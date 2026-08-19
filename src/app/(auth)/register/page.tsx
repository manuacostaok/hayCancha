"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Trees } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerComplex, registerPlayer } from "@/server/actions/auth";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const searchParams = useSearchParams();
  const isPlayer = searchParams.get("rol") === "jugador";
  return isPlayer ? <PlayerRegister /> : <ComplexRegister />;
}

/** Cuenta de jugador — solo nombre, email y contraseña. Sin complejo, sin canchas. */
function PlayerRegister() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await registerPlayer({ name, email, password });
      await signIn("credentials", { email, password, redirect: false });
      router.push("/player");
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
        <h1 className="mb-1 text-center font-display text-lg font-semibold">Creá tu cuenta de jugador</h1>
        <p className="mb-6 text-center text-sm text-chalk-dim">Para reservar y anotarte a torneos.</p>
        {error && <p className="mb-4 rounded-lg border border-clay/40 bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}
        <div className="flex flex-col gap-4">
          <Input placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button size="lg" disabled={loading || !name || !email || password.length < 6} onClick={submit}>
            {loading ? "Creando..." : "Crear cuenta"}
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-chalk-dim">
          ¿Tenés un complejo? <a href="/register?rol=dueno" className="text-turf-bright">Registralo acá</a>
        </p>
      </div>
    </div>
  );
}

/** Onboarding de complejo en 3 pasos — objetivo: creado en menos de 5 minutos. */
function ComplexRegister() {
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

        {step < 4 && (
          <p className="mt-6 text-center text-sm text-chalk-dim">
            ¿Sos jugador? <a href="/register?rol=jugador" className="text-turf-bright">Creá tu cuenta acá</a>
          </p>
        )}
      </div>
    </div>
  );
}
