"use client";
import { useState } from "react";
import Link from "next/link";
import { Trees, Menu, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const SPORTS = ["Fútbol", "Pádel", "Tenis", "Pickleball", "Hockey", "Básquet", "Vóley", "Squash", "Golf", "Natación"];

export default function MarketingPage() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink text-chalk">
      <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <Trees className="h-5 w-5 text-turf-bright" /> ¿Hay Cancha?
          </div>
          <div className="hidden items-center gap-8 text-sm text-chalk-dim md:flex">
            <a href="#producto" className="hover:text-chalk">Producto</a>
            <a href="#deportes" className="hover:text-chalk">Deportes</a>
            <a href="#precios" className="hover:text-chalk">Precios</a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm text-chalk-dim hover:text-chalk">Iniciar sesión</Link>
            <Link href="/register"><Button size="sm">Empezar gratis</Button></Link>
          </div>
          <button className="md:hidden" onClick={() => setNavOpen((v) => !v)}>
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {navOpen && (
          <div className="flex flex-col gap-4 border-t border-line px-5 py-5 text-sm md:hidden">
            <a href="#producto" onClick={() => setNavOpen(false)}>Producto</a>
            <a href="#deportes" onClick={() => setNavOpen(false)}>Deportes</a>
            <a href="#precios" onClick={() => setNavOpen(false)}>Precios</a>
            <Link href="/login">Iniciar sesión</Link>
            <Link href="/register"><Button size="sm" className="w-full">Empezar gratis</Button></Link>
          </div>
        )}
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-turf-dim bg-turf-dim/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-turf-bright">
          ● Reservas confirmándose en vivo
        </div>
        <h1 className="mb-6 max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          El calendario de tu complejo, <span className="text-turf-bright">al fin bajo control.</span>
        </h1>
        <p className="mb-8 max-w-md text-lg text-chalk-dim">
          Reservas, clientes, pagos y torneos en un solo lugar. Registrá tu complejo en menos de 5 minutos.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/register"><Button size="lg">Crear mi complejo gratis</Button></Link>
          <a href="#producto"><Button size="lg" variant="ghost">Ver cómo funciona ↓</Button></a>
        </div>
      </section>

      <section id="deportes" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="mb-8 font-display text-2xl font-bold sm:text-3xl">Cualquier deporte. Lo configurás vos.</h2>
        <div className="flex flex-wrap gap-2.5">
          {SPORTS.map((s) => (
            <span key={s} className="rounded-lg border border-line bg-ink-2 px-4 py-2.5 font-display text-sm font-semibold">{s}</span>
          ))}
          <span className="rounded-lg border border-line bg-ink-2 px-4 py-2.5 font-display text-sm font-semibold text-amber">+ Tu deporte</span>
        </div>
      </section>

      <section id="precios" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <h2 className="mb-10 font-display text-2xl font-bold sm:text-3xl">Empezá gratis. Escalá cuando lo necesites.</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-ink-2 p-8">
            <div className="mb-2 font-mono text-xs uppercase tracking-wide text-chalk-dim">Free</div>
            <div className="mb-6 font-display text-4xl font-bold">$0</div>
            <ul className="mb-8 flex flex-col gap-2.5 text-sm">
              {["Hasta 2 canchas", "Hasta 200 reservas/mes", "Agenda completa", "Gestión de clientes"].map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-chalk-dim" /> {f}</li>
              ))}
            </ul>
            <Link href="/register"><Button variant="ghost" className="w-full">Crear cuenta gratis</Button></Link>
          </div>
          <div className="rounded-2xl border border-turf-bright bg-turf-dim/10 p-8">
            <div className="mb-2 font-mono text-xs uppercase tracking-wide text-chalk-dim">Pro</div>
            <div className="mb-6 font-display text-4xl font-bold">$29<span className="text-base font-normal text-chalk-dim">/mes</span></div>
            <ul className="mb-8 flex flex-col gap-2.5 text-sm">
              {["Canchas y reservas ilimitadas", "Mercado Pago + WhatsApp", "Torneos completos", "Multi sucursal"].map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-turf-bright" /> {f}</li>
              ))}
            </ul>
            <Link href="/register"><Button className="w-full">Probar Pro 14 días</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 font-mono text-xs text-chalk-dim sm:flex-row">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-chalk"><Trees className="h-4 w-4 text-turf-bright" /> ¿Hay Cancha?</div>
          © 2026 ¿Hay Cancha?
        </div>
      </footer>
    </div>
  );
}
