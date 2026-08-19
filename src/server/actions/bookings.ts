"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireComplex } from "@/lib/tenant";
import { tenantPrisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/permissions";
import {
  sendBookingConfirmation,
  sendCancellationNotice,
  sendRescheduleNotice,
} from "@/lib/notifications/whatsapp";
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

/**
 * Alta de reserva:
 * - Valida el complejo actual.
 * - Valida que la cancha pertenezca al complejo.
 * - Crea o reutiliza el cliente dentro del complejo.
 * - Valida y aplica cupones PRO.
 * - Crea la reserva.
 * - Suma puntos de fidelización si corresponde.
 * - Envía confirmación por WhatsApp/email.
 */
export async function createBooking(
  input: z.infer<typeof CreateBookingSchema>
) {
  const complex = await requireComplex();
  const data = CreateBookingSchema.parse(input);
  const db = tenantPrisma(complex.id);

  // ============================================================
  // CANCHA
  // ============================================================

  const court = await db.court.findFirst({
    where: {
      id: data.courtId,
      complexId: complex.id,
    },
  });

  if (!court) {
    throw new Error("Cancha no encontrada");
  }

  // ============================================================
  // CLIENTE
  // ============================================================

  // Buscamos el cliente solamente dentro del complejo actual.
  // Esto evita mezclar clientes entre distintos complejos.
  let customer = await db.customer.findFirst({
    where: {
      phone: data.customerPhone,
      complexId: complex.id,
    },
  });

  // Si no existe, lo creamos asociado al complejo actual.
  if (!customer) {
    customer = await db.customer.create({
      data: {
        complexId: complex.id,
        name: data.customerName,
        phone: data.customerPhone,
      },
    });
  }

  // ============================================================
  // CUPÓN
  // ============================================================

  let finalPrice = data.totalPrice;
  let discountApplied = 0;
  let appliedCode: string | undefined;

  if (
    data.couponCode &&
    hasFeature(complex.plan, "coupons")
  ) {
    const result = await validateCoupon(
      data.couponCode,
      data.totalPrice
    );

    if (result.valid) {
      finalPrice = result.finalPrice;
      discountApplied = result.discount;
      appliedCode = data.couponCode.toUpperCase();

      await db.coupon.updateMany({
        where: {
          id: result.couponId,
        },
        data: {
          usesCount: {
            increment: 1,
          },
        },
      });
    }
  }

  // ============================================================
  // RESERVA
  // ============================================================

  const booking = await db.booking.create({
    data: {
      complexId: complex.id,
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

  // ============================================================
  // FIDELIZACIÓN PRO
  // ============================================================

  // 1 punto cada $1.000 gastados.
  if (hasFeature(complex.plan, "loyalty")) {
    await db.customer.updateMany({
      where: {
        id: customer.id,
        complexId: complex.id,
      },
      data: {
        loyaltyPoints: {
          increment: Math.floor(finalPrice / 1000),
        },
      },
    });
  }

  // ============================================================
  // WHATSAPP
  // ============================================================

  if (hasFeature(complex.plan, "whatsapp")) {
    await sendBookingConfirmation({
      toPhone: customer.phone,
      customerName: customer.name,
      courtName: court.name,
      when: formatTime(data.startTime),
    }).catch((e: any) =>
      console.error(
        "WhatsApp falló, no bloqueamos la reserva:",
        e
      )
    );
  }

  // ============================================================
  // EMAIL
  // ============================================================

  if (customer.email) {
    await sendBookingEmail({
      to: customer.email,
      customerName: customer.name,
      courtName: court.name,
      complexName: complex.name,
      when: formatTime(data.startTime),
      kind: "confirmacion",
    }).catch((e: any) =>
      console.error(
        "Email falló, no bloqueamos la reserva:",
        e
      )
    );
  }

  revalidatePath("/calendar");

  return booking;
}

// ============================================================
// RESERVAS DEL DÍA
// ============================================================

export async function getBookingsForDay(day: Date) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const start = new Date(day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start.getTime() + 86400000);

  return db.booking.findMany({
    where: {
      complexId: complex.id,
      startTime: {
        gte: start,
        lt: end,
      },
    },
    include: {
      court: true,
      customer: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });
}

// ============================================================
// CANCHAS CON DEPORTE
// ============================================================

export async function getCourtsWithSport() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.court.findMany({
    where: {
      complexId: complex.id,
    },
    include: {
      sport: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

// ============================================================
// CLIENTES
// ============================================================

export async function getCustomers() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  return db.customer.findMany({
    where: {
      complexId: complex.id,
    },
    include: {
      bookings: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// ============================================================
// USO DEL COMPLEJO
// ============================================================

export async function getComplexUsage() {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    bookingsThisMonth,
    courtCount,
    revenueAgg,
  ] = await Promise.all([
    db.booking.count({
      where: {
        complexId: complex.id,
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),

    db.court.count({
      where: {
        complexId: complex.id,
      },
    }),

    db.booking.aggregate({
      _sum: {
        totalPrice: true,
      },
      where: {
        complexId: complex.id,
        createdAt: {
          gte: startOfMonth,
        },
        status: "CONFIRMED",
      },
    }),
  ]);

  return {
    plan: complex.plan,
    bookingsThisMonth,
    bookingsLimit: null,
    courtCount,
    courtLimit:
      complex.plan === "STARTER"
        ? 3
        : null,
    revenueThisMonth:
      revenueAgg._sum.totalPrice ?? 0,
  };
}

// ============================================================
// CANCELAR RESERVA
// ============================================================

export async function cancelBooking(
  bookingId: string
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      complexId: complex.id,
    },
    include: {
      court: true,
      customer: true,
    },
  });

  if (!booking) {
    throw new Error("Reserva no encontrada");
  }

  await db.booking.updateMany({
    where: {
      id: bookingId,
      complexId: complex.id,
    },
    data: {
      status: "CANCELED",
    },
  });

  if (booking.customer) {
    const when = formatTime(
      booking.startTime
    );

    // ==========================================================
    // WHATSAPP
    // ==========================================================

    if (hasFeature(complex.plan, "whatsapp")) {
      await sendCancellationNotice({
        toPhone: booking.customer.phone,
        customerName: booking.customer.name,
        courtName: booking.court.name,
        when,
      }).catch((e: any) =>
        console.error(
          "WhatsApp de cancelación falló:",
          e
        )
      );
    }

    // ==========================================================
    // EMAIL
    // ==========================================================

    if (booking.customer.email) {
      await sendBookingEmail({
        to: booking.customer.email,
        customerName: booking.customer.name,
        courtName: booking.court.name,
        complexName: complex.name,
        when,
        kind: "cancelacion",
      }).catch((e: any) =>
        console.error(
          "Email de cancelación falló:",
          e
        )
      );
    }
  }

  revalidatePath("/calendar");
}

// ============================================================
// REPROGRAMAR RESERVA
// ============================================================

export async function rescheduleBooking(
  bookingId: string,
  newStartTime: Date,
  newEndTime: Date
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      complexId: complex.id,
    },
    include: {
      court: true,
      customer: true,
    },
  });

  if (!booking) {
    throw new Error("Reserva no encontrada");
  }

  await db.booking.updateMany({
    where: {
      id: bookingId,
      complexId: complex.id,
    },
    data: {
      startTime: newStartTime,
      endTime: newEndTime,
    },
  });

  if (booking.customer) {
    const when = formatTime(
      newStartTime
    );

    // ==========================================================
    // WHATSAPP
    // ==========================================================

    if (hasFeature(complex.plan, "whatsapp")) {
      await sendRescheduleNotice({
        toPhone: booking.customer.phone,
        customerName: booking.customer.name,
        courtName: booking.court.name,
        when,
      }).catch((e: any) =>
        console.error(
          "WhatsApp de reprogramación falló:",
          e
        )
      );
    }

    // ==========================================================
    // EMAIL
    // ==========================================================

    if (booking.customer.email) {
      await sendBookingEmail({
        to: booking.customer.email,
        customerName: booking.customer.name,
        courtName: booking.court.name,
        complexName: complex.name,
        when,
        kind: "reprogramacion",
      }).catch((e: any) =>
        console.error(
          "Email de reprogramación falló:",
          e
        )
      );
    }
  }

  revalidatePath("/calendar");
}

// ============================================================
// TOGGLE VIP
// ============================================================

export async function toggleVip(
  customerId: string,
  isVip: boolean
) {
  const complex = await requireComplex();
  const db = tenantPrisma(complex.id);

  await db.customer.updateMany({
    where: {
      id: customerId,
      complexId: complex.id,
    },
    data: {
      isVip,
    },
  });

  revalidatePath("/customers");
}