-- ─────────────────────────────────────────────────────────────────────────────
-- Registro de aceptación de Términos y Condiciones
--
-- Guarda en public.users la fecha y la versión del documento legal que el
-- usuario aceptó al registrarse. La aceptación registrada (fecha + versión) es
-- lo que permite probar el vínculo contractual ante una disputa.
--
-- Ejecutar una vez en el SQL editor de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Columnas en users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS terms_version     TEXT;

-- 2. register_chef — ahora recibe y guarda la versión de términos aceptada
DROP FUNCTION IF EXISTS register_chef(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS register_chef(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION register_chef(
  p_user_id        UUID,
  p_email          TEXT,
  p_first_name     TEXT,
  p_phone          TEXT,
  p_country        TEXT,
  p_first_surname  TEXT DEFAULT NULL,
  p_second_surname TEXT DEFAULT NULL,
  p_terms_version  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_chef_profile_id UUID;
  v_existing_user  UUID;
  v_existing_chef  UUID;
BEGIN
  -- Validate phone uniqueness against other users
  IF EXISTS (SELECT 1 FROM public.users WHERE phone = p_phone AND id != p_user_id) THEN
    RAISE EXCEPTION 'Phone number already exists: %', p_phone;
  END IF;

  SELECT id INTO v_existing_user FROM public.users WHERE id = p_user_id;

  IF v_existing_user IS NULL THEN
    INSERT INTO public.users (
      id, email, first_name, first_surname, second_surname, phone, role,
      terms_version, terms_accepted_at
    )
    VALUES (
      p_user_id, p_email, p_first_name, p_first_surname, p_second_surname, p_phone, 'chef',
      p_terms_version,
      CASE WHEN p_terms_version IS NOT NULL THEN now() ELSE NULL END
    )
    RETURNING id INTO v_user_id;
  ELSE
    UPDATE public.users
    SET first_name     = p_first_name,
        first_surname  = p_first_surname,
        second_surname = p_second_surname,
        phone          = p_phone,
        role           = 'chef',
        terms_version     = COALESCE(p_terms_version, terms_version),
        terms_accepted_at = CASE
                              WHEN p_terms_version IS NOT NULL THEN now()
                              ELSE terms_accepted_at
                            END
    WHERE id = p_user_id;
    v_user_id := p_user_id;
  END IF;

  -- Save display_name and surnames in auth.users metadata
  UPDATE auth.users
  SET
    phone = p_phone,
    raw_user_meta_data = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{display_name}',
          to_jsonb(trim(concat_ws(' ', p_first_name, p_first_surname, p_second_surname)))
        ),
        '{first_surname}',
        to_jsonb(p_first_surname)
      ),
      '{second_surname}',
      to_jsonb(p_second_surname)
    )
  WHERE id = p_user_id;

  SELECT id INTO v_existing_chef FROM public.chef_profiles WHERE user_id = v_user_id;

  IF v_existing_chef IS NULL THEN
    INSERT INTO public.chef_profiles (user_id, country, is_active)
    VALUES (v_user_id, p_country, true)
    RETURNING id INTO v_chef_profile_id;

    INSERT INTO public.profile_completion (chef_id)
    VALUES (v_chef_profile_id)
    ON CONFLICT DO NOTHING;
  ELSE
    v_chef_profile_id := v_existing_chef;

    INSERT INTO public.profile_completion (chef_id)
    VALUES (v_chef_profile_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_user_id;
END;
$$;

-- 3. register_client — ahora recibe y guarda la versión de términos aceptada
DROP FUNCTION IF EXISTS register_client(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS register_client(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION register_client(
  p_user_id       UUID,
  p_email         TEXT,
  p_first_name    TEXT,
  p_phone         TEXT DEFAULT NULL,
  p_terms_version TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, first_name, phone, role, terms_version, terms_accepted_at
  )
  VALUES (
    p_user_id, p_email, p_first_name, p_phone, 'client',
    p_terms_version,
    CASE WHEN p_terms_version IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        phone      = COALESCE(EXCLUDED.phone, public.users.phone),
        role       = CASE
                       WHEN public.users.role = 'chef' THEN public.users.role
                       ELSE 'client'
                     END,
        terms_version     = COALESCE(EXCLUDED.terms_version, public.users.terms_version),
        terms_accepted_at = CASE
                              WHEN EXCLUDED.terms_version IS NOT NULL
                                THEN now()
                              ELSE public.users.terms_accepted_at
                            END;

  UPDATE auth.users
  SET
    phone = p_phone,
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{display_name}',
      to_jsonb(p_first_name)
    )
  WHERE id = p_user_id;

  RETURN p_user_id;
END;
$$;
