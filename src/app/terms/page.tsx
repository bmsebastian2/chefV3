import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header />
      <section className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-3xl">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground mb-4">
            Términos y Condiciones
          </h1>
          <p className="text-sm text-muted-foreground mb-12">Última actualización: abril 2025</p>

          <div className="prose prose-zinc max-w-none space-y-10 font-sans text-foreground">
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">1. Aceptación de los términos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Al acceder y utilizar GetChef.com aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguno de ellos, te pedimos que no uses la plataforma.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">2. Descripción del servicio</h2>
              <p className="text-muted-foreground leading-relaxed">
                GetChef.com es una plataforma de intermediación que conecta a chefs privados con clientes que desean contratar servicios culinarios personalizados. No somos empleadores de los chefs ni prestamos directamente ningún servicio de catering.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">3. Registro y cuenta</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para acceder a ciertas funcionalidades deberás crear una cuenta. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades que ocurran bajo tu cuenta.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">4. Responsabilidad de los chefs</h2>
              <p className="text-muted-foreground leading-relaxed">
                Los chefs que operan en la plataforma son profesionales independientes. GetChef.com no garantiza la calidad, seguridad o legalidad de los servicios ofrecidos por cada chef, aunque tomamos medidas razonables de verificación.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">5. Pagos y cancelaciones</h2>
              <p className="text-muted-foreground leading-relaxed">
                Las condiciones de pago y cancelación se especificarán en cada reserva. GetChef.com puede actuar como intermediario en el procesamiento de pagos según lo indique cada servicio contratado.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">6. Modificaciones</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Notificaremos los cambios relevantes a través de la plataforma o por correo electrónico.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">7. Contacto</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para cualquier consulta sobre estos términos puedes contactarnos en <a href="mailto:hola@getchef.com" className="text-accent hover:underline">hola@getchef.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
