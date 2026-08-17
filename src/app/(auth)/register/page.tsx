"use client";
import { useState } from "react";
import { Trees } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerComplex } from "@/server/actions/auth";

/** Onboarding en 3 pasos — objetivo: complejo creado en menos de 5 minutos. */
export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  const [complexName, setComplexName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [sportName, setSportName] = useState("");
  const [courtName, setCourtName] = useState("");

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      const result = await registerComplex({ complexName, ownerEmail, ownerPassword, sportName, courtName });
      setSlug(result.slug);
      setStep(4);
    } catch (e: any) {
      setError(e.message ?? "Algo salió mal, probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 font-display text-lg font-bold">
          <Trees className="h-5 w-5 text-turf-bright" /> Canchas
        </div>
        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map((n) => <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-turf-bright" : "bg-ink-3"}`} />)}
        </div>

        {error && <p className="mb-4 rounded-lg border border-clay/40 bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-lg font-semibold">Contanos de tu complejo</h1>
            <Input placeholder="Nombre del complejo" value={complexName} onChange={(e) => setComplexName(e.target.value)} />
            <Input placeholder="Tu email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
            <Input placeholder="Contraseña" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
            <Button size="lg" disabled={!complexName || !ownerEmail || ownerPassword.length < 6} onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-lg font-semibold">Tu primer deporte y cancha</h1>
            <Input placeholder="Deporte (ej: Pádel)" value={sportName} onChange={(e) => setSportName(e.target.value)} />
            <Input placeholder="Nombre de la cancha (ej: Cancha 1)" value={courtName} onChange={(e) => setCourtName(e.target.value)} />
            <Button size="lg" disabled={!sportName || !courtName} onClick={() => setStep(3)}>Continuar</Button>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-4 text-center">
            <h1 className="font-display text-lg font-semibold">Todo listo para crear tu cuenta</h1>
            <p className="text-sm text-chalk-dim">{complexName} · {sportName} · {courtName}</p>
            <Button size="lg" disabled={loading} onClick={finish}>{loading ? "Creando..." : "Crear mi complejo"}</Button>
          </div>
        )}
        {step === 4 && slug && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="font-display text-lg font-semibold">¡Listo! Ya podés recibir reservas.</h1>
            <p className="text-sm text-chalk-dim">
              Tu link público para compartir:<br />
              <span className="font-mono text-turf-bright">canchas.app/book/{slug}</span>
            </p>
            <Button size="lg" className="w-full">Ir al calendario</Button>
          </div>
        )}
      </div>
    </div>
  );
}
