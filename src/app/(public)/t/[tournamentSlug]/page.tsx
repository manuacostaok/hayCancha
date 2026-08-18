import { Trophy, Trees } from "lucide-react";
import { Bracket } from "@/components/tournaments/Bracket";
import { StandingsTable } from "@/components/tournaments/StandingsTable";
import { getTournamentBySlug } from "@/server/actions/tournaments-read";
import { getStandings } from "@/server/actions/tournaments";

const IS_LEAGUE = new Set(["ROUND_ROBIN", "LEAGUE"]);

export default async function PublicTournamentPage({ params }: { params: { tournamentSlug: string } }) {
  const tournament = await getTournamentBySlug(params.tournamentSlug);

  if (!tournament) {
    return <div className="flex min-h-screen items-center justify-center bg-ink text-chalk-dim">Torneo no encontrado.</div>;
  }

  const isLeague = IS_LEAGUE.has(tournament.format);
  const standings = isLeague && tournament.matches.length > 0 ? await getStandings(tournament.id) : [];

  return (
    <div className="min-h-screen bg-ink px-5 py-8 text-chalk sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-2 font-display font-semibold"><Trees className="h-5 w-5 text-turf-bright" /> Canchas</div>
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-full bg-amber/15 p-3"><Trophy className="h-6 w-6 text-amber" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold">{tournament.name}</h1>
            <p className="font-mono text-xs text-chalk-dim">{tournament.format.replace("_", " ")} · {tournament.teams.length} equipos</p>
          </div>
        </div>
        {tournament.matches.length > 0 ? (
          <div className="flex flex-col gap-6">
            {isLeague && <StandingsTable standings={standings} />}
            <Bracket matches={tournament.matches as any} />
          </div>
        ) : (
          <p className="text-sm text-chalk-dim">El fixture todavía no se generó.</p>
        )}
      </div>
    </div>
  );
}
