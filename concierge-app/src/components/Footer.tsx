import Link from "next/link";

export function Footer() {
  return (
    <footer id="contacto" className="bg-zinc-950 text-zinc-400 border-t border-zinc-800 py-16">
      <div className="container mx-auto px-6 max-w-[1280px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <Link href="/" className="font-serif text-3xl font-bold tracking-tight text-white mb-4 block">
              Reserva Epicúrea
            </Link>
            <p className="font-sans text-sm text-zinc-500 max-w-sm leading-relaxed">
              Conectando la élite culinaria con los paladares más exigentes. Su concierge digital personal.
            </p>
          </div>
          
          <div>
            <h4 className="font-serif text-white text-lg font-medium mb-4">Descubre</h4>
            <ul className="space-y-3 font-sans text-sm">
              <li><Link href="#experiencia" className="hover:text-accent transition-colors">La Experiencia</Link></li>
              <li><Link href="#chefs" className="hover:text-accent transition-colors">Nuestros Chefs</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Regala una Cena</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Para Empresas</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-white text-lg font-medium mb-4">La Empresa</h4>
            <ul className="space-y-3 font-sans text-sm">
              <li><Link href="#" className="hover:text-accent transition-colors">Sobre Nosotros</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Sé un Chef Epicúreo</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Preguntas Frecuentes</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-white text-lg font-medium mb-4">Síguenos</h4>
            <div className="flex space-x-4 mb-6">
              <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            </div>
            <div>
              <p className="font-sans text-xs uppercase tracking-wider mb-2 text-zinc-500">¿Hablamos?</p>
              <a href="tel:+34600000000" className="text-white font-serif text-lg hover:text-accent transition-colors block mb-1">+34 600 000 000</a>
              <a href="mailto:hola@reservaepicurea.com" className="text-white font-sans text-sm hover:text-accent transition-colors">hola@reservaepicurea.com</a>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/50 pt-8 flex flex-col md:flex-row justify-between items-center text-sm font-sans text-zinc-500">
          <p>© {new Date().getFullYear()} Reserva Epicúrea. Todos los derechos reservados.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white transition-colors">Términos Legales</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
