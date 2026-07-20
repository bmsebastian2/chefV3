-- ============================================================================
-- MIGRACIÓN · RPC para que el chef guarde su cuenta de pago
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere: MIGRATION_chef_payout_accounts.sql + MIGRATION_chef_payout_fields.sql
--
-- Por qué un RPC y no un upsert directo:
--   1. Dato sensible → patrón del proyecto (mutaciones vía SECURITY DEFINER).
--   2. Necesita ser atómico: guardar la cuenta y marcar profile_completion
--      .payments_done en una sola transacción. Si se hicieran por separado, un
--      fallo entre medio dejaría al chef con cuenta cargada y el checklist
--      diciendo que le falta (o peor: el checklist en verde sin cuenta, y el
--      admin sin poder girarle).
--   3. Es upsert: la primera carga inserta, las ediciones actualizan.
--
-- 🔒 El chef_id NO es parámetro: se deriva de auth.uid() adentro de la función.
-- Si viniera por parámetro, cualquier chef autenticado podría escribir sobre la
-- cuenta bancaria de otro — el RPC es SECURITY DEFINER y bypassa las RLS.
--
-- Idempotente (CREATE OR REPLACE): se puede correr más de una vez.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_chef_payout_account(
  p_legal_status    text,
  p_account_holder  text,
  p_document_type   text,
  p_document_id     text,
  p_bank_name       text,
  p_account_type    text,
  p_currency        text,
  p_account_number  text,
  p_address_line    text,
  p_address_city    text,
  p_address_country text,
  p_postal_code     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id     uuid;
  v_holder      text;
  v_bank        text;
  v_document    text;
  v_account_num text;
  v_address     text;
  v_city        text;
  v_country     text;
  v_postal      text;
BEGIN
  -- ── Dueño de la fila: siempre el chef autenticado ─────────────────────────
  SELECT id INTO v_chef_id
  FROM chef_profiles
  WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'chef_profile_not_found';
  END IF;

  -- ── Normalización ─────────────────────────────────────────────────────────
  -- Colapsa espacios internos y recorta. El admin lee estos campos para operar,
  -- así que "BAC  Credomatic " y "BAC Credomatic" tienen que guardarse igual.
  v_holder  := NULLIF(regexp_replace(btrim(COALESCE(p_account_holder,  '')), '\s+', ' ', 'g'), '');
  v_bank    := NULLIF(regexp_replace(btrim(COALESCE(p_bank_name,       '')), '\s+', ' ', 'g'), '');
  v_address := NULLIF(regexp_replace(btrim(COALESCE(p_address_line,    '')), '\s+', ' ', 'g'), '');
  v_city    := NULLIF(regexp_replace(btrim(COALESCE(p_address_city,    '')), '\s+', ' ', 'g'), '');
  v_country := NULLIF(regexp_replace(btrim(COALESCE(p_address_country, '')), '\s+', ' ', 'g'), '');
  v_postal  := NULLIF(btrim(COALESCE(p_postal_code, '')), '');

  -- Documento: sin guiones ni espacios, en mayúsculas (001-010101-0001A → 0010101010001A)
  v_document := upper(regexp_replace(COALESCE(p_document_id, ''), '[\s-]', '', 'g'));
  v_document := NULLIF(v_document, '');

  -- Número de cuenta: solo dígitos. Los bancos NI lo muestran con guiones o
  -- espacios según el canal; guardamos la forma canónica.
  v_account_num := NULLIF(regexp_replace(COALESCE(p_account_number, ''), '\D', '', 'g'), '');

  -- ── Obligatorios ──────────────────────────────────────────────────────────
  -- postal_code queda fuera a propósito: en Nicaragua es de uso marginal y
  -- exigirlo bloquearía chefs válidos.
  IF v_holder IS NULL OR v_document IS NULL OR v_bank IS NULL
     OR v_account_num IS NULL OR v_address IS NULL OR v_city IS NULL
     OR v_country IS NULL OR p_legal_status IS NULL OR p_document_type IS NULL
     OR p_account_type IS NULL OR p_currency IS NULL THEN
    RAISE EXCEPTION 'missing_required_fields';
  END IF;

  -- ── Campos cerrados ───────────────────────────────────────────────────────
  -- Los CHECK de la tabla ya cubren esto, pero acá el error es legible para la
  -- UI en vez de un violación de constraint cruda.
  IF p_legal_status NOT IN ('self_employed', 'individual', 'company') THEN
    RAISE EXCEPTION 'invalid_legal_status';
  END IF;

  IF p_document_type NOT IN ('cedula', 'passport', 'residencia', 'ruc') THEN
    RAISE EXCEPTION 'invalid_document_type';
  END IF;

  IF p_account_type NOT IN ('ahorro', 'corriente') THEN
    RAISE EXCEPTION 'invalid_account_type';
  END IF;

  IF p_currency NOT IN ('USD', 'NIO') THEN
    RAISE EXCEPTION 'invalid_currency';
  END IF;

  -- Una compañía cobra con RUC, no con documento personal.
  -- La inversa NO se exige: un comerciante individual puede tener RUC.
  IF p_legal_status = 'company' AND p_document_type <> 'ruc' THEN
    RAISE EXCEPTION 'company_requires_ruc';
  END IF;

  -- ── Formato ───────────────────────────────────────────────────────────────
  -- Documento: rango amplio y alfanumérico, igual para todos los tipos.
  --
  -- NO se valida el formato exacto por tipo a propósito. La cédula NI clásica
  -- es 001-010101-0001A (14), pero conviven documentos más cortos, y con la
  -- expansión a otros países cada uno trae su propio formato. El costo del
  -- error es asimétrico: un formato demasiado estricto deja al chef sin poder
  -- cobrar, mientras que un dígito mal tipeado lo detecta el admin, que revisa
  -- estos datos antes de girar.
  IF v_document !~ '^[A-Z0-9]{5,20}$' THEN
    RAISE EXCEPTION 'invalid_document_id';
  END IF;

  -- Número de cuenta: rango amplio a propósito. BAC, Banpro y LAFISE usan
  -- largos distintos; fijar uno solo bloquearía cuentas válidas.
  IF length(v_account_num) < 10 OR length(v_account_num) > 20 THEN
    RAISE EXCEPTION 'invalid_account_number';
  END IF;

  -- ── Upsert ────────────────────────────────────────────────────────────────
  INSERT INTO chef_payout_accounts (
    chef_id, legal_status, account_holder, document_type, document_id,
    bank_name, account_type, currency, account_number,
    address_line, address_city, address_country, postal_code, updated_at
  ) VALUES (
    v_chef_id, p_legal_status, v_holder, p_document_type, v_document,
    v_bank, p_account_type, p_currency, v_account_num,
    v_address, v_city, v_country, v_postal, now()
  )
  ON CONFLICT (chef_id) DO UPDATE SET
    legal_status    = EXCLUDED.legal_status,
    account_holder  = EXCLUDED.account_holder,
    document_type   = EXCLUDED.document_type,
    document_id     = EXCLUDED.document_id,
    bank_name       = EXCLUDED.bank_name,
    account_type    = EXCLUDED.account_type,
    currency        = EXCLUDED.currency,
    account_number  = EXCLUDED.account_number,
    address_line    = EXCLUDED.address_line,
    address_city    = EXCLUDED.address_city,
    address_country = EXCLUDED.address_country,
    postal_code     = EXCLUDED.postal_code,
    updated_at      = now();

  -- ── Checklist ─────────────────────────────────────────────────────────────
  -- Misma transacción que el upsert: o quedan los dos, o no queda ninguno.
  UPDATE profile_completion
     SET payments_done = true,
         updated_at    = now()
   WHERE chef_id = v_chef_id;
END;
$$;

REVOKE ALL     ON FUNCTION public.save_chef_payout_account(
  text, text, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC;

-- Solo el chef autenticado. NADA de service_role acá: esta función deriva su
-- dueño de auth.uid(), que con service-role es NULL → siempre fallaría.
GRANT EXECUTE   ON FUNCTION public.save_chef_payout_account(
  text, text, text, text, text, text, text, text, text, text, text, text
) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- La función existe y es SECURITY DEFINER (prosecdef debe ser true):
--   SELECT proname, prosecdef FROM pg_proc
--   WHERE proname = 'save_chef_payout_account';
--
-- Privilegios (debe aparecer authenticated, NO anon ni public):
--   SELECT grantee, privilege_type FROM information_schema.routine_privileges
--   WHERE routine_name = 'save_chef_payout_account';
--
-- Prueba end-to-end: logueado como chef desde la app, guardar el formulario y
-- verificar que la fila quedó y el checklist se marcó:
--   SELECT a.chef_id, a.bank_name, a.account_number, a.currency, c.payments_done
--   FROM chef_payout_accounts a
--   JOIN profile_completion c ON c.chef_id = a.chef_id;
