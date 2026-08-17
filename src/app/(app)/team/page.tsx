import { TopBar } from "@/components/layout/TopBar";
import { getEmployees, getBranches } from "@/server/actions/team";
import { TeamManager } from "@/components/team/TeamManager";

export default async function TeamPage() {
  const [employees, branches] = await Promise.all([getEmployees(), getBranches()]);
  return (
    <>
      <TopBar title="Equipo y sucursales" />
      <div className="px-4 py-4 sm:px-8">
        <TeamManager initialEmployees={employees as any} initialBranches={branches as any} />
      </div>
    </>
  );
}
