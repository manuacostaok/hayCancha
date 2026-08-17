import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { requireComplex } from "@/lib/tenant";
import { basePrisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const complex = await requireComplex().catch(() => null);
  if (!complex) redirect("/"); // dominio no resuelve a ningún complejo

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const membership = await basePrisma.membership.findFirst({
    where: { userId: (session.user as any).id, complexId: complex.id },
  });
  // el usuario está logueado pero no pertenece a ESTE complejo -> afuera
  if (!membership) redirect("/login");

  return (
    <div className="flex min-h-screen bg-ink text-chalk">
      <Sidebar complexName={complex.name} />
      <div className="flex min-h-screen flex-1 flex-col pb-16 lg:pb-0">{children}</div>
      <MobileNav />
    </div>
  );
}
