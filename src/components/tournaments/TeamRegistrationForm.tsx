"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerTeam } from "@/server/actions/tournaments";

export function TeamRegistrationForm({ tournamentId }: { tournamentId: string }) {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await registerTeam(tournamentId, name, players.split(",").map((p) => p.trim()).filter(Boolean));
        setName(""); setPlayers("");
        router.refresh();
      } catch (e: any) {
        setError(e.message ?? "No se pudo anotar el equipo");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-ink-2 p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold"><UserPlus className="h-4 w-4 text-turf-bright" /> Anotar equipo</h3>
      {error && <p className="mb-3 text-sm text-clay">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Nombre del equipo (ej: Silva/Paz)" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Input placeholder="Jugadores, separados por coma" value={players} onChange={(e) => setPlayers(e.target.value)} className="flex-1" />
        <Button onClick={submit} disabled={isPending}>{isPending ? "Anotando..." : "Anotar"}</Button>
      </div>
    </div>
  );
}
