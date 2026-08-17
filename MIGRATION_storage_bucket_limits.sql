-- ─────────────────────────────────────────────────────────────────────────────
-- Límites server-side para los buckets de imágenes ("chef-photos", "menu-images")
--
-- Hoy el tamaño (10 MB) y el tipo (jpg/png/webp) solo se validan en el cliente
-- (compressImage() + checks en FotoPerfilUpload/GaleriaUpload/MenuBuilderPanel).
-- Alguien que le pegue directo a la API de Storage salteando el JS del browser
-- podría subir cualquier archivo/tamaño. Esto lo bloquea a nivel de bucket,
-- que es lo único que valida los bytes que realmente llegan.
--
-- No fuerza la recompresión (eso seguiría siendo cosmético/client-side) — solo
-- pone un techo real de tamaño y tipo. Límite igual al MAX_FILE_MB=10 del cliente.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10 MB, en bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('chef-photos', 'menu-images');
