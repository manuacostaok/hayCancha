import Link from "next/link";
import { CalendarDays, Users, LayoutGrid, Trophy, BarChart3, Settings, Trees } from "lucide-react";

const NAV = [
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/courts", label: "Canchas", icon: LayoutGrid },
  { href: "/tournaments", label: "Torneos", icon: Trophy },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/settings/billing", label: "Configuración", icon: Settings },
];

/** Sidebar fija de escritorio. Oculta en mobile (ver MobileNav). */
export function Sidebar({ complexName }: { complexName: string }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-ink-2 px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Trees className="h-5 w-5 text-turf-bright" />
        <span className="font-display text-sm font-semibold">{complexName}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-chalk-dim transition-colors hover:bg-ink-3 hover:text-chalk"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
