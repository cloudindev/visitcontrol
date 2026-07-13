"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

// ── Interfaces ──────────────────────────────────────────────────────────────
interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

// ── Sub-componentes / Helpers ───────────────────────────────────────────────
function NavLink({ href, children, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`font-medium transition-colors duration-200 py-2 border-b-2 ${
        active
          ? "text-[var(--color-primary)] border-[var(--color-primary)]"
          : "text-[var(--color-on-background)] dark:text-[var(--color-inverse-on-surface)] hover:text-[var(--color-primary)] border-transparent"
      }`}
    >
      {children}
    </Link>
  );
}

function FeatureCard({ icon, title, description, className = "", children }: FeatureCardProps) {
  return (
    <div
      className={`bg-white dark:bg-[var(--color-inverse-surface)] p-6 rounded-[24px] shadow-sm border border-[var(--color-outline-variant)] hover:shadow-md transition-shadow group flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-container)]/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
          <span className="text-[var(--color-primary)] text-2xl font-bold">{icon}</span>
        </div>
        <h3 className="text-xl font-bold mb-2 text-[var(--color-on-background)] dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-4">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

// ── Componente Principal ─────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-theme min-h-screen bg-[var(--color-background)] text-[var(--color-on-background)] selection:bg-[var(--color-primary-container)] selection:text-[var(--color-on-primary-container)]">
      {/* ── Barra de Navegación (Header) ── */}
      <nav
        className={`fixed top-0 w-full z-50 h-20 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-md"
            : "bg-transparent"
        }`}
      >
        <div className="flex justify-between items-center h-full px-6 md:px-12 max-w-7xl mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/flowvisit-logo.png"
              alt="FlowVisit Logo"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
          </Link>

          {/* Enlaces Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#features" active>
              Características
            </NavLink>
            <NavLink href="#solutions">Soluciones</NavLink>
            <NavLink href="#pricing">Precios</NavLink>
          </div>

          {/* Botones de acción */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/residencialsanesteban"
              className="px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-on-primary-container)] transition-colors text-sm font-semibold active:scale-95 duration-150"
            >
              Iniciar sesión
            </Link>
          </div>

          {/* Menú Móvil Botón */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[var(--color-on-background)] focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Menú Móvil Desplegable */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-black shadow-lg py-6 px-8 flex flex-col gap-4 border-t border-gray-100">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium py-2"
            >
              Características
            </Link>
            <Link
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium py-2"
            >
              Soluciones
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium py-2"
            >
              Precios
            </Link>
            <Link
              href="/residencialsanesteban"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 w-full py-3 rounded-full bg-[var(--color-primary)] text-white text-center font-semibold"
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        {/* ── Hero Section ── */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden hero-gradient">
          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full py-12 md:py-20">
            {/* Texto Hero */}
            <div className="relative z-10 space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] text-xs font-semibold tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
                Seguridad y Control Total
              </span>

              <h1 className="text-4xl md:text-[56px] leading-[1.1] font-bold text-[var(--color-on-background)]">
                Sistema de Gestión de <span className="text-[var(--color-primary)]">Visitas</span> para empresas
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Optimiza la recepción de tu empresa, mejora la seguridad y ofrece una experiencia impecable a tus visitantes con nuestra plataforma de última generación.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 justify-center lg:justify-start">
                <Link
                  href="/residencialsanesteban"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-bold text-center hover:shadow-lg transition-all active:scale-95 duration-150"
                >
                  Empezar ahora
                </Link>
                <Link
                  href="#demo"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white border-2 border-[var(--color-secondary)] text-[var(--color-secondary)] font-bold text-center hover:bg-gray-50 transition-all active:scale-95 duration-150"
                >
                  Ver demo
                </Link>
              </div>

              {/* Confianza / Avatares */}
              <div className="pt-6 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <div className="flex -space-x-3">
                  <Image
                    src="/images/avatar-1.png"
                    alt="User 1"
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-white bg-white"
                  />
                  <Image
                    src="/images/avatar-2.png"
                    alt="User 2"
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-white bg-white"
                  />
                  <Image
                    src="/images/avatar-3.png"
                    alt="User 3"
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-white bg-white"
                  />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  +500 empresas confían en FlowVisit
                </p>
              </div>
            </div>

            {/* Imagen Hero / Mockup */}
            <div className="relative hidden lg:block h-[500px] w-full">
              <div className="absolute inset-0 bg-[var(--color-primary)]/5 rounded-3xl -rotate-2 transform"></div>
              <div className="absolute inset-0 rounded-3xl shadow-2xl border-4 border-white rotate-1 transform overflow-hidden">
                <Image
                  src="/images/landing-hero.jpg"
                  alt="Modern reception desk with iPad check-in"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary)]/10 to-transparent"></div>
              </div>

              {/* Floating Status Card */}
              <div className="absolute -bottom-6 -left-6 glass-card p-4 rounded-2xl shadow-xl max-w-[280px] transition-transform hover:-translate-y-1 duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-primary-container)]/30 flex items-center justify-center text-xl text-[var(--color-primary)] font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-on-background)]">
                      Visita Registrada
                    </p>
                    <p className="text-xs text-gray-500">
                      Juan Pérez • Reunión ID: 245
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bento Grid de Características ── */}
        <section id="features" className="py-20 bg-gray-50 dark:bg-black/20">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-on-background)]">
                Potencia tu <span className="text-[var(--color-primary)]">recepción</span>
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto text-base">
                Tecnología diseñada para simplificar el flujo de personas en tu edificio mientras mantienes los más altos estándares de seguridad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {/* Card 1: Grande (Check-in) */}
              <FeatureCard
                icon="⚡"
                title="Check-in Ultrarápido"
                description="Reduce los tiempos de espera con registros mediante códigos QR, reconocimiento facial o pre-registro vía correo electrónico."
                className="md:col-span-2 lg:col-span-2"
              >
                <div className="h-44 w-full relative rounded-xl overflow-hidden mt-4">
                  <Image
                    src="/images/landing-tablet.jpg"
                    alt="Digital Check-in Tablet"
                    fill
                    className="object-cover"
                  />
                </div>
              </FeatureCard>

              {/* Card 2: Vertical (Notificaciones) */}
              <FeatureCard
                icon="🔔"
                title="Notificaciones Real-time"
                description="Informa automáticamente al anfitrión vía Slack, WhatsApp o correo electrónico en el momento que llega su visita."
                className="md:col-span-1 lg:col-span-1"
              >
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center gap-3 border border-gray-100">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                    💬
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                    &quot;Tu visita ha llegado&quot;
                  </span>
                </div>
              </FeatureCard>

              {/* Card 3: Compact (Seguridad) */}
              <FeatureCard
                icon="🛡️"
                title="Seguridad y Compliance"
                description="Cumple con normativas de protección de datos (GDPR) y protocolos de seguridad interna sin fricciones."
              />

              {/* Card 4: Digital Logbook */}
              <div className="bg-[var(--color-primary)] text-white p-6 rounded-[24px] shadow-lg border border-[var(--color-primary-container)]/30 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                    <span className="text-white text-2xl font-bold">📖</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">
                    Libreta Digital
                  </h3>
                  <p className="text-sm text-gray-200 leading-relaxed">
                    Historial completo y digitalizado de todos los ingresos. Olvida el papel y accede a reportes detallados en segundos.
                  </p>
                </div>
              </div>

              {/* Card 5: Analíticas */}
              <div className="md:col-span-3 lg:col-span-3 bg-[var(--color-inverse-surface)] p-6 rounded-[24px] shadow-sm border border-gray-800 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2 text-white">
                    Analíticas Inteligentes
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">
                    Visualiza picos de tráfico, tiempos de permanencia y frecuencia de visitas para optimizar tus recursos operativos.
                  </p>
                  <button className="text-[var(--color-primary-container)] font-bold flex items-center gap-2 hover:gap-3 transition-all text-sm">
                    Explorar reportes ➔
                  </button>
                </div>
                <div className="w-full md:w-1/2 h-36 bg-white/5 rounded-2xl border border-white/10 p-4 flex items-end gap-2 overflow-hidden">
                  <div className="flex-1 bg-[var(--color-primary-container)] rounded-t-lg h-[60%] animate-pulse"></div>
                  <div className="flex-1 bg-[var(--color-primary-container)] rounded-t-lg h-[90%]"></div>
                  <div className="flex-1 bg-[var(--color-primary-container)] rounded-t-lg h-[40%]"></div>
                  <div className="flex-1 bg-[var(--color-primary-container)] rounded-t-lg h-[75%]"></div>
                  <div className="flex-1 bg-[var(--color-primary-container)] rounded-t-lg h-[55%]"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust Section (Asymmetric) ── */}
        <section className="py-20 overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Imagen izquierda con Uptime */}
              <div className="relative order-2 lg:order-1">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--color-primary)]/10 rounded-full blur-3xl"></div>
                <div className="relative rounded-3xl shadow-xl overflow-hidden aspect-video w-full border-4 border-gray-50">
                  <Image
                    src="/images/landing-manager.jpg"
                    alt="Corporate manager using system"
                    fill
                    className="object-cover"
                  />
                </div>
                {/* Uptime Badge */}
                <div className="absolute -bottom-6 -right-6 p-6 bg-white rounded-2xl shadow-xl z-20 flex flex-col items-center border border-gray-100">
                  <span className="text-4xl font-extrabold text-[var(--color-primary)]">
                    99.9%
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Uptime Garantizado
                  </span>
                </div>
              </div>

              {/* Textos derecha */}
              <div className="order-1 lg:order-2 space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-on-background)] leading-tight">
                  Diseñado para la <span className="text-[var(--color-primary)]">Continuidad Operativa</span>
                </h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
                  Nuestra infraestructura cloud asegura que tu recepción nunca se detenga. Con FlowVisit, el registro de visitas es resiliente, seguro y siempre disponible.
                </p>
                <ul className="space-y-4">
                  {[
                    "Infraestructura escalable en la nube",
                    "Backups automáticos en tiempo real",
                    "Soporte técnico 24/7 especializado",
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <span className="text-[var(--color-primary)] text-lg">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="bg-[var(--color-inverse-surface)] rounded-[32px] p-12 text-center relative overflow-hidden shadow-2xl border border-gray-800">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  ¿Listo para transformar tu recepción?
                </h2>
                <p className="text-gray-300 text-base">
                  Únete a cientos de empresas que ya están modernizando sus espacios de trabajo con FlowVisit.
                </p>
                <div className="pt-2">
                  <Link
                    href="/residencialsanesteban"
                    className="inline-block px-8 py-4 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-bold text-base hover:scale-105 transition-transform duration-150 active:scale-95 shadow-lg"
                  >
                    Agenda una demostración gratis
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-16 bg-[var(--color-inverse-surface)] text-gray-400 border-t border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">FlowVisit</h3>
            <p className="text-sm leading-relaxed">
              Reinventando el acceso corporativo con tecnología de vanguardia.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Producto</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Funcionalidades</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Integraciones</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Precios</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Compañía</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Nosotros</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contacto</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Términos del Servicio</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>© 2024 FlowVisit Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-white cursor-pointer transition-colors">🌐 Español</span>
            <span className="hover:text-white cursor-pointer transition-colors">🇪🇸 ES</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/*
 * ─── Decisión Técnica ───
 * Para aislar los estilos corporativos de la landing page del diseño del kiosco (care home),
 * se define la clase `.landing-theme` como contenedor en el elemento raíz del DOM de la página.
 * Esto nos permite mapear variables CSS de colores sin alterar el funcionamiento global
 * ni interferir con las otras vistas de la aplicación.
 * 
 * Se usan imágenes locales optimizadas mediante next/image para LCP y bento grid preview.
 */
