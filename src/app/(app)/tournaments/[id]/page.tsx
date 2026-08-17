import { TopBar } from "@/components/layout/TopBar";
import { Bracket } from "@/components/tournaments/Bracket";
import { TeamRegistrationForm } from "@/components/tournaments/TeamRegistrationForm";
import { Button } from "@/components/ui/button";
import { getTournament } from "@/server/actions/tournaments-read";
import { generateFixture } from "@/server/actions/tournaments";

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const tournament = await getTournament(params.id);
  if (!tournament) return <p className="p-8 text-sm text-chalk-dim">Torneo no encontrado.</p>;

  async function handleGenerate() {
    "use server";
    await generateFixture(params.id);
  }

  return (
    <>
      <TopBar title={tournament.name} />
      <div className="flex flex-col gap-6 px-4 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-chalk-dim">
            {tournament.teams.length} equipos anotados · link público: <span className="font-mono text-turf-bright">/t/{tournament.publicSlug}</span>
          </p>
          {tournament.matches.length === 0 && (
            <form action={handleGenerate}>
              <Button type="submit" disabled={tournament.teams.length < 2}>Generar fixture</Button>
            </form>
          )}
        </div>

        {tournament.matches.length === 0 && <TeamRegistrationForm tournamentId={tournament.id} />}

        {tournament.matches.length > 0 ? (
          <Bracket matches={tournament.matches as any} />
        ) : (
          <p className="text-sm text-chalk-dim">Anotá al menos 2 equipos y generá el fixture.</p>
        )}
      </div>
    </>
  );
}
