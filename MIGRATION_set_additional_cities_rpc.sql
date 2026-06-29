-- ============================================================================
-- MIGRACIÓN · RPC para que el chef guarde sus ciudades adicionales
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere: MIGRATION_chef_additional_cities.sql (columna additional_cities)
--
-- Por qué un RPC y no un UPDATE directo: chef_profiles está blindada a nivel
-- COLUMNA (el feature de bloqueo admin revoca UPDATE de tabla y solo concede
-- columnas puntuales a `authenticated`). additional_cities no está en esa lista,
-- así que un .update() directo da 42501 "permission denied for table".
--
-- Esta función SECURITY DEFINER corre como owner (bypassa los privilegios de
-- columna) pero SOLO toca additional_cities de la fila del propio chef → el chef
-- no puede escalar a admin_blocked ni tocar otras columnas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_chef_additional_cities(p_cities text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id uuid;
BEGIN
  SELECT id INTO v_chef_id
  FROM chef_profiles
  WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RAISE EXCEPTION 'Chef profile not found';
  END IF;

  UPDATE chef_profiles
     SET additional_cities = COALESCE(p_cities, '{}'),
         updated_at        = now()
   WHERE id = v_chef_id;
END;
$$;

REVOKE ALL    ON FUNCTION public.set_chef_additional_cities(text[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.set_chef_additional_cities(text[]) TO authenticated;
