"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createCoupon, toggleCoupon } from "@/server/actions/coupons";

interface CouponVM { id: string; code: string; discountType: "PERCENT" | "FIXED"; discountValue: number; isActive: boolean; usesCount: number }

export function CouponsManager({ initialCoupons }: { initialCoupons: CouponVM[] }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!code.trim()) return;
    startTransition(async () => {
      try {
        await createCoupon({ code, discountType: type, discountValue: value });
        setCode("");
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  }

  function toggle(id: string, active: boolean) {
    startTransition(async () => { await toggleCoupon(id, active); router.refresh(); });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-lg border border-clay/40 bg-clay/10 px-4 py-2 text-sm text-clay">{error}</div>}

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold"><Tag className="h-4 w-4 text-turf-bright" /> Nuevo cupón</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Código</label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VERANO20" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="rounded-lg border border-line bg-ink px-3.5 py-2.5 text-sm">
              <option value="PERCENT">% Porcentaje</option>
              <option value="FIXED">$ Monto fijo</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Valor</label>
            <Input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-24" />
          </div>
          <Button onClick={submit} disabled={isPending}>Crear</Button>
        </div>
        <p className="mt-2 text-xs text-chalk-dim">Cupones es una función del plan Pro. Se aplican desde el modal de nueva reserva.</p>
      </Card>

      <div className="flex flex-col gap-2">
        {initialCoupons.map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Percent className="h-4 w-4 text-turf-bright" />
              <div>
                <div className="font-mono text-sm font-semibold">{c.code}</div>
                <div className="text-xs text-chalk-dim">
                  {c.discountType === "PERCENT" ? `${c.discountValue}% off` : `$${c.discountValue} off`} · usado {c.usesCount} veces
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={c.isActive ? "confirmed" : "canceled"}>{c.isActive ? "Activo" : "Pausado"}</Badge>
              <Button size="sm" variant="ghost" onClick={() => toggle(c.id, !c.isActive)}>
                {c.isActive ? "Pausar" : "Activar"}
              </Button>
            </div>
          </Card>
        ))}
        {initialCoupons.length === 0 && <p className="text-sm text-chalk-dim">Todavía no creaste ningún cupón.</p>}
      </div>
    </div>
  );
}
