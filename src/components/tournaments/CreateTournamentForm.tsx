"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTournament } from "@/server/actions/tournaments";

interface SportVM { id: string; name: string }

const FORMATS: { value: string; label: string }[] = [
  { value: "SINGLE_ELIM", label: "Eliminación simple" },
  { value: "DOUBLE_ELIM", label: "Doble eliminación" },
  { value: "ROUND_ROBIN", label: "Todos contra todos" },
  { value: "LEAGUE", label: "Liga (fechas)" },
  { value: "GROUPS_KNOCKOUT", label: "Fase de grupos + playoffs" },
];

export function CreateTournamentForm({ sports }: { sports: SportVM[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState(sports[0]?.id ?? "");
  const [format, setFormat] = useState("SINGLE_ELIM");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!name.trim() || !sportId) return;
    startTransition(async () => {
      try {
        await createTournament({ name, sportId, format: format as any });
        setName("");
        setOpen(false);
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuevo torneo</Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <h2 className="mb-5 font-display text-lg font-semibold">Nuevo torneo</h2>
        {error && <p className="mb-3 text-sm text-clay">{error}</p>}
        <div className="flex flex-col gap-4">
          <Input placeholder="Nombre (ej: Copa Apertura)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <select value={sportId} onChange={(e) => setSportId(e.target.value)} className="rounded-lg border border-line bg-ink px-3.5 py-2.5 text-sm">
            {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="rounded-lg border border-line bg-ink px-3.5 py-2.5 text-sm">
            {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={submit} disabled={isPending || sports.length === 0} className="flex-1">Crear</Button>
        </div>
        {sports.length === 0 && <p className="mt-3 text-xs text-amber">Primero cargá al menos un deporte en la sección Deportes.</p>}
      </Dialog>
    </>
  );
}
