export function bookingReservesRoom(booking: {
  status: string;
  deposit_paid_at: string | null;
  bank_transfer_claimed_at?: string | null;
}): boolean {
  if (booking.status === "declined") return false;
  if (booking.status === "confirmed") return true;
  if (booking.deposit_paid_at) return true;
  if (booking.bank_transfer_claimed_at) return true;
  return false;
}
