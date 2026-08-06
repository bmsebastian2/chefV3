// Piezas compartidas entre notify-chefs.ts y client-emails.ts. Primera:
// el footer — próximas partes del rediseño (header, cuerpo) se suman acá
// para que "aplicar a todos los emails" sea automático, no copiar/pegar.
// Sin 'use server': no exporta server actions, son helpers de HTML puro.

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

// Dorado — mismo tono que GOLD en notify-chefs.ts / client-emails.ts. Se
// repite acá porque este módulo no importa de esos archivos (evita ciclos).
const GOLD = '#B8935B'

// Íconos de línea dorados (recoloreados a partir de los originales en negro,
// mismo tratamiento que chef-hat-gold.png). Los de la carpeta "Iconos email
// medio/" conviven con chef-hat-gold.png en la raíz de /public.
export type DetailIcon = 'reloj' | 'cubiertos' | 'hoja' | 'party' | 'chef-hat' | 'nota' | 'cloche'

const ICON_PATHS: Record<DetailIcon, string> = {
  reloj:      'Iconos email medio/icons8-reloj-50-gold.png',
  cubiertos:  'Iconos email medio/icons8-cubiertos-50-gold.png',
  hoja:       'Iconos email medio/icons8-hoja-50-gold.png',
  party:      'Iconos email medio/party-gold.png',
  nota:       'Iconos email medio/icons8-nota-50-gold.png',
  cloche:     'Iconos email medio/cloche-gold.png',
  'chef-hat': 'chef-hat-gold.png',
}

function iconUrl(icon: DetailIcon): string {
  return `${SITE_URL}/${encodeURI(ICON_PATHS[icon])}`
}

type FooterVariant = 'chef' | 'client'

const FOOTER_TEXT: Record<FooterVariant, string> = {
  chef: 'Recibiste este email porque tu perfil está activo en GetChef.<br>\n              Podés ajustar tus preferencias de solicitud desde tu dashboard.',
  client: 'Recibiste este email porque realizaste una solicitud en GetChef.',
}

// Divisor dorado con el gorro de chef centrado + texto legal. El ícono va
// como <img> con URL absoluta pública (chef-hat-gold.png en /public) —
// nada de SVG inline ni rutas relativas, así se ve igual en Gmail/Outlook.
export function emailFooter(variant: FooterVariant): string {
  return `
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="border-top:1px solid rgba(184,147,91,0.35);"></td>
              <td width="34" style="text-align:center;padding:0 6px;">
                <img src="${SITE_URL}/chef-hat-gold.png" width="20" height="20" style="display:block;margin:0 auto;" alt="">
              </td>
              <td style="border-top:1px solid rgba(184,147,91,0.35);"></td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 20px;">
            <p style="margin:0;font-size:12px;color:#A1A1AA;text-align:center;">
              ${FOOTER_TEXT[variant]}
            </p>
          </td>
        </tr>`
}

// Media query para apilar el CTA en mobile — clientes que la soportan
// (Apple Mail, Gmail app, Outlook mobile, Yahoo) apilan ícono/texto/botón;
// los que no (Outlook desktop) se quedan con las 3 columnas fijas, que
// igual entran en los 496px útiles del card. Se inyecta una sola vez en el
// <head> de cada shell().
export const EMAIL_RESPONSIVE_STYLES = `
    <style>
      @media only screen and (max-width:480px) {
        .ctaBandTable, .ctaBandTable tr, .ctaIconCell, .ctaTextCell, .ctaButtonCell {
          display:block !important; width:100% !important;
        }
        .ctaIconCell { margin:0 0 10px; padding-right:0 !important; }
        .ctaTextCell { padding-right:0 !important; }
        .ctaButtonCell { margin-top:14px; text-align:center !important; }
        .ctaButtonCell table { width:100% !important; }
        .ctaButtonCell a { display:block !important; width:100% !important; box-sizing:border-box; text-align:center !important; }

        .detailRow, .detailCell { display:block !important; width:100% !important; }
        .detailCell { border-left:none !important; border-top:1px solid rgba(184,147,91,0.18) !important; }
        .detailRow:first-child .detailCell:first-child { border-top:none !important; }
      }
    </style>`

// Icono real (DetailIcon) o, mientras no exista un asset que le quede bien
// a un campo (ej. "Días"/"Total de comidas" del servicio semanal), un
// emoji de fallback — mismo criterio que usábamos antes de tener el set.
type DetailIconOrEmoji = DetailIcon | (string & {})

function isKnownIcon(icon: string): icon is DetailIcon {
  return icon in ICON_PATHS
}

// Grilla "Detalles del servicio" — eyebrow con ícono de cloche + filas de a
// 2 columnas (ícono | label | valor), divisor vertical entre columnas y
// horizontal entre filas. En mobile pasa a 1 columna (ver EMAIL_RESPONSIVE_STYLES).
// Nulls: se muestra "Sin especificar" en vez de ocultar la fila — cada campo
// que se pasa siempre aparece.
export function detailBlock(rows: [DetailIconOrEmoji, string, string | null | undefined][]): string {
  if (!rows.length) return ''

  const iconHtml = (icon: DetailIconOrEmoji): string =>
    isKnownIcon(icon)
      ? `<img src="${iconUrl(icon)}" width="16" height="16" style="display:block;margin-top:2px;" alt="">`
      : `<span style="font-size:15px;">${icon}</span>`

  const cellHtml = (icon: DetailIconOrEmoji, label: string, value: string | null | undefined, isFirstRow: boolean, isRightCol: boolean): string => {
    const borderTop = isFirstRow ? '' : 'border-top:1px solid rgba(184,147,91,0.18);'
    const borderLeft = isRightCol ? 'border-left:1px solid rgba(184,147,91,0.22);' : ''
    return `
    <td width="50%" class="detailCell" style="padding:12px 20px;vertical-align:top;${borderTop}${borderLeft}">
      <table cellpadding="0" cellspacing="0"><tr>
        <td width="22" style="padding-right:10px;vertical-align:top;">
          ${iconHtml(icon)}
        </td>
        <td>
          <p style="margin:0;font-size:11px;color:#71717A;">${label}</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#18181B;">${value ?? 'Sin especificar'}</p>
        </td>
      </tr></table>
    </td>`
  }

  const pairedRows: string[] = []
  for (let i = 0; i < rows.length; i += 2) {
    const isFirstRow = i === 0
    const [iconA, labelA, valueA] = rows[i]
    const b = rows[i + 1]
    pairedRows.push(`
      <tr class="detailRow">
        ${cellHtml(iconA, labelA, valueA, isFirstRow, false)}
        ${b ? cellHtml(b[0], b[1], b[2], isFirstRow, true) : `<td class="detailCell" width="50%" style="${isFirstRow ? '' : 'border-top:1px solid rgba(184,147,91,0.18);'}"></td>`}
      </tr>`)
  }

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F1;border:1px solid #E4DCC8;border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <tr><td colspan="2" style="padding:16px 20px 8px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td width="20" style="padding-right:8px;vertical-align:middle;">
            <img src="${iconUrl('cloche')}" width="16" height="16" style="display:block;" alt="">
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:11px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:0.06em;">Detalles del servicio</span>
          </td>
        </tr></table>
      </td></tr>
      ${pairedRows.join('')}
    </table>`
}

// Banda de CTA — ícono | título + subtítulo | botón, encima del footer.
// Botón "a prueba de balas": fondo en el <td> (bgcolor + background-color)
// además del <a>, que es la técnica que sobrevive a Outlook (motor Word).
export function ctaBand(opts: {
  title: string
  subtitle: string
  buttonLabel: string
  href: string
}): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EAD8;border-radius:14px;margin-top:8px;">
      <tr>
        <td style="padding:16px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0" class="ctaBandTable"><tr>
            <td class="ctaIconCell" width="52" valign="middle" style="padding-right:14px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td width="36" height="36" align="center" valign="middle" bgcolor="#F0FDF4" style="background-color:#F0FDF4;border-radius:50%;">
                  <img src="${SITE_URL}/chef-hat-gold.png" width="18" height="18" style="display:block;" alt="">
                </td>
              </tr></table>
            </td>
            <td class="ctaTextCell" valign="middle" style="padding-right:14px;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#18181B;line-height:1.4;">${opts.title}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#71717A;">${opts.subtitle}</p>
            </td>
            <td class="ctaButtonCell" valign="middle" align="right">
              <table cellpadding="0" cellspacing="0"><tr>
                <td align="center" bgcolor="#166534" style="background-color:#166534;border-radius:8px;">
                  <a href="${opts.href}" target="_blank" style="display:inline-block;padding:13px 22px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;white-space:nowrap;">${opts.buttonLabel} →</a>
                </td>
              </tr></table>
            </td>
          </tr></table>
        </td>
      </tr>
    </table>`
}
