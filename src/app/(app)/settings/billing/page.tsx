import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BillingPage() {
  return (
    <>
      <TopBar title="Configuración" />
      <div className="px-4 py-4 sm:px-8">
        <Card className="p-6">
          <div className="mb-1 font-mono text-xs uppercase tracking-wide text-chalk-dim">Plan actual</div>
          <div className="mb-4 font-display text-2xl font-bold">Free</div>
          <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-ink-3">
            <div className="h-full bg-turf-bright" style={{ width: "71%" }} />
          </div>
          <p className="mb-6 text-sm text-chalk-dim">142 de 200 reservas usadas este mes · 2 de 2 canchas.</p>
          <Button>Pasar a Pro — $USD 29/mes</Button>
        </Card>
      </div>
    </>
  );
}
