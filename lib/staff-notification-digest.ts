import type { StaffBooking } from "@/lib/booking-requests";
import {
  getStaffBookingKey,
  hasStaffStayChangeTask,
  isAbandonedCheckoutHold,
  isUnverifiedBankHold,
  needsClosedRefund,
} from "@/lib/booking-requests";
import type {
  StaffDeskNotification,
  StaffDeskNotificationKind,
} from "@/lib/staff-desk-notifications";
import { notificationKindLabel } from "@/lib/staff-desk-notifications";

export type NotificationFocus = "all" | "action" | "bookings" | "messages";

export type NotificationDigestItem = StaffDeskNotification & {
  section: "action" | "activity";
  guestLabel: string;
  ctaLabel: string | null;
  urgent: boolean;
};

export type NotificationDigestSummary = {
  actionCount: number;
  replyCount: number;
  moneyCount: number;
  unreadCount: number;
  bookingEventCount: number;
};

const ACTION_KINDS = new Set<StaffDeskNotificationKind>([
  "transfer_verify",
  "reply_needed",
  "refund_due",
  "checkout_hold",
  "booking_created",
]);

const BOOKING_KINDS = new Set<StaffDeskNotificationKind>([
  "booking_created",
  "booking_confirmed",
  "booking_cancelled",
  "booking_moved",
]);

const MESSAGE_KINDS = new Set<StaffDeskNotificationKind>(["reply_needed"]);

export function parseNotificationFocus(value?: string): NotificationFocus {
  if (value === "action" || value === "bookings" || value === "messages") {
    return value;
  }
  return "all";
}

export function isActionNotificationKind(kind: StaffDeskNotificationKind) {
  return ACTION_KINDS.has(kind);
}

function guestFromTitle(title: string) {
  const parts = title.split(" · ");
  return parts[0]?.trim() || title.trim() || "Guest";
}

function ctaForKind(kind: StaffDeskNotificationKind): string | null {
  switch (kind) {
    case "reply_needed":
      return "Reply";
    case "transfer_verify":
      return "Confirm or reject";
    case "refund_due":
      return "Refund";
    case "checkout_hold":
      return "Review hold";
    case "booking_created":
      return "Open request";
    case "booking_moved":
      return "Review change";
    default:
      return null;
  }
}

function liveActionKind(booking: StaffBooking): StaffDeskNotificationKind | null {
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

function liveActionTitle(booking: StaffBooking, kind: StaffDeskNotificationKind) {
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

function toDigestItem(
  notice: StaffDeskNotification,
  section: "action" | "activity",
): NotificationDigestItem {
  return {
    ...notice,
    section,
    guestLabel: guestFromTitle(notice.title),
    ctaLabel: section === "action" ? ctaForKind(notice.kind) : null,
    urgent:
      section === "action" &&
      (notice.kind === "reply_needed" ||
        notice.kind === "transfer_verify" ||
        notice.kind === "refund_due" ||
        notice.kind === "checkout_hold"),
  };
}

/**
 * Collapse noisy lifecycle pairs: if a booking was confirmed, drop the earlier
 * "new booking" row so staff see one line instead of two.
 */
export function collapseLifecycleNoise(
  notifications: StaffDeskNotification[],
): StaffDeskNotification[] {
  const confirmedBookingIds = new Set(
    notifications
      .filter((row) => row.kind === "booking_confirmed" && row.bookingId)
      .map((row) => row.bookingId as string),
  );

  return notifications.filter((row) => {
    if (
      row.kind === "booking_created" &&
      row.bookingId &&
      confirmedBookingIds.has(row.bookingId)
    ) {
      return false;
    }
    return true;
  });
}

/** One live action card per open booking that still needs staff. */
export function liveActionNotifications(
  bookings: StaffBooking[],
  nowIso = new Date().toISOString(),
): StaffDeskNotification[] {
  const items: StaffDeskNotification[] = [];
  for (const booking of bookings) {
    const kind = liveActionKind(booking);
    if (!kind) continue;
    const bookingId = booking.databaseId || getStaffBookingKey(booking);
    if (!bookingId) continue;
    items.push({
      id: `live:${bookingId}:${kind}`,
      kind,
      title: liveActionTitle(booking, kind),
      body: `${booking.room} · ${booking.dates}`,
      bookingId,
      tripSaleId: null,
      stayArrival: booking.arrivalDate,
      stayDeparture: booking.departureDate,
      href:
        kind === "transfer_verify"
          ? `/staff/transfers?open=${encodeURIComponent(`live:${bookingId}:${kind}`)}`
          : `/staff/transfers?booking=${encodeURIComponent(bookingId)}&view=inbox`,
      readAt: null,
      createdAt: nowIso,
    });
  }
  return items;
}

export function buildNotificationDigest({
  notifications,
  openBookings,
  focus = "all",
}: {
  notifications: StaffDeskNotification[];
  openBookings: StaffBooking[];
  focus?: NotificationFocus;
}): {
  summary: NotificationDigestSummary;
  actionItems: NotificationDigestItem[];
  activityItems: NotificationDigestItem[];
} {
  const withoutTripNoise = notifications.filter((row) => row.kind !== "trip_sold");
  const collapsed = collapseLifecycleNoise(withoutTripNoise);
  const liveActions = liveActionNotifications(openBookings);

  const liveKeys = new Set(
    liveActions.map((row) => `${row.bookingId}:${row.kind}`),
  );

  // Prefer live open-state cards over stale stored action rows for the same key.
  const storedActions = collapsed.filter((row) => {
    if (!isActionNotificationKind(row.kind)) return false;
    if (row.bookingId && liveKeys.has(`${row.bookingId}:${row.kind}`)) {
      return false;
    }
    // Hide informational action echoes once read unless still live above.
    if (row.readAt) return false;
    return true;
  });

  const actionSource = [...liveActions, ...storedActions];
  const activitySource = collapsed.filter(
    (row) => !isActionNotificationKind(row.kind) || Boolean(row.readAt),
  );

  // Activity should not repeat live action cards.
  const activityFiltered = activitySource.filter((row) => {
    if (!row.bookingId) return true;
    return !liveKeys.has(`${row.bookingId}:${row.kind}`);
  });

  let actionItems = actionSource.map((row) => toDigestItem(row, "action"));
  let activityItems = activityFiltered.map((row) =>
    toDigestItem(row, "activity"),
  );

  if (focus === "action") {
    activityItems = [];
  } else if (focus === "messages") {
    actionItems = actionItems.filter((row) => MESSAGE_KINDS.has(row.kind));
    activityItems = activityItems.filter((row) => MESSAGE_KINDS.has(row.kind));
  } else if (focus === "bookings") {
    actionItems = actionItems.filter((row) => BOOKING_KINDS.has(row.kind));
    activityItems = activityItems.filter((row) => BOOKING_KINDS.has(row.kind));
  }

  const summary: NotificationDigestSummary = {
    actionCount: actionSource.length,
    replyCount: actionSource.filter((row) => row.kind === "reply_needed").length,
    moneyCount: actionSource.filter(
      (row) =>
        row.kind === "transfer_verify" ||
        row.kind === "refund_due" ||
        row.kind === "checkout_hold",
    ).length,
    unreadCount: collapsed.filter((row) => !row.readAt).length,
    bookingEventCount: collapsed.filter((row) => BOOKING_KINDS.has(row.kind))
      .length,
  };

  return { summary, actionItems, activityItems };
}

export function formatStayRangeLabel(
  arrival: string | null,
  departure: string | null,
  locale = "en",
) {
  if (!arrival) return null;
  const fmt = new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
    day: "numeric",
    month: "short",
  });
  const from = fmt.format(new Date(`${arrival}T12:00:00`));
  if (!departure || departure === arrival) return from;
  const to = fmt.format(new Date(`${departure}T12:00:00`));
  return `${from} → ${to}`;
}

export function digestKindShortLabel(kind: StaffDeskNotificationKind) {
  return notificationKindLabel(kind);
}
