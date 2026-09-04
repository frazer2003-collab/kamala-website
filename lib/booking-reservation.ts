/**
 * Whether a website/staff stay consumes guest-facing room inventory.
 *
 * Holds a room when:
 * - status is confirmed (including staff-keyed / walk-in stays marked unpaid —
 *   unpaid is only a collect-at-check-in reminder for staff)
 * - or deposit_paid_at is set (card paid / staff verified payment)
 *
 * Does not hold when:
 * - declined
 * - abandoned guest checkout (pending_payment, unpaid)
 * - Thai QR / bank “I've paid” still waiting in Requests (not yet confirmed)
 */
export function bookingReservesRoom(booking: {
  status: string;
  deposit_paid_at: string | null;
  bank_transfer_claimed_at?: string | null;
}): boolean {
  if (booking.status === "declined") return false;

  // Calendar stays — paid or unpaid. Unpaid = staff still need to collect.
  if (booking.status === "confirmed") return true;

  if (booking.deposit_paid_at) return true;

  // Guest checkout not finished, or Thai QR claim still in Requests.
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
