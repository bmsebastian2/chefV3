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
            2. Qué cookies y almacenamiento usamos
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            En GetChef usamos <strong className="text-zinc-700">únicamente cookies técnicas
            esenciales y almacenamiento local del navegador</strong>. No utilizamos cookies de
            analítica, publicidad ni seguimiento de terceros (como Google Analytics o Meta Pixel).
          </p>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Finalidad</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-muted-foreground align-top">
                <tr>
                  <td className="px-4 py-3 text-zinc-700">
                    <code className="font-mono text-xs">sb-*-auth-token</code>
                    <span className="block text-xs text-muted-foreground mt-1">
                      (puede aparecer fragmentada como <code className="font-mono">.0</code>,{" "}
                      <code className="font-mono">.1</code>)
                    </span>
                  </td>
                  <td className="px-4 py-3 leading-relaxed">
                    Mantiene tu sesión iniciada de forma segura. Autenticación gestionada por
                    Supabase.
                  </td>
                  <td className="px-4 py-3">Cookie esencial</td>
                  <td className="px-4 py-3 leading-relaxed">
                    Durante la sesión y su renovación automática
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-zinc-700">
                    Preferencias locales{" "}
                    <code className="font-mono text-xs">localStorage</code>
                  </td>
                  <td className="px-4 py-3 leading-relaxed">
                    Recuerda ajustes básicos en tu dispositivo, como el estado del aviso de
                    instalación de la aplicación. Esta información se guarda únicamente en tu
                    dispositivo y no se comparte con terceros.
                  </td>
                  <td className="px-4 py-3">Almacenamiento local</td>
                  <td className="px-4 py-3 leading-relaxed">
                    Hasta que la elimines o desinstales la aplicación
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground leading-relaxed mt-4">
            <strong className="text-zinc-700">Pagos.</strong> Al realizar un pago sos redirigido al
            sitio de nuestro procesador de pagos (dLocalGo), que puede utilizar sus propias cookies
            en su dominio conforme a su propia política de privacidad y cookies, sobre las cuales
            GetChef no tiene control.
          </p>
        </section>

        <section>
          <h2 id="consentimiento" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            3. ¿Necesito dar mi consentimiento?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Al tratarse exclusivamente de cookies técnicas estrictamente necesarias para prestar
            el servicio que solicitás (como mantener tu sesión iniciada), no se requiere tu
            consentimiento previo para su uso. Si en el futuro incorporamos cookies de analítica o
            de terceros, actualizaremos esta política y solicitaremos tu consentimiento cuando
            corresponda.
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
          <p className="text-muted-foreground leading-relaxed mb-4">
            Podemos actualizar esta Política de Cookies para reflejar cambios en el sitio o en la
            normativa. Publicaremos cualquier modificación en esta misma página, actualizando la
            fecha indicada al inicio.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Si tenés dudas, escribinos a{" "}
            <a href="mailto:getchef.com@gmail.com" className="text-accent hover:underline">
              getchef.com@gmail.com
            </a>
            .
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Esta Política de Cookies complementa nuestra{" "}
            <a href="/legal/privacidad" className="text-accent hover:underline">
              Política de Privacidad
            </a>{" "}
            y nuestros{" "}
            <a href="/legal/terminos" className="text-accent hover:underline">
              Términos y Condiciones
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
