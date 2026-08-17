"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, Trophy, BarChart3, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/calendar", label: "Agenda", icon: CalendarDays },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/tournaments", label: "Torneos", icon: Trophy },
  { href: "/dashboard", label: "Panel", icon: BarChart3 },
  { href: "/settings/billing", label: "Más", icon: Menu },
];

/** Barra de navegación inferior para mobile, estilo app nativa. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink-2/95 backdrop-blur lg:hidden"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-mono uppercase tracking-wide",
              active ? "text-turf-bright" : "text-chalk-dim"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
