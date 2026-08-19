import { Trophy, Trees } from "lucide-react";
import { Bracket } from "@/components/tournaments/Bracket";
import { StandingsTable } from "@/components/tournaments/StandingsTable";
import { getTournamentBySlug } from "@/server/actions/tournaments-read";
import { getStandings } from "@/server/actions/tournaments";
import { computeStandings } from "@/server/services/bracket";

const IS_LEAGUE = new Set(["ROUND_ROBIN", "LEAGUE"]);

export default async function PublicTournamentPage({ params }: { params: { tournamentSlug: string } }) {
  const tournament = await getTournamentBySlug(params.tournamentSlug);
  if (!tournament) {
    return <div className="flex min-h-screen items-center justify-center bg-ink text-chalk-dim">Torneo no encontrado.</div>;
  }

  const isLeague = IS_LEAGUE.has(tournament.format);
  const isGroups = tournament.format === "GROUPS_KNOCKOUT";
  const standings = isLeague && tournament.matches.length > 0 ? await getStandings(tournament.id) : [];

  const groupMatches = tournament.matches.filter((m: any) => m.round.startsWith("Grupo "));
  const playoffMatches = tournament.matches.filter((m: any) => m.round.startsWith("Playoffs"));
  const groupsByLabel = new Map<string, typeof groupMatches>();
  for (const m of groupMatches) {
    const label = m.round.split(" · ")[0];
    groupsByLabel.set(label, [...(groupsByLabel.get(label) ?? []), m]);
  }

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

        {tournament.matches.length === 0 && <p className="text-sm text-chalk-dim">El fixture todavía no se generó.</p>}

        {isLeague && tournament.matches.length > 0 && (
          <div className="flex flex-col gap-6">
            <StandingsTable standings={standings} />
            <Bracket matches={tournament.matches as any} />
          </div>
        )}

        {isGroups && (
          <div className="flex flex-col gap-6">
            {[...groupsByLabel.entries()].map(([label, matches]) => (
              <div key={label}>
                <h3 className="mb-2 font-display text-sm font-semibold">{label}</h3>
                <StandingsTable
                  standings={computeStandings(matches.map((m: any) => ({
                    teamAId: m.teamAId, teamBId: m.teamBId,
                    teamAName: m.teamA?.name, teamBName: m.teamB?.name,
                    scoreA: m.scoreA, scoreB: m.scoreB, status: m.status,
                  })))}
                />
              </div>
            ))}
            {playoffMatches.length > 0 && (
              <div>
                <h3 className="mb-3 font-display text-sm font-semibold">Playoffs</h3>
                <Bracket matches={playoffMatches as any} />
              </div>
            )}
          </div>
        )}

        {(tournament.format === "SINGLE_ELIM" || tournament.format === "DOUBLE_ELIM") && tournament.matches.length > 0 && (
          <Bracket matches={tournament.matches as any} />
        )}
      </div>
    </div>
  );
}
