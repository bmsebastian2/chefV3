// ============================================================================
// Cliente REST de PayPal (Orders API v2) — server-only.
//
// Espejo de lib/dlocalgo.ts, con una diferencia: PayPal no usa una API key en
// cada request, sino un access token OAuth2 de vida corta que hay que pedir y
// cachear. Todo lo demás es fetch pelado — sin SDK, sin dependencias nuevas.
//
// NUNCA importar esto desde un componente cliente: expondría el secret.
// ============================================================================

// ── Switch sandbox/live ──────────────────────────────────────────────────────
// ÚNICO lugar donde se decide el entorno. Nada de URLs hardcodeadas en las rutas.
//
// Fail-safe A PROPÓSITO: solo el valor exacto 'live' activa producción. Si la env
// falta, está mal escrita o quedó vacía, caemos a SANDBOX. La dirección importa:
// un deploy mal configurado que cobra de mentira es un bug visible y sin daño;
// uno que cobra de verdad sin querer es plata real de un cliente real.
// (Ojo: es la política inversa a DLOCALGO_BASE_URL, que sí default-ea a prod.)
const IS_LIVE = process.env.PAYPAL_ENV === 'live';

const BASE_URL = IS_LIVE
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export const paypalEnv = IS_LIVE ? 'live' : 'sandbox';

function credentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_CLIENT_SECRET;
  // Validación en tiempo de llamada, no de import: si tirara al cargar el módulo,
  // rompería el build/la ruta entera en vez de fallar solo el pago.
  if (!clientId || !secret) {
    throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET no configurados');
  }
  return { clientId, secret };
}

// ── Access token ─────────────────────────────────────────────────────────────
// Cache en memoria del proceso. En serverless cada instancia tiene la suya y se
// pierde en el cold start: es correcto igual, solo significa un request extra de
// vez en cuando. NO cachear en base: el token es un secreto de vida corta.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Margen de 60s: un token que vence "en 3 segundos" es un 401 esperándonos.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const { clientId, secret } = credentials();
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('🛑 [paypal] fallo al obtener access token', res.status, text.slice(0, 300));
    throw new Error(`PayPal auth failed (${res.status})`);
  }

  const data = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    console.error('🛑 [paypal] respuesta de token sin access_token', text.slice(0, 200));
    throw new Error('PayPal auth: respuesta sin access_token');
  }

  cachedToken = {
    value:     data.access_token,
    // expires_in viene en segundos (~9h). Fallback conservador si no viniera.
    expiresAt: Date.now() + (data.expires_in ?? 300) * 1000,
  };

  return cachedToken.value;
}

// ── Request genérico ─────────────────────────────────────────────────────────

export type PaypalResult<T = Record<string, unknown>> = {
  ok:     boolean;
  status: number;
  data:   T;
};

type RequestOptions = {
  /**
   * Valor del header `PayPal-Request-Id`. Es la idempotencia DEL LADO DE PAYPAL:
   * si el mismo id llega dos veces, PayPal devuelve el resultado original en vez
   * de ejecutar la operación otra vez.
   *
   * Es obligatorio en la captura: sin esto, un reintento (timeout de red, doble
   * click, retry de Vercel) puede cobrarle dos veces al cliente. Nuestros guards
   * de base son la otra red, pero esta ataja el caso antes de que el cobro exista.
   */
  requestId?: string;
};

/**
 * A diferencia de `dlocalgoRequest`, devolvemos el status HTTP además del body.
 * No es cosmético: PayPal responde 422 con códigos de issue que cambian la
 * decisión del caller (ORDER_ALREADY_CAPTURED → ya está cobrado, tratar como
 * éxito; INSTRUMENT_DECLINED → mostrarle otro medio al usuario). Tragarse el
 * status obligaría a adivinar parseando mensajes.
 */
export async function paypalRequest<T = Record<string, unknown>>(
  path: string,
  /**
   * Objeto (se serializa) o string JSON YA armado. El string existe para un caso
   * puntual: la verificación de firma del webhook, donde el evento tiene que
   * viajar con los BYTES EXACTOS que recibimos. Parsear y re-serializar puede
   * cambiar orden de claves o formato de números y tumbar la verificación.
   */
  body?: object | string,
  options: RequestOptions = {},
): Promise<PaypalResult<T>> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  };
  if (options.requestId) headers['PayPal-Request-Id'] = options.requestId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method:  'POST',
    headers,
    // La captura se llama sin body; PayPal exige igual Content-Type JSON.
    body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('🛑 [paypal] error', path, res.status, text.slice(0, 500));
  }

  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) as T };
  } catch {
    return {
      ok:     false,
      status: res.status,
      data:   { error: `Non-JSON response (${res.status})`, raw: text.slice(0, 200) } as T,
    };
  }
}

export async function paypalGet<T = Record<string, unknown>>(
  path: string,
): Promise<PaypalResult<T>> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method:  'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('🛑 [paypal] error GET', path, res.status, text.slice(0, 500));
  }

  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) as T };
  } catch {
    return {
      ok:     false,
      status: res.status,
      data:   { error: `Non-JSON response (${res.status})`, raw: text.slice(0, 200) } as T,
    };
  }
}

/**
 * Link de aprobación dentro de la respuesta de creación de orden. PayPal lo
 * devuelve en un array `links` con rel 'payer-action' (checkout con
 * experience_context) o 'approve' según el shape del request — buscamos los dos
 * porque cuál viene depende de la configuración de la orden.
 */
export function findApprovalUrl(links: unknown): string | null {
  if (!Array.isArray(links)) return null;

  const hrefFor = (rel: string): string | null => {
    const match = links.find(
      (l) => typeof l === 'object' && l !== null && (l as { rel?: unknown }).rel === rel,
    ) as { href?: unknown } | undefined;
    return typeof match?.href === 'string' ? match.href : null;
  };

  // Orden de preferencia, no "el primero que aparezca": con experience_context
  // PayPal devuelve 'payer-action', y algunas respuestas traen ADEMÁS 'approve'
  // apuntando al checkout viejo.
  return hrefFor('payer-action') ?? hrefFor('approve');
}
