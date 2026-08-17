"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reportResult } from "@/server/actions/tournaments";

interface MatchVM {
  id: string;
  round: string;
  roundOrder: number;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
}

/** Bracket real, agrupado por ronda, con carga de resultado inline. */
export function Bracket({ matches }: { matches: MatchVM[] }) {
  const rounds = Array.from(new Set(matches.map((m) => m.roundOrder))).sort((a, b) => a - b);

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((r) => (
        <div key={r} className="flex min-w-[190px] flex-col justify-around gap-4">
          <div className="font-mono text-[11px] uppercase tracking-wide text-amber">
            {matches.find((m) => m.roundOrder === r)?.round}
          </div>
          {matches.filter((m) => m.roundOrder === r).map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ))}
    </div>
  );
}

function MatchCard({ match }: { match: MatchVM }) {
  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canPlay = match.teamA && match.teamB;

  function save() {
    startTransition(async () => {
      await reportResult(match.id, scoreA, scoreB);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-line bg-ink-2 p-3 font-mono text-xs">
      <div className="flex items-center justify-between py-1">
        <span className={match.scoreA != null && match.scoreA > (match.scoreB ?? -1) ? "font-semibold text-turf-bright" : "text-chalk-dim"}>
          {match.teamA?.name ?? "—"}
        </span>
        {editing ? (
          <input type="number" value={scoreA} onChange={(e) => setScoreA(Number(e.target.value))} className="w-10 rounded bg-ink px-1 text-center" />
        ) : (
          <span>{match.scoreA ?? ""}</span>
        )}
      </div>
      <div className="flex items-center justify-between py-1">
        <span className={match.scoreB != null && match.scoreB > (match.scoreA ?? -1) ? "font-semibold text-turf-bright" : "text-chalk-dim"}>
          {match.teamB?.name ?? "—"}
        </span>
        {editing ? (
          <input type="number" value={scoreB} onChange={(e) => setScoreB(Number(e.target.value))} className="w-10 rounded bg-ink px-1 text-center" />
        ) : (
          <span>{match.scoreB ?? ""}</span>
        )}
      </div>
      {canPlay && (
        editing ? (
          <button onClick={save} disabled={isPending} className="mt-2 w-full rounded bg-turf-bright py-1 text-[10px] font-bold text-ink">
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-2 w-full rounded border border-line py-1 text-[10px] text-chalk-dim">
            Cargar resultado
          </button>
        )
      )}
    </div>
  );
}
