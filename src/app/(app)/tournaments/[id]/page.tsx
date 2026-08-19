import { TopBar } from "@/components/layout/TopBar";
import { Bracket } from "@/components/tournaments/Bracket";
import { StandingsTable } from "@/components/tournaments/StandingsTable";
import { TeamRegistrationForm } from "@/components/tournaments/TeamRegistrationForm";
import { Button } from "@/components/ui/button";
import { getTournament } from "@/server/actions/tournaments-read";
import { generateFixture, getStandings, generatePlayoffs } from "@/server/actions/tournaments";
import { computeStandings } from "@/server/services/bracket";

const IS_LEAGUE = new Set(["ROUND_ROBIN", "LEAGUE"]);

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const tournament = await getTournament(params.id);
  if (!tournament) return <p className="p-8 text-sm text-chalk-dim">Torneo no encontrado.</p>;

  const isLeague = IS_LEAGUE.has(tournament.format);
  const isGroups = tournament.format === "GROUPS_KNOCKOUT";

  const groupMatches = tournament.matches.filter((m: any) => m.round.startsWith("Grupo "));
  const playoffMatches = tournament.matches.filter((m: any) => m.round.startsWith("Playoffs"));
  const groupsPlayed = groupMatches.length > 0 && groupMatches.every((m: any) => m.status === "PLAYED");

  const groupsByLabel = new Map<string, typeof groupMatches>();
  for (const m of groupMatches) {
    const label = m.round.split(" · ")[0];
    groupsByLabel.set(label, [...(groupsByLabel.get(label) ?? []), m]);
  }

  const standings = isLeague && tournament.matches.length > 0 ? await getStandings(params.id) : [];

  async function handleGenerate() {
    "use server";
    await generateFixture(params.id);
  }
  async function handlePlayoffs() {
    "use server";
    await generatePlayoffs(params.id);
  }

  return (
    <>
      <TopBar title={tournament.name} />
      <div className="flex flex-col gap-6 px-4 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-chalk-dim">
            {tournament.format.replace("_", " ")} · {tournament.teams.length} equipos anotados · link público: <span className="font-mono text-turf-bright">/t/{tournament.publicSlug}</span>
          </p>
          {tournament.matches.length === 0 && (
            <form action={handleGenerate}>
              <Button type="submit" disabled={tournament.teams.length < 2}>Generar fixture</Button>
            </form>
          )}
          {isGroups && groupsPlayed && playoffMatches.length === 0 && (
            <form action={handlePlayoffs}>
              <Button type="submit">Generar playoffs con los clasificados</Button>
            </form>
          )}
        </div>

        {tournament.matches.length === 0 && <TeamRegistrationForm tournamentId={tournament.id} />}

        {isLeague && tournament.matches.length > 0 && (
          <>
            <StandingsTable standings={standings} />
            <Bracket matches={tournament.matches as any} />
          </>
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
            {!groupsPlayed && groupMatches.length > 0 && (
              <p className="text-sm text-amber">Faltan partidos de la fase de grupos para poder generar los playoffs.</p>
            )}
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

        {tournament.matches.length === 0 && (
          <p className="text-sm text-chalk-dim">Anotá al menos 2 equipos y generá el fixture.</p>
        )}
      </div>
    </>
  );
}
