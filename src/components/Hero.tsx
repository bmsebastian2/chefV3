"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vectorRef = useRef<SVGSVGElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !vectorRef.current) return;

    const ctx = gsap.context(() => {
      // Text entrance
      gsap.fromTo(
        ".hero-text",
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.3, stagger: 0.18, ease: "power3.out" }
      );

      // Badge entrance
      gsap.fromTo(
        ".hero-badge",
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.5)" }
      );

      // Background ring
      gsap.fromTo(
        ".v-circle-bg",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.6, ease: "power3.out", delay: 0.1, stagger: 0.15 }
      );

      // Plate assembly
      gsap.fromTo(
        ".v-plate-shadow",
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.9, ease: "power2.out", delay: 0.5 }
      );
      gsap.fromTo(
        ".v-plate",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power2.out", delay: 0.6 }
      );

      // Cloche drop-in
      gsap.fromTo(
        ".v-cloche",
        { y: -120, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.4, ease: "bounce.out", delay: 0.8, stagger: 0.05 }
      );

      // Stars burst
      gsap.fromTo(
        ".v-star",
        { scale: 0, opacity: 0, rotation: -180 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.9, stagger: 0.15, ease: "back.out(2)", delay: 1.4 }
      );

      // Decorative dots
      gsap.fromTo(
        ".v-dot",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, stagger: 0.1, ease: "back.out(2)", delay: 1.8 }
      );

      // Continuous float
      gsap.to(".v-floating", {
        y: -18,
        duration: 3.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // Stars gentle drift
      gsap.to(".v-star-float", {
        y: -12,
        rotation: 12,
        duration: 4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.7,
      });

      // Steam rising
      gsap.to(".v-steam", {
        y: -30,
        opacity: 0,
        scale: 1.3,
        duration: 2.8,
        ease: "power1.inOut",
        stagger: 0.45,
        repeat: -1,
      });

      // Orbit ring spin via CSS override
      gsap.to(".v-orbit", {
        rotation: 360,
        duration: 50,
        ease: "none",
        repeat: -1,
        transformOrigin: "300px 300px",
      });

      // Parallax on scroll
      if (parallaxRef.current) {
        gsap.to(parallaxRef.current, {
          y: -80,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-[#FAFAFA]"
    >
      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      {/* Warm glow behind illustration */}
      <div className="pointer-events-none absolute right-0 top-1/4 w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full bg-amber-100/40 blur-3xl" />

      <div className="container mx-auto px-6 max-w-[1280px] relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-6">

          {/* Left: Text */}
          <div className="w-full lg:w-5/12 flex flex-col justify-center text-left z-10">
            <div className="hero-badge opacity-0 inline-flex mb-7">
              <span className="flex items-center gap-2.5 px-4 py-1.5 text-[10px] font-black tracking-[0.25em] uppercase text-accent border border-accent/25 rounded-full bg-accent/5">
                {/* Nicaragua flag — blue/white/blue tricolor */}
                <svg
                  viewBox="0 0 21 14"
                  className="w-[18px] h-3 rounded-[2px] flex-shrink-0"
                  aria-label="Bandera de Nicaragua"
                >
                  <rect width="21" height="4.67" y="0" fill="#3E6EB4" />
                  <rect width="21" height="4.66" y="4.67" fill="#FFFFFF" />
                  <rect width="21" height="4.67" y="9.33" fill="#3E6EB4" />
                </svg>
                Nicaragua · Alta Cocina Privada
              </span>
            </div>

            <h1 className="hero-text opacity-0 font-serif text-5xl md:text-6xl lg:text-[4.5rem] font-semibold text-zinc-900 tracking-tight mb-7 leading-[1.03]">
              Transforma tu comedor en el restaurante{" "}
              <span className="relative inline-block">
                más exclusivo
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 8"
                  fill="none"
                  preserveAspectRatio="none"
                  style={{ height: "6px" }}
                >
                  <path
                    d="M0 6 Q75 0 150 5 Q225 10 300 4"
                    stroke="#E09F3E"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="hero-text opacity-0 font-sans text-lg text-zinc-500 mb-10 max-w-md font-light leading-relaxed">
              Chefs de élite en la intimidad de tu hogar. Se encargan de la
              compra, la cocina y el servicio en mesa.
            </p>

            <div className="hero-text opacity-0 flex flex-col sm:flex-row gap-4 items-start">
              <Link href="/wizard">
                <Button
                  size="lg"
                  className="bg-accent text-white border-none h-12 px-8 text-base font-medium shadow-xl shadow-amber-400/25 rounded-full hover:scale-105 hover:shadow-amber-400/40 transition-all duration-200"
                >
                  Solicitar un chef
                </Button>
              </Link>
              <Link
                href="#chefs"
                className="inline-flex items-center gap-2 h-12 px-4 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Ver nuestros chefs
                <span className="text-accent">→</span>
              </Link>
            </div>

            {/* Social proof strip */}
            <div className="hero-text opacity-0 mt-12 flex items-center gap-6 border-t border-zinc-100 pt-7">
              <div className="text-center">
                <div className="font-serif text-2xl font-semibold text-zinc-900">+500</div>
                <div className="text-xs text-zinc-400 tracking-wide mt-0.5">Experiencias</div>
              </div>
              <div className="w-px h-8 bg-zinc-100" />
              <div className="text-center">
                <div className="font-serif text-2xl font-semibold text-zinc-900">4.9★</div>
                <div className="text-xs text-zinc-400 tracking-wide mt-0.5">Valoración media</div>
              </div>
              <div className="w-px h-8 bg-zinc-100" />
              <div className="text-center">
                <div className="font-serif text-2xl font-semibold text-zinc-900">48h</div>
                <div className="text-xs text-zinc-400 tracking-wide mt-0.5">Tiempo de respuesta</div>
              </div>
            </div>
          </div>

          {/* Right: Illustration */}
          <div
            ref={parallaxRef}
            className="w-full lg:w-7/12 flex justify-center lg:justify-end items-center h-[380px] md:h-[520px] lg:h-[640px] relative"
          >
            <svg
              ref={vectorRef}
              viewBox="0 0 600 600"
              className="w-full max-w-[600px] h-full"
            >
              <defs>
                <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFF8EC" />
                  <stop offset="100%" stopColor="#F4F4F5" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="plateGrad" cx="50%" cy="20%" r="70%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E8E8EA" />
                </radialGradient>
                <linearGradient id="clocheGrad" x1="0%" y1="0%" x2="30%" y2="100%">
                  <stop offset="0%" stopColor="#3F3F46" />
                  <stop offset="100%" stopColor="#09090B" />
                </linearGradient>
                <radialGradient id="handleGrad" cx="40%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#F0B429" />
                  <stop offset="100%" stopColor="#B7791F" />
                </radialGradient>
                <filter id="plateShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000000" floodOpacity="0.10" />
                </filter>
                <filter id="starGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Ambient glow disc */}
              <circle cx="300" cy="310" r="250" fill="url(#bgGlow)" className="v-circle-bg opacity-0" />

              {/* Outer dashed orbit */}
              <circle
                cx="300"
                cy="300"
                r="275"
                fill="none"
                stroke="#E09F3E"
                strokeWidth="0.8"
                strokeDasharray="7 13"
                strokeOpacity="0.5"
                className="v-orbit v-circle-bg opacity-0"
              />

              {/* Inner solid thin ring */}
              <circle
                cx="300"
                cy="300"
                r="210"
                fill="none"
                stroke="#E09F3E"
                strokeWidth="0.5"
                strokeOpacity="0.25"
                className="v-circle-bg opacity-0"
              />

              {/* Plate shadow */}
              <ellipse
                cx="300"
                cy="450"
                rx="175"
                ry="22"
                fill="#09090B"
                fillOpacity="0.07"
                className="v-plate-shadow opacity-0"
              />

              {/* Plate rim */}
              <ellipse
                cx="300"
                cy="432"
                rx="158"
                ry="20"
                fill="#DADADD"
                className="v-plate opacity-0"
              />
              {/* Plate surface */}
              <ellipse
                cx="300"
                cy="426"
                rx="145"
                ry="17"
                fill="url(#plateGrad)"
                filter="url(#plateShadow)"
                className="v-plate opacity-0"
              />
              {/* Plate inner ring detail */}
              <ellipse
                cx="300"
                cy="424"
                rx="88"
                ry="10"
                fill="none"
                stroke="#D1D1D5"
                strokeWidth="1"
                className="v-plate opacity-0"
              />

              {/* Cloche + floating group */}
              <g className="v-floating">
                {/* Cloche body */}
                <path
                  d="M152 398 Q152 158 300 140 Q448 158 448 398"
                  fill="url(#clocheGrad)"
                  className="v-cloche opacity-0"
                />
                {/* Cloche sheen */}
                <path
                  d="M195 360 Q205 265 225 220"
                  fill="none"
                  stroke="white"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeOpacity="0.06"
                  className="v-cloche opacity-0"
                />
                {/* Base rim */}
                <rect
                  x="138"
                  y="395"
                  width="324"
                  height="16"
                  rx="8"
                  fill="#18181B"
                  className="v-cloche opacity-0"
                />
                {/* Handle stem */}
                <rect
                  x="295"
                  y="152"
                  width="10"
                  height="36"
                  rx="5"
                  fill="#92400E"
                  className="v-cloche opacity-0"
                />
                {/* Handle sphere */}
                <circle
                  cx="300"
                  cy="148"
                  r="18"
                  fill="url(#handleGrad)"
                  filter="url(#starGlow)"
                  className="v-cloche opacity-0"
                />
                {/* Handle highlight */}
                <circle
                  cx="294"
                  cy="141"
                  r="5"
                  fill="white"
                  fillOpacity="0.45"
                  className="v-cloche opacity-0"
                />

                {/* Steam wisps */}
                <path
                  d="M250 380 Q228 320 258 278"
                  fill="none"
                  stroke="#E09F3E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="v-steam opacity-0"
                />
                <path
                  d="M300 388 Q330 335 300 292"
                  fill="none"
                  stroke="#71717A"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="v-steam opacity-0"
                />
                <path
                  d="M350 380 Q348 308 366 268"
                  fill="none"
                  stroke="#E09F3E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="v-steam opacity-0"
                />
              </g>

              {/* Decorative stars */}
              <g className="v-star-float" filter="url(#starGlow)">
                <path
                  d="M490 188 L498 155 L506 188 L539 196 L506 204 L498 237 L490 204 L457 196 Z"
                  fill="#E09F3E"
                  className="v-star opacity-0"
                />
                <path
                  d="M95 202 L101 172 L107 202 L137 208 L107 214 L101 244 L95 214 L65 208 Z"
                  fill="#18181B"
                  className="v-star opacity-0"
                />
                <path
                  d="M168 110 L172 90 L176 110 L196 114 L176 118 L172 138 L168 118 L148 114 Z"
                  fill="#E09F3E"
                  className="v-star opacity-0"
                />
              </g>

              {/* Small dot accents */}
              <circle cx="520" cy="310" r="5" fill="#E09F3E" fillOpacity="0.4" className="v-dot opacity-0" />
              <circle cx="80" cy="365" r="3.5" fill="#E09F3E" fillOpacity="0.35" className="v-dot opacity-0" />
              <circle cx="460" cy="108" r="4" fill="#18181B" fillOpacity="0.2" className="v-dot opacity-0" />
              <circle cx="130" cy="440" r="3" fill="#E09F3E" fillOpacity="0.3" className="v-dot opacity-0" />
              <circle cx="490" cy="420" r="2.5" fill="#18181B" fillOpacity="0.15" className="v-dot opacity-0" />

              {/* Small fork + knife silhouette — far left */}
              <g className="v-star-float v-star opacity-0" transform="translate(72, 265) rotate(-18)">
                <rect x="-1.5" y="-28" width="3" height="56" rx="1.5" fill="#E09F3E" fillOpacity="0.7" />
                <rect x="-5" y="-28" width="1.5" height="16" rx="0.75" fill="#E09F3E" fillOpacity="0.7" />
                <rect x="2" y="-28" width="1.5" height="16" rx="0.75" fill="#E09F3E" fillOpacity="0.7" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
