"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerChef } from "@/app/auth/actions";
import { Country } from "country-state-city";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      
      // Validar emails en tiempo real
      if (name === "email" || name === "confirmEmail") {
        const emailToCheck = name === "email" ? value : formData.email;
        const confirmEmailToCheck = name === "confirmEmail" ? value : formData.confirmEmail;
        
        if (emailToCheck && confirmEmailToCheck && emailToCheck !== confirmEmailToCheck) {
          setEmailError("Los emails no coinciden");
        } else {
          setEmailError("");
        }
      }
    }
  };

  // Validar que todos los campos requeridos estén llenos
  const isFormValid = () => {
    return (
      formData.firstName.trim() !== "" &&
      formData.firstSurname.trim() !== "" &&
      formData.country.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.confirmEmail.trim() !== "" &&
      formData.password.trim() !== "" &&
      formData.email === formData.confirmEmail &&
      formData.acceptTerms === true &&
      emailError === ""
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    console.log('🎯 Cliente: Iniciando envío del formulario')
    console.log('📋 Datos del formulario:', formData)
    
    // Validar que los emails coincidan
    if (formData.email !== formData.confirmEmail) {
      console.log('❌ Cliente: Emails no coinciden')
      setEmailError("Los emails no coinciden");
      e.preventDefault();
      return;
    }
    
    // Validar que acepte los términos
    if (!formData.acceptTerms) {
      console.log('❌ Cliente: No aceptó términos')
      setFormError("Debes aceptar los términos y condiciones para continuar");
      e.preventDefault();
      return;
    }

    console.log('✅ Cliente: Validaciones pasaron, enviando al servidor...')
    setFormError("");
    // El formulario se envía automáticamente con formAction
  };

  if (state?.error) {
    console.log('❌ Cliente: Error recibido del servidor:', state.error)
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full bg-white rounded-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] p-10 text-center border border-zinc-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-semibold text-zinc-900 mb-4">Error en el registro</h2>
            <p className="font-sans text-zinc-600 mb-8 leading-relaxed">
              {state.error}
            </p>
            <Link href="/chef-registration">
              <Button 
                className="w-full bg-accent hover:bg-accent-200 text-white border-none h-12 text-base shadow-xl shadow-zinc-900/10 transition-all rounded-md"
                onClick={() => window.location.href = '/chef-registration'}
              >
                Intentar de nuevo
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 md:py-24 border-b border-zinc-200">
        <div className="container mx-auto px-6 max-w-[1280px]">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Únete hoy
            </h1>
            <p className="font-sans text-lg text-muted-foreground leading-relaxed mb-8">
              Únete a nuestra comunidad de chefs profesionales. Sé tu propio jefe, cocina tus platos y conecta directamente con tus comensales. Construye tu propio negocio culinario.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 border-b border-zinc-200">
        <div className="container mx-auto px-6 max-w-[1280px]">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground mb-12 text-center">
            Por qué unirse a nosotros
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-accent/10">
                    <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">Sé tu propio jefe</h3>
                  <p className="text-muted-foreground mt-2">Controla tus horarios, precios y tipo de servicios que ofreces.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-accent/10">
                    <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m6 2a6 6 0 11-12 0 6 6 0 0112 0zm0 0h6m-9 9.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">Cocina tus platos</h3>
                  <p className="text-muted-foreground mt-2">Expresa tu creatividad culinaria sin límites ni restricciones.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-accent/10">
                    <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">Conecta con comensales</h3>
                  <p className="text-muted-foreground mt-2">Crea relaciones directas con tus clientes sin intermediarios.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-accent/10">
                    <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">Ganancias competitivas</h3>
                  <p className="text-muted-foreground mt-2">Fija tus propios precios y maximiza tus ganancias.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    
      {/* Registration Form Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-2xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground mb-12">
            Conviértete en chef
          </h2>

          <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 text-sm">{formError}</p>
              </div>
            )}
            {/* Nombre */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                Nombre *
              </label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Tu nombre"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>

            {/* Primer Apellido */}
            <div>
              <label htmlFor="firstSurname" className="block text-sm font-medium text-foreground mb-2">
                Primer apellido *
              </label>
              <Input
                id="firstSurname"
                name="firstSurname"
                type="text"
                placeholder="Tu primer apellido"
                value={formData.firstSurname}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>

            {/* Segundo Apellido */}
            <div>
              <label htmlFor="secondSurname" className="block text-sm font-medium text-foreground mb-2">
                Segundo apellido
              </label>
              <Input
                id="secondSurname"
                name="secondSurname"
                type="text"
                placeholder="Tu segundo apellido (opcional)"
                value={formData.secondSurname}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            {/* País */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-foreground mb-2">
                País *
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="" disabled>Selecciona un país</option>
                {[
                  "ES", "MX", "AR", "CO", "CL", "PE", "VE", "CR", "EC", "BO",
                  "PY", "UY", "GT", "HN", "SV", "NI", "PA", "DO", "CU", "PR",
                ].map((code) => {
                  const c = Country.getCountryByCode(code);
                  return c ? <option key={code} value={c.name}>{c.name}</option> : null;
                })}
                <option disabled>──────────</option>
                {Country.getAllCountries()
                  .filter((c) => !["ES","MX","AR","CO","CL","PE","VE","CR","EC","BO","PY","UY","GT","HN","SV","NI","PA","DO","CU","PR"].includes(c.isoCode))
                  .map((c) => (
                    <option key={c.isoCode} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                Número de teléfono *
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+34 612 345 678"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>

            {/* Confirmar Email */}
            <div>
              <label htmlFor="confirmEmail" className="block text-sm font-medium text-foreground mb-2">
                Confirmar email *
              </label>
              <Input
                id="confirmEmail"
                name="confirmEmail"
                type="email"
                placeholder="Confirma tu email"
                value={formData.confirmEmail}
                onChange={handleChange}
                required
                className="w-full"
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Contraseña *
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Tu contraseña segura"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>

            {/* Checkbox Términos y Condiciones */}
            <div className="flex items-start gap-3 pt-4">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-sm text-foreground cursor-pointer">
                Acepto los <Link href="/terms" className="text-accent hover:underline">términos y condiciones</Link> así como la <Link href="/privacy" className="text-accent hover:underline">política de privacidad</Link>. *
              </label>
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                disabled={!isFormValid() || isPending}
                className="w-full bg-accent hover:bg-accent-200 text-white border-none h-12 px-4 text-base shadow-xl shadow-zinc-900/10 transition-all rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Registrando..." : "Regístrate"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              * Los campos marcados con asterisco son obligatorios
            </p>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}
