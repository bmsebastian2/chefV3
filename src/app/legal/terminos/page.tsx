import type { Metadata } from "next";
import { TERMS_VERSION } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Términos y Condiciones · GetChef",
  description:
    "Términos y condiciones de uso de GetChef, el marketplace que conecta clientes con chefs a domicilio.",
};

const LAST_UPDATED = "junio de 2026";

export default function TerminosPage() {
  return (
    <>
      <header className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 mb-3">
          Términos y Condiciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: {LAST_UPDATED} · Versión {TERMS_VERSION}
        </p>
      </header>

      <div className="space-y-12">
        <section>
          <h2 id="objeto" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            1. Objeto del servicio
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Los presentes Términos y Condiciones regulan el acceso y uso de GetChef
            (en adelante, &laquo;la Plataforma&raquo;), accesible a través de{" "}
            <span className="text-zinc-700">getcheftoday.com</span>, un marketplace que
            conecta a personas que desean contratar un servicio gastronómico a domicilio
            (&laquo;Clientes&raquo;) con chefs profesionales independientes
            (&laquo;Chefs&raquo;).
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            La Plataforma es operada por{" "}
            <strong className="text-zinc-700">Horacio José Bollo</strong> (en adelante,
            &laquo;el Operador&raquo;), con domicilio en{" "}
            <span className="text-zinc-700">Montevideo, Uruguay</span> y correo electrónico
            de contacto{" "}
            <a
              href="mailto:getchef.com@gmail.com"
              className="text-accent hover:underline"
            >
              getchef.com@gmail.com
            </a>
            . Los servicios ofrecidos a través de la Plataforma están dirigidos
            exclusivamente a usuarios ubicados en la República de Nicaragua.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            GetChef actúa exclusivamente como intermediario tecnológico entre Clientes y
            Chefs. El Operador no presta servicios gastronómicos, no elabora ni manipula
            alimentos, no emplea a los Chefs y no es parte del contrato de servicio que se
            celebra directamente entre el Cliente y el Chef. Los Chefs son profesionales
            independientes, únicos responsables de la calidad, seguridad e higiene de los
            servicios que prestan, así como del cumplimiento de las normas sanitarias,
            fiscales y legales que les resulten aplicables.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            No existe entre el Operador y los Chefs relación laboral, societaria, de agencia
            ni de representación de ningún tipo. El uso de la Plataforma por parte de un Chef
            no genera derecho laboral alguno frente al Operador.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Al registrarte o utilizar la Plataforma declarás ser mayor de dieciocho (18)
            años, contar con plena capacidad legal para contratar y aceptar quedar vinculado
            por estos Términos y Condiciones.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            El Operador se reserva el derecho de modificar en cualquier momento los presentes
            Términos y Condiciones. Las modificaciones serán publicadas en la Plataforma y,
            cuando resulten sustanciales, notificadas a los usuarios registrados por correo
            electrónico u otro medio razonable. El uso continuado de la Plataforma con
            posterioridad a la publicación de las modificaciones implica su aceptación.
          </p>
        </section>

        <section>
          <h2 id="intermediario" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            2. Rol de la Plataforma como intermediario
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            GetChef actúa exclusivamente como <strong className="text-zinc-700">intermediario
            tecnológico</strong> que facilita el contacto, la comunicación y la contratación
            entre Clientes y Chefs. La Plataforma no presta directamente servicios de cocina
            ni catering, no elabora ni manipula alimentos, no es empleadora de los Chefs y no
            forma parte del contrato de servicio que se celebra directamente entre el Cliente
            y el Chef.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Los Chefs operan como profesionales independientes y son los únicos responsables
            de la prestación del servicio, su calidad, la seguridad e higiene alimentaria, el
            cumplimiento de las normas sanitarias aplicables y la obtención de las licencias,
            permisos o registros que la legislación les exija.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            El Operador podrá solicitar a los Chefs documentación, información de perfil u
            otros requisitos como condición para utilizar la Plataforma. Dicha revisión tiene
            carácter exclusivamente formal y no constituye una certificación, garantía ni aval
            sobre la idoneidad, calidad o seguridad de los servicios de los Chefs. El Cliente
            reconoce que la selección y contratación de un Chef se realiza bajo su propio
            criterio y responsabilidad.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            El procesamiento de pagos a través de la Plataforma se realiza mediante proveedores
            de pago externos. La intervención del Operador en el cobro y la liquidación de pagos
            no modifica su carácter de intermediario ni lo convierte en parte del contrato de
            servicio.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Cualquier reclamo derivado de la prestación del servicio gastronómico deberá
            dirigirse directamente al Chef correspondiente, sin perjuicio de que el Operador
            pueda, a su sola discreción y sin obligación de hacerlo, facilitar la comunicación
            entre las partes para la resolución de la controversia.
          </p>
        </section>

        <section>
          <h2 id="registro" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            3. Registro de usuarios
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Para acceder a determinadas funcionalidades de la Plataforma deberás crear una
            cuenta proporcionando información veraz, completa y actualizada, y mantenerla
            actualizada durante toda la vigencia de tu cuenta. El Operador podrá suspender o
            cancelar cuentas creadas con información falsa, inexacta o de terceros.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Para registrarte debés ser mayor de dieciocho (18) años conforme a la legislación
            de la República de Nicaragua y contar con plena capacidad legal para contratar.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Cada usuario podrá mantener una única cuenta, que es personal e intransferible. No
            está permitido ceder, vender o permitir el uso de la cuenta por terceros.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Sos responsable de mantener la confidencialidad de tus credenciales de acceso y de
            toda actividad realizada bajo tu cuenta. Deberás notificar de inmediato al Operador
            ante cualquier uso no autorizado de tu cuenta o violación de seguridad de la que
            tengas conocimiento. El Operador no será responsable por los daños derivados del
            incumplimiento de esta obligación.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Los Chefs estarán sujetos a un proceso adicional de verificación documental y de
            completitud de perfil antes de poder ofrecer sus servicios en la Plataforma. Esta
            verificación tiene carácter formal, conforme a lo establecido en la cláusula 2, y
            no constituye garantía sobre la idoneidad o calidad de sus servicios.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            El Operador se reserva el derecho de rechazar solicitudes de registro y de suspender
            o cancelar cuentas, con o sin previo aviso, en caso de incumplimiento de estos
            Términos y Condiciones, uso fraudulento o indebido de la Plataforma, o cuando
            existan motivos razonables para proteger a otros usuarios o a la Plataforma.
          </p>
        </section>

        <section>
          <h2 id="responsabilidades" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            4. Responsabilidades de cada parte
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Del Cliente.</strong> El Cliente se compromete a:
            (a) facilitar información precisa, completa y veraz sobre su solicitud, incluyendo
            fecha, ubicación, número de comensales y, especialmente, alergias, intolerancias o
            restricciones alimentarias de todos los comensales; (b) disponer de un espacio
            adecuado, seguro e higiénico para la prestación del servicio, con instalaciones,
            suministros y equipamiento básico en condiciones de funcionamiento; (c) permitir el
            acceso del Chef al domicilio en el horario acordado; y (d) abonar el precio acordado
            a través de la Plataforma. El Cliente reconoce que el Chef prepara los alimentos en
            base a la información declarada en la solicitud, y asume la responsabilidad por las
            consecuencias derivadas de información incompleta, inexacta u omitida, en particular
            respecto de alergias y restricciones alimentarias.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Del Chef.</strong> El Chef se compromete a: (a)
            contar con todas las habilitaciones, permisos, registros y certificados sanitarios
            exigidos por la autoridad competente de la República de Nicaragua para el ejercicio
            de su actividad, manteniéndolos vigentes; (b) prestar el servicio en las condiciones,
            fecha y horario acordados con el Cliente; (c) respetar en todo momento las normas de
            higiene y seguridad alimentaria aplicables; (d) cumplir con sus obligaciones
            fiscales, tributarias y de seguridad social como profesional independiente; y (e)
            tratar con respeto el domicilio y los bienes del Cliente, respondiendo por los daños
            que cause en la prestación del servicio.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Prohibición de elusión.</strong> Clientes y Chefs
            se comprometen a gestionar y abonar a través de la Plataforma todos los servicios
            cuyo contacto se haya originado en ella. La concertación de servicios por fuera de la
            Plataforma con el fin de evitar las comisiones aplicables constituye un incumplimiento
            grave de estos Términos y podrá dar lugar a la suspensión o cancelación de las cuentas
            involucradas.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-zinc-700">Del Operador.</strong> El Operador se compromete a
            realizar esfuerzos razonables para mantener la Plataforma operativa y en condiciones
            adecuadas de funcionamiento, sin garantizar disponibilidad ininterrumpida ni ausencia
            de errores. El Operador podrá suspender temporalmente la Plataforma por mantenimiento,
            actualizaciones o causas de fuerza mayor, sin que ello genere derecho a indemnización.
          </p>
        </section>

        <section>
          <h2 id="pagos" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            5. Pagos y comisiones
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Los pagos se procesan a través de proveedores de pago externos, actualmente{" "}
            <strong className="text-zinc-700">dLocalGo</strong>. GetChef no almacena los datos
            completos de tarjetas de pago; estos son gestionados directamente por el procesador
            de pagos conforme a sus propios términos y estándares de seguridad.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            El Cliente abonará el precio total del servicio a través de la Plataforma. El Chef
            otorga al Operador un mandato de cobro, en virtud del cual el Operador recibe los
            pagos de los Clientes en nombre y por cuenta del Chef. El pago realizado por el
            Cliente a través de la Plataforma tiene efecto liberatorio respecto del Chef.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            El Operador retendrá, sobre cada operación, una comisión por el uso de la Plataforma
            conforme a los porcentajes informados al Chef en la Plataforma al momento de la
            contratación. El saldo resultante será liquidado al Chef en los plazos y por los
            medios indicados en la Plataforma, una vez prestado el servicio y descontadas las
            comisiones, contracargos o ajustes que correspondan.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Los precios se expresan en [córdobas nicaragüenses (NIO) / dólares estadounidenses
            (USD)]. El procesamiento del cobro podrá realizarse en moneda local al tipo de cambio
            aplicado por el procesador de pagos.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Cada Chef es exclusivamente responsable de determinar, declarar y abonar los
            impuestos que graven su actividad y los servicios que presta, incluyendo el Impuesto
            al Valor Agregado cuando corresponda según su régimen fiscal, así como de emitir los
            comprobantes fiscales exigidos por la legislación nicaragüense. El Operador no asume
            obligación tributaria alguna por cuenta de los Chefs.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            En caso de contracargos, reversos o disputas de pago iniciadas por el Cliente ante el
            procesador o el emisor de su tarjeta, el Operador podrá descontar los importes
            correspondientes de liquidaciones futuras al Chef involucrado, sin perjuicio de la
            investigación del caso.
          </p>
        </section>

        <section>
          <h2 id="cancelaciones" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            6. Cancelaciones y reembolsos
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Cancelación por el Cliente.</strong> El Cliente
            podrá cancelar una reserva confirmada con los siguientes efectos: (a) con más de
            siete (7) días de antelación a la fecha del servicio, recibirá el reembolso del 100%
            del importe abonado; (b) con una antelación de entre siete (7) días y setenta y dos
            (72) horas, recibirá el reembolso del 50% del importe abonado; (c) con menos de
            setenta y dos (72) horas de antelación, no corresponderá reembolso, en atención a los
            costos en que el Chef ya ha incurrido.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Inasistencia del Cliente.</strong> Si el Chef se
            presenta en el domicilio en la fecha y horario acordados y no puede prestar el
            servicio por causas imputables al Cliente (ausencia, imposibilidad de acceso,
            condiciones del espacio que impidan el servicio), la reserva se considerará cancelada
            sin derecho a reembolso.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Cancelación por el Chef.</strong> Si el Chef cancela
            una reserva confirmada o no se presenta a prestar el servicio, el Cliente recibirá el
            reembolso del 100% del importe abonado. La cancelación reiterada o injustificada por
            parte de un Chef podrá dar lugar a la suspensión o cancelación de su cuenta, así como
            a penalidades sobre futuras liquidaciones según lo informado en la Plataforma.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Servicios recurrentes.</strong> En los planes de
            comidas semanales o servicios de múltiples fechas, las condiciones anteriores se
            aplican a cada fecha de servicio en forma individual, salvo que la Plataforma indique
            condiciones específicas al momento de la contratación.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Fuerza mayor.</strong> Las cancelaciones motivadas
            por caso fortuito o fuerza mayor debidamente acreditados (desastres naturales,
            emergencias sanitarias, hechos graves imprevisibles) serán evaluadas por el Operador
            caso por caso, pudiendo otorgarse el reembolso total o un crédito para futuros
            servicios.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Procesamiento de reembolsos.</strong> Los reembolsos
            se efectuarán por el mismo medio de pago utilizado y a través del procesador de pagos,
            dentro de los plazos que dicho procesador y el emisor del medio de pago requieran. El
            Operador no responde por demoras imputables al procesador o a la entidad emisora.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-zinc-700">Modificaciones de la política.</strong> Las
            condiciones de cancelación aplicables a cada reserva serán las vigentes al momento de
            su confirmación.
          </p>
        </section>

        <section>
          <h2 id="limitacion" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            7. Limitación de responsabilidad
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            En la medida máxima permitida por la legislación aplicable:
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">7.1. Servicios de los Chefs.</strong> El Operador
            no será responsable por los daños o perjuicios de cualquier naturaleza derivados de
            la prestación de los servicios gastronómicos por parte de los Chefs, incluyendo, sin
            limitación, daños derivados de la calidad, higiene o seguridad de los alimentos,
            reacciones alérgicas o intolerancias, intoxicaciones alimentarias, incumplimientos,
            demoras, inasistencias, o daños causados en el domicilio del Cliente. Dichos servicios
            son prestados exclusivamente por los Chefs, conforme a las cláusulas 1 y 2.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">7.2. Verificación.</strong> La revisión documental
            y de perfil que el Operador realiza sobre los Chefs tiene carácter exclusivamente
            formal y no constituye garantía, certificación ni declaración sobre la idoneidad,
            capacidad, honestidad o calidad de los servicios de ningún Chef ni Cliente. Cada
            usuario evalúa y decide bajo su propio criterio con quién contratar.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">7.3. Conflictos entre usuarios.</strong> El Operador
            no será responsable por los conflictos, reclamos o controversias que surjan entre
            Clientes y Chefs, sin perjuicio de su facultad de facilitar voluntariamente la
            comunicación entre las partes.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">7.4. Disponibilidad y terceros.</strong> El Operador
            no será responsable por interrupciones, errores o fallas de la Plataforma, ni por los
            actos u omisiones de proveedores externos, incluyendo procesadores de pago, servicios
            de hosting o comunicaciones.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">7.5. Daños indirectos y tope.</strong> El Operador
            no responderá en ningún caso por daños indirectos, lucro cesante, pérdida de
            oportunidades o daños punitivos. Cuando una responsabilidad del Operador resulte
            judicialmente declarada y no pueda excluirse legalmente, esta quedará limitada al
            importe total de las comisiones efectivamente percibidas por el Operador en la
            operación que dio origen al reclamo.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">7.6. Indemnidad.</strong> El usuario (Cliente o
            Chef) se obliga a mantener indemne al Operador frente a cualquier reclamo de terceros
            derivado de: (a) el incumplimiento de estos Términos por parte del usuario; (b) la
            información falsa o inexacta proporcionada por el usuario; (c) en el caso de los
            Chefs, la prestación de sus servicios, incluyendo reclamos sanitarios, laborales o
            fiscales.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-zinc-700">7.7. Derechos del consumidor.</strong> Nada de lo
            dispuesto en esta cláusula limita derechos que la legislación de protección al
            consumidor de la República de Nicaragua reconozca con carácter irrenunciable. Si
            alguna disposición de esta cláusula fuera declarada inválida o inaplicable, las
            restantes conservarán plena vigencia.
          </p>
        </section>

        <section>
          <h2 id="legislacion" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            8. Legislación aplicable, jurisdicción y contacto
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Estos Términos y Condiciones se rigen por las leyes de la República de Nicaragua.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Controversias con Clientes.</strong> Cualquier
            controversia entre un Cliente y el Operador se someterá a los tribunales competentes
            de la ciudad de Managua, República de Nicaragua, salvo que la normativa de protección
            al consumidor establezca con carácter imperativo una jurisdicción distinta, en cuyo
            caso esta prevalecerá.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Controversias con Chefs.</strong> Las controversias
            entre un Chef y el Operador derivadas de su relación profesional con la Plataforma
            serán objeto, en primer término, de negociación directa de buena fe durante un plazo
            de treinta (30) días. De no alcanzarse acuerdo, se someterán a los tribunales
            competentes de la ciudad de Managua, sin perjuicio de que las partes puedan acordar
            someter la controversia a arbitraje.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">Notificaciones y contacto.</strong> Para cualquier
            consulta, reclamo o notificación relacionada con estos Términos, podés escribir a{" "}
            <a
              href="mailto:getchef.com@gmail.com"
              className="text-accent hover:underline"
            >
              getchef.com@gmail.com
            </a>
            . Las notificaciones del Operador a los usuarios se considerarán válidamente
            efectuadas al correo electrónico registrado en la cuenta del usuario.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            El responsable de la Plataforma es Horacio José Bollo, con domicilio en{" "}
            <span className="text-zinc-700">Montevideo, Uruguay</span>.
          </p>
        </section>

        <section>
          <h2 id="conducta" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            9. Conducta prohibida y contenido de usuarios
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">9.1. Conducta prohibida.</strong> Queda prohibido a
            todos los usuarios: (a) utilizar la Plataforma con fines ilícitos, fraudulentos o
            contrarios a estos Términos; (b) suplantar la identidad de terceros o proporcionar
            información falsa; (c) acosar, amenazar, discriminar o agredir a otros usuarios; (d)
            publicar contenido ilícito, difamatorio, obsceno, violento o que infrinja derechos de
            terceros; (e) interferir con el funcionamiento técnico de la Plataforma, intentar
            acceder sin autorización a sus sistemas, cuentas de terceros o datos, o utilizar
            mecanismos automatizados de extracción de información; (f) utilizar la Plataforma para
            promocionar servicios ajenos a su objeto o concertar operaciones por fuera de ella
            conforme a la cláusula 4.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">9.2. Contenido de usuarios.</strong> Los usuarios
            podrán publicar contenido en la Plataforma, incluyendo fotografías, descripciones de
            menús, información de perfil y reseñas (en adelante, &laquo;Contenido de
            Usuario&raquo;). Cada usuario declara ser titular de los derechos sobre el Contenido
            de Usuario que publica o contar con autorización suficiente, y es el único responsable
            por dicho contenido.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">9.3. Licencia.</strong> Al publicar Contenido de
            Usuario, el usuario otorga al Operador una licencia gratuita, no exclusiva, mundial y
            por el plazo máximo legal para usar, reproducir, adaptar, comunicar públicamente y
            exhibir dicho contenido en la Plataforma y en las comunicaciones y materiales
            promocionales de GetChef. Esta licencia subsiste respecto del contenido ya utilizado
            aun después de la baja de la cuenta.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">9.4. Reseñas.</strong> Las reseñas y calificaciones
            deben basarse en experiencias reales y expresarse de forma respetuosa. Queda prohibido
            publicar reseñas falsas, propias encubiertas, o a cambio de contraprestación. El
            Operador no verifica la veracidad de las reseñas y no es responsable por su contenido.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-zinc-700">9.5. Moderación.</strong> El Operador podrá, a su
            sola discreción y sin obligación de hacerlo, revisar, editar la visibilidad o remover
            Contenido de Usuario que infrinja estos Términos o la ley, así como suspender o
            cancelar las cuentas involucradas, sin que ello genere derecho a indemnización. La
            facultad de moderación no implica obligación de supervisión previa del contenido
            publicado.
          </p>
        </section>

        <section>
          <h2 id="propiedad-intelectual" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            10. Propiedad intelectual
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">10.1. Titularidad.</strong> La Plataforma, incluyendo
            su software, código fuente, diseño, interfaces, bases de datos, textos, logotipos, y la
            marca &laquo;GetChef&raquo; y el dominio{" "}
            <span className="text-zinc-700">getcheftoday.com</span>, son de titularidad exclusiva
            del Operador o de sus licenciantes, y están protegidos por la legislación de propiedad
            intelectual e industrial aplicable.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">10.2. Licencia de uso.</strong> El Operador otorga a
            los usuarios una licencia limitada, revocable, no exclusiva e intransferible para
            acceder y utilizar la Plataforma conforme a su finalidad y a estos Términos. Esta
            licencia no implica cesión alguna de derechos de propiedad intelectual.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">10.3. Restricciones.</strong> Queda prohibido
            reproducir, copiar, modificar, distribuir, descompilar, realizar ingeniería inversa o
            crear obras derivadas de la Plataforma o de cualquiera de sus elementos, así como
            utilizar la marca, el logotipo o el nombre comercial de GetChef sin autorización previa
            y por escrito del Operador.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">10.4. Contenido de los Chefs.</strong> Las recetas,
            menús y creaciones gastronómicas de los Chefs son de su titularidad, sin perjuicio de
            la licencia otorgada conforme a la cláusula 9.3 sobre el contenido publicado en la
            Plataforma.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-zinc-700">10.5. Infracciones.</strong> Si considerás que algún
            contenido de la Plataforma infringe tus derechos de propiedad intelectual, podés
            notificarlo al correo indicado en la cláusula 8, acompañando la identificación del
            contenido y la acreditación de tu titularidad.
          </p>
        </section>
      </div>
    </>
  );
}
