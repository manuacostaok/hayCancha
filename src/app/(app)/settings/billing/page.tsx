import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getComplexUsage } from "@/server/actions/bookings";

const PRICE: Record<string, string> = { STARTER: "$19.900 ARS/mes", PRO: "$44.900 ARS/mes" };

export default async function BillingPage() {
  const usage = await getComplexUsage();

  return (
    <>
      <TopBar title="Configuración" />
      <div className="px-4 py-4 sm:px-8">
        <Card className="p-6">
          <div className="mb-1 font-mono text-xs uppercase tracking-wide text-chalk-dim">Plan actual</div>
          <div className="mb-1 font-display text-2xl font-bold">{usage.plan === "PRO" ? "Pro" : "Starter"}</div>
          <div className="mb-6 font-mono text-sm text-chalk-dim">{PRICE[usage.plan]}</div>

          {usage.courtLimit && (
            <>
              <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-ink-3">
                <div className="h-full bg-turf-bright" style={{ width: `${Math.min(100, (usage.courtCount / usage.courtLimit) * 100)}%` }} />
              </div>
              <p className="mb-6 text-sm text-chalk-dim">{usage.courtCount} de {usage.courtLimit} canchas usadas.</p>
            </>
          )}

          {usage.plan === "STARTER" && <Button>Pasar a Pro — $44.900 ARS/mes</Button>}
        </Card>
      </div>
    </>
  );
}
