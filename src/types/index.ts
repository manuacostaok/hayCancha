export interface BookingVM {
  id: string;
  courtId: string;
  courtName: string;
  customerName: string;
  startHour: number; // 0-23
  durationMin: number;
  status: "confirmed" | "pending" | "canceled";
}

export interface CourtVM {
  id: string;
  name: string;
  sportName: string;
}
