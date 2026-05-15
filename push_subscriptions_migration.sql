-- Tabla para guardar suscripciones de push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- RLS: cada usuario solo ve sus propias suscripciones
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_owner"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- El service role puede leer todas (para enviar notificaciones)
CREATE POLICY "push_subscriptions_service_role_read"
  ON push_subscriptions
  FOR SELECT
  USING (true);
