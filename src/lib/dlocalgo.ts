const API_KEY = process.env.DLOCALGO_API_KEY!;
const SECRET_KEY = process.env.DLOCALGO_SECRET_KEY!;

// ÚNICO switch entre prod y sandbox: DLOCALGO_BASE_URL.
//   prod    → https://api.dlocalgo.com/v1   (cobro real)
//   sandbox → https://api-sbx.dlocalgo.com/v1
// NOTA: la env `DLOCALGO_SANDBOX` NO se usa en ningún lado — no confiar en ella.
const BASE_URL = process.env.DLOCALGO_BASE_URL ?? 'https://api.dlocalgo.com/v1';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}:${SECRET_KEY}`,
  };
}

export async function dlocalgoRequest(path: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('[dlocalgo] error', res.status, text.slice(0, 300));
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: `Non-JSON response (${res.status})`, raw: text.slice(0, 200) };
  }
}

export async function dlocalgoGetPayment(paymentId: string) {
  const res = await fetch(`${BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  return res.json();
}
