-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: lógica de email confirmation para nuevos clientes
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ampliar el CHECK constraint de service_requests.status para admitir 'pending_confirmation'.
--    El error 23514 confirma que la tabla usa CHECK CONSTRAINT con nombre service_requests_status_check.

-- Primero podés ver los valores actuales con:
--   SELECT DISTINCT status FROM service_requests;

ALTER TABLE service_requests
  DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- NOT VALID: aplica el constraint solo a filas nuevas/modificadas.
-- Las filas existentes quedan intactas sin importar su status actual.
ALTER TABLE service_requests
  ADD CONSTRAINT service_requests_status_check
  CHECK (status IN ('new', 'active', 'pending_confirmation', 'completed', 'cancelled', 'pending'))
  NOT VALID;

-- 2. Reemplazo de get_user_by_email que también busca en auth.users.
--    Cuando Supabase reemplaza un usuario no-confirmado con admin.createUser,
--    el CASCADE DELETE borra la fila de public.users. Esta función lo detecta
--    y re-sincroniza public.users antes de devolver el resultado.

CREATE OR REPLACE FUNCTION find_user_by_email(p_email text)
RETURNS TABLE(user_id uuid, user_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   uuid;
  v_role text;
BEGIN
  -- 1. Buscar en public.users (caso normal)
  SELECT id, role INTO v_id, v_role
  FROM public.users WHERE email = p_email LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, v_role;
    RETURN;
  END IF;

  -- 2. Fallback: buscar en auth.users (usuario no-confirmado cuyo registro
  --    fue eliminado por CASCADE al ser reemplazado por admin.createUser)
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, role)
    VALUES (v_id, p_email, 'client')
    ON CONFLICT (id) DO NOTHING;

    RETURN QUERY SELECT v_id, 'client'::text;
    RETURN;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION find_user_by_email(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION find_user_by_email(text) TO authenticated, anon, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

-- 3. Función para marcar un request recién creado como pending_confirmation.
--    Llamada desde submitServiceRequest cuando el cliente es nuevo.

CREATE OR REPLACE FUNCTION set_request_pending(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE service_requests
  SET    status = 'pending_confirmation'
  WHERE  id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION set_request_pending(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION set_request_pending(uuid) TO authenticated, anon, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

-- 4. Función para activar requests pendientes cuando el usuario confirma su email.
--    Retorna los IDs activados para que /auth/callback pueda notificar a los chefs.
--    Llamada desde /auth/callback después de exchangeCodeForSession.

DROP FUNCTION IF EXISTS activate_pending_requests(uuid);

CREATE OR REPLACE FUNCTION activate_pending_requests(p_user_id uuid)
RETURNS TABLE(
  id                 uuid,
  service_type       text,
  occasion           text,
  city               text,
  event_date_start   date,
  event_date_end     date,
  event_time         text,
  guests_adults      integer,
  cuisine_type       text,
  budget_min         numeric,
  budget_max         numeric,
  descripcion_evento text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE service_requests
  SET    status = 'new'
  WHERE  user_id = p_user_id
    AND  status  = 'pending_confirmation'
  RETURNING
    service_requests.id,
    service_requests.service_type,
    service_requests.occasion,
    service_requests.city,
    service_requests.event_date_start,
    service_requests.event_date_end,
    service_requests.event_time,
    service_requests.guests_adults,
    service_requests.cuisine_type,
    service_requests.budget_min,
    service_requests.budget_max,
    service_requests.descripcion_evento;
END;
$$;

REVOKE ALL ON FUNCTION activate_pending_requests(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION activate_pending_requests(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────

-- 5. Limpieza automática: cancelar requests sin confirmar después de 7 días.
--    Requiere pg_cron: Dashboard → Database → Extensions → habilitar "pg_cron".
--    Una vez habilitado, correr este bloque por separado:
--
-- SELECT cron.schedule(
--   'cancel-unconfirmed-requests',
--   '0 3 * * *',
--   $$
--     UPDATE public.service_requests
--     SET    status = 'cancelled'
--     WHERE  status     = 'pending_confirmation'
--       AND  created_at < now() - interval '7 days';
--   $$
-- );
