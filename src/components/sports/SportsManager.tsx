"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSport, createCourt } from "@/server/actions/sports";

interface SportVM { id: string; name: string; defaultSlotMinutes: number; courts: { id: string; name: string }[] }

export function SportsManager({ initialSports }: { initialSports: SportVM[] }) {
  const [sports, setSports] = useState(initialSports);
  const [newSport, setNewSport] = useState("");
  const [newCourt, setNewCourt] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function addSport() {
    if (!newSport.trim()) return;
    startTransition(async () => {
      try {
        await createSport({ name: newSport, defaultSlotMinutes: 60 });
        setNewSport("");
        router.refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function addCourt(sportId: string) {
    const name = newCourt[sportId]?.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await createCourt({ sportId, name });
        setNewCourt((prev) => ({ ...prev, [sportId]: "" }));
        router.refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-lg border border-clay/40 bg-clay/10 px-4 py-2 text-sm text-clay">{error}</div>}

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Nuevo deporte</label>
          <Input value={newSport} onChange={(e) => setNewSport(e.target.value)} placeholder="Ej: Pickleball" />
        </div>
        <Button onClick={addSport} disabled={isPending}><Plus className="h-4 w-4" /> Agregar deporte</Button>
      </Card>

      {sports.map((sport) => (
        <Card key={sport.id} className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-semibold">{sport.name}</h3>
            <span className="font-mono text-xs text-chalk-dim">{sport.defaultSlotMinutes} min/turno</span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {sport.courts.map((c) => (
              <span key={c.id} className="rounded-lg border border-line bg-ink px-3 py-1.5 text-sm">{c.name}</span>
            ))}
            {sport.courts.length === 0 && <span className="text-sm text-chalk-dim">Sin canchas todavía.</span>}
          </div>

          <div className="flex gap-2">
            <Input
              value={newCourt[sport.id] ?? ""}
              onChange={(e) => setNewCourt((prev) => ({ ...prev, [sport.id]: e.target.value }))}
              placeholder="Nombre de la cancha (ej: Cancha 4)"
              className="flex-1"
            />
            <Button variant="ghost" onClick={() => addCourt(sport.id)} disabled={isPending}>Agregar cancha</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
