-- Drop all previous overloads
DROP FUNCTION IF EXISTS register_chef(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS register_chef(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION register_chef(
  p_user_id       UUID,
  p_email         TEXT,
  p_first_name    TEXT,
  p_phone         TEXT,
  p_country       TEXT,
  p_first_surname TEXT DEFAULT NULL,
  p_second_surname TEXT DEFAULT NULL
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
    INSERT INTO public.users (id, email, first_name, first_surname, second_surname, phone, role)
    VALUES (p_user_id, p_email, p_first_name, p_first_surname, p_second_surname, p_phone, 'chef')
    RETURNING id INTO v_user_id;
  ELSE
    UPDATE public.users
    SET first_name    = p_first_name,
        first_surname  = p_first_surname,
        second_surname = p_second_surname,
        phone          = p_phone,
        role           = 'chef'
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
