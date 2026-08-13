-- ============================================================================
-- MIGRACIÓN · Moderación de chat — registro de intentos de desintermediación
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Contexto: el filtro server-side (src/lib/chat-moderation.ts) corre dentro de
-- sendMessage / sendClientMessage ANTES de llamar a insert_message(). Cuando
-- detecta un intento de compartir datos de contacto, no llega a insertar el
-- mensaje real — en su lugar queda registrado acá para que el admin pueda ver
-- patrones de abuso (quién insiste en desintermediar).
--
-- Sin políticas RLS para anon/authenticated a propósito: esta tabla solo se
-- escribe y lee desde server actions usando el admin client (service role,
-- nunca expuesto al browser) — mismo patrón que notify-chefs.ts y
-- /api/push/send. Los chefs/clientes no tienen ni deben tener acceso directo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_moderation_flags (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id       uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  sender_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_role       text NOT NULL CHECK (sender_role IN ('chef', 'client')),
  content           text NOT NULL,
  matched_category  text NOT NULL CHECK (matched_category IN ('phone', 'email', 'social', 'keyword', 'spelled_digits')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Lectura por proposal_id/sender_id para armar el listado admin y detectar reincidencia.
CREATE INDEX IF NOT EXISTS chat_moderation_flags_sender_id_idx ON public.chat_moderation_flags (sender_id);
CREATE INDEX IF NOT EXISTS chat_moderation_flags_proposal_id_idx ON public.chat_moderation_flags (proposal_id);

ALTER TABLE public.chat_moderation_flags ENABLE ROW LEVEL SECURITY;

-- Sin GRANT a anon/authenticated: solo service_role (que ya tiene bypass de RLS
-- por defecto en Supabase) puede leer o escribir.
GRANT SELECT, INSERT ON public.chat_moderation_flags TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Debe existir la tabla y el GRANT a service_role:
--   SELECT grantee, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'chat_moderation_flags';
