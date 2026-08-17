import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { getCustomers } from "@/server/actions/bookings";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <>
      <TopBar title="Clientes" />
      <div className="px-4 py-4 sm:px-8">
        {customers.length === 0 && (
          <p className="text-sm text-chalk-dim">Todavía no tenés clientes cargados — se crean solos apenas hacés la primera reserva.</p>
        )}

        <div className="flex flex-col gap-2 lg:hidden">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-ink-2 p-4">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {c.name} {c.isVip && <Badge tone="pending">VIP</Badge>}
                </div>
                <div className="text-xs text-chalk-dim">{c.phone}</div>
              </div>
              <div className="font-mono text-sm text-turf-bright">{c.bookings.length} rsv.</div>
            </div>
          ))}
        </div>

        {customers.length > 0 && (
          <div className="hidden overflow-hidden rounded-2xl border border-line lg:block">
            <table className="w-full text-sm">
              <thead className="bg-ink-2 text-left text-xs uppercase tracking-wide text-chalk-dim">
                <tr><th className="p-4">Cliente</th><th className="p-4">Teléfono</th><th className="p-4">Reservas</th><th className="p-4">Estado</th></tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="p-4 font-medium">{c.name}</td>
                    <td className="p-4 font-mono text-chalk-dim">{c.phone}</td>
                    <td className="p-4">{c.bookings.length}</td>
                    <td className="p-4">{c.isVip && <Badge tone="pending">VIP</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
