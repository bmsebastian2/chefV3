import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cookies · GetChef",
  description:
    "Qué cookies usa GetChef. Solo utilizamos cookies técnicas esenciales para la sesión y el funcionamiento del sitio.",
};

const LAST_UPDATED = "junio de 2026";

export default function CookiesPage() {
  return (
    <>
      <header className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 mb-3">
          Política de Cookies
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {LAST_UPDATED}
        </p>
      </header>

      <div className="space-y-12">
        <section>
          <h2 id="que-son" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            1. Qué son las cookies
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Las cookies son pequeños archivos de texto que un sitio web guarda en tu dispositivo
            cuando lo visitás. Sirven para que el sitio funcione correctamente y para recordar
            información entre páginas, como tu sesión iniciada.
          </p>
        </section>

        <section>
          <h2 id="cookies-que-usamos" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            2. Qué cookies usamos
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            En GetChef usamos <strong className="text-zinc-700">únicamente cookies técnicas
            esenciales</strong>. No utilizamos cookies de analítica, publicidad ni seguimiento de
            terceros (como Google Analytics o Meta Pixel).
          </p>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cookie</th>
                  <th className="px-4 py-3 font-semibold">Finalidad</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-muted-foreground">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700 whitespace-nowrap">
                    sb-…-auth-token
                  </td>
                  <td className="px-4 py-3 leading-relaxed">
                    Mantiene tu sesión iniciada de forma segura (autenticación gestionada por
                    Supabase).
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">Esencial</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700 whitespace-nowrap">
                    Preferencias locales
                  </td>
                  <td className="px-4 py-3 leading-relaxed">
                    Recuerda ajustes básicos del navegador (p. ej. el estado de instalación de la
                    app). Se guardan en tu dispositivo, no se comparten.
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">Esencial</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            [REVISAR: confirmar los nombres y la duración exactos de las cookies de Supabase
            según la configuración del proyecto.]
          </p>
        </section>

        <section>
          <h2 id="consentimiento" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            3. ¿Necesito dar mi consentimiento?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Al tratarse exclusivamente de cookies técnicas estrictamente necesarias para prestar
            el servicio que solicitás (como mantener tu sesión), no se requiere tu consentimiento
            previo para su uso. Si en el futuro incorporamos cookies de analítica o terceros,
            actualizaremos esta política y solicitaremos tu consentimiento cuando corresponda
            [REVISAR: requisitos de consentimiento bajo la normativa nicaragüense].
          </p>
        </section>

        <section>
          <h2 id="desactivar" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            4. Cómo desactivar las cookies
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Podés configurar tu navegador para bloquear o eliminar las cookies desde sus ajustes
            de privacidad. Tené en cuenta que, al ser cookies esenciales, si las bloqueás es
            probable que no puedas iniciar sesión ni usar las funciones que requieren cuenta.
            Cada navegador (Chrome, Safari, Firefox, Edge) ofrece su propia guía para gestionar
            cookies en su sección de ayuda.
          </p>
        </section>

        <section>
          <h2 id="cambios" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            5. Cambios y contacto
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Podemos actualizar esta Política de Cookies para reflejar cambios en el sitio o en la
            normativa. Publicaremos cualquier modificación en esta misma página. Si tenés dudas,
            escribinos a{" "}
            <a href="mailto:getchef.com@gmail.com" className="text-accent hover:underline">
              getchef.com@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
