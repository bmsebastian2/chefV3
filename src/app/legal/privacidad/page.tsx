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
          <p className="text-muted-foreground leading-relaxed mb-4">
            El responsable del tratamiento de los datos personales recogidos a través de
            GetChef (<span className="text-zinc-700">getcheftoday.com</span>) es{" "}
            <strong className="text-zinc-700">Horacio José Bollo </strong> (en adelante,
            &laquo;el Operador&raquo;), con domicilio en{" "}
            <span className="text-zinc-700">Montevideo, Uruguay</span> y correo de contacto{" "}
            <a href="mailto:getchef.com@gmail.com" className="text-accent hover:underline">
              getchef.com@gmail.com
            </a>
            .
          </p>
          <p className="text-muted-foreground leading-relaxed">
            El tratamiento de datos personales se realiza conforme a la Ley No. 787, Ley de
            Protección de Datos Personales de la República de Nicaragua, y su reglamentación.
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
              evento, número de comensales, ubicación del servicio, preferencias gastronómicas,
              restricciones alimentarias y demás detalles que aportes para recibir propuestas.
            </li>
            <li>
              <strong className="text-zinc-700">Datos sensibles (alergias e intolerancias):</strong>{" "}
              la información sobre alergias e intolerancias alimentarias constituye un dato
              relativo a la salud. La recopilamos únicamente con tu consentimiento expreso, con la
              exclusiva finalidad de que el Chef pueda preparar el servicio de forma segura. Podés
              optar por no proporcionarla, asumiendo en tal caso la responsabilidad prevista en los
              Términos y Condiciones.
            </li>
            <li>
              <strong className="text-zinc-700">Datos de los chefs:</strong> perfil profesional,
              fotografías, menús, platos, documentación de verificación y zona de cobertura.
            </li>
            <li>
              <strong className="text-zinc-700">Datos de ubicación:</strong> si lo autorizás a
              través de tu navegador o dispositivo, utilizamos tu ubicación aproximada para
              mostrarte chefs disponibles en tu zona. Podés revocar este permiso en cualquier
              momento desde la configuración de tu navegador o dispositivo.
            </li>
            <li>
              <strong className="text-zinc-700">Datos de pago:</strong> gestionados directamente
              por nuestro procesador de pagos <strong className="text-zinc-700">dLocalGo</strong>.
              GetChef no almacena los datos completos de tu tarjeta.
            </li>
            <li>
              <strong className="text-zinc-700">Datos técnicos:</strong> información de sesión y
              cookies estrictamente necesarias para el funcionamiento de la Plataforma (ver{" "}
              <a href="/legal/cookies" className="text-accent hover:underline">
                Política de Cookies
              </a>
              ).
            </li>
          </ul>
        </section>

        <section>
          <h2 id="finalidad" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            3. Finalidades y bases legales del tratamiento
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Tratamos tus datos para las siguientes finalidades, cada una con su base legal:
          </p>
          <ul className="space-y-3 text-muted-foreground leading-relaxed list-none">
            <li>
              <strong className="text-zinc-700">Ejecución del contrato:</strong> crear y gestionar
              tu cuenta, conectar Clientes con Chefs, procesar solicitudes y reservas, gestionar
              los pagos y liquidaciones, y enviarte notificaciones transaccionales relacionadas con
              el servicio (confirmaciones, recordatorios, cambios de estado).
            </li>
            <li>
              <strong className="text-zinc-700">Consentimiento expreso:</strong> tratamiento de
              datos sensibles (alergias e intolerancias) y uso de tu ubicación para la búsqueda de
              chefs cercanos.
            </li>
            <li>
              <strong className="text-zinc-700">Interés legítimo:</strong> mejora de la Plataforma,
              prevención del fraude, seguridad de los sistemas y atención de soporte.
            </li>
            <li>
              <strong className="text-zinc-700">Obligación legal:</strong> conservación de registros
              de transacciones y demás información exigida por la normativa fiscal y legal aplicable.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            No usamos tus datos para finalidades distintas de las descritas sin tu consentimiento
            previo. No vendemos tus datos personales a terceros.
          </p>
        </section>

        <section>
          <h2 id="terceros" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            4. Terceros con los que compartimos datos
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Para operar la Plataforma compartimos datos con proveedores que actúan como
            encargados del tratamiento, únicamente en la medida necesaria para prestar sus
            servicios:
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
            Además, los datos necesarios de tu solicitud (incluyendo, si las declaraste, alergias y
            restricciones alimentarias) se comparten con los Chefs habilitados para atenderla, y
            los datos del Chef contratado se comparten con el Cliente, exclusivamente para hacer
            posible la prestación del servicio.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            <strong className="text-zinc-700">Transferencias internacionales.</strong> Algunos de
            estos proveedores procesan y almacenan datos en servidores ubicados fuera de la
            República de Nicaragua, principalmente en los Estados Unidos. Al utilizar la Plataforma
            y aceptar esta Política, consentís dichas transferencias internacionales, que se
            realizan a proveedores que aplican medidas de seguridad y confidencialidad conforme a
            estándares internacionales.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            También podremos divulgar datos personales cuando una autoridad competente lo requiera
            conforme a la ley.
          </p>
        </section>

        <section>
          <h2 id="conservacion" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            5. Conservación y seguridad
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Conservamos tus datos mientras tu cuenta esté activa. Tras la eliminación de tu cuenta,
            eliminamos o anonimizamos tus datos personales, con excepción de aquellos que debamos
            conservar para cumplir obligaciones legales, fiscales o contables —en particular los
            registros de transacciones—, que se conservarán por un plazo de hasta cinco (5) años o
            el que exija la normativa aplicable.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Aplicamos medidas técnicas y organizativas razonables para proteger tu información
            frente a accesos no autorizados, pérdida o alteración, incluyendo cifrado de
            contraseñas, conexiones seguras (HTTPS) y controles de acceso a la base de datos según
            el rol de cada usuario.
          </p>
        </section>

        <section>
          <h2 id="menores" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            6. Menores de edad
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            La Plataforma está dirigida exclusivamente a personas mayores de dieciocho (18) años.
            No recopilamos deliberadamente datos personales de menores de edad. Si tomamos
            conocimiento de que un menor ha creado una cuenta, procederemos a eliminarla junto con
            sus datos.
          </p>
        </section>

        <section>
          <h2 id="derechos" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            7. Tus derechos
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Conforme a la Ley No. 787, tenés derecho a solicitar el{" "}
            <strong className="text-zinc-700">acceso</strong>, la{" "}
            <strong className="text-zinc-700">rectificación</strong>, la{" "}
            <strong className="text-zinc-700">actualización</strong>, la{" "}
            <strong className="text-zinc-700">cancelación (eliminación)</strong> de tus datos
            personales, así como a <strong className="text-zinc-700">oponerte</strong> a su
            tratamiento o solicitar su limitación.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Podés ejercer estos derechos escribiéndonos a{" "}
            <a href="mailto:getchef.com@gmail.com" className="text-accent hover:underline">
              getchef.com@gmail.com
            </a>
            , indicando tu nombre, el derecho que querés ejercer y los datos a los que refiere tu
            solicitud. También podés eliminar tu cuenta en cualquier momento desde la propia
            Plataforma.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Si considerás que el tratamiento de tus datos no se ajusta a la normativa, podés
            presentar un reclamo ante la Dirección de Protección de Datos Personales (DIPRODAP) de
            la República de Nicaragua, sin perjuicio de contactarnos primero para resolverlo
            directamente.
          </p>
        </section>

        <section>
          <h2 id="contacto" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            8. Cambios en esta política y contacto
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Podemos actualizar esta Política de Privacidad. Publicaremos cualquier cambio en esta
            misma página, actualizando la fecha indicada al inicio, y te notificaremos por correo
            electrónico los cambios sustanciales.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Si tenés dudas sobre esta Política o sobre el tratamiento de tus datos, escribinos a{" "}
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
