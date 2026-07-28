import type { BookingStatus } from "@/lib/content";

type StayLike = {
  status: BookingStatus;
  depositPaid?: boolean;
  deposit_paid_at?: string | null;
};

function isDepositPaid(stay: StayLike) {
  return stay.depositPaid ?? Boolean(stay.deposit_paid_at);
}

/**
 * Stays staff can edit/assign on the calendar tape (door, dates, guest details).
 * Includes paid needs-reply so allocation is not blocked by an open conversation.
 */
export function isStaffCalendarManageableStay(stay: StayLike) {
  if (stay.status === "confirmed") {
    return true;
  }

  const paid = isDepositPaid(stay);
  return (
    paid &&
    (stay.status === "awaiting" || stay.status === "needs-reply")
  );
}

/** Guest message should flag inbox triage without leaving the calendar. */
export function nextStatusAfterGuestMessage(
  status: BookingStatus,
): BookingStatus | null {
  if (status === "awaiting" || status === "confirmed") {
    return "needs-reply";
  }

  return null;
}

/**
 * After staff reply: paid stays return to confirmed; unpaid bank/open
 * requests return to awaiting.
 */
export function nextStatusAfterStaffReply(
  status: BookingStatus,
  depositPaid: boolean,
): BookingStatus | null {
  if (status !== "needs-reply") {
    return null;
  }

  return depositPaid ? "confirmed" : "awaiting";
}
