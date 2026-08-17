"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/server/actions/bookings";
import type { BookingVM } from "@/types";

export function BookingDetailSheet({ booking, onClose }: { booking: BookingVM | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    if (!booking) return;
    startTransition(async () => {
      await cancelBooking(booking.id);
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open={!!booking} onClose={onClose}>
      {booking && (
        <>
          <h2 className="mb-1 font-display text-lg font-semibold">{booking.customerName}</h2>
          <p className="mb-6 text-sm text-chalk-dim">
            {booking.courtName} · {String(booking.startHour).padStart(2, "0")}:00 · {booking.durationMin} min
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cerrar</Button>
            <Button variant="outline" onClick={handleCancel} disabled={isPending} className="flex-1 !border-clay/50 !text-clay hover:!border-clay">
              {isPending ? "Cancelando..." : "Cancelar reserva"}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
