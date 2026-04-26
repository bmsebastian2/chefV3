-- Function to check if a phone number already exists in the users table
-- Uses SECURITY DEFINER to bypass RLS (needed for pre-auth checks)
CREATE OR REPLACE FUNCTION check_phone_exists(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE phone = p_phone);
END;
$$;
