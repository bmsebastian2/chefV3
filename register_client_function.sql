-- Lookup by email
CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS TABLE(user_id UUID, user_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, role FROM public.users WHERE email = p_email;
END;
$$;

-- Lookup by phone
CREATE OR REPLACE FUNCTION get_user_by_phone(p_phone TEXT)
RETURNS TABLE(user_id UUID, user_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, role FROM public.users WHERE phone = p_phone;
END;
$$;

-- Register a new client (only called when we confirmed no existing user)
CREATE OR REPLACE FUNCTION register_client(
  p_user_id    UUID,
  p_email      TEXT,
  p_first_name TEXT,
  p_phone      TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, phone, role)
  VALUES (p_user_id, p_email, p_first_name, p_phone, 'client')
  ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        phone      = COALESCE(EXCLUDED.phone, public.users.phone),
        role       = CASE
                       WHEN public.users.role = 'chef' THEN public.users.role
                       ELSE 'client'
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

