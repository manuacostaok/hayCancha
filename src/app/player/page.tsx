import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Trees, Search } from "lucide-react";
import { PlayerComplexSearch } from "@/components/player/PlayerComplexSearch";

export default async function PlayerHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-ink px-5 py-8 text-chalk sm:px-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-2 font-display text-lg font-bold">
          <Trees className="h-5 w-5 text-turf-bright" /> Canchas
        </div>
        <h1 className="mb-2 font-display text-2xl font-bold">Hola, {session.user.name?.split(" ")[0]} 👋</h1>
        <p className="mb-8 text-sm text-chalk-dim">
          Todavía no tenemos un buscador de complejos cerca tuyo — está en camino. Por ahora, si un complejo
          te pasó su link de reserva o de torneo, entrá directo con ese link. Si sabés el nombre del complejo,
          probá acá:
        </p>
        <PlayerComplexSearch />
        <div className="mt-10 rounded-2xl border border-line bg-ink-2 p-5">
          <div className="mb-2 flex items-center gap-2 font-display text-sm font-semibold">
            <Search className="h-4 w-4 text-amber" /> Próximamente
          </div>
          <p className="text-sm text-chalk-dim">
            Buscador de complejos cerca tuyo, tu historial de reservas, tus torneos anotados y armar picaditos
            informales en espacios públicos. Si te interesa alguna en particular, avisale a tu complejo — nos
            ayuda a priorizar qué construir primero.
          </p>
        </div>
      </div>
    </div>
  );
}
