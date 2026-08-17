"use client";
import { useState } from "react";
import { Trees, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SPORTS = ["Pádel", "Fútbol 5", "Tenis"];
const SLOTS = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

/**
 * Reserva pública sin login — pensada primero para celular (el 90% de este
 * tráfico llega desde un link de WhatsApp o Instagram), con fallback cómodo
 * en pantallas grandes. 3 pasos: deporte → horario → tus datos.
 */
export default function PublicBookingPage({ params }: { params: { complexSlug: string } }) {
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState(SPORTS[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <div className="rounded-full bg-turf-dim p-4"><Check className="h-8 w-8 text-turf-bright" /></div>
        <h1 className="font-display text-xl font-bold">¡Reserva confirmada!</h1>
        <p className="max-w-xs text-sm text-chalk-dim">Te esperamos a las {slot} para jugar {sport}. Te llega la confirmación por WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-ink px-5 py-6 sm:max-w-lg">
      <div className="mb-8 flex items-center gap-2">
        <Trees className="h-5 w-5 text-turf-bright" />
        <span className="font-display font-semibold capitalize">{params.complexSlug.replace(/-/g, " ")}</span>
      </div>

      <div className="mb-8 flex gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={cn("h-1 flex-1 rounded-full", n <= step ? "bg-turf-bright" : "bg-ink-3")} />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <h1 className="mb-2 font-display text-xl font-bold">¿Qué querés jugar?</h1>
          {SPORTS.map((s) => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={cn(
                "rounded-xl border p-4 text-left font-medium",
                sport === s ? "border-turf-bright bg-turf-dim/30" : "border-line bg-ink-2"
              )}
            >
              {s}
            </button>
          ))}
          <Button size="lg" className="mt-4" onClick={() => setStep(2)}>Continuar</Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <h1 className="mb-2 font-display text-xl font-bold">Elegí un horario — hoy</h1>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={cn(
                  "rounded-lg border p-3 text-center font-mono text-sm",
                  slot === s ? "border-turf-bright bg-turf-dim/30 text-turf-bright" : "border-line bg-ink-2 text-chalk-dim"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Button size="lg" className="mt-4" disabled={!slot} onClick={() => setStep(3)}>Continuar</Button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="mb-1 font-display text-xl font-bold">Tus datos</h1>
          <Input placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="WhatsApp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button size="lg" disabled={!name || !phone} onClick={() => setDone(true)}>
            Confirmar reserva — {sport} {slot}
          </Button>
        </div>
      )}
    </div>
  );
}
