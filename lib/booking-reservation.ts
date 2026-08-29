export function bookingReservesRoom(booking: {
  status: string;
  deposit_paid_at: string | null;
  bank_transfer_claimed_at?: string | null;
}): boolean {
  if (booking.status === "declined") return false;
  if (booking.status === "confirmed") return true;
  if (booking.deposit_paid_at) return true;
  // QR/bank: inventory holds when the guest taps "I've paid", not at checkout start.
  if (booking.bank_transfer_claimed_at) return true;
  return false;
}

/** Open website stays that actually hold inventory block Airbnb export / sold-out nights. */
export function bookingBlocksCalendarExport(booking: {
  status: string;
  deposit_paid_at?: string | null;
  bank_transfer_claimed_at?: string | null;
}): boolean {
  return bookingReservesRoom({
    status: booking.status,
    deposit_paid_at: booking.deposit_paid_at ?? null,
    bank_transfer_claimed_at: booking.bank_transfer_claimed_at ?? null,
  });
}
