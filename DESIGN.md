
# Rol
Actúa como un *Ingeniero Frontend Senior* de clase mundial. Tu objetivo es construir apps-web de alta fidelidad, cinematográficas y con una precisión "1:1 Pixel Perfect". Cada sitio que produzcas debe sentirse como un instrumento digital: cada desplazamiento (scroll) debe ser intencional y cada animación debe tener peso y profesionalismo.

Reglas Globales del Proyecto: El Concierge Culinario (GetChef)
1. Visión del Proyecto
El Concierge Culinario es un ecosistema digital de alta gama que conecta chefs de élite con clientes exigentes. La plataforma debe transmitir la sensación de un servicio premium y exclusivo—más cercano a un “Maître D’ Digital” que a una “App de Economía Colaborativa.”

2. Identidad Visual y Sistema de Diseño (GetChef)
Estética Principal: Editorial, sofisticada y de alto contraste.

Paleta de Colores:

Primario: Carbón/Cinc (#18181B) para profundidad y lujo.

Acento: Verde (#22c55e) para CTAs, resaltados y estados activos.

Fondos: Blanco Piedra/Cinc (#FAFAFA) para una sensación limpia, similar a una galería.

La fuente de verdad del acento es el token `--accent` en `src/app/globals.css`.
Consumilo siempre como token (`bg-accent`, `text-accent`, `shadow-accent/25`) y
nunca hardcodees el hex ni clases `green-*` para color de marca: eso es
precisamente lo que hoy impide moverlo.

Foreground del acento: usar `text-accent-foreground` (#18181B). Texto blanco
sobre el verde da ~2.1:1 de contraste y no cumple accesibilidad; el carbón da
7.8:1.

Tipografía:

Titulares: Newsreader (Serif) – Usada para narrativas, títulos de sección y expresión de marca.

Cuerpo/UI: Manrope (Sans-Serif) – Usada para navegación, etiquetas de formularios e información densa para asegurar legibilidad.

Forma y Estilo: Radio de borde de 4px (Round Four) para un aspecto moderno, nítido y sutilmente tradicional.

#### Decisión sobre el acento (2026-07-16)

Este documento decía Ocre Dorado (#E09F3E). Se evaluó migrar y **se descartó**.
No lo reabras sin leer esto primero:

- El verde no es un token suelto, es lo que la marca es hoy: el logo y el
  favicon (`src/app/icon.svg`) son `fill="#22c55e"`, y las plantillas de
  `src/lib/emails/` también.
- Hay ~200 referencias verdes hardcodeadas en ~45 archivos (125 clases
  `green-*`/`emerald-*` y 73 hexes) que el token no alcanza. Cambiar `--accent`
  solo no repinta la app: la deja mitad ocre y mitad verde. El CTA del Hero es
  el caso testigo — `bg-accent` con `hover:bg-green-600`, o sea que quedaría
  ocre en reposo y verde al pasar el mouse.
- El logo no se recolorea con buscar y reemplazar: sus trazos son blancos sobre
  verde y sobre ocre serían ilegibles. Requiere rediseño del mark.

Migrar al ocre es un rebrand por etapas, no un cambio de token.

#### Deuda viva: marca y estado comparten el verde

El verde significa hoy dos cosas a la vez: marca (CTAs, acentos) y éxito
(chips "pagado", "activo", "aprobado" en admin, payments y RequestCard). Un chip
de estado y un botón de marca son indistinguibles.

Si algún día se mueve la marca, el verde queda libre para significar solo
"éxito". Ese es el argumento fuerte a favor del cambio, más que el gusto. Al
tocar esto, separar marca de semántico es el primer paso, no el último.

3. Reglas Globales de UI
Navegación:

Barra Superior: Fija, con efecto translúcido de desenfoque (backdrop-blur-xl). Contiene enlaces principales de descubrimiento (Explorar, Chefs, Experiencias).

Barra Lateral (Interna/Paneles): Fija a la izquierda para tareas administrativas (Reservas, Mensajes, Configuración).

Imágenes:

Usar fotografía gastronómica profesional en alta resolución.

Enfocarse en texturas, ingredientes y el proceso del chef.

Retratos en blanco y negro de los chefs para mantener una estética unificada de “Atelier.”

Separación: Usar variaciones tonales (ej. Zinc-50 a Zinc-100) en lugar de bordes pesados para crear secciones.

Sombras: Mínimas. Usar sombras extremadamente suaves y de gran radio en las tarjetas para crear un efecto de “papel flotante.”

4. Flujos Funcionales Clave
Descubrimiento: El “Explorador de Chefs” debe priorizar filtros y propuestas de valor claras (ej. estrellas Michelin, años de experiencia).

Flujo de Solicitud: Formularios de múltiples pasos y baja fricción. Usar iconografía para que seleccionar ocasiones (Cumpleaños, Aniversario) sea intuitivo.

Gestión de Propuestas: Lógica de comparación lado a lado. Los clientes deben poder ver fácilmente la “Introducción del Chef,” “Destacados del Menú” y “Precio Todo Incluido.”

Comunicación: El chat interno es el puente. Debe soportar compartir imágenes en alta resolución (para vistas previas de menús) y botones de acción rápida (ej. “Crear Propuesta”).

5. Tono de Voz
Profesional y Refinado: Usar palabras como “A medida,” “Curado,” “Arte” y “Excelencia.”

Conciso: Respetar el tiempo del usuario; brindar información esencial de manera clara y sin saturación.

6. Guías de Maquetación
Ancho Máximo: 1920px para escritorio, con un contenedor central de 1280px.

Espacios en Blanco: Padding generoso (al menos 64px–96px entre secciones principales) para permitir que el contenido respire.

## Requisitos Técnicos

- *Stack:* Next.js · Tailwind · shadcn/ui ·  Supabase  · Vercel · GitHub, GSAP 3 (ScrollTrigger), .
- *Imágenes:* URLs reales de Unsplash que coincidan con el imageMood del preset.
- *Directiva Final:* No construyas un sitio web; construye un instrumento digital. Erradica los patrones genéricos de IA.