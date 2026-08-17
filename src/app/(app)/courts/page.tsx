import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { getCourtsWithSport } from "@/server/actions/bookings";

export default async function CourtsPage() {
  const courts = await getCourtsWithSport();

  return (
    <>
      <TopBar title="Canchas" />
      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {courts.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="mb-1 font-display font-semibold">{c.name}</div>
            <div className="mb-3 font-mono text-xs text-chalk-dim">{c.sport.name}</div>
            <span className="rounded-full bg-turf-dim px-2.5 py-1 font-mono text-[10px] text-turf-bright">
              {c.isActive ? "Activa" : "Inactiva"}
            </span>
          </Card>
        ))}
        {courts.length === 0 && <p className="text-sm text-chalk-dim">Todavía no cargaste canchas.</p>}
      </div>
    </>
  );
}
