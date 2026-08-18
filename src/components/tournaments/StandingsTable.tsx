interface Row {
  teamId: string; teamName: string; played: number; won: number; drawn: number;
  lost: number; goalsFor: number; goalsAgainst: number; diff: number; points: number;
}

/** Tabla de posiciones para torneos de liga / todos contra todos. */
export function StandingsTable({ standings }: { standings: Row[] }) {
  if (standings.length === 0) {
    return <p className="text-sm text-chalk-dim">Todavía no hay resultados cargados.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-ink-2 text-left font-mono text-[11px] uppercase tracking-wide text-chalk-dim">
          <tr>
            <th className="p-3">#</th><th className="p-3">Equipo</th><th className="p-3 text-center">PJ</th>
            <th className="p-3 text-center">G</th><th className="p-3 text-center">E</th><th className="p-3 text-center">P</th>
            <th className="p-3 text-center">DIF</th><th className="p-3 text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr key={row.teamId} className="border-t border-line">
              <td className="p-3 font-mono text-chalk-dim">{i + 1}</td>
              <td className={`p-3 font-medium ${i === 0 ? "text-turf-bright" : ""}`}>{row.teamName}</td>
              <td className="p-3 text-center font-mono">{row.played}</td>
              <td className="p-3 text-center font-mono">{row.won}</td>
              <td className="p-3 text-center font-mono">{row.drawn}</td>
              <td className="p-3 text-center font-mono">{row.lost}</td>
              <td className="p-3 text-center font-mono">{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
              <td className="p-3 text-center font-mono font-bold text-turf-bright">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
