// Catálogo curado del constructor de menú (sección "El menú de esta noche").
//
// Por qué curado y no leído de la BD: la tabla `dishes` es de cada chef
// (chef_id NOT NULL, RLS "Chef reads own dishes"), no hay catálogo público ni
// dato de popularidad — nada vincula un plato con una solicitud, así que "los
// más pedidos" no existe todavía. Esta lista es la fuente mientras tanto.
//
// Contrato para la versión dinámica: `course` usa EL MISMO vocabulario que
// dishes.course en la BD, así migrar a datos reales es cambiar la fuente, no el
// modelo. La BD tiene además 'first_course'; el constructor no lo ofrece porque
// la carta se compone en tres tiempos (I · II · III), como la card ya promete.
//
// Los ids viajan en la URL del handoff al wizard (?menu=tartar,lomo,milhojas),
// así que son slugs cortos y estables: cambiarlos rompe los links compartidos.

export type Momento = 'lunch' | 'dinner'

export type Course = 'starter' | 'main' | 'dessert'

export interface Dish {
  id: string
  name: string
  /** Bajada del plato, como en una carta: guarnición y punto de cocción. */
  note: string
  course: Course
  /** En qué momentos se ofrece. Los platos largos o pesados son solo de cena. */
  momentos: Momento[]
  /** "Que elija el chef": no es un plato, es dejarle el tiempo al chef. */
  chefChoice?: boolean
}

const AMBOS: Momento[] = ['lunch', 'dinner']

// Los tres primeros platos son los que la card ya muestra de muestra: quien
// llega desde la home encuentra elegible exactamente lo que vio.
export const DISHES: Dish[] = [
  // ── Entradas ────────────────────────────────────────────────────────────────
  { id: 'tartar',    course: 'starter', momentos: AMBOS, name: 'Tartar de atún rojo',        note: 'palta, cítricos y aceite de oliva virgen' },
  { id: 'ceviche',   course: 'starter', momentos: AMBOS, name: 'Ceviche de corvina',         note: 'leche de tigre, camote y cancha' },
  { id: 'carpaccio', course: 'starter', momentos: AMBOS, name: 'Carpaccio de res',           note: 'rúcula, parmesano y aceite de trufa' },
  { id: 'quesillo',  course: 'starter', momentos: AMBOS, name: 'Quesillo de autor',          note: 'tortilla fina, cebolla encurtida y crema ácida' },
  { id: 'burrata',   course: 'starter', momentos: AMBOS, name: 'Burrata con tomates de estación', note: 'albahaca y aceite de oliva' },
  { id: 'chef-starter', course: 'starter', momentos: AMBOS, chefChoice: true, name: 'Que elija el chef', note: 'la entrada que mejor abra tu mesa' },

  // ── Principales ─────────────────────────────────────────────────────────────
  { id: 'lomo',      course: 'main', momentos: AMBOS,      name: 'Lomo madurado al carbón',  note: 'jugo de su cocción y papas confitadas' },
  { id: 'pargo',     course: 'main', momentos: AMBOS,      name: 'Pargo rojo a la parrilla', note: 'plátano maduro y salsa criolla' },
  { id: 'risotto',   course: 'main', momentos: AMBOS,      name: 'Risotto de hongos',        note: 'parmesano y aceite de hierbas' },
  { id: 'pollo',     course: 'main', momentos: ['lunch'],  name: 'Pollo de campo al limón',  note: 'papas al romero y verduras de estación' },
  { id: 'costillar', course: 'main', momentos: ['dinner'], name: 'Costillar braseado',       note: 'ocho horas, puré rústico y jugo reducido' },
  { id: 'chef-main', course: 'main', momentos: AMBOS, chefChoice: true, name: 'Que elija el chef', note: 'el principal según el mercado del día' },

  // ── Postres ─────────────────────────────────────────────────────────────────
  { id: 'milhojas',  course: 'dessert', momentos: AMBOS,      name: 'Milhojas de vainilla',  note: 'crema diplomática y frutos rojos' },
  { id: 'treslech',  course: 'dessert', momentos: AMBOS,      name: 'Tres leches de la casa', note: 'canela y merengue tostado' },
  { id: 'sorbete',   course: 'dessert', momentos: ['lunch'],  name: 'Sorbete de maracuyá',   note: 'albahaca y ralladura de lima' },
  { id: 'coulant',   course: 'dessert', momentos: ['dinner'], name: 'Coulant de cacao',      note: 'cacao nicaragüense y helado de vainilla' },
  { id: 'chef-dessert', course: 'dessert', momentos: AMBOS, chefChoice: true, name: 'Que elija el chef', note: 'el cierre que él tenga en mente' },
]

/** Orden de servicio: define los numerales de la carta (I · II · III). */
export const COURSE_ORDER: Course[] = ['starter', 'main', 'dessert']

export const COURSE_LABEL: Record<Course, string> = {
  starter: 'Entrada',
  main:    'Principal',
  dessert: 'Postre',
}

const BY_ID = new Map(DISHES.map((d) => [d.id, d]))

export const dishById = (id: string): Dish | undefined => BY_ID.get(id)

export const dishesFor = (course: Course, momento: Momento): Dish[] =>
  DISHES.filter((d) => d.course === course && d.momentos.includes(momento))
