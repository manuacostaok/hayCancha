"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function slugify(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
}

/** Atajo simple: convierte el nombre a slug y te lleva directo a su página de reserva pública. */
export function PlayerComplexSearch() {
  const [name, setName] = useState("");
  const router = useRouter();

  function go() {
    if (!name.trim()) return;
    router.push(`/book/${slugify(name)}`);
  }

  return (
    <div className="flex gap-2">
      <Input placeholder="Nombre del complejo (ej: Cancha Central)" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
      <Button onClick={go}>Buscar</Button>
    </div>
  );
}
