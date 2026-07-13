-- Registra en public.users a un usuario que entró por OAuth (Google) y todavía
-- no tiene fila propia. El mapeo de nombre (given_name → first_name,
-- family_name → first_surname) se resuelve en el callback; aquí solo se persiste.
--
-- Idempotente: ON CONFLICT (id) DO NOTHING. Si la fila ya existe (p. ej. un chef
-- que linkea su Google), no se duplica ni se pisan datos existentes — se conserva
-- su rol y su perfil, así el gate de bloqueo (admin_blocked) sigue aplicando.
CREATE OR REPLACE FUNCTION register_oauth_user(
  p_user_id       UUID,
  p_email         TEXT,
  p_first_name    TEXT,
  p_first_surname TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, first_name, first_surname, second_surname, role
  )
  VALUES (
    p_user_id, p_email, p_first_name, p_first_surname, NULL, 'client'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN p_user_id;
END;
$$;

-- El callback puede invocarlo tanto con la sesión del usuario como con el admin
-- client (service-role), así que otorgamos EXECUTE a ambos roles.
GRANT EXECUTE ON FUNCTION register_oauth_user(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
