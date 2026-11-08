import {
  hasStaffStayChangeTask,
  isAbandonedCheckoutHold,
  isUnverifiedBankHold,
  needsClosedRefund,
  type StaffBooking,
} from "@/lib/booking-requests";

export type StaffNotificationKind =
  | "refund"
  | "bank"
  | "stay-change"
  | "reply"
  | "hold"
  | "new"
  | "other";

export type StaffNotificationFilter =
  | "all"
  | "money"
  | "reply"
  | "new";

/** Why this booking is on the notifications screen. */
export function getStaffNotificationKind(
  booking: StaffBooking,
): StaffNotificationKind {
  if (needsClosedRefund(booking) || (booking.refundDue ?? 0) > 0) {
    return "refund";
  }
  if (hasStaffStayChangeTask(booking)) {
    return "stay-change";
  }
  if (isUnverifiedBankHold(booking)) {
    return "bank";
  }
  if (isAbandonedCheckoutHold(booking)) {
    return "hold";
  }
  if (booking.status === "needs-reply") {
    return "reply";
  }
  if (booking.status === "new") {
    return "new";
  }
  if (booking.status === "awaiting") {
    return "bank";
  }
  return "other";
}

export function getStaffNotificationReason(booking: StaffBooking): string {
  switch (getStaffNotificationKind(booking)) {
    case "refund":
      return "Send refund";
    case "stay-change":
      return booking.pendingStayChange
        ? "Confirm stay change"
        : "Stay change refund";
    case "bank":
      return "Verify transfer";
    case "hold":
      return "Checkout hold";
    case "reply":
      return "Reply to guest";
    case "new":
      return "New request";
    default:
      return "Needs attention";
  }
}

export function parseStaffNotificationFilter(
  value: string | undefined,
): StaffNotificationFilter {
  if (value === "money" || value === "reply" || value === "new") {
    return value;
  }
  // Legacy Transfers filter aliases.
  if (value === "awaiting") {
    return "money";
  }
  if (value === "needs-reply") {
    return "reply";
  }
  return "all";
}

export function matchesStaffNotificationFilter(
  booking: StaffBooking,
  filter: StaffNotificationFilter,
) {
  if (filter === "all") {
    return true;
  }
  const kind = getStaffNotificationKind(booking);
  if (filter === "money") {
    return (
      kind === "refund" ||
      kind === "bank" ||
      kind === "stay-change" ||
      kind === "hold"
    );
  }
  if (filter === "reply") {
    return kind === "reply";
  }
  return kind === "new";
}

export function staffNotificationPriority(booking: StaffBooking) {
  switch (getStaffNotificationKind(booking)) {
    case "refund":
      return 0;
    case "bank":
    case "hold":
      return 1;
    case "stay-change":
      return 2;
    case "reply":
      return 3;
    case "new":
      return 4;
    default:
      return 9;
  }
}
