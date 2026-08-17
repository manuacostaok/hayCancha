/**
 * Integración liviana con Mercado Pago (Checkout Pro) vía fetch directo,
 * sin el SDK completo — menos dependencias, mismo resultado para nuestro caso
 * (una preferencia de pago por reserva o por seña).
 */
const MP_API = "https://api.mercadopago.com";

interface CreatePreferenceInput {
  bookingId: string;
  title: string;
  amount: number;
  payerEmail?: string;
}

export async function createPaymentPreference({ bookingId, title, amount, payerEmail }: CreatePreferenceInput) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en el .env");

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ title, quantity: 1, unit_price: amount, currency_id: "ARS" }],
      payer: payerEmail ? { email: payerEmail } : undefined,
      external_reference: bookingId,
      back_urls: {
        success: `${appUrl}/pago/exito`,
        failure: `${appUrl}/pago/error`,
        pending: `${appUrl}/pago/pendiente`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
    }),
  });

  if (!res.ok) throw new Error(`Mercado Pago rechazó la preferencia: ${await res.text()}`);
  return res.json() as Promise<{ id: string; init_point: string }>;
}

export async function getPayment(paymentId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo consultar el pago en Mercado Pago");
  return res.json();
}
