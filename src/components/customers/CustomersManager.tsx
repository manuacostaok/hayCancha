"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toggleVip } from "@/server/actions/bookings";

interface CustomerVM { id: string; name: string; phone: string; isVip: boolean; loyaltyPoints: number; bookings: { id: string }[] }

export function CustomersManager({ customers }: { customers: CustomerVM[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string, current: boolean) {
    startTransition(async () => { await toggleVip(id, !current); router.refresh(); });
  }

  return (
    <>
      <div className="flex flex-col gap-2 lg:hidden">
        {customers.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-ink-2 p-4">
            <div>
              <div className="flex items-center gap-2 font-medium">
                {c.name} {c.isVip && <Badge tone="pending">VIP</Badge>}
              </div>
              <div className="text-xs text-chalk-dim">{c.phone} · {c.loyaltyPoints} pts</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-turf-bright">{c.bookings.length} rsv.</span>
              <button onClick={() => toggle(c.id, c.isVip)} disabled={isPending}>
                <Star className={c.isVip ? "h-4 w-4 fill-amber text-amber" : "h-4 w-4 text-chalk-dim"} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {customers.length > 0 && (
        <div className="hidden overflow-hidden rounded-2xl border border-line lg:block">
          <table className="w-full text-sm">
            <thead className="bg-ink-2 text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr><th className="p-4">Cliente</th><th className="p-4">Teléfono</th><th className="p-4">Reservas</th><th className="p-4">Puntos</th><th className="p-4">VIP</th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4 font-mono text-chalk-dim">{c.phone}</td>
                  <td className="p-4">{c.bookings.length}</td>
                  <td className="p-4 font-mono">{c.loyaltyPoints}</td>
                  <td className="p-4">
                    <button onClick={() => toggle(c.id, c.isVip)} disabled={isPending}>
                      <Star className={c.isVip ? "h-4 w-4 fill-amber text-amber" : "h-4 w-4 text-chalk-dim"} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
