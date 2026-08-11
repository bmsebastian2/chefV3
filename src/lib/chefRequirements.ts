// Umbrales mínimos para que un chef pueda activar su perfil y recibir
// solicitudes. Fuente única — consumidos por el checklist de "% completado"
// (profile_completion) y por el gate real del switch "Perfil activo"
// (meetsRequirements en dashboard/page.tsx). No duplicar estos números.
export const MIN_PROFILE_PHOTOS = 1
export const MIN_GALLERY_PHOTOS = 7
export const MIN_MENUS = 3
export const MIN_DISHES = 4
