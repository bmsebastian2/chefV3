/**
 * Contenido culinario curado por departamento — la "Ruta Culinaria de Nicaragua"
 * del mapa de la home. Indexado por el mismo `departmentId` que el geojson y
 * `CityEntry.departmentId`, así que enchufa directo sin tocar el matching de
 * ciudades existente.
 *
 * Departamentos sin entrada acá degradan a un estado "próximamente" en el mapa
 * — nunca rompen la interacción existente de click → filtrar chefs.
 */
export type DepartmentCulinary = {
  dish: string
  description: string
  image: string
  imageAlt: string
}

export const CULINARY: Partial<Record<string, DepartmentCulinary>> = {
  masaya: {
    dish: 'Vigorón',
    description:
      'Yuca sancochada, chicharrón crocante y una ensalada de repollo curtido en vinagre, todo servido sobre una hoja de plátano. Nació en Masaya y ahí se sigue comiendo igual que hace un siglo: parado en la calle, un domingo, con las manos. Es el plato que más rápido delata a un nicaragüense fuera del país — solo con nombrarlo.',
    image: '/maps/culinary/vigoron.jpg',
    imageAlt: 'Vigorón servido sobre hoja de plátano, con yuca, chicharrón y ensalada curtida',
  },
  granada: {
    dish: 'Sopa de Mondongo',
    description:
      'Un caldo espeso de panza de res que se cocina a fuego lento por horas, con verduras, achiote y un toque de picante que despierta. Es el plato de domingo por excelencia en Granada, el que se comparte en familia después de misa, alrededor de la mesa grande. Contundente, terroso, y con la reputación de curar hasta la resaca más brava.',
    image: '/maps/culinary/mondongo.jpg',
    imageAlt: 'Sopa de mondongo humeante en un tazón blanco, con hierbabuena y arroz al lado',
  },
  managua: {
    dish: 'Nacatamal',
    description:
      'Masa de maíz rellena de cerdo, arroz, papa y encurtido, envuelta en hoja de plátano y cocida durante horas hasta que todo se funde en un solo sabor. Es el ritual dominical de miles de familias capitalinas: se pide la noche anterior, se recoge temprano, y se come todavía humeante con pan y café. Managua, como capital que reúne gente de todo el país, lo adoptó como su plato de identidad compartida.',
    image: '/maps/culinary/nacatamal.jpg',
    imageAlt: 'Nacatamal recién desenvuelto de su hoja de plátano, sostenido con las manos',
  },
  leon: {
    dish: 'Quesillo',
    description:
      'Una tortilla tibia envuelve una lonja de queso fresco derritiéndose, bañada en crema agria y cebolla curtida, todo atado en una bolsita para comer de pie. Es comida de carretera y de plaza, la excusa perfecta para parar en cualquier pueblo del departamento. Sencillo en apariencia, pero cuando el queso está en su punto, es pura nostalgia líquida.',
    image: '/maps/culinary/quesillo.jpg',
    imageAlt: 'Quesillo recién envuelto en una tortilla, sostenido con la mano junto al comal',
  },
}
