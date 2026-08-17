"use client";
import { useState } from "react";
import Link from "next/link";
import { Trees, Menu, X, Check, CalendarCheck, BarChart3, Megaphone, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const SPORTS = ["Fútbol", "Pádel", "Tenis", "Pickleball", "Hockey", "Básquet", "Vóley", "Squash", "Golf", "Natación"];

const OWNER_FEATURES = [
  { icon: CalendarCheck, title: "Agenda online", desc: "Reservas automáticas. Vas tu horario en tiempo real desde cualquier dispositivo." },
  { icon: BarChart3, title: "Estadísticas", desc: "Panel con ingresos, ocupación y métricas. Tomá decisiones con datos reales." },
  { icon: Megaphone, title: "Promociones", desc: "Creá descuentos y ofertas para llenar tus horas libres automáticamente." },
  { icon: Trophy, title: "Torneos", desc: "Organizá competencias, gestioná equipos y llevá el marcador desde la app." },
];

export default function MarketingPage() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink text-chalk">
      <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <Trees className="h-5 w-5 text-turf-bright" /> Canchas
          </div>
          <div className="hidden items-center gap-8 text-sm text-chalk-dim md:flex">
            <a href="#deportes" className="hover:text-chalk">Deportes</a>
            <a href="#complejos" className="hover:text-chalk">Complejos</a>
            <a href="#duenos" className="hover:text-chalk">Para dueños</a>
            <a href="#precios" className="hover:text-chalk">Precios</a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm text-chalk-dim hover:text-chalk">Iniciar sesión</Link>
            <Link href="/register"><Button size="sm">Registrarse</Button></Link>
          </div>
          <button className="md:hidden" onClick={() => setNavOpen((v) => !v)}>
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {navOpen && (
          <div className="flex flex-col gap-4 border-t border-line px-5 py-5 text-sm md:hidden">
            <a href="#deportes" onClick={() => setNavOpen(false)}>Deportes</a>
            <a href="#duenos" onClick={() => setNavOpen(false)}>Para dueños</a>
            <a href="#precios" onClick={() => setNavOpen(false)}>Precios</a>
            <Link href="/login">Iniciar sesión</Link>
            <Link href="/register"><Button size="sm" className="w-full">Registrarse</Button></Link>
          </div>
        )}
      </header>

      {/* HERO — doble CTA jugador / dueño, como el líder de mercado */}
      <section className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-turf-dim bg-turf-dim/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-turf-bright">
          ● La forma más fácil de reservar canchas en Latinoamérica
        </div>
        <h1 className="mx-auto mb-6 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Reservá canchas deportivas <span className="text-turf-bright">en segundos.</span>
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-chalk-dim">
          Encontrá y reservá canchas de fútbol, pádel, tenis, básquet y vóley — sin llamadas, sin filas.
          Y si tenés un complejo, gestionalo todo desde acá.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/register?rol=jugador"><Button size="lg">Soy jugador — buscar canchas</Button></Link>
          <Link href="/register?rol=dueno"><Button size="lg" variant="ghost">Tengo un complejo</Button></Link>
        </div>
        <div className="mx-auto mt-12 flex max-w-md justify-center gap-10 border-t border-line pt-8 font-mono text-xs text-chalk-dim">
          <div><div className="font-display text-xl font-bold text-chalk">6+</div>Países</div>
          <div><div className="font-display text-xl font-bold text-chalk">100%</div>Online</div>
          <div><div className="font-display text-xl font-bold text-chalk">24/7</div>Disponible</div>
        </div>
      </section>

      <section id="deportes" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="mb-8 font-display text-2xl font-bold sm:text-3xl">Cualquier deporte. Vos lo configurás.</h2>
        <div className="flex flex-wrap gap-2.5">
          {SPORTS.map((s) => (
            <span key={s} className="rounded-lg border border-line bg-ink-2 px-4 py-2.5 font-display text-sm font-semibold">{s}</span>
          ))}
          <span className="rounded-lg border border-line bg-ink-2 px-4 py-2.5 font-display text-sm font-semibold text-amber">+ Tu deporte</span>
        </div>
      </section>

      {/* PARA DUEÑOS — misma estructura de 4 features que la referencia */}
      <section id="duenos" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="mb-12 text-center">
          <div className="mb-3 font-mono text-xs uppercase tracking-wide text-amber">Para dueños de complejos</div>
          <h2 className="mx-auto max-w-lg font-display text-2xl font-bold sm:text-3xl">Todo tu negocio, en una sola app</h2>
          <p className="mx-auto mt-3 max-w-md text-chalk-dim">Olvidate de los cuadernos y las llamadas. Gestioná tus reservas 24/7, en cualquier ciudad.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OWNER_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-line bg-ink-2 p-6">
              <Icon className="mb-4 h-6 w-6 text-turf-bright" />
              <h3 className="mb-2 font-display font-semibold">{title}</h3>
              <p className="text-sm text-chalk-dim">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRECIOS — sin plan gratis, en pesos, con trial de 14 días como gancho de venta */}
      <section id="precios" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Precios pensados para tu complejo</h2>
          <p className="mt-3 text-chalk-dim">14 días de prueba gratis en cualquier plan. Después, se cobra automático — cancelás cuando quieras.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-ink-2 p-8">
            <div className="mb-2 font-mono text-xs uppercase tracking-wide text-chalk-dim">Starter</div>
            <div className="mb-1 font-display text-4xl font-bold">$19.900<span className="text-base font-normal text-chalk-dim"> ARS/mes</span></div>
            <ul className="mb-8 flex flex-col gap-2.5 text-sm">
              {["Hasta 3 canchas", "Reservas ilimitadas", "Agenda y calendario completos", "Gestión de clientes", "Dashboard básico", "Página pública de reserva"].map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-chalk-dim" /> {f}</li>
              ))}
            </ul>
            <Link href="/register"><Button variant="ghost" className="w-full">Probar 14 días gratis</Button></Link>
          </div>
          <div className="relative rounded-2xl border border-turf-bright bg-turf-dim/10 p-8">
            <div className="absolute -top-3 right-8 rounded-full bg-amber px-3 py-1 font-mono text-[10px] font-bold text-ink">MÁS ELEGIDO</div>
            <div className="mb-2 font-mono text-xs uppercase tracking-wide text-chalk-dim">Pro</div>
            <div className="mb-1 font-display text-4xl font-bold">$44.900<span className="text-base font-normal text-chalk-dim"> ARS/mes</span></div>
            <ul className="mb-8 flex flex-col gap-2.5 text-sm">
              {["Canchas y deportes ilimitados", "Mercado Pago + cobro de señas", "WhatsApp automático", "Torneos completos con fixture", "Multi sucursal y empleados", "Reportes, cupones y fidelización"].map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-turf-bright" /> {f}</li>
              ))}
            </ul>
            <Link href="/register"><Button className="w-full">Probar 14 días gratis</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 font-mono text-xs text-chalk-dim sm:flex-row">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-chalk"><Trees className="h-4 w-4 text-turf-bright" /> Canchas</div>
          © 2026 Canchas
        </div>
      </footer>
    </div>
  );
}
