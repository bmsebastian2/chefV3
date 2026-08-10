-- ─────────────────────────────────────────────────────────────────────────────
-- Lockdown: quitar el listado público del bucket "menu-images"
--
-- Alerta de seguridad (Supabase linter): la política de SELECT sobre
-- storage.objects para 'menu-images' es TO public USING (bucket_id = ...),
-- sin acotar por dueño. SELECT en storage.objects gobierna tanto la lectura
-- de metadata como el .list() — esto deja a cualquiera enumerar TODAS las
-- carpetas (user_id de cada chef) y archivos del bucket (nombre, tamaño,
-- fechas), aunque nadie en la app llame a .list().
--
-- Confirmado en vivo con la anon key antes de este fix:
--   POST /storage/v1/object/list/menu-images  -> devuelve todas las carpetas
--
-- La lectura pública de una imagen por su URL (getPublicUrl /
-- /storage/v1/object/public/menu-images/...) NO depende de esta política:
-- la sirve el flag "public" del bucket. Se verificó que sigue funcionando
-- igual después de este cambio.
--
-- Ningún componente de la app usa .storage.from('menu-images').list() —
-- las imágenes se trackean vía la tabla de menús/dishes, no listando el
-- bucket. Por eso se elimina la política sin reemplazo (no hace falta una
-- versión acotada al dueño).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Menu images publicly readable" ON storage.objects;

-- INSERT/UPDATE/DELETE (acotadas a auth.uid() = carpeta propia) quedan
-- intactas, definidas en create_menu_images_storage.sql. No se tocan.
