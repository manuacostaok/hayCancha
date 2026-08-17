"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingModal } from "./BookingModal";
import { createBooking } from "@/server/actions/bookings";
import type { BookingVM, CourtVM } from "@/types";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 8 }, (_, i) => 14 + i); // 14:00 a 21:00

const toneBg: Record<BookingVM["status"], string> = {
  confirmed: "bg-turf-bright text-ink",
  pending: "bg-amber text-ink",
  canceled: "bg-clay/20 text-clay border border-clay/40",
};

/**
 * Calendario central de la app.
 * - Desktop (lg+): grilla semanal, canchas en columnas.
 * - Mobile: agenda de un solo día, con selector prev/next — pensado para
 *   usarse con el pulgar, sin scroll horizontal.
 */
export function WeekCalendar({ courts, initialBookings }: { courts: CourtVM[]; initialBookings: BookingVM[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<{ courtId: string; hour: number } | null>(null);
  const [mobileDayOffset, setMobileDayOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function openSlot(courtId: string, hour: number) {
    setDraft({ courtId, hour });
    setModalOpen(true);
  }

  function handleCreate(data: { customerName: string; courtId: string; hour: number; durationMin: number; customerPhone: string; totalPrice: number }) {
    const court = courts.find((c) => c.id === data.courtId)!;

    // optimista: se ve al toque en el calendario mientras el server confirma
    const tempId = crypto.randomUUID();
    setBookings((prev) => [
      ...prev,
      { id: tempId, courtId: data.courtId, courtName: court.name, customerName: data.customerName, startHour: data.hour, durationMin: data.durationMin, status: "pending" },
    ]);

    startTransition(async () => {
      const start = new Date();
      start.setHours(data.hour, 0, 0, 0);
      const end = new Date(start.getTime() + data.durationMin * 60000);
      try {
        await createBooking({
          courtId: data.courtId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          startTime: start,
          endTime: end,
          totalPrice: data.totalPrice,
        });
        router.refresh();
      } catch (e: any) {
        setError(e.message ?? "No se pudo crear la reserva");
        setBookings((prev) => prev.filter((b) => b.id !== tempId));
      }
    });
  }

  const bookingFor = (courtId: string, hour: number) =>
    bookings.find((b) => b.courtId === courtId && Math.floor(b.startHour) === hour);

  const dayLabel = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "short" })
    .format(new Date(Date.now() + mobileDayOffset * 86400000));

  return (
    <div className="px-4 pb-6 pt-4 sm:px-8">
      {/* ---- Desktop: grilla semanal por cancha ---- */}
      <div className="hidden overflow-hidden rounded-2xl border border-line lg:block">
        <div className="grid" style={{ gridTemplateColumns: `70px repeat(${courts.length}, 1fr)` }}>
          <div className="border-b border-r border-line bg-ink-2 p-3" />
          {courts.map((c) => (
            <div key={c.id} className="border-b border-r border-line bg-ink-2 p-3 text-center">
              <div className="font-display text-sm font-semibold">{c.name}</div>
              <div className="font-mono text-[10px] uppercase text-chalk-dim">{c.sportName}</div>
            </div>
          ))}

          {HOURS.map((hour) => (
            <>
              <div key={`h-${hour}`} className="border-b border-r border-line p-3 text-right font-mono text-xs text-chalk-dim">
                {String(hour).padStart(2, "0")}:00
              </div>
              {courts.map((c) => {
                const b = bookingFor(c.id, hour);
                return (
                  <button
                    key={`${c.id}-${hour}`}
                    onClick={() => !b && openSlot(c.id, hour)}
                    className={cn(
                      "min-h-[56px] border-b border-r border-line p-1.5 text-left transition-colors",
                      !b && "hover:bg-ink-3"
                    )}
                  >
                    {b && (
                      <div className={cn("h-full w-full rounded-md px-2 py-1.5 font-mono text-[11px] font-semibold", toneBg[b.status])}>
                        {b.customerName}
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* ---- Mobile: agenda de un día, pensada para el pulgar ---- */}
      <div className="lg:hidden">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setMobileDayOffset((d) => d - 1)} className="rounded-full border border-line p-2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-display text-sm font-semibold capitalize">{dayLabel}</span>
          <button onClick={() => setMobileDayOffset((d) => d + 1)} className="rounded-full border border-line p-2">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {HOURS.map((hour) => {
            const slotsForHour = courts.map((c) => ({ court: c, booking: bookingFor(c.id, hour) }));
            return (
              <div key={hour} className="flex gap-3">
                <div className="w-12 shrink-0 pt-2 text-right font-mono text-xs text-chalk-dim">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {slotsForHour.map(({ court, booking }) => (
                    <button
                      key={court.id}
                      onClick={() => !booking && openSlot(court.id, hour)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border border-line px-3.5 py-3 text-sm",
                        booking ? toneBg[booking.status] : "bg-ink-2 text-chalk-dim"
                      )}
                    >
                      <span className="font-medium">{booking ? booking.customerName : court.name}</span>
                      {!booking && <Plus className="h-4 w-4 opacity-60" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="fixed inset-x-4 bottom-20 z-50 rounded-lg border border-clay/40 bg-ink-2 px-4 py-3 text-sm text-clay lg:bottom-6">
          {error}
        </div>
      )}

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        courts={courts}
        defaultCourtId={draft?.courtId}
        defaultHour={draft?.hour}
        onCreate={handleCreate}
      />
    </div>
  );
}
