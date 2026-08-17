import { NextRequest, NextResponse } from "next/server";
import { createPaymentPreference } from "@/lib/payments/mercadopago";

/** El front llama acá para generar el link de pago de una reserva. */
export async function POST(req: NextRequest) {
  const { bookingId, title, amount, payerEmail } = await req.json();
  try {
    const pref = await createPaymentPreference({ bookingId, title, amount, payerEmail });
    return NextResponse.json({ initPoint: pref.init_point });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
