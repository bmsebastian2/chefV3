"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Check, ArrowRight } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 80, email: 120, message: 3000 };

const TOPICS = [
  { value: "pago", label: "Temas de pago" },
  { value: "tecnico", label: "Soporte técnico" },
  { value: "general", label: "Funcionamiento general" },
  { value: "otros", label: "Otros" },
] as const;

type TopicValue = (typeof TOPICS)[number]["value"];

export function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<TopicValue | "">("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const sectionRef = useRef<HTMLElement>(null);

  // Llegar acá con #contacto desde otra página (ej. el botón del chef bloqueado)
  // scrollea apenas pinta, pero el contenido de arriba (fotos de chefs, mapa…)
  // termina de cargar después y empuja la sección hacia abajo, dejando el viewport
  // sobre la sección anterior. Re-centramos en cada cambio de altura del body
  // mientras el layout se acomoda, y soltamos en cuanto el usuario scrollea él
  // mismo o pasa el presupuesto de tiempo.
  useEffect(() => {
    if (window.location.hash !== "#contacto") return;
    const el = sectionRef.current;
    if (!el) return;

    let active = true;
    const scroll = () => el.scrollIntoView({ block: "start" });
    const release = () => {
      if (!active) return;
      active = false;
      ro.disconnect();
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", release);
    };

    const ro = new ResizeObserver(() => { if (active) scroll(); });
    ro.observe(document.body);

    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", release);

    scroll();
    const timeout = setTimeout(release, 2500);

    return () => { release(); clearTimeout(timeout); };
  }, []);

  const isValid =
    name.trim().length > 0 &&
    name.trim().length <= LIMITS.name &&
    EMAIL_RE.test(email.trim()) &&
    email.trim().length <= LIMITS.email &&
    topic !== "" &&
    message.trim().length > 0 &&
    message.trim().length <= LIMITS.message;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || status === "loading") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "No se pudo enviar el mensaje. Intentá de nuevo.");
        setStatus("error");
        return;
      }

      setName("");
      setEmail("");
      setTopic("");
      setMessage("");
      setStatus("success");
    } catch {
      setErrorMsg("Error de conexión. Revisá tu internet e intentá de nuevo.");
      setStatus("error");
    }
  }

  const inputBase =
    "w-full bg-white rounded-xl px-5 py-4 text-base text-zinc-900 placeholder:text-zinc-400 " +
    "shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition-all duration-200 " +
    "focus:outline-none focus:ring-2 focus:ring-accent focus:shadow-[0_4px_16px_rgba(34,197,94,0.10)]";

  return (
    <section ref={sectionRef} id="contacto" className="py-24 bg-background scroll-mt-20">
      <div className="container mx-auto px-6 max-w-[1280px]">
        {/* Encabezado */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-accent mb-4">
            Contacto
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-zinc-900 mb-5">
            Hablemos.
          </h2>
          <p className="font-sans text-lg text-zinc-500 leading-relaxed">
            ¿Tenés una consulta o querés organizar algo especial? Escribinos y te
            respondemos a la brevedad.
          </p>
        </div>

        {/* Formulario */}
        <div className="max-w-xl mx-auto">
          {status === "success" ? (
            <div className="flex flex-col items-center text-center bg-white rounded-2xl px-8 py-14 ring-1 ring-zinc-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-5">
                <Check className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-serif text-2xl text-zinc-900 mb-2">¡Mensaje enviado!</h3>
              <p className="font-sans text-zinc-500 mb-7 max-w-sm">
                Gracias por escribirnos. Te responderemos muy pronto al correo que dejaste.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="font-sans text-sm font-medium text-accent hover:text-accent/80 transition-colors"
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl p-8 md:p-10 ring-1 ring-zinc-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-col gap-5"
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="contact-name" className="font-sans text-sm font-medium text-zinc-700">
                  Nombre
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={LIMITS.name}
                  placeholder="Tu nombre"
                  autoComplete="name"
                  className={inputBase}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="contact-email" className="font-sans text-sm font-medium text-zinc-700">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={LIMITS.email}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className={inputBase}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-sans text-sm font-medium text-zinc-700">
                  Tipo de consulta
                </span>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((t) => {
                    const selected = topic === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTopic(t.value)}
                        aria-pressed={selected}
                        className={`font-sans text-sm rounded-xl px-4 py-2.5 ring-1 transition-all duration-200
                          ${
                            selected
                              ? "bg-accent text-white ring-accent shadow-sm shadow-accent/20"
                              : "bg-white text-zinc-600 ring-zinc-200/80 hover:ring-accent/40 hover:text-zinc-900"
                          }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="contact-message" className="font-sans text-sm font-medium text-zinc-700">
                  Mensaje
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={LIMITS.message}
                  rows={5}
                  placeholder="Contanos en qué te podemos ayudar…"
                  className={`${inputBase} resize-none`}
                />
              </div>

              {status === "error" && (
                <p className="font-sans text-sm text-red-600 -mt-1">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={!isValid || status === "loading"}
                className="group mt-1 inline-flex items-center justify-center gap-2 h-13 px-6 py-4 rounded-xl
                  bg-accent text-white font-sans font-medium text-base
                  shadow-lg shadow-accent/20 transition-all duration-200
                  hover:enabled:scale-[1.02] hover:enabled:shadow-accent/30
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    Enviar mensaje
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
