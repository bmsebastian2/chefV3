-- ─────────────────────────────────────────────────────────────────────────────
-- Limpieza automática de cuentas sin confirmar (chef/cliente)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Motivo: con "Confirm email" activo, una cuenta creada con un email falso
-- (formato válido, dominio real, pero inexistente) nunca puede confirmar ni
-- loguearse — pero la fila en auth.users / public.users / chef_profiles /
-- profile_completion queda para siempre si nadie la borra.
--
-- Filtro de seguridad — se borra SOLO si las 3 condiciones se cumplen:
--   1. email_confirmed_at IS NULL      → nunca confirmó
--   2. created_at < hoy - 7 días        → tiempo de sobra para confirmar
--   3. last_sign_in_at IS NULL          → NUNCA inició sesión, ni una vez
--
-- La condición 3 es la que evita un desastre: protege cuentas viejas de
-- antes de exigir confirmación, que pueden seguir sin email_confirmed_at
-- pero SÍ están activas (entran con contraseña normalmente). Sin esa
-- condición, el job borraría cuentas reales en uso.
--
-- role IS NULL también entra en el filtro: cubre el caso de una cuenta
-- huérfana en auth.users cuyo register_chef/register_client falló y nunca
-- llegó a crear la fila en public.users.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 1 — Diagnóstico (NO borra nada). Corré esto primero y revisá la lista
-- antes de seguir. Ajustá el intervalo acá y en el PASO 2 si querés probar
-- con menos días antes de comprometerte a 7.
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  au.id,
  au.email,
  pu.role,
  au.created_at,
  au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email_confirmed_at IS NULL
  AND au.created_at < now() - interval '7 days'
  AND au.last_sign_in_at IS NULL
  AND (pu.role IS NULL OR pu.role IN ('chef', 'client'))
ORDER BY au.created_at DESC;


-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 2 — Función de limpieza. Devuelve cuántas filas borró (para poder
-- verificarlo después en los logs del cron). Corré esto una sola vez.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_unconfirmed_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH targets AS (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE au.email_confirmed_at IS NULL
      AND au.created_at < now() - interval '7 days'
      AND au.last_sign_in_at IS NULL
      AND (pu.role IS NULL OR pu.role IN ('chef', 'client'))
  )
  DELETE FROM auth.users WHERE id IN (SELECT id FROM targets);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION cleanup_unconfirmed_accounts() FROM PUBLIC;
-- Sin GRANT a anon/authenticated a propósito: solo la ejecuta el cron
-- (corre como el dueño de la función, service_role de facto).


-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 3 — Habilitar pg_cron (una sola vez, si no lo tenés ya).
-- Dashboard → Database → Extensions → buscar "pg_cron" → Enable.
-- Si ya aparece habilitada, saltar directo al PASO 4.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 4 — Programar el job diario (corre todos los días a las 4am UTC).
-- ═══════════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'cleanup-unconfirmed-accounts',
  '0 4 * * *',
  $$ SELECT public.cleanup_unconfirmed_accounts(); $$
);


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN — correr en cualquier momento después de activado, para ver
-- las últimas corridas del job y cuántas filas borró cada vez:
--
--   SELECT jobname, status, start_time, return_message
--   FROM cron.job_run_details
--   JOIN cron.job ON cron.job.jobid = cron.job_run_details.jobid
--   WHERE jobname = 'cleanup-unconfirmed-accounts'
--   ORDER BY start_time DESC
--   LIMIT 10;
--
-- Para desactivar el job más adelante (si hiciera falta):
--   SELECT cron.unschedule('cleanup-unconfirmed-accounts');
-- ─────────────────────────────────────────────────────────────────────────────
