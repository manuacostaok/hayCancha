import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/payments/mercadopago";
import { basePrisma } from "@/lib/prisma";

/**
 * Mercado Pago pega acá cada vez que cambia el estado de un pago.
 * Buscamos la reserva por external_reference y actualizamos su estado.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const paymentId = body?.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  const payment = await getPayment(paymentId);
  const bookingId = payment.external_reference as string | undefined;
  if (!bookingId) return NextResponse.json({ ok: true });

  const status = payment.status === "approved" ? "CONFIRMED" : "PENDING";

  await basePrisma.booking.update({
    where: { id: bookingId },
    data: {
      status,
      mpPaymentId: String(paymentId),
      paymentMethod: "MERCADO_PAGO",
      depositPaid: payment.status === "approved" ? payment.transaction_amount : 0,
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
