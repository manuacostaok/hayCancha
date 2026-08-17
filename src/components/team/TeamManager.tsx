"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { inviteEmployee, removeEmployee, createBranch } from "@/server/actions/team";

interface EmployeeVM { id: string; role: string; user: { name: string; email: string } }
interface BranchVM { id: string; name: string; address: string | null; courts: { id: string }[] }

export function TeamManager({ initialEmployees, initialBranches }: { initialEmployees: EmployeeVM[]; initialBranches: BranchVM[] }) {
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchName, setBranchName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function invite() {
    if (!name || !email) return;
    startTransition(async () => {
      try {
        await inviteEmployee({ name, email });
        setName(""); setEmail("");
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try { await removeEmployee(id); router.refresh(); } catch (e: any) { setError(e.message); }
    });
  }

  function addBranch() {
    if (!branchName) return;
    startTransition(async () => {
      try {
        await createBranch({ name: branchName });
        setBranchName("");
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="rounded-lg border border-clay/40 bg-clay/10 px-4 py-2 text-sm text-clay">{error}</div>}

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold"><UserPlus className="h-4 w-4 text-turf-bright" /> Equipo</h3>

        <div className="mb-5 flex flex-col gap-2">
          {initialEmployees.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-line bg-ink px-4 py-2.5">
              <div>
                <div className="text-sm font-medium">{m.user.name}</div>
                <div className="font-mono text-xs text-chalk-dim">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={m.role === "OWNER" ? "confirmed" : "pending"}>{m.role === "OWNER" ? "Dueño" : "Empleado"}</Badge>
                {m.role !== "OWNER" && (
                  <button onClick={() => remove(m.id)} className="text-chalk-dim hover:text-clay"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={invite} disabled={isPending}>Invitar</Button>
        </div>
        <p className="mt-2 text-xs text-chalk-dim">Empleados ilimitados es una función del plan Pro.</p>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold"><Building2 className="h-4 w-4 text-turf-bright" /> Sucursales</h3>
        <div className="mb-5 flex flex-col gap-2">
          {initialBranches.map((b) => (
            <div key={b.id} className="rounded-lg border border-line bg-ink px-4 py-2.5 text-sm">
              {b.name} <span className="font-mono text-xs text-chalk-dim">· {b.courts.length} canchas</span>
            </div>
          ))}
          {initialBranches.length === 0 && <p className="text-sm text-chalk-dim">Todavía operás en una sola sede.</p>}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Nombre de la sucursal" value={branchName} onChange={(e) => setBranchName(e.target.value)} className="flex-1" />
          <Button variant="ghost" onClick={addBranch} disabled={isPending}>Agregar sucursal</Button>
        </div>
        <p className="mt-2 text-xs text-chalk-dim">Multi sucursal es una función del plan Pro.</p>
      </Card>
    </div>
  );
}
