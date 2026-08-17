import { TopBar } from "@/components/layout/TopBar";
import { SportsManager } from "@/components/sports/SportsManager";
import { getSports } from "@/server/actions/sports";

export default async function SportsPage() {
  const sports = await getSports();
  return (
    <>
      <TopBar title="Deportes" />
      <div className="px-4 py-4 sm:px-8">
        <SportsManager initialSports={sports} />
      </div>
    </>
  );
}
