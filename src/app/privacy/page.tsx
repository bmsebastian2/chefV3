import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header />
      <section className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-3xl">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground mb-4">
            Política de Privacidad
          </h1>
          <p className="text-sm text-muted-foreground mb-12">Última actualización: abril 2025</p>

          <div className="prose prose-zinc max-w-none space-y-10 font-sans text-foreground">
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">1. Responsable del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                GetChef.com es el responsable del tratamiento de los datos personales que nos facilites a través de la plataforma.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">2. Datos que recopilamos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Recopilamos los datos que nos proporcionas al registrarte (nombre, apellidos, email, teléfono, país) así como datos de uso de la plataforma para mejorar nuestros servicios.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">3. Finalidad del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                Utilizamos tus datos para gestionar tu cuenta, facilitar la conexión entre chefs y clientes, procesar reservas y enviarte comunicaciones relacionadas con el servicio.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">4. Base legal</h2>
              <p className="text-muted-foreground leading-relaxed">
                El tratamiento de tus datos se basa en la ejecución del contrato de servicio que aceptas al registrarte, y en tu consentimiento explícito para comunicaciones opcionales.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">5. Conservación de datos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conservamos tus datos mientras mantengas una cuenta activa. Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">6. Tus derechos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tienes derecho a acceder, rectificar, suprimir, limitar el tratamiento y oponerte al uso de tus datos. Para ejercer tus derechos escríbenos a <a href="mailto:privacidad@getchef.com" className="text-accent hover:underline">privacidad@getchef.com</a>.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">7. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Utilizamos cookies técnicas necesarias para el funcionamiento de la plataforma y cookies de análisis para mejorar la experiencia de usuario.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold mb-3">8. Contacto</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para cualquier consulta sobre privacidad contacta con nosotros en <a href="mailto:privacidad@getchef.com" className="text-accent hover:underline">privacidad@getchef.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
