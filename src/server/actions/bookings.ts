"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";
import { sendBookingConfirmation, sendCancellationNotice, sendRescheduleNotice } from "@/lib/notifications/whatsapp";
import { sendBookingEmail } from "@/lib/notifications/email";
import { validateCoupon } from "./coupons";
import { formatTime } from "@/lib/utils";

const CreateBookingSchema = z.object({
  courtId: z.string(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  totalPrice: z.number().nonnegative(),
  couponCode: z.string().optional(),
});

/** Alta de reserva: valida el límite del plan Free, crea/reutiliza cliente,
 *  crea la reserva y dispara la confirmación por WhatsApp si el plan es PRO. */
export async function createBooking(input: z.infer<typeof CreateBookingSchema>) {
  const complex = await requireComplex();
  const data = CreateBookingSchema.parse(input);
  const db = tenantPrisma(complex.id);

  let customer = await db.customer.findFirst({ where: { phone: data.customerPhone } });
  if (!customer) {
    customer = await db.customer.create({ data: { name: data.customerName, phone: data.customerPhone } });
  }

  const court = await db.court.findFirst({ where: { id: data.courtId } });

  // Cupón (Pro): si viene un código, se valida y se aplica el descuento acá,
  // nunca confiando en un totalPrice ya descontado que venga del cliente.
  let finalPrice = data.totalPrice;
  let discountApplied = 0;
  let appliedCode: string | undefined;
  if (data.couponCode && hasFeature(complex.plan, "coupons")) {
    const result = await validateCoupon(data.couponCode, data.totalPrice);
    if (result.valid) {
      finalPrice = result.finalPrice;
      discountApplied = result.discount;
      appliedCode = data.couponCode.toUpperCase();
      await db.coupon.updateMany({ where: { id: result.couponId }, data: { usesCount: { increment: 1 } } });
    }
  }

  const booking = await db.booking.create({
    data: {
      courtId: data.courtId,
      customerId: customer.id,
      startTime: data.startTime,
      endTime: data.endTime,
      totalPrice: finalPrice,
      discountApplied,
      couponCode: appliedCode,
      status: "CONFIRMED",
    },
  });

  // Fidelización (Pro): 1 punto cada $1.000 gastados. Simple y transparente.
  if (hasFeature(complex.plan, "loyalty")) {
    await db.customer.updateMany({
      where: { id: customer.id },
      data: { loyaltyPoints: { increment: Math.floor(finalPrice / 1000) } },
    });
  }

  if (hasFeature(complex.plan, "whatsapp")) {
    await sendBookingConfirmation({
      toPhone: customer.phone,
      customerName: customer.name,
      courtName: court?.name ?? "tu cancha",
      when: formatTime(data.startTime),
    }).catch((e: any) => console.error("WhatsApp falló, no bloqueamos la reserva:", e));
  }
  if (customer.email) {
    await sendBookingEmail({
      to: customer.email,
      customerName: customer.name,
      courtName: court?.name ?? "tu cancha",
      complexName: complex.name,
      when: formatTime(data.startTime),
      kind: "confirmacion",
    }).catch((e: any) => console.error("Email falló, no bloqueamos la reserva:", e));
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
    bookingsLimit: null,
    courtCount,
    courtLimit: complex.plan === "STARTER" ? 3 : null,
    revenueThisMonth: revenueAgg._sum.totalPrice ?? 0,
  };
}

export async function cancelBooking(bookingId: string) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  const booking = await db.booking.findFirst({ where: { id: bookingId }, include: { court: true, customer: true } });
  if (!booking) throw new Error("Reserva no encontrada");

  await db.booking.updateMany({ where: { id: bookingId }, data: { status: "CANCELED" } });

  if (booking.customer) {
    const when = formatTime(booking.startTime);
    if (hasFeature(complex.plan, "whatsapp")) {
      await sendCancellationNotice({ toPhone: booking.customer.phone, customerName: booking.customer.name, courtName: booking.court.name, when })
        .catch((e: any) => console.error("WhatsApp de cancelación falló:", e));
    }
    if (booking.customer.email) {
      await sendBookingEmail({ to: booking.customer.email, customerName: booking.customer.name, courtName: booking.court.name, complexName: complex.name, when, kind: "cancelacion" })
        .catch((e: any) => console.error("Email de cancelación falló:", e));
    }
  }

  revalidatePath("/calendar");
}

export async function rescheduleBooking(bookingId: string, newStartTime: Date, newEndTime: Date) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  const booking = await db.booking.findFirst({ where: { id: bookingId }, include: { court: true, customer: true } });
  if (!booking) throw new Error("Reserva no encontrada");

  await db.booking.updateMany({ where: { id: bookingId }, data: { startTime: newStartTime, endTime: newEndTime } });

  if (booking.customer) {
    const when = formatTime(newStartTime);
    if (hasFeature(complex.plan, "whatsapp")) {
      await sendRescheduleNotice({ toPhone: booking.customer.phone, customerName: booking.customer.name, courtName: booking.court.name, when })
        .catch((e: any) => console.error("WhatsApp de reprogramación falló:", e));
    }
    if (booking.customer.email) {
      await sendBookingEmail({ to: booking.customer.email, customerName: booking.customer.name, courtName: booking.court.name, complexName: complex.name, when, kind: "reprogramacion" })
        .catch((e: any) => console.error("Email de reprogramación falló:", e));
    }
  }

  revalidatePath("/calendar");
}

export async function toggleVip(customerId: string, isVip: boolean) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);
  await db.customer.updateMany({ where: { id: customerId }, data: { isVip } });
  revalidatePath("/customers");
}
