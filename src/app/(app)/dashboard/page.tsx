import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, CalendarCheck, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getComplexUsage, getCustomers } from "@/server/actions/bookings";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const [usage, customers] = await Promise.all([getComplexUsage(), getCustomers()]);

  const occupancy = usage.courtCount > 0 ? Math.min(100, Math.round((usage.bookingsThisMonth / (usage.courtCount * 30)) * 100)) : 0;

  const stats = [
    { label: "Ingresos del mes", value: formatMoney(usage.revenueThisMonth), icon: DollarSign },
    { label: "Reservas del mes", value: String(usage.bookingsThisMonth), icon: CalendarCheck },
    { label: "Ocupación estimada", value: `${occupancy}%`, icon: TrendingUp },
    { label: "Clientes totales", value: String(customers.length), icon: Users },
  ];

  return (
    <>
      <TopBar title="Dashboard" />
      {usage.plan === "PRO" && (
        <div className="flex justify-end px-4 pt-4 sm:px-8">
          <a href="/api/reports/bookings">
            <Button size="sm" variant="ghost"><Download className="h-4 w-4" /> Exportar reservas del mes (CSV)</Button>
          </a>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:px-8 lg:grid-cols-4 lg:gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4 sm:p-5">
            <Icon className="mb-3 h-4 w-4 text-turf-bright" />
            <div className="font-display text-xl font-bold sm:text-2xl">{value}</div>
            <div className="mt-1 text-xs text-chalk-dim">{label}</div>
          </Card>
        ))}
      </div>

      {usage.courtLimit && (
        <div className="px-4 pb-2 sm:px-8">
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-chalk-dim">Canchas — plan Starter</span>
              <span className="font-mono text-turf-bright">{usage.courtCount}/{usage.courtLimit}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-3">
              <div className="h-full bg-turf-bright" style={{ width: `${Math.min(100, (usage.courtCount / usage.courtLimit) * 100)}%` }} />
            </div>
            {usage.courtCount >= usage.courtLimit && (
              <p className="mt-3 text-xs text-amber">Llegaste al límite de canchas de tu plan. Pasate a Pro para sumar sin tope.</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
