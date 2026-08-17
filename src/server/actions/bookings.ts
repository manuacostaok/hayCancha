"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";
import { sendBookingConfirmation } from "@/lib/notifications/whatsapp";
import { formatTime } from "@/lib/utils";

const CreateBookingSchema = z.object({
  courtId: z.string(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  totalPrice: z.number().nonnegative(),
});

/** Alta de reserva: valida el límite del plan Free, crea/reutiliza cliente,
 *  crea la reserva y dispara la confirmación por WhatsApp si el plan es PRO. */
export async function createBooking(input: z.infer<typeof CreateBookingSchema>) {
  const complex = await requireComplex();
  const data = CreateBookingSchema.parse(input);
  const db = tenantPrisma(complex.id);

  if (complex.plan === "FREE") {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const count = await db.booking.count({ where: { createdAt: { gte: startOfMonth } } });
    if (count >= 200) {
      throw new Error("Llegaste al límite de 200 reservas de tu plan Free este mes. Pasate a Pro para reservas ilimitadas.");
    }
  }

  let customer = await db.customer.findFirst({ where: { phone: data.customerPhone } });
  if (!customer) {
    customer = await db.customer.create({ data: { name: data.customerName, phone: data.customerPhone } });
  }

  const court = await db.court.findFirst({ where: { id: data.courtId } });

  const booking = await db.booking.create({
    data: {
      courtId: data.courtId,
      customerId: customer.id,
      startTime: data.startTime,
      endTime: data.endTime,
      totalPrice: data.totalPrice,
      status: "CONFIRMED",
    },
  });

  if (hasFeature(complex.plan, "whatsapp")) {
    await sendBookingConfirmation({
      toPhone: customer.phone,
      customerName: customer.name,
      courtName: court?.name ?? "tu cancha",
      when: formatTime(data.startTime),
    }).catch((e) => console.error("WhatsApp falló, no bloqueamos la reserva:", e));
  }

  revalidatePath("/calendar");
  return booking;
}

export async function getBookingsForDay(day: Date) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);

  return db.booking.findMany({
    where: { startTime: { gte: start, lt: end } },
    include: { court: true, customer: true },
    orderBy: { startTime: "asc" },
  });
}

export async function getCourtsWithSport() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  return db.court.findMany({ include: { sport: true }, orderBy: { name: "asc" } });
}

export async function getCustomers() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  return db.customer.findMany({
    include: { bookings: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getComplexUsage() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const [bookingsThisMonth, courtCount, revenueAgg] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.court.count(),
    db.booking.aggregate({ _sum: { totalPrice: true }, where: { createdAt: { gte: startOfMonth }, status: "CONFIRMED" } }),
  ]);

  return {
    plan: complex.plan,
    bookingsThisMonth,
    bookingsLimit: complex.plan === "FREE" ? 200 : null,
    courtCount,
    courtLimit: complex.plan === "FREE" ? 2 : null,
    revenueThisMonth: revenueAgg._sum.totalPrice ?? 0,
  };
}
