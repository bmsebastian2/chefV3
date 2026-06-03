Paso 2 — Crear el helper con la firma HMAC
dLocalGo usa autenticación HMAC-SHA256. Tenés que concatenar x-login + x-date + requestBody y hashear con tu secret key para generar la firma que va en el header Authorization. dLocal Docs
Crea lib/dlocalgo.ts:
tsimport crypto from 'crypto';

const API_KEY = process.env.DLOCALGO_API_KEY!;
const SECRET_KEY = process.env.DLOCALGO_SECRET_KEY!;
const BASE_URL = 'https://api.dlocalgo.com/v1'; // producción
// sandbox: 'https://api.sandbox.dlocalgo.com/v1'

function generateSignature(body: string, date: string): string {
  const data = API_KEY + date + body;
  return crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
}

export async function dlocalgoRequest(path: string, body: object) {
  const date = new Date().toISOString();
  const bodyStr = JSON.stringify(body);
  const signature = generateSignature(bodyStr, date);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Date': date,
      'X-Login': API_KEY,
      'X-Trans-Key': SECRET_KEY,
      'X-Version': '2.1',
      'Authorization': `V2-HMAC-SHA256, Signature: ${signature}`,
    },
    body: bodyStr,
  });

  return res.json();
}

Paso 3 — API Route: crear el pago
Crea app/api/dlocalgo/create-payment/route.ts:
tsimport { dlocalgoRequest } from '@/lib/dlocalgo';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { amount, currency = 'USD', description = 'Pago' } = await req.json();

  const result = await dlocalgoRequest('/payments', {
    amount,
    currency,
    country_code: 'UY', // o 'NI' para Nicaragua
    description,
    success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
    back_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
    notification_url: `${process.env.NEXT_PUBLIC_URL}/api/dlocalgo/webhook`,
    payer: {
      name: user?.user_metadata?.full_name ?? 'Cliente',
      email: user?.email,
    },
    metadata: {
      user_id: user?.id,
    },
  });

  if (!result.redirect_url) {
    return NextResponse.json({ error: 'Error creando pago' }, { status: 500 });
  }

  // Guardar pago pendiente en Supabase
  await supabase.from('payments').insert({
    user_id: user?.id,
    dlocalgo_payment_id: result.id,
    amount,
    currency,
    status: 'pending',
  });

  return NextResponse.json({ redirect_url: result.redirect_url });
}

Paso 4 — Frontend: redirigir al checkout
El flujo de dLocalGo es redirect — el usuario va a la página de pago de dLocalGo y vuelve a tu app. No hay botón embebido como PayPal.
tsx// components/CheckoutButton.tsx
'use client';

export function CheckoutButton({ amount }: { amount: number }) {
  async function handlePay() {
    const res = await fetch('/api/dlocalgo/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'USD' }),
    });
    const { redirect_url } = await res.json();
    if (redirect_url) {
      window.location.href = redirect_url; // redirige al checkout de dLocalGo
    }
  }

  return (
    <button onClick={handlePay}>
      Pagar con dLocalGo
    </button>
  );
}

Paso 5 — Webhook (notificaciones de pago)
Cuando el estado del pago cambia, dLocalGo hace un POST a tu notification_url con un payment_id en el body, que podés usar para consultar el estado del pago. Medium
Crea app/api/dlocalgo/webhook/route.ts:
tsimport { dlocalgoRequest } from '@/lib/dlocalgo';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();
  const { payment_id } = body;

  // Consultar el estado real del pago a la API
  const payment = await dlocalgoRequest(`/payments/${payment_id}`, {});

  const statusMap: Record<string, string> = {
    PAID: 'completed',
    REJECTED: 'failed',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
  };

  await supabase
    .from('payments')
    .update({ status: statusMap[payment.status] ?? payment.status })
    .eq('dlocalgo_payment_id', payment_id);

  return NextResponse.json({ received: true });
}

Paso 6 — Tabla en Supabase
sqlcreate table payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  dlocalgo_payment_id text unique,
  amount numeric,
  currency text default 'USD',
  status text default 'pending', -- pending, completed, failed, expired
  created_at timestamptz default now()
);

alter table payments enable row level security;

create policy "Users ven sus pagos"
  on payments for select
  using (auth.uid() = user_id);

Paso 7 — Probar en sandbox
Cambiá la URL base en lib/dlocalgo.ts a sandbox:
tsconst BASE_URL = 'https://api.sandbox.dlocalgo.com/v1';
Y usá las credenciales de tu cuenta sandbox de dLocalGo (las encontrás en el mismo panel de Integrations, con un toggle Sandbox/Production).

Resumen del flujo
Usuario hace clic → /api/dlocalgo/create-payment
                  → dLocalGo devuelve redirect_url
                  → Usuario paga en página de dLocalGo
                  → dLocalGo notifica tu webhook con payment_id
                  → Verificás estado → guardás en Supabase
                  → Usuario llega a tu success_url