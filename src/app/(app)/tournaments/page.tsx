import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTournamentForm } from "@/components/tournaments/CreateTournamentForm";
import { getTournaments } from "@/server/actions/tournaments-read";
import { getSports } from "@/server/actions/sports";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador", REGISTRATION_OPEN: "Inscripciones", IN_PROGRESS: "En curso", FINISHED: "Finalizado",
};

export default async function TournamentsPage() {
  const [tournaments, sports] = await Promise.all([getTournaments(), getSports()]);

  return (
    <>
      <TopBar title="Torneos" />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-8">
        <div className="flex justify-end">
          <CreateTournamentForm sports={sports.map((s) => ({ id: s.id, name: s.name }))} />
        </div>

        {tournaments.length === 0 && (
          <p className="text-sm text-chalk-dim">Todavía no creaste ningún torneo. Es una función Pro — se activa un trial de 14 días automáticamente al crear el primero.</p>
        )}
        {tournaments.map((t) => (
          <Link key={t.id} href={`/tournaments/${t.id}`}>
            <Card className="flex items-center justify-between p-5 transition-colors hover:border-turf-bright">
              <div>
                <div className="font-display font-semibold">{t.name}</div>
                <div className="mt-1 font-mono text-xs text-chalk-dim">{t.format.replace("_", " ")} · {t.teams.length} equipos</div>
              </div>
              <Badge tone={t.status === "IN_PROGRESS" ? "confirmed" : "pending"}>{STATUS_LABEL[t.status]}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
