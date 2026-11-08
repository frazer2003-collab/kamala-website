import {
  getStaffBookingKey,
  hasStaffStayChangeTask,
  isAbandonedCheckoutHold,
  isUnverifiedBankHold,
  needsClosedRefund,
  type StaffBooking,
} from "@/lib/booking-requests";
import {
  listStaffDeskNotifications,
  recordStaffDeskNotification,
  type StaffDeskNotificationKind,
} from "@/lib/staff-desk-notifications";

function actionKind(booking: StaffBooking): StaffDeskNotificationKind | null {
  if (needsClosedRefund(booking) || (booking.refundDue ?? 0) > 0) {
    return "refund_due";
  }
  if (hasStaffStayChangeTask(booking)) return "booking_moved";
  if (isUnverifiedBankHold(booking)) return "transfer_verify";
  if (isAbandonedCheckoutHold(booking)) return "checkout_hold";
  if (booking.status === "needs-reply") return "reply_needed";
  if (booking.status === "new") return "booking_created";
  return null;
}

function actionTitle(booking: StaffBooking, kind: StaffDeskNotificationKind) {
  const guest = booking.guest.trim() || "Guest";
  switch (kind) {
    case "refund_due":
      return `${guest} · refund due`;
    case "booking_moved":
      return `${guest} · stay change`;
    case "transfer_verify":
      return `${guest} · verify transfer`;
    case "checkout_hold":
      return `${guest} · checkout hold`;
    case "reply_needed":
      return `${guest} · needs reply`;
    case "booking_created":
      return `${guest} · new request`;
    default:
      return guest;
  }
}

/** Ensure open desk action items appear in the notification feed. */
export async function syncActionNotifications(bookings: StaffBooking[]) {
  const existing = await listStaffDeskNotifications(120);
  const knownBookingKinds = new Set(
    existing.notifications
      .filter((row) => row.bookingId && !row.readAt)
      .map((row) => `${row.bookingId}:${row.kind}`),
  );

  for (const booking of bookings) {
    const bookingId = booking.databaseId || getStaffBookingKey(booking);
    if (!bookingId) continue;
    const kind = actionKind(booking);
    if (!kind) continue;
    const key = `${bookingId}:${kind}`;
    if (knownBookingKinds.has(key)) continue;

    await recordStaffDeskNotification({
      kind,
      title: actionTitle(booking, kind),
      body: `${booking.room} · ${booking.dates}`,
      bookingId,
      stayArrival: booking.arrivalDate,
      stayDeparture: booking.departureDate,
      href: `/staff/transfers?booking=${encodeURIComponent(bookingId)}`,
    });
    knownBookingKinds.add(key);
  }
}
