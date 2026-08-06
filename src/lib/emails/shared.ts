// Piezas compartidas entre notify-chefs.ts y client-emails.ts. Primera:
// el footer — próximas partes del rediseño (header, cuerpo) se suman acá
// para que "aplicar a todos los emails" sea automático, no copiar/pegar.
// Sin 'use server': no exporta server actions, son helpers de HTML puro.

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

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
      }
    </style>`

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
