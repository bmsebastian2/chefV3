-- ─────────────────────────────────────────────────────────────────────────────
-- Referencia: políticas EXISTENTES en producción para el bucket "chef-photos"
--
-- Documenta políticas que ya están así en la base (verificadas contra
-- pg_policies el 2026-08-10). No hace falta ejecutarlo — se versiona porque,
-- a diferencia de "menu-images", nunca se había commiteado el SQL original
-- (se creó a mano desde el dashboard de Supabase). Es idempotente (DROP IF
-- EXISTS + CREATE) por si alguna vez hay que recrearlas.
--
-- A diferencia de "menu-images", acá el SELECT (y por lo tanto el .list())
-- ya está correctamente acotado: solo TO authenticated y solo la carpeta
-- propia del chef. Por eso la anon key no puede listar nada de este bucket
-- (se confirmó en vivo: list() con anon devuelve [] incluso pasando el
-- prefix real de un chef existente). No requiere el mismo fix que
-- "menu-images" (ver MIGRATION_menu_images_storage_lockdown.sql).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "chefs upload own photos 1j2wlt4_0" ON storage.objects;
CREATE POLICY "chefs upload own photos 1j2wlt4_0"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chef-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "chefs update own photos 1j2wlt4_1" ON storage.objects;
CREATE POLICY "chefs update own photos 1j2wlt4_1"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chef-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "chefs update own photos 1j2wlt4_0" ON storage.objects;
CREATE POLICY "chefs update own photos 1j2wlt4_0"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chef-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NOTA — fuera de alcance de esta tarea, no se toca sin autorización:
-- No existe política de DELETE para este bucket. deleteGalleryPhoto()
-- (src/app/dashboard/fotos/actions.ts:137) llama a
-- supabase.storage.from('chef-photos').remove([oldPath]) con el cliente
-- de usuario (server.ts, sujeto a RLS) y sin chequear el resultado.
-- Sin política de DELETE, ese remove() probablemente falla en silencio:
-- la fila de chef_photos se borra pero el archivo queda huérfano en el
-- bucket. Es un problema de limpieza/costo de storage, no de seguridad
-- (nadie más puede borrar archivos ajenos), así que lo dejo señalado
-- para que decidas si se atiende aparte.
