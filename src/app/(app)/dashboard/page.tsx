import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, CalendarCheck, Users } from "lucide-react";
import { getComplexUsage, getCustomers } from "@/server/actions/bookings";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const [usage, customers] = await Promise.all([getComplexUsage(), getCustomers()]);

  const occupancy = usage.courtCount > 0 ? Math.min(100, Math.round((usage.bookingsThisMonth / (usage.courtCount * 30)) * 100)) : 0;

  const stats = [
    { label: "Ingresos del mes", value: formatMoney(usage.revenueThisMonth), icon: DollarSign },
    { label: "Reservas", value: usage.bookingsLimit ? `${usage.bookingsThisMonth} / ${usage.bookingsLimit}` : `${usage.bookingsThisMonth}`, icon: CalendarCheck },
    { label: "Ocupación estimada", value: `${occupancy}%`, icon: TrendingUp },
    { label: "Clientes totales", value: String(customers.length), icon: Users },
  ];

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:px-8 lg:grid-cols-4 lg:gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4 sm:p-5">
            <Icon className="mb-3 h-4 w-4 text-turf-bright" />
            <div className="font-display text-xl font-bold sm:text-2xl">{value}</div>
            <div className="mt-1 text-xs text-chalk-dim">{label}</div>
          </Card>
        ))}
      </div>

      {usage.plan === "FREE" && usage.bookingsLimit && (
        <div className="px-4 pb-2 sm:px-8">
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-chalk-dim">Uso del plan Free</span>
              <span className="font-mono text-turf-bright">{usage.bookingsThisMonth}/{usage.bookingsLimit} reservas</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-3">
              <div className="h-full bg-turf-bright" style={{ width: `${Math.min(100, (usage.bookingsThisMonth / usage.bookingsLimit) * 100)}%` }} />
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
