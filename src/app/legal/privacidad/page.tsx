import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad · GetChef",
  description:
    "Cómo GetChef recopila, usa y protege tus datos personales como marketplace de chefs a domicilio.",
};

const LAST_UPDATED = "junio de 2026";

export default function PrivacidadPage() {
  return (
    <>
      <header className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 mb-3">
          Política de Privacidad
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {LAST_UPDATED}
        </p>
      </header>

      <div className="space-y-12">
        <section>
          <h2 id="responsable" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            1. Responsable del tratamiento
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            El responsable del tratamiento de los datos personales recogidos a través de
            GetChef (<span className="text-zinc-700">getcheftoday.com</span>) es
            [REVISAR: razón social del responsable], con domicilio en
            [REVISAR: domicilio legal] y correo de contacto{" "}
            <a href="mailto:getchef.com@gmail.com" className="text-accent hover:underline">
              getchef.com@gmail.com
            </a>
            . El tratamiento se realiza conforme a la legislación de protección de datos
            aplicable en Nicaragua [REVISAR: ley de protección de datos vigente y referencia
            normativa].
          </p>
        </section>

        <section>
          <h2 id="datos" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            2. Datos que recopilamos
          </h2>
          <ul className="space-y-3 text-muted-foreground leading-relaxed list-none">
            <li>
              <strong className="text-zinc-700">Datos de cuenta:</strong> nombre, correo
              electrónico, contraseña (almacenada de forma cifrada) y rol (cliente o chef).
            </li>
            <li>
              <strong className="text-zinc-700">Datos de las solicitudes:</strong> fecha del
              evento, número de comensales, ubicación, preferencias, alergias y demás detalles
              que aportes para recibir propuestas.
            </li>
            <li>
              <strong className="text-zinc-700">Datos de los chefs:</strong> perfil profesional,
              fotos, menús, platos y zona de cobertura.
            </li>
            <li>
              <strong className="text-zinc-700">Datos de pago:</strong> gestionados por nuestro
              procesador <strong className="text-zinc-700">dLocalGo</strong>. GetChef
              no almacena los datos completos de tu tarjeta.
            </li>
            <li>
              <strong className="text-zinc-700">Datos técnicos:</strong> información de sesión y
              cookies estrictamente necesarias para el funcionamiento (ver{" "}
              <a href="/legal/cookies" className="text-accent hover:underline">
                Política de Cookies
              </a>
              ).
            </li>
          </ul>
        </section>

        <section>
          <h2 id="finalidad" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            3. Finalidad del tratamiento
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Usamos tus datos para crear y gestionar tu cuenta, conectar Clientes con Chefs,
            procesar solicitudes y reservas, gestionar los pagos, enviarte notificaciones y
            comunicaciones relacionadas con el servicio, y mejorar y dar soporte a la Plataforma.
            No usamos tus datos para finalidades distintas de las descritas sin tu consentimiento
            [REVISAR: base legal de cada finalidad — consentimiento, ejecución de contrato,
            interés legítimo].
          </p>
        </section>

        <section>
          <h2 id="terceros" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            4. Terceros con los que compartimos datos
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Para operar la Plataforma compartimos datos con proveedores que actúan como
            encargados del tratamiento, únicamente con la finalidad de prestar sus servicios:
          </p>
          <ul className="space-y-3 text-muted-foreground leading-relaxed list-none">
            <li>
              <strong className="text-zinc-700">Supabase</strong> — alojamiento de la base de
              datos y autenticación de usuarios.
            </li>
            <li>
              <strong className="text-zinc-700">Resend</strong> — envío de correos transaccionales
              y notificaciones.
            </li>
            <li>
              <strong className="text-zinc-700">dLocalGo</strong> — procesamiento de pagos.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Además, los datos necesarios de tu solicitud se comparten con los Chefs que pueden
            atenderla, y los datos del Chef contratado con el Cliente, para hacer posible el
            servicio. Algunos de estos proveedores pueden tratar datos fuera de Nicaragua
            [REVISAR: transferencias internacionales de datos y garantías aplicables].
          </p>
        </section>

        <section>
          <h2 id="conservacion" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            5. Conservación y seguridad
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario
            para cumplir obligaciones legales [REVISAR: plazos de conservación concretos]. Aplicamos
            medidas técnicas y organizativas razonables para proteger tu información frente a
            accesos no autorizados, pérdida o alteración.
          </p>
        </section>

        <section>
          <h2 id="derechos" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            6. Tus derechos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Podés solicitar el acceso, la rectificación, la actualización o la eliminación de tus
            datos personales, así como oponerte o limitar su tratamiento, escribiéndonos a{" "}
            <a href="mailto:getchef.com@gmail.com" className="text-accent hover:underline">
              getchef.com@gmail.com
            </a>
            . También podés eliminar tu cuenta en cualquier momento. [REVISAR: derechos concretos
            reconocidos por la legislación nicaragüense y autoridad de control ante la que reclamar.]
          </p>
        </section>

        <section>
          <h2 id="contacto" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            7. Contacto
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Si tenés dudas sobre esta Política de Privacidad o sobre el tratamiento de tus datos,
            escribinos a{" "}
            <a href="mailto:getchef.com@gmail.com" className="text-accent hover:underline">
              getchef.com@gmail.com
            </a>
            . Podemos actualizar esta política; publicaremos cualquier cambio en esta misma página
            con su fecha de actualización.
          </p>
        </section>
      </div>
    </>
  );
}
