"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Trees } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hasAnyMembership } from "@/server/actions/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    // dueños/empleados van a la agenda de su complejo, jugadores a su panel
    const isOwnerOrEmployee = await hasAnyMembership(email);
    router.push(isOwnerOrEmployee ? "/calendar" : "/player");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 font-display text-lg font-bold">
          <Trees className="h-5 w-5 text-turf-bright" /> Canchas
        </div>
        <h1 className="mb-6 text-center font-display text-xl font-semibold">Iniciar sesión</h1>
        {error && <p className="mb-4 rounded-lg border border-clay/40 bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button size="lg" type="submit" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-chalk-dim">
          ¿No tenés cuenta? <Link href="/register" className="text-turf-bright">Registrate</Link>
        </p>
      </div>
    </div>
  );
}
