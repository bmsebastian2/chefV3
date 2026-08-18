// Redacción segura para interpolar la ocasión dentro de una oración ("para su X").
// El slug 'other' (ocasión "Otra"/"Otro" del wizard) no tiene texto real asociado
// — el label libre que el usuario pudo escribir en el asistente nunca se persiste
// (ver comentario en components/assistant/flow.ts) — así que cae a un fallback neutro.
export function occasionSentence(occasion: string | null | undefined, label: string): string {
  if (!occasion || occasion === 'other') return 'su evento';
  return `su ${label.toLowerCase()}`;
}
