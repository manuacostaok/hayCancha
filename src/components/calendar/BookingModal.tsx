"use client";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CourtVM } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  courts: CourtVM[];
  defaultCourtId?: string;
  defaultHour?: number;
  onCreate: (data: { customerName: string; customerPhone: string; courtId: string; hour: number; durationMin: number; totalPrice: number }) => void;
}

/** Modal de alta rápida de reserva — el flujo de "1 clic" del que habla el brief. */
export function BookingModal({ open, onClose, courts, defaultCourtId, defaultHour, onCreate }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [courtId, setCourtId] = useState(defaultCourtId ?? courts[0]?.id ?? "");
  const [hour, setHour] = useState(defaultHour ?? 18);
  const [duration, setDuration] = useState(60);
  const [totalPrice, setTotalPrice] = useState(12000);

  function submit() {
    if (!customerName.trim() || !customerPhone.trim()) return;
    onCreate({ customerName, customerPhone, courtId, hour, durationMin: duration, totalPrice });
    setCustomerName("");
    setCustomerPhone("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="mb-1 font-display text-lg font-semibold">Nueva reserva</h2>
      <p className="mb-5 text-sm text-chalk-dim">Completá los datos y quedó confirmada, con aviso por WhatsApp.</p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Cliente</label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre y apellido" autoFocus />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">WhatsApp</label>
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+54 9 11 ...." type="tel" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Cancha</label>
          <select
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
            className="w-full rounded-lg border border-line bg-ink px-3.5 py-2.5 text-sm text-chalk focus:border-turf-bright focus:outline-none"
          >
            {courts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.sportName}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Hora</label>
            <Input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Min.</label>
            <Input type="number" step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase tracking-wide text-chalk-dim">Precio</label>
            <Input type="number" step={500} value={totalPrice} onChange={(e) => setTotalPrice(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button onClick={submit} className="flex-1">Confirmar reserva</Button>
      </div>
    </Dialog>
  );
}
