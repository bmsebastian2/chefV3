"use client";

import { useState, useEffect, useRef } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerChef } from "@/app/auth/actions";
import { Country } from "country-state-city";
import { gsap } from "gsap";

interface FormData {
  firstName: string;
  firstSurname: string;
  secondSurname: string;
  country: string;
  phone: string;
  email: string;
  confirmEmail: string;
  password: string;
  acceptTerms: boolean;
}

export default function ChefRegistrationPage() {
  const [state, formAction, isPending] = useActionState(registerChef, null);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    firstSurname: "",
    secondSurname: "",
    country: "Spain",
    phone: "",
    email: "",
    confirmEmail: "",
    password: "",
    acceptTerms: false,
  });
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");

  const pageRef = useRef<HTMLElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (leftPanelRef.current) {
        gsap.fromTo(
          leftPanelRef.current,
          { x: -48, opacity: 0 },
          { x: 0, opacity: 1, duration: 1.05, ease: "power3.out" }
        );
      }
      gsap.fromTo(
        ".reg-header",
        { y: -18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.72, ease: "power2.out", delay: 0.2 }
      );
      gsap.fromTo(
        ".reg-field",
        { x: 22, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, stagger: 0.065, ease: "power2.out", delay: 0.38 }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (name === "email" || name === "confirmEmail") {
        const emailToCheck = name === "email" ? value : formData.email;
        const confirmEmailToCheck =
          name === "confirmEmail" ? value : formData.confirmEmail;
        if (
          emailToCheck &&
          confirmEmailToCheck &&
          emailToCheck !== confirmEmailToCheck
        ) {
          setEmailError("Los emails no coinciden");
        } else {
          setEmailError("");
        }
      }
    }
  };

  const isFormValid = () =>
    formData.firstName.trim() !== "" &&
    formData.firstSurname.trim() !== "" &&
    formData.country.trim() !== "" &&
    formData.phone.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.confirmEmail.trim() !== "" &&
    formData.password.trim() !== "" &&
    formData.email === formData.confirmEmail &&
    formData.acceptTerms === true &&
    emailError === "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (formData.email !== formData.confirmEmail) {
      setEmailError("Los emails no coinciden");
      e.preventDefault();
      return;
    }
    if (!formData.acceptTerms) {
      setFormError("Debes aceptar los términos y condiciones para continuar");
      e.preventDefault();
      return;
    }
    setFormError("");
  };

  const inputCls =
    "w-full bg-transparent border-0 border-b border-zinc-200 rounded-none px-0 h-11 text-zinc-900 placeholder:text-zinc-300 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#E09F3E] transition-colors duration-200 text-[15px] font-sans";

  const labelCls =
    "block text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-zinc-400 mb-2.5";

  /* ── Error state ── */
  if (state?.error) {
    return (
      <main className="flex min-h-screen flex-col bg-[#0C0C0C]">
        <Header />
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full text-center">
            <div className="w-px h-12 bg-[#E09F3E]/35 mx-auto mb-10" />
            <div className="w-14 h-14 border border-red-500/25 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-semibold text-white mb-4 tracking-tight">
              Error en el registro
            </h2>
            <p className="font-sans text-zinc-500 mb-10 leading-relaxed text-sm">
              {state.error}
            </p>
            <Link href="/chef-registration">
              <Button
                className="w-full bg-[#E09F3E] hover:bg-[#c8892e] text-black border-none h-12 text-xs font-sans font-semibold tracking-[0.2em] uppercase rounded-none transition-all"
                onClick={() => (window.location.href = "/chef-registration")}
              >
                Intentar de nuevo
              </Button>
            </Link>
            <div className="w-px h-12 bg-[#E09F3E]/35 mx-auto mt-10" />
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  /* ── Main page ── */
  return (
    <main ref={pageRef} className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <Header />

      <div className="flex-1 flex flex-col lg:flex-row pt-20">

        {/* ════ LEFT PANEL — dark branding ════ */}
        <div
          ref={leftPanelRef}
          className="hidden lg:flex lg:flex-col lg:w-[42%] xl:w-[40%] bg-[#0C0C0C] relative overflow-hidden"
          style={{ minHeight: "calc(100vh - 80px)" }}
        >
          {/* Grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "128px",
            }}
          />
          {/* Amber glow */}
          <div className="pointer-events-none absolute bottom-0 left-0 w-96 h-96 bg-[#E09F3E]/[0.07] rounded-full blur-3xl" />
          {/* Edge accents */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-[#E09F3E]/45 via-[#E09F3E]/12 to-transparent" />
          <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#E09F3E]/8 to-transparent" />

          {/* Inner content */}
          <div className="relative z-10 flex flex-col h-full p-12 xl:p-16 py-14">

            {/* Brand mark */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 border border-[#E09F3E]/30 rounded-full flex items-center justify-center">
                <span className="font-serif text-[#E09F3E] text-xs font-bold leading-none">
                  G
                </span>
              </div>
              <span className="font-sans text-zinc-600 text-[10px] tracking-[0.28em] uppercase">
                GetChef · Nicaragua
              </span>
            </div>

            {/* Center section */}
            <div className="flex-1 flex flex-col justify-center">
              {/* Cloche illustration */}
              <div className="mb-10 -ml-1">
                <svg viewBox="0 0 320 230" className="w-52 xl:w-60" aria-hidden="true">
                  <defs>
                    <linearGradient id="regCloche" x1="0%" y1="0%" x2="22%" y2="100%">
                      <stop offset="0%" stopColor="#3F3F46" />
                      <stop offset="100%" stopColor="#09090B" />
                    </linearGradient>
                    <radialGradient id="regHandle" cx="40%" cy="30%" r="60%">
                      <stop offset="0%" stopColor="#F0B429" />
                      <stop offset="100%" stopColor="#B7791F" />
                    </radialGradient>
                    <filter id="regDrop">
                      <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000" floodOpacity="0.45" />
                    </filter>
                  </defs>
                  <ellipse cx="160" cy="196" rx="128" ry="14" fill="#09090B" fillOpacity="0.35" />
                  <ellipse cx="160" cy="187" rx="116" ry="13" fill="#1a1a1f" />
                  <ellipse cx="160" cy="182" rx="103" ry="11" fill="#222226" filter="url(#regDrop)" />
                  <ellipse cx="160" cy="180" rx="64" ry="6.5" fill="none" stroke="#E09F3E" strokeWidth="0.7" strokeOpacity="0.18" />
                  <path d="M52 180 Q52 60 160 44 Q268 60 268 180" fill="url(#regCloche)" />
                  <path d="M64 155 Q72 105 84 76" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.04" />
                  <rect x="40" y="177" width="240" height="11" rx="5.5" fill="#18181B" />
                  <rect x="156" y="46" width="8" height="26" rx="4" fill="#92400E" />
                  <circle cx="160" cy="42" r="15" fill="url(#regHandle)" />
                  <circle cx="155" cy="36" r="4" fill="white" fillOpacity="0.32" />
                  <path d="M262 55 L267 38 L272 55 L289 60 L272 65 L267 82 L262 65 L245 60 Z" fill="#E09F3E" fillOpacity="0.45" />
                  <path d="M38 90 L42 74 L46 90 L62 94 L46 98 L42 114 L38 98 L22 94 Z" fill="#E09F3E" fillOpacity="0.28" />
                  <circle cx="284" cy="110" r="3.5" fill="#E09F3E" fillOpacity="0.22" />
                  <circle cx="40" cy="150" r="2.5" fill="#E09F3E" fillOpacity="0.18" />
                </svg>
              </div>

              {/* Headline */}
              <div className="mb-10">
                <p className="font-sans text-[#E09F3E] text-[10px] tracking-[0.38em] uppercase mb-5 font-semibold">
                  Registro de Chef
                </p>
                <h1 className="font-serif text-[2.6rem] xl:text-[2.9rem] text-white font-semibold leading-[1.04] tracking-tight">
                  Tu arte<br />
                  <em className="not-italic text-[#E09F3E]">merece</em><br />
                  un escenario.
                </h1>
                <p className="font-sans text-zinc-500 text-sm leading-relaxed mt-5 max-w-[260px]">
                  Conecta con comensales que valoran tu talento. Controla tus horarios, precios y estilo.
                </p>
              </div>

              {/* Stats */}
              <div className="border-t border-white/[0.055] pt-7 grid grid-cols-3 gap-5">
                {[
                  { val: "+500", lbl: "Experiencias" },
                  { val: "4.9★", lbl: "Valoración" },
                  { val: "100%", lbl: "Autonomía" },
                ].map(({ val, lbl }) => (
                  <div key={lbl}>
                    <div className="font-serif text-xl xl:text-2xl text-white font-semibold">{val}</div>
                    <div className="text-[9px] font-sans text-zinc-600 tracking-widest mt-1 uppercase">{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom quote */}
            <div className="border-l-2 border-[#E09F3E]/28 pl-5">
              <p className="font-serif text-zinc-600 text-sm italic leading-relaxed">
                &ldquo;La cocina es el único<br />lenguaje universal.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* ════ RIGHT PANEL — Form ════ */}
        <div className="flex-1 flex flex-col bg-[#FAFAFA]">

          {/* Mobile-only top banner */}
          <div className="lg:hidden bg-[#0C0C0C] px-8 pt-10 pb-10">
            <p className="font-sans text-[#E09F3E] text-[10px] tracking-[0.3em] uppercase mb-4 font-semibold">
              Registro de Chef
            </p>
            <h1 className="font-serif text-3xl text-white font-semibold leading-tight">
              Tu arte merece<br />
              <span className="text-[#E09F3E]">un escenario.</span>
            </h1>
          </div>

          {/* Form area */}
          <div className="flex-1 w-full max-w-xl lg:max-w-2xl xl:max-w-xl mx-auto px-8 sm:px-10 lg:px-14 xl:px-16 py-12 lg:py-16">

            {/* Header */}
            <div className="reg-header opacity-0 mb-10">
              <h2 className="font-serif text-[1.85rem] lg:text-[2rem] font-semibold text-zinc-900 tracking-tight mb-2">
                Crea tu cuenta
              </h2>
              <p className="font-sans text-sm text-zinc-500">
                ¿Ya tienes cuenta?{" "}
                <Link
                  href="/"
                  className="text-[#E09F3E] hover:text-[#c8892e] transition-colors font-medium"
                >
                  Inicia sesión
                </Link>
              </p>
            </div>

            <form action={formAction} onSubmit={handleSubmit}>
              {formError && (
                <div className="reg-field opacity-0 mb-7 pl-4 py-3 border-l-2 border-red-400 bg-red-50/60">
                  <p className="text-red-700 text-xs font-sans">{formError}</p>
                </div>
              )}

              {/* Nombre + Primer apellido */}
              <div className="reg-field opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-x-8 mb-7">
                <div>
                  <label htmlFor="firstName" className={labelCls}>
                    Nombre <span className="text-[#E09F3E]">*</span>
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Carlos"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="firstSurname" className={labelCls}>
                    Primer apellido <span className="text-[#E09F3E]">*</span>
                  </label>
                  <Input
                    id="firstSurname"
                    name="firstSurname"
                    type="text"
                    placeholder="García"
                    value={formData.firstSurname}
                    onChange={handleChange}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Segundo apellido */}
              <div className="reg-field opacity-0 mb-7">
                <label htmlFor="secondSurname" className={labelCls}>
                  Segundo apellido
                </label>
                <Input
                  id="secondSurname"
                  name="secondSurname"
                  type="text"
                  placeholder="López (opcional)"
                  value={formData.secondSurname}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>

              {/* País + Teléfono */}
              <div className="reg-field opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-x-8 mb-7">
                <div>
                  <label htmlFor="country" className={labelCls}>
                    País <span className="text-[#E09F3E]">*</span>
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="w-full bg-transparent border-0 border-b border-zinc-200 rounded-none px-0 h-11 text-zinc-900 text-[15px] font-sans focus:outline-none focus:border-[#E09F3E] transition-colors duration-200 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Selecciona un país</option>
                    {[
                      "ES","MX","AR","CO","CL","PE","VE","CR","EC","BO",
                      "PY","UY","GT","HN","SV","NI","PA","DO","CU","PR",
                    ].map((code) => {
                      const c = Country.getCountryByCode(code);
                      return c ? (
                        <option key={code} value={c.name}>
                          {c.name}
                        </option>
                      ) : null;
                    })}
                    <option disabled>──────────</option>
                    {Country.getAllCountries()
                      .filter(
                        (c) =>
                          !["ES","MX","AR","CO","CL","PE","VE","CR","EC","BO","PY","UY","GT","HN","SV","NI","PA","DO","CU","PR"].includes(
                            c.isoCode
                          )
                      )
                      .map((c) => (
                        <option key={c.isoCode} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="phone" className={labelCls}>
                    Teléfono <span className="text-[#E09F3E]">*</span>
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+505 8888 1234"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Email + Confirmar */}
              <div className="reg-field opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-x-8 mb-7">
                <div>
                  <label htmlFor="email" className={labelCls}>
                    Email <span className="text-[#E09F3E]">*</span>
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="chef@correo.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="confirmEmail" className={labelCls}>
                    Confirmar email <span className="text-[#E09F3E]">*</span>
                  </label>
                  <Input
                    id="confirmEmail"
                    name="confirmEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="Confirma tu email"
                    value={formData.confirmEmail}
                    onChange={handleChange}
                    required
                    className={`${inputCls} ${emailError ? "border-red-300 focus-visible:border-red-400" : ""}`}
                  />
                  {emailError && (
                    <p className="text-red-500 text-xs mt-1.5 font-sans">
                      {emailError}
                    </p>
                  )}
                </div>
              </div>

              {/* Contraseña */}
              <div className="reg-field opacity-0 mb-8">
                <label htmlFor="password" className={labelCls}>
                  Contraseña <span className="text-[#E09F3E]">*</span>
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={inputCls}
                />
              </div>

              {/* Términos */}
              <div className="reg-field opacity-0 mb-9 flex items-start gap-3.5">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <label
                    htmlFor="acceptTerms"
                    className={`flex items-center justify-center w-4 h-4 border rounded-[2px] cursor-pointer transition-all duration-150 ${
                      formData.acceptTerms
                        ? "bg-[#E09F3E] border-[#E09F3E]"
                        : "border-zinc-300 bg-white hover:border-[#E09F3E]/60"
                    }`}
                  >
                    {formData.acceptTerms && (
                      <svg
                        className="w-2.5 h-2 text-white"
                        fill="none"
                        viewBox="0 0 12 8"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1 4l3 3 7-6" />
                      </svg>
                    )}
                  </label>
                </div>
                <label
                  htmlFor="acceptTerms"
                  className="text-[11px] font-sans text-zinc-500 leading-relaxed cursor-pointer"
                >
                  Acepto los{" "}
                  <Link
                    href="/terms"
                    className="text-[#E09F3E] hover:text-[#c8892e] transition-colors"
                  >
                    términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/privacy"
                    className="text-[#E09F3E] hover:text-[#c8892e] transition-colors"
                  >
                    política de privacidad
                  </Link>
                  <span className="text-[#E09F3E] ml-0.5">*</span>
                </label>
              </div>

              {/* Submit */}
              <div className="reg-field opacity-0">
                <Button
                  type="submit"
                  disabled={!isFormValid() || isPending}
                  className="w-full bg-[#E09F3E] hover:bg-[#c8892e] active:scale-[0.99] text-white border-none h-12 rounded-none text-xs font-sans font-semibold tracking-[0.22em] uppercase shadow-none transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registrando…
                    </span>
                  ) : (
                    "Unirme como Chef →"
                  )}
                </Button>
                <p className="text-[10px] font-sans text-zinc-400 text-center mt-4 tracking-wider">
                  * Campos obligatorios
                </p>
              </div>
            </form>
          </div>

          <Footer />
        </div>
      </div>
    </main>
  );
}
