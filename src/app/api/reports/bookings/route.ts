import { NextResponse } from "next/server";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";

/** Exporta las reservas del mes en CSV — se abre directo en Excel/Sheets. */
export async function GET() {
  const complex = await requireComplex();
  if (!hasFeature(complex.plan, "exports")) {
    return NextResponse.json({ error: "Exportar reportes es una función del plan Pro." }, { status: 403 });
  }

  const db = tenantPrisma(complex.id);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const bookings = await db.booking.findMany({
    where: { createdAt: { gte: startOfMonth } },
    include: { court: true, customer: true },
    orderBy: { startTime: "asc" },
  });

  const header = "Fecha,Hora,Cancha,Cliente,Telefono,Precio,Descuento,Cupon,Estado\n";
  const rows = bookings.map((b: any) => [
    new Date(b.startTime).toLocaleDateString("es-AR"),
    new Date(b.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    b.court.name,
    b.customer?.name ?? "",
    b.customer?.phone ?? "",
    b.totalPrice,
    b.discountApplied,
    b.couponCode ?? "",
    b.status,
  ].join(",")).join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas-${new Date().toISOString().slice(0, 7)}.csv"`,
    },
  });
}
