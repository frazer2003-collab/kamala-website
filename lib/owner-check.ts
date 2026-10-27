import type { StaffInsightsAttention, StaffInsightsRoomRow } from "@/lib/staff-insights";

const INBOX_KEYS = [
  "booking",
  "filter",
  "view",
  "error",
  "detail",
  "overlap",
  "hold-cancelled",
  "stay-change",
  "refund",
] as const;

/** True when /staff should open the request inbox instead of the owner check. */
export function isStaffInboxQuery(params: Record<string, string | undefined>) {
  return INBOX_KEYS.some((key) => Boolean(params[key]));
}

export function ownerBookingHref(bookingId: string) {
  return `/staff?booking=${encodeURIComponent(bookingId)}`;
}

export function ownerFinanceHref(monthKey: string) {
  return `/staff/sold?month=${encodeURIComponent(monthKey)}`;
}

export function ownerCalendarRoomHref(fromIso: string, toIso: string, roomId: string) {
  const params = new URLSearchParams({
    month: fromIso.slice(0, 7),
    from: fromIso,
    to: toIso,
    room: roomId,
  });
  return `/staff/calendar?${params.toString()}`;
}

export function ownerDiscountHref(roomId: string) {
  return `/staff/promotions?room=${encodeURIComponent(roomId)}`;
}

/** Dates still ahead inside the selected month. The whole month, once it has passed. */
export function ownerOpenRange(todayIso: string, monthStart: string, monthEnd: string) {
  if (todayIso < monthStart || todayIso > monthEnd) {
    return { fromIso: monthStart, toIso: monthEnd };
  }
  return { fromIso: todayIso, toIso: monthEnd };
}

/**
 * The room whose agreed rate sits furthest from the published rate.
 * With no agreed rate yet, the room with the most nights still open.
 */
export function pickOwnerRateRoom(rooms: StaffInsightsRoomRow[]) {
  const configured = rooms.filter((room) => !room.isUnconfigured && room.publishedRate !== null);
  const compared = configured.filter(
    (room) => room.agreedNightlyRate !== null && (room.publishedRate ?? 0) > 0,
  );

  if (compared.length > 0) {
    return compared.slice().sort((a, b) => {
      const gapA =
        Math.abs((a.agreedNightlyRate ?? 0) - (a.publishedRate ?? 0)) / (a.publishedRate || 1);
      const gapB =
        Math.abs((b.agreedNightlyRate ?? 0) - (b.publishedRate ?? 0)) / (b.publishedRate || 1);
      return gapB - gapA || b.nightsStillOpen - a.nightsStillOpen || a.roomName.localeCompare(b.roomName);
    })[0] ?? null;
  }

  return (
    configured
      .slice()
      .sort(
        (a, b) => b.nightsStillOpen - a.nightsStillOpen || a.roomName.localeCompare(b.roomName),
      )[0] ?? null
  );
}

export function ownerRateAction(room: StaffInsightsRoomRow, fromIso: string, toIso: string) {
  if (/short discount|discount can fill/i.test(room.priceCue)) {
    return {
      href: ownerDiscountHref(room.roomId),
      label: "Discount the empty nights",
    };
  }
  if (/raise the published rate/i.test(room.priceCue)) {
    return {
      href: "/staff/settings/rooms",
      label: "Change the published rate",
    };
  }
  if (room.nightsStillOpen > 0) {
    return {
      href: ownerCalendarRoomHref(fromIso, toIso, room.roomId),
      label: "See the empty nights",
    };
  }
  return {
    href: "/staff/settings/rooms",
    label: "Change rates",
  };
}

export function ownerAttentionLabel(item: StaffInsightsAttention) {
  if (item.kind === "refund") {
    return `${item.guestName} · ${item.roomName} · refund still to send`;
  }
  if (item.kind === "bank-claimed") {
    return `${item.guestName} · ${item.roomName} · bank transfer claimed, not marked paid`;
  }
  return `${item.guestName} · ${item.roomName} · stayed, not marked paid`;
}
