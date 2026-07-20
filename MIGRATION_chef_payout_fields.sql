-- ============================================================================
-- MIGRACIÓN · Campos adicionales de la cuenta de pago del chef
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Amplía chef_payout_accounts (creada en MIGRATION_chef_payout_accounts.sql)
-- con los datos que faltaban para poder girarle al chef:
--   · identidad del titular  → legal_status, document_type
--   · cuenta bancaria        → currency (bank_name/account_number/account_type ya existían)
--   · dirección fiscal       → address_line, address_city, address_country, postal_code
--
-- NO toca las RLS: siguen siendo las de la migración original (el chef solo su
-- propia fila, sin lectura pública, admin vía service-role). Estos campos son
-- tan sensibles como el número de cuenta y quedan bajo las mismas políticas.
--
-- ⚠️ Estos datos NO deben aparecer nunca en una query pública ni en el perfil
-- visible de chefs. chef_profiles tiene un SELECT público (USING true); esta
-- tabla no, y por eso los datos bancarios viven acá y no allá. Si alguna vez
-- agregás un JOIN a chef_payout_accounts desde una query que sirve al front
-- público, estás filtrando datos bancarios.
--
-- Todas las columnas son nullable: la fila se completa desde el editor del chef
-- y hoy la tabla está vacía. Idempotente: se puede correr más de una vez.
-- ============================================================================

-- 1. Columnas nuevas ─────────────────────────────────────────────────────────
ALTER TABLE public.chef_payout_accounts
  -- Identidad del titular
  ADD COLUMN IF NOT EXISTS legal_status    text,  -- self_employed / individual / company
  ADD COLUMN IF NOT EXISTS document_type   text,  -- cedula / passport / residencia / ruc
  -- Cuenta bancaria: moneda en la que el chef recibe el depósito.
  -- El escrow cobra en USD; si la cuenta es en córdobas hay conversión de por
  -- medio, así que el admin necesita saberlo antes de girar.
  ADD COLUMN IF NOT EXISTS currency        text,  -- USD / NIO
  -- Dirección fiscal (no de envío: el pago es depósito bancario, no se envía nada)
  ADD COLUMN IF NOT EXISTS address_line    text,
  ADD COLUMN IF NOT EXISTS address_city    text,
  ADD COLUMN IF NOT EXISTS address_country text,
  ADD COLUMN IF NOT EXISTS postal_code     text;  -- opcional: en Nicaragua es de uso marginal

-- 2. CHECKs de los campos cerrados ───────────────────────────────────────────
-- Última línea de defensa: aunque la UI o el RPC fallen, la base rechaza un
-- valor fuera de rango. Se agregan vía DO block porque ADD CONSTRAINT no
-- soporta IF NOT EXISTS. Todos aceptan NULL (fila a medio completar).
--
-- bank_name queda SIN check a propósito: el chef lo escribe manualmente (la UI
-- ofrece sugerencias, no una lista cerrada), así que no se puede restringir.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chef_payout_legal_status_check'
  ) THEN
    ALTER TABLE public.chef_payout_accounts
      ADD CONSTRAINT chef_payout_legal_status_check
      CHECK (legal_status IS NULL OR legal_status IN ('self_employed', 'individual', 'company'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chef_payout_document_type_check'
  ) THEN
    ALTER TABLE public.chef_payout_accounts
      ADD CONSTRAINT chef_payout_document_type_check
      CHECK (document_type IS NULL OR document_type IN ('cedula', 'passport', 'residencia', 'ruc'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chef_payout_account_type_check'
  ) THEN
    ALTER TABLE public.chef_payout_accounts
      ADD CONSTRAINT chef_payout_account_type_check
      CHECK (account_type IS NULL OR account_type IN ('ahorro', 'corriente'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chef_payout_currency_check'
  ) THEN
    ALTER TABLE public.chef_payout_accounts
      ADD CONSTRAINT chef_payout_currency_check
      CHECK (currency IS NULL OR currency IN ('USD', 'NIO'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Columnas (deben aparecer las 7 nuevas + las 5 originales + timestamps):
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='chef_payout_accounts'
--   ORDER BY ordinal_position;
--
-- CHECKs creados (deben ser 4):
--   SELECT conname FROM pg_constraint
--   WHERE conrelid='public.chef_payout_accounts'::regclass AND contype='c';
--
-- Las RLS siguen intactas (deben seguir siendo 3: select/insert/update own):
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='chef_payout_accounts';
--
-- anon sigue SIN ningún privilegio (debe devolver 0 filas):
--   SELECT privilege_type FROM information_schema.role_table_grants
--   WHERE table_name='chef_payout_accounts' AND grantee='anon';
