# Integración dLocalGo — GetChef

> ⚠️ Este documento describe la **implementación real** del código. Una versión
> anterior documentaba un esquema HMAC-SHA256 que **no se usa**: dLocalGo se
> autentica con un token Bearer, no con firma HMAC (eso es la API de *dLocal*,
> otro producto).

## Autenticación

dLocalGo usa un header Bearer con `apiKey:secretKey` — ver [`src/lib/dlocalgo.ts`](src/lib/dlocalgo.ts):

```ts
Authorization: `Bearer ${DLOCALGO_API_KEY}:${DLOCALGO_SECRET_KEY}`
```

No hay firma por-campo ni HMAC. Las credenciales viajan en el header sobre TLS.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DLOCALGO_API_KEY` | Token público de la cuenta dLocalGo |
| `DLOCALGO_SECRET_KEY` | Secret de la cuenta — **nunca exponer al browser** |
| `DLOCALGO_BASE_URL` | **Único switch prod/sandbox** (ver abajo) |
| `NEXT_PUBLIC_APP_URL` | Base para `success_url` / `back_url` / `notification_url`. **Debe ser el dominio de prod en Vercel** |

> `DLOCALGO_SANDBOX` **no se lee en ningún lado** — variable muerta. Para cambiar
> de entorno usá `DLOCALGO_BASE_URL`. Conviene eliminarla del `.env` y no
> agregarla en Vercel para no confundir.

### Switch prod / sandbox

```
prod    → DLOCALGO_BASE_URL=https://api.dlocalgo.com/v1     (cobro real)
sandbox → DLOCALGO_BASE_URL=https://api-sbx.dlocalgo.com/v1
```

## Flujo

```
Cliente confirma → POST /api/dlocalgo/create-payment
                 → dLocalGo devuelve redirect_url
                 → Cliente paga en la página de dLocalGo
                 → dLocalGo hace POST a notification_url con { payment_id }
                 → webhook re-consulta el estado real a la API y actualiza Supabase
                 → Cliente vuelve a success_url
```

### 1. Crear el pago — [`create-payment/route.ts`](src/app/api/dlocalgo/create-payment/route.ts)

- Verifica que el usuario esté autenticado y sea dueño del `service_request`.
- Valida que `amount` sea un número finito > 0 **antes** de enviarlo (evita el bug
  histórico de `"USD-"` con monto vacío).
- Envía `amount`, `currency: 'USD'`, `country_code: 'UY'`, las 3 URLs y `metadata`.
- `notification_url` se manda **por pago** (no hace falta registrarla en el panel).
- Inserta una fila `pending` en `payments` con el `dlocalgo_payment_id`.

> ⚠️ **Monto de prueba activo:** el cobro está fijado en `2 USD` (marcado con
> `TODO_PROD`). Antes del cobro real hay que volver a `realAmount` **y**
> recalcular el total en el servidor desde `proposal.price_per_person × guests`
> (no confiar en el `amount` que manda el cliente).

### 2. Webhook — [`webhook/route.ts`](src/app/api/dlocalgo/webhook/route.ts)

- El webhook **no está firmado**. La seguridad viene de **re-consultar** el pago a
  la API con nuestras credenciales (`dlocalgoGetPayment`): no se confía en el body.
- Si la verificación falla, devuelve 5xx para que dLocalGo reintente (no pisa el
  registro).
- Mapea estados de dLocalGo → internos:

  | dLocalGo | interno |
  |---|---|
  | `PAID` | `completed` (fondos retenidos en escrow) |
  | `PENDING` | `pending` |
  | `REJECTED` | `failed` |
  | `EXPIRED` | `expired` |
  | `CANCELLED` | `cancelled` |

- En `PAID` marca además `proposals.status = 'accepted'`.
- **No** toca `service_requests`: el dinero queda retenido por la empresa hasta que
  el chef completa el servicio y el cliente da el OK (liberación manual posterior).

## Tabla `payments`

```
id, user_id, dlocalgo_payment_id (unique), proposal_id, request_id,
amount, currency (default 'USD'), status (pending|completed|failed|expired|cancelled),
created_at
```
