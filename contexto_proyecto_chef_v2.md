# Contexto del proyecto — App de servicios de chef (v2)

## ¿Qué es la app?
Marketplace similar a Take a Chef (takeachef.com). Los **clientes** publican solicitudes de servicio de comida, los **chefs** se postulan con propuestas, chatean con el cliente, y el cliente elige y reserva.

## Stack técnico
- **Frontend:** Next.js 15 (App Router + Server Actions)
- **UI:** shadcn/ui + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth nativo con email (NO Clerk)
- **Pagos:** MercadoPago

---

## Schema de base de datos (estado actual)

### `public.users`
Sincronizada con `auth.users` via trigger.
```sql
id uuid (FK → auth.users)
email text UNIQUE
first_name text
first_surname text
second_surname text
phone text UNIQUE
role text CHECK ('client' | 'chef' | 'admin')
avatar_url text
como_nos_conociste text
created_at, updated_at
```

### `public.chef_profiles`
Solo para usuarios con role = 'chef'.
```sql
id uuid
user_id uuid UNIQUE (FK → users)
tagline, acerca_de_mi, para_mi_cocinar_es, aprendi_a_cocinar, mi_secreto_cocina text
sitio_web, instagram, facebook, youtube, linkedin text
city text, country text DEFAULT 'Uruguay'
experience_years integer DEFAULT 0
rating_avg numeric DEFAULT 0, total_services integer DEFAULT 0
is_active boolean DEFAULT false, is_pro boolean DEFAULT false
created_at, updated_at
```

### `public.client_profiles`
Para usuarios con role = 'client'.
```sql
id uuid
user_id uuid UNIQUE (FK → users)
preferred_cuisine text
preferred_language text DEFAULT 'es'
notes text
created_at, updated_at
```

### `public.service_requests`
Solicitudes de servicio hechas por clientes.
```sql
id uuid
user_id uuid (FK → users) -- puede ser NULL (usuario no registrado)
service_type text CHECK ('single' | 'multiple' | 'weekly')
occasion text CHECK ('birthday' | 'bachelor_party' | 'romantic_dinner' | 'gastronomic' | 'family_reunion' | 'friends_gathering' | 'corporate' | 'other')
event_date_start date NOT NULL, event_date_end date, event_time time
location text NOT NULL, city text
guests_adults, guests_teens, guests_kids integer DEFAULT 0
cuantas_personas integer -- columna calculada (suma de guests)
cuisine_type text CHECK ('local' | 'mediterranean' | 'french' | 'fusion' | 'italian' | 'seafood' | 'japanese' | 'chefs_special')
budget_min, budget_max numeric
descripcion_evento text
status text DEFAULT 'new' CHECK ('new' | 'in_process' | 'paid' | 'completed' | 'cancelled')
created_at, updated_at
```
> ⚠️ Nota: `user_id` es nullable — permite requests de usuarios no registrados.
> ⚠️ No tiene `proposal_type` (casual/gourmet/exclusive) — si se necesita, hay que agregarlo.

### `public.request_contact_info`
Datos de contacto para requests de usuarios no registrados.
```sql
id uuid
request_id uuid UNIQUE (FK → service_requests)
full_name, email text NOT NULL, phone text
created_at
```

### `public.request_dates`
Slots de comidas por día (para tipos 'multiple' y 'weekly', y también 'single' con 1 fila).
```sql
id uuid
request_id uuid (FK → service_requests)
fecha date NOT NULL
desayuno boolean DEFAULT false
almuerzo boolean DEFAULT false
cena boolean DEFAULT false
```

### `public.request_restrictions`
Restricciones alimentarias por solicitud.
```sql
id uuid
request_id uuid UNIQUE (FK → service_requests)
vegetariano, vegano, sin_gluten, sin_lactosa, sin_mariscos, sin_frutos_secos boolean DEFAULT false
alergias_adicionales text, notas_adicionales text
```

### `public.weekly_meal_details`
Datos extra solo para service_type = 'weekly'.
```sql
id uuid
request_id uuid UNIQUE (FK → service_requests)
codigo_postal text
comidas_por_semana integer, raciones_por_comida integer
frecuencia_cocina integer, preferencia_chef text
preferencias_culinarias text
```

### `public.proposals`
Propuestas que los chefs envían a una solicitud.
```sql
id uuid
request_id uuid (FK → service_requests)
chef_id uuid (FK → chef_profiles)
message text, menu_description text
price_total numeric, price_per_person numeric
status text DEFAULT 'pending' CHECK ('pending' | 'accepted' | 'rejected' | 'withdrawn')
created_at, updated_at
```

### `public.bookings`
Se crea cuando el cliente acepta una propuesta.
```sql
id uuid
proposal_id uuid (FK → proposals)
request_id uuid (FK → service_requests)
chef_id uuid (FK → chef_profiles)
total_amount numeric NOT NULL
payment_status text DEFAULT 'pending' CHECK ('pending' | 'paid' | 'refunded' | 'failed')
booking_status text DEFAULT 'confirmed' CHECK ('confirmed' | 'completed' | 'cancelled')
payment_ref text
confirmed_at, updated_at
```

### `public.messages`
Chat entre cliente y chef dentro de una solicitud.
```sql
id uuid
request_id uuid (FK → service_requests)
chef_id uuid (FK → chef_profiles)
sender_id uuid (FK → users)
sender_name text
content text NOT NULL
is_read boolean DEFAULT false
sent_at
```

### `public.reviews`
Reseñas del cliente sobre el chef, ligadas a un booking.
```sql
id uuid
booking_id uuid UNIQUE (FK → bookings)
chef_id uuid (FK → chef_profiles)
reviewer_name text NOT NULL
rating_chef, rating_food, rating_presentation, rating_cleanliness integer CHECK (1-5)
comment text
created_at
```

### `public.chef_menus`
Menús que el chef arma para mostrar en su perfil.
```sql
id uuid
chef_id uuid (FK → chef_profiles)
title text NOT NULL, description text
cuisine_type text CHECK ('local' | 'mediterranean' | 'french' | 'fusion' | 'italian' | 'seafood' | 'japanese' | 'chefs_special')
image_url text
is_active boolean DEFAULT true
created_at, updated_at
```

### `public.dishes`
Platos individuales del chef.
```sql
id uuid
chef_id uuid (FK → chef_profiles)
name text NOT NULL, description text
course text CHECK ('starter' | 'first_course' | 'main' | 'dessert' | 'drink' | 'other')
is_active boolean DEFAULT true
created_at, updated_at
```

### `public.menu_dishes`
Relación N:M entre menús y platos.
```sql
menu_id uuid (FK → chef_menus)
dish_id uuid (FK → dishes)
sort_order integer DEFAULT 0
PRIMARY KEY (menu_id, dish_id)
```

### `public.menu_pricing`
Precios del menú según cantidad de comensales.
```sql
id uuid
menu_id uuid (FK → chef_menus)
guests_min, guests_max integer NOT NULL
price_per_person numeric NOT NULL
```

### `public.chef_photos`
Fotos del chef (perfil y galería).
```sql
id uuid
chef_id uuid (FK → chef_profiles)
url text NOT NULL
type text DEFAULT 'gallery' CHECK ('profile' | 'gallery')
sort_order integer DEFAULT 0
created_at
```

### `public.chef_languages`
Idiomas que habla el chef.
```sql
id uuid
chef_id uuid (FK → chef_profiles)
language_code text NOT NULL
```

### `public.profile_completion`
Seguimiento del progreso del perfil del chef.
```sql
id uuid
chef_id uuid UNIQUE (FK → chef_profiles)
account_done, bio_done, location_done, profile_picture_done boolean DEFAULT false
gallery_done, menus_done, payments_done, request_prefs_done boolean DEFAULT false
updated_at
```

### `public.request_settings`
Preferencias del chef sobre qué tipos de solicitudes acepta.
```sql
id uuid
chef_id uuid UNIQUE (FK → chef_profiles)
accepts_single, accepts_multiple, accepts_weekly boolean DEFAULT true
min_guests integer DEFAULT 1, max_guests integer DEFAULT 50
min_budget numeric, advance_days integer DEFAULT 3
updated_at
```

---

## Funciones RPC importantes

```sql
-- Registrar chef (llamar desde frontend DESPUÉS de auth.signUp)
register_chef(p_user_id, p_email, p_full_name, p_phone, p_country, p_first_surname, p_second_surname)
  RETURNS UUID
  SECURITY DEFINER
  -- Valida unicidad del teléfono ANTES de insertar
  -- Bloque EXCEPTION limpia auth.users y public.users si falla

-- Verificar disponibilidad de teléfono (llamar ANTES del signUp en frontend)
check_phone_available(p_phone TEXT) RETURNS BOOLEAN
  SECURITY DEFINER
```

## Permisos aplicados
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_chef TO anon, authenticated;
```

---

## Decisiones clave
- `role` es `text` con CHECK ('client' | 'chef' | 'admin'), no boolean
- Trigger `on_auth_user_created` crea fila en `public.users` automáticamente
- Validación de teléfono en dos capas: frontend + bloque EXCEPTION en RPC
- `user_id` en `service_requests` es nullable (permite requests sin registro)
- `cuantas_personas` es columna calculada (suma de guests_adults + guests_teens + guests_kids)
- RLS habilitado en todas las tablas

---

## Estado del proyecto
- Schema de base de datos: ✅ completo
- Registro de chef: ✅ implementado
- Login (email + Google OAuth): ✅ implementado
- Perfil del chef (bio, fotos, menús, platos): en desarrollo
- Flujo de clientes (crear request): en desarrollo
- Propuestas, chat, bookings, pagos: pendiente
