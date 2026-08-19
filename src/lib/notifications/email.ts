/**
 * Emails transaccionales vía Resend. Igual que WhatsApp: si no hay
 * RESEND_API_KEY configurado, no rompe el flujo — solo lo loguea.
 * Se usa como respaldo cuando el cliente no tiene WhatsApp o directamente
 * como canal principal en el plan Starter (que no tiene WhatsApp automático).
 */
interface BookingEmailInput {
  to: string;
  customerName: string;
  courtName: string;
  complexName: string;
  when: string;
  kind: "confirmacion" | "cancelacion" | "reprogramacion";
}

const SUBJECTS: Record<BookingEmailInput["kind"], string> = {
  confirmacion: "Tu reserva está confirmada",
  cancelacion: "Tu reserva fue cancelada",
  reprogramacion: "Tu reserva cambió de horario",
};

export async function sendBookingEmail({ to, customerName, courtName, complexName, when, kind }: BookingEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:stub] ${SUBJECTS[kind]} a ${to}: ${customerName}, ${courtName}, ${when}`);
    return { sent: false, reason: "Resend no configurado (falta RESEND_API_KEY)" };
  }

  const body: Record<BookingEmailInput["kind"], string> = {
    confirmacion: `Hola ${customerName}, tu reserva en ${complexName} quedó confirmada para ${courtName} el ${when}. ¡Te esperamos!`,
    cancelacion: `Hola ${customerName}, tu reserva en ${complexName} para ${courtName} el ${when} fue cancelada.`,
    reprogramacion: `Hola ${customerName}, tu reserva en ${complexName} se reprogramó: ahora es en ${courtName} el ${when}.`,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${complexName} <reservas@resend.dev>`,
      to,
      subject: `${SUBJECTS[kind]} — ${complexName}`,
      text: body[kind],
    }),
  });

  if (!res.ok) {
    console.error("Error enviando email:", await res.text());
    return { sent: false, reason: "Falló el envío" };
  }
  return { sent: true };
}
