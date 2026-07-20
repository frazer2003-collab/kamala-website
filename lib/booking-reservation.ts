export function bookingReservesRoom(booking: {
  status: string;
  deposit_paid_at: string | null;
  bank_transfer_claimed_at?: string | null;
}): boolean {
  if (booking.status === "declined") return false;
  // Hold inventory while card/PromptPay checkout is in flight.
  if (booking.status === "pending_payment") return true;
  if (booking.status === "confirmed") return true;
  if (booking.deposit_paid_at) return true;
  if (booking.bank_transfer_claimed_at) return true;
  return false;
}

/** Open website stays (including unconfirmed) block Airbnb export / type sold-out nights. */
export function bookingBlocksCalendarExport(booking: { status: string }): boolean {
  return booking.status !== "declined";
}
