// Versión vigente de los Términos y Condiciones / Política de privacidad.
//
// Se guarda junto con la fecha de aceptación (users.terms_version,
// users.terms_accepted_at) en cada registro para poder probar el vínculo
// contractual ante una eventual disputa. Al publicar una versión sustancial
// nueva del documento legal, incrementá este valor (formato AAAA-MM).
export const TERMS_VERSION = '2026-06'

// Versión vigente de la Política de Cancelaciones y Reembolsos (cláusula 6 de
// los Términos). La cláusula exige aplicar a cada reserva la política vigente
// "al momento de su confirmación", por lo que esta versión debe guardarse junto
// con la reserva cuando exista el flujo de booking/pago confirmado
// (p. ej. service_requests.cancellation_policy_version). Incrementá este valor
// (formato AAAA-MM) al publicar cambios sustanciales en la política.
export const CANCELLATION_POLICY_VERSION = '2026-06'
