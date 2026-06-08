"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function PersonalizaMenu() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pm-photo",
        { opacity: 0, y: 40, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.05,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        }
      );
      gsap.fromTo(
        ".pm-card",
        { opacity: 0, y: 30, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          delay: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* Font + minimal hover — layout is handled via Tailwind + inline styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600;1,700&family=DM+Sans:wght@300;400;500&display=swap');
        .pm-cta-btn { transition: background .2s ease, transform .18s ease, box-shadow .18s ease; }
        .pm-cta-btn:hover { background: #0a0600 !important; transform: scale(1.035); box-shadow: 0 6px 22px rgba(0,0,0,.4); }
        .pm-cta-btn:active { transform: scale(.97); }
      `}</style>

      <section
        ref={sectionRef}
        className="overflow-hidden py-10"
        style={{ background: "#0F0C08", position: "relative" }}
      >
        {/* Dot-grid texture */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(circle, rgba(255,210,120,.06) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        {/* Ambient centre glow */}
        <div
          aria-hidden
          style={{
            position: "absolute", top: "38%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "65%", height: "50%",
            background: "radial-gradient(ellipse, rgba(210,155,50,.08) 0%, transparent 68%)",
            pointerEvents: "none",
          }}
        />

        {/* Watermark word */}
        <div
          aria-hidden
          style={{
            position: "absolute", bottom: 70, left: "50%",
            transform: "translateX(-50%)",
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: "italic", fontWeight: 700,
            fontSize: "clamp(4.5rem, 16vw, 14rem)",
            color: "rgba(255,255,255,.03)",
            whiteSpace: "nowrap", lineHeight: 1,
            letterSpacing: "-.02em", pointerEvents: "none",
            userSelect: "none", zIndex: 0,
          }}
        >
          Menú
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 md:px-8" style={{ zIndex: 1 }}>
          <div className="relative pb-44 md:pb-56">

            {/* ── Photo collage — same structure as original ── */}
            <div className="flex gap-2 md:gap-4 items-start">

              <div className="pm-photo opacity-0 flex-1 mt-14 md:mt-20 rounded-2xl overflow-hidden aspect-[3/4]"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,.6), inset 0 0 0 1px rgba(210,160,70,.18)" }}>
                <Image
                  src="/Lomito.png"
                  alt="Plato de chef"
                  width={400}
                  height={533}
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(.88) contrast(1.06) saturate(1.05)" }}
                />
              </div>

              <div className="pm-photo opacity-0 flex-1 rounded-2xl overflow-hidden aspect-[3/4]"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,.6), inset 0 0 0 1px rgba(210,160,70,.18)" }}>
                <Image
                  src="/tataki de atun rojo.png"
                  alt="Tataki de atún rojo"
                  width={400}
                  height={533}
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(.88) contrast(1.06) saturate(1.05)" }}
                />
              </div>

              <div className="pm-photo opacity-0 hidden sm:block flex-1 mt-8 md:mt-10 rounded-2xl overflow-hidden aspect-[3/4]"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,.6), inset 0 0 0 1px rgba(210,160,70,.18)" }}>
                <Image
                  src="/milhoja.png"
                  alt="Milhoja"
                  width={400}
                  height={533}
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(.88) contrast(1.06) saturate(1.05)" }}
                />
              </div>

              <div className="pm-photo opacity-0 hidden md:block flex-1 mt-16 rounded-2xl overflow-hidden aspect-[3/4]"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,.6), inset 0 0 0 1px rgba(210,160,70,.18)" }}>
                <Image
                  src="/pan brioche.png"
                  alt="Pan brioche"
                  width={400}
                  height={533}
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(.88) contrast(1.06) saturate(1.05)" }}
                />
              </div>

            </div>

            {/* ── CTA card — same positioning as original ── */}
            <div
              className="pm-card opacity-0 absolute bottom-0 left-1/2 -translate-x-1/2 w-[88%] sm:w-[60%] md:w-[44%]"
            >
              <div
                style={{
                  background: "var(--accent)",
                  borderRadius: 22,
                  padding: "34px 38px 36px",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 24px 64px rgba(0,0,0,.55), 0 6px 18px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.38)",
                }}
              >
                {/* Top shimmer line */}
                <div style={{
                  position: "absolute", top: 0, left: "18%", right: "18%",
                  height: 2,
                  background: "linear-gradient(to right, transparent, rgba(255,255,255,.42), transparent)",
                  borderRadius: 1,
                }} />

                {/* Eyebrow */}
                <p style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: 9, fontWeight: 600, letterSpacing: ".18em",
                  textTransform: "uppercase", color: "rgba(25,12,0,.48)",
                  marginBottom: 10,
                }}>
                  Experiencia gastronómica
                </p>

                {/* Heading */}
                <h2 style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontStyle: "italic", fontWeight: 700,
                  fontSize: "clamp(1.7rem, 4.5vw, 2.4rem)",
                  lineHeight: 1.05, color: "#1A0E00",
                  marginBottom: 14,
                }}>
                  Personaliza<br />tu menú
                </h2>

                {/* Body */}
                <p style={{
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontWeight: 300, fontSize: 13, lineHeight: 1.7,
                  color: "rgba(20,10,0,.65)", marginBottom: 26,
                }}>
                  Una cena romántica, una reunión familiar o una celebración entre
                  amigos. Platos tradicionales o sabores exóticos. Cada experiencia
                  es única.
                </p>

                {/* CTA */}
                <Link
                  href="/wizard"
                  className="pm-cta-btn"
                  style={{
                    display: "inline-block",
                    background: "#1A0E00", color: "#fff",
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    fontWeight: 500, fontSize: 12.5,
                    letterSpacing: ".06em", textTransform: "uppercase",
                    padding: "12px 34px", borderRadius: 50,
                    textDecoration: "none",
                  }}
                >
                  Crear mi experiencia
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
