import type { Metadata } from "next";

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
          Última actualización: {LAST_UPDATED}
        </p>
      </header>

      <div className="space-y-12">
        <section>
          <h2 id="objeto" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            1. Objeto del servicio
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Los presentes Términos y Condiciones regulan el acceso y uso de GetChef
            (en adelante, &laquo;la Plataforma&raquo;), accesible a través de{" "}
            <span className="text-zinc-700">getcheftoday.com</span>, un marketplace que
            conecta a personas que desean contratar un servicio gastronómico a domicilio
            (&laquo;Clientes&raquo;) con chefs profesionales independientes
            (&laquo;Chefs&raquo;). Al registrarte o utilizar la Plataforma aceptás quedar
            vinculado por estos términos.
          </p>
        </section>

        <section>
          <h2 id="intermediario" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            2. Rol de la plataforma como intermediario
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            GetChef actúa exclusivamente como <strong className="text-zinc-700">intermediario
            tecnológico</strong> que facilita el contacto y la contratación entre Clientes y
            Chefs. La Plataforma no presta directamente servicios de cocina ni catering, no es
            empleadora de los Chefs y no forma parte del contrato de servicio que se celebra
            entre Cliente y Chef. Los Chefs operan como profesionales independientes y son los
            únicos responsables de la prestación, calidad y seguridad alimentaria de sus
            servicios. [REVISAR: confirmar con asesoría legal la naturaleza jurídica exacta de
            la intermediación y la ausencia de relación laboral.]
          </p>
        </section>

        <section>
          <h2 id="registro" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            3. Registro de usuarios
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Para acceder a determinadas funcionalidades deberás crear una cuenta proporcionando
            información veraz, completa y actualizada. Sos responsable de mantener la
            confidencialidad de tus credenciales y de toda actividad realizada bajo tu cuenta.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Para registrarte debés ser mayor de edad según la legislación de Nicaragua
            [REVISAR: edad mínima legal aplicable]. Los Chefs podrán estar sujetos a un proceso
            adicional de verificación antes de poder ofrecer sus servicios en la Plataforma.
          </p>
        </section>

        <section>
          <h2 id="responsabilidades" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            4. Responsabilidades de cada parte
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">El Cliente</strong> se compromete a facilitar
            información precisa sobre su solicitud (fecha, número de comensales, alergias,
            ubicación), a disponer de un espacio adecuado para la prestación y a abonar el precio
            acordado.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-zinc-700">El Chef</strong> se compromete a contar con las
            habilitaciones, permisos sanitarios y conocimientos necesarios [REVISAR: requisitos
            sanitarios exigidos en Nicaragua], a prestar el servicio en las condiciones
            acordadas y a respetar las normas de higiene y seguridad alimentaria.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-zinc-700">GetChef</strong> se compromete a mantener la
            Plataforma operativa con esfuerzos razonables, sin garantizar disponibilidad
            ininterrumpida.
          </p>
        </section>

        <section>
          <h2 id="pagos" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            5. Pagos y comisiones
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Los pagos se procesan a través del proveedor de pagos{" "}
            <strong className="text-zinc-700">dLocalGo</strong>. GetChef podrá retener una
            comisión por el uso de la Plataforma sobre cada operación
            [REVISAR: porcentaje de comisión y a quién se aplica]. Los precios se expresan en
            [REVISAR: moneda — córdobas / dólares] e incluyen los impuestos que correspondan
            [REVISAR: tratamiento fiscal e IVA aplicable en Nicaragua]. GetChef no almacena los
            datos completos de tarjetas; estos son gestionados por el procesador de pagos.
          </p>
        </section>

        <section>
          <h2 id="cancelaciones" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            6. Cancelaciones y reembolsos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Las condiciones de cancelación, los plazos y los eventuales reembolsos se regirán
            por la política vigente al momento de la reserva [REVISAR: definir política de
            cancelación — plazos, penalidades y porcentajes de reembolso según antelación]. Las
            cancelaciones por causas de fuerza mayor se evaluarán caso por caso.
          </p>
        </section>

        <section>
          <h2 id="limitacion" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            7. Limitación de responsabilidad
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            En la medida permitida por la ley, GetChef no será responsable por daños derivados
            de la prestación del servicio por parte de los Chefs, ni por conflictos entre
            Clientes y Chefs, al actuar únicamente como intermediario. La Plataforma no garantiza
            la idoneidad de un Chef o Cliente determinado, aunque adopta medidas razonables de
            verificación. [REVISAR: alcance y límites de responsabilidad admisibles bajo la
            legislación nicaragüense de protección al consumidor.]
          </p>
        </section>

        <section>
          <h2 id="legislacion" className="scroll-mt-28 font-serif text-2xl font-semibold text-zinc-900 mb-3">
            8. Legislación aplicable y jurisdicción
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Estos Términos se rigen por las leyes de la República de Nicaragua. Cualquier
            controversia se someterá a los tribunales competentes de [REVISAR: ciudad / domicilio
            legal del responsable], salvo que la normativa de consumo disponga otra cosa. Para
            cualquier consulta podés escribir a{" "}
            <a
              href="mailto:getchef.com@gmail.com"
              className="text-accent hover:underline"
            >
              getchef.com@gmail.com
            </a>{" "}
            [REVISAR: correo de contacto legal y razón social del responsable].
          </p>
        </section>
      </div>
    </>
  );
}
