-- Drop the existing function first (if it exists)
DROP FUNCTION IF EXISTS register_chef(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS register_chef(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Function to register a chef after auth signup
CREATE OR REPLACE FUNCTION register_chef(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_country TEXT,
  p_first_surname TEXT DEFAULT NULL,
  p_second_surname TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_chef_profile_id UUID;
  v_existing_user UUID;
  v_existing_chef UUID;
BEGIN
  -- Start a transaction block that can be rolled back
  -- Check if user already exists
  SELECT id INTO v_existing_user FROM public.users WHERE id = p_user_id;

  IF v_existing_user IS NULL THEN
    -- Insert into users table if doesn't exist
    BEGIN
      INSERT INTO public.users (id, email, full_name, phone, role)
      VALUES (p_user_id, p_email, p_full_name, p_phone, 'chef')
      RETURNING id INTO v_user_id;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Phone number already exists: %', p_phone;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error creating user: %', SQLERRM;
    END;
  ELSE
    -- User exists, update if needed and set role to chef
    BEGIN
      UPDATE public.users
      SET full_name = p_full_name, phone = p_phone, role = 'chef'
      WHERE id = p_user_id;
      v_user_id := p_user_id;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Phone number already exists: %', p_phone;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error updating user: %', SQLERRM;
    END;
  END IF;

  -- Update the display_name, phone, and surnames in auth.users table metadata
  UPDATE auth.users
  SET 
    phone = p_phone,
    raw_user_meta_data = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{display_name}',
          to_jsonb(p_full_name)
        ),
        '{first_surname}',
        to_jsonb(p_first_surname)
      ),
      '{second_surname}',
      to_jsonb(p_second_surname)
    )
  WHERE id = p_user_id;

  -- Check if chef profile already exists
  SELECT id INTO v_existing_chef FROM public.chef_profiles WHERE user_id = v_user_id;

  IF v_existing_chef IS NULL THEN
    -- Insert into chef_profiles table if doesn't exist
    INSERT INTO public.chef_profiles (user_id, country, is_active, first_surname, second_surname)
    VALUES (v_user_id, p_country, false, p_first_surname, p_second_surname)
    RETURNING id INTO v_chef_profile_id;

    -- Insert into profile_completion table if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.profile_completion WHERE chef_id = v_chef_profile_id) THEN
      INSERT INTO public.profile_completion (chef_id)
      VALUES (v_chef_profile_id);
    END IF;
  ELSE
    -- Chef profile exists, update with surnames
    UPDATE public.chef_profiles
    SET first_surname = p_first_surname, second_surname = p_second_surname
    WHERE id = v_existing_chef;
    v_chef_profile_id := v_existing_chef;
    
    -- Ensure profile_completion exists for this chef
    IF NOT EXISTS (SELECT 1 FROM public.profile_completion WHERE chef_id = v_chef_profile_id) THEN
      INSERT INTO public.profile_completion (chef_id)
      VALUES (v_chef_profile_id);
    END IF;
  END IF;

  -- Return the user_id
  RETURN v_user_id;
END;
$$;