import { TopBar } from "@/components/layout/TopBar";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { getBookingsForDay, getCourtsWithSport } from "@/server/actions/bookings";
import type { BookingVM, CourtVM } from "@/types";

export default async function CalendarPage() {
  const [courts, bookings] = await Promise.all([getCourtsWithSport(), getBookingsForDay(new Date())]);

  const courtVMs: CourtVM[] = courts.map((c: any) => ({ id: c.id, name: c.name, sportName: c.sport.name }));
  const bookingVMs: BookingVM[] = bookings.map((b: any) => ({
    id: b.id,
    courtId: b.courtId,
    courtName: b.court.name,
    customerName: b.customer?.name ?? "Reserva",
    startHour: new Date(b.startTime).getHours(),
    durationMin: (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000,
    status: b.status === "CONFIRMED" ? "confirmed" : b.status === "PENDING" ? "pending" : "canceled",
  }));

  return (
    <>
      <TopBar title="Calendario" />
      <WeekCalendar courts={courtVMs} initialBookings={bookingVMs} />
    </>
  );
}
