/**
 * WhatsApp Cloud API (Meta) — mensajes de plantilla para confirmaciones y
 * recordatorios de reserva. Requiere tener una plantilla aprobada en Meta
 * llamada "confirmacion_reserva" con 3 variables: {{1}} nombre, {{2}} cancha,
 * {{3}} horario. Si no tenés WHATSAPP_TOKEN configurado, la función no falla
 * la reserva — solo lo loguea, para no bloquear el flujo principal.
 */
interface SendConfirmationInput {
  toPhone: string;
  customerName: string;
  courtName: string;
  when: string;
}

export async function sendBookingConfirmation({ toPhone, customerName, courtName, when }: SendConfirmationInput) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[whatsapp:stub] Confirmaría a ${toPhone}: ${customerName}, ${courtName}, ${when}`);
    return { sent: false, reason: "WhatsApp no configurado (falta WHATSAPP_TOKEN)" };
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: "confirmacion_reserva",
        language: { code: "es_AR" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: customerName },
            { type: "text", text: courtName },
            { type: "text", text: when },
          ],
        }],
      },
    }),
  });

  if (!res.ok) {
    console.error("Error enviando WhatsApp:", await res.text());
    return { sent: false, reason: "Falló el envío" };
  }
  return { sent: true };
}

async function sendTemplate(templateName: string, toPhone: string, params: string[]) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[whatsapp:stub] ${templateName} a ${toPhone}: ${params.join(", ")}`);
    return { sent: false, reason: "WhatsApp no configurado (falta WHATSAPP_TOKEN)" };
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: "es_AR" },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
      },
    }),
  });

  if (!res.ok) {
    console.error(`Error enviando WhatsApp (${templateName}):`, await res.text());
    return { sent: false, reason: "Falló el envío" };
  }
  return { sent: true };
}

/** Requiere una plantilla "cancelacion_reserva" aprobada en Meta con las mismas 3 variables. */
export async function sendCancellationNotice({ toPhone, customerName, courtName, when }: SendConfirmationInput) {
  return sendTemplate("cancelacion_reserva", toPhone, [customerName, courtName, when]);
}

/** Requiere una plantilla "reprogramacion_reserva" aprobada en Meta con las mismas 3 variables. */
export async function sendRescheduleNotice({ toPhone, customerName, courtName, when }: SendConfirmationInput) {
  return sendTemplate("reprogramacion_reserva", toPhone, [customerName, courtName, when]);
}
