# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Turbopack enabled)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint
```

No test suite is configured.

## Architecture

**GetChef** — marketplace connecting clients with private chefs. Next.js 16 App Router, React 19, Supabase (auth + database), TypeScript, Tailwind CSS 4.

### Directory layout

```
src/
├── app/                   # App Router pages + server actions
│   ├── auth/actions.ts    # login, logout, registerChef, changePassword
│   ├── auth/callback/     # OAuth + magic link handler
│   ├── dashboard/         # Chef dashboard (protected, role: chef)
│   ├── client-dashboard/  # Client dashboard (protected, role: client)
│   ├── wizard/            # Multi-step service request form
│   └── api/push/          # PWA push notification endpoints
├── components/
│   ├── dashboard/         # Chef dashboard UI components
│   ├── wizard/            # Wizard step components + types
│   └── ui/                # shadcn base components
├── lib/
│   ├── emails/            # Resend email helpers (notify-chefs, client-emails)
│   ├── pwa.ts             # PWA install detection utilities
│   └── resend.ts          # Resend singleton
├── utils/
│   ├── images.ts          # compressImage() — used before Supabase upload
│   └── supabase/
│       ├── server.ts      # Cookie-based SSR client
│       ├── clients.ts     # Browser anon client
│       └── admin.ts       # Service-role client (backend only)
└── middleware.ts           # Auth guard + role redirect + auth param capture
```

### Supabase client usage

Use the right client for the context:
- **Server components / server actions** → `src/utils/supabase/server.ts`
- **Client components** → `src/utils/supabase/clients.ts`
- **Admin operations / RPCs that bypass RLS** → `src/utils/supabase/admin.ts` (never expose to browser)

### Database mutations

Direct `.update()` / `.insert()` fail with RLS `42501` errors inside server actions. **Always use `supabase.rpc()` with SECURITY DEFINER functions** for any mutation that needs to run as the calling user's context. Direct reads in server components are fine.

### Server actions pattern

All mutations live in `actions.ts` files colocated with their route. They are `'use server'` functions that call Supabase RPCs, then `revalidatePath()`. Return `{ error?: string }` for error propagation to the client.

### Auth flow

1. `middleware.ts` runs on every non-static request
2. Protects `/dashboard` and `/client-dashboard` — redirects unauthenticated users to `/`
3. Redirects authenticated users away from `/` based on `users.role` (`chef` → `/dashboard`, `client` → `/client-dashboard`)
4. Intercepts stray `?code=` / `?token_hash=` params on any route and forwards them to `/auth/callback`
5. `/auth/callback/route.ts` exchanges the code for a session and calls `activate_pending_requests()` RPC once email is confirmed

### Wizard (service request flow)

Three service types, each with its own step sequence. The wizard is fully client-side (`'use client'`). On submit, `submitServiceRequest()` server action creates a `service_requests` row, then `notifyMatchingChefs()` sends emails via Resend. Unauthenticated users get a new account created during submission; the request activates after email confirmation via the auth callback.

### PWA

Service worker, install prompt, and push notifications are built-in. Push subscriptions are stored in `push_subscriptions` table. The `/api/push/send` route uses the service-role client to send notifications. VAPID keys are required env vars for this to work.

### Key environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # Never expose to browser
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY                  # Never expose to browser
```

### Next.js version note

This project uses **Next.js 16** with **React 19** and **Turbopack**. APIs may differ from training data. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`.
