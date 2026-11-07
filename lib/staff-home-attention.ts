import {
  hasStaffStayChangeTask,
  isAbandonedCheckoutHold,
  needsClosedRefund,
  type StaffBooking,
} from "@/lib/booking-requests";
import { billTotalSatang } from "@/lib/desk-bills";
import { bilingualItemLabel } from "@/lib/desk-items";
import { formatSatang } from "@/lib/desk-money";
import type {
  DeskBill,
  DeskCountedItem,
  DeskLaundryRecord,
  DeskSellableItem,
} from "@/lib/desk-ops-data";
import { headroom } from "@/lib/desk-stock";
import { stayNeedsRoomAssignment } from "@/lib/room-units";
import { staffHomeUnassignedHref } from "@/lib/staff-home";

export type StaffHomeAttentionItem = {
  key: string;
  label: string;
  meta: string;
  href: string;
};

const LIST_CAP = 8;

function capItems(items: StaffHomeAttentionItem[]) {
  return items.slice(0, LIST_CAP);
}

export function homeOpenBillItems(
  bills: readonly DeskBill[],
  sellables: readonly DeskSellableItem[],
): StaffHomeAttentionItem[] {
  const open = bills
    .filter((bill) => bill.status === "open")
    .slice()
    .sort((left, right) => left.serviceDate.localeCompare(right.serviceDate));

  return capItems(
    open.map((bill) => ({
      key: bill.id,
      label: bill.room ? `${bill.name} · ${bill.room}` : bill.name,
      meta: formatSatang(billTotalSatang(bill.lines, sellables)),
      href: `/staff/bills?open=${encodeURIComponent(bill.id)}`,
    })),
  );
}

export function homeOpenLaundryItems(
  records: readonly DeskLaundryRecord[],
): StaffHomeAttentionItem[] {
  const open = records.filter(
    (record) => record.status === "sent" || record.status === "incomplete",
  );
  return capItems(
    open.map((record) => ({
      key: record.id,
      label: record.name,
      meta: `${record.category} · ${record.status}`,
      href: `/staff/laundry?open=${encodeURIComponent(record.id)}`,
    })),
  );
}

export function homeLowStockItems(
  items: readonly DeskCountedItem[],
): StaffHomeAttentionItem[] {
  const low = items
    .filter((item) => item.active && headroom(item.onHand, item.minimum) <= 0)
    .slice()
    .sort(
      (left, right) =>
        headroom(left.onHand, left.minimum) - headroom(right.onHand, right.minimum),
    );
  return capItems(
    low.map((item) => ({
      key: item.id,
      label: bilingualItemLabel(item),
      meta: `on hand ${item.onHand} · min ${item.minimum}`,
      href: `/staff/items?open=${encodeURIComponent(item.id)}`,
    })),
  );
}

export function homeTransferAttentionItems(
  bookings: readonly StaffBooking[],
): StaffHomeAttentionItem[] {
  const items: StaffHomeAttentionItem[] = [];
  for (const booking of bookings) {
    if (!booking.databaseId) continue;
    let meta = "";
    if (needsClosedRefund(booking)) meta = "Refund";
    else if (hasStaffStayChangeTask(booking)) meta = "Stay change";
    else if (booking.status === "needs-reply") meta = "Needs reply";
    else if (isAbandonedCheckoutHold(booking)) meta = "Checkout hold";
    else if (booking.status === "awaiting") meta = "Awaiting payment";
    else if (booking.status === "new") meta = "New request";
    else continue;

    items.push({
      key: booking.databaseId,
      label: booking.guest.trim() || "Guest",
      meta,
      href: `/staff/transfers?view=inbox&booking=${encodeURIComponent(booking.databaseId)}`,
    });
  }
  return capItems(items);
}

export function homeUnassignedDoorItems({
  bookings,
  channelStays,
  knownUnitIds,
  todayIso,
}: {
  bookings: readonly (StaffBooking & { roomUnitId?: string | null })[];
  channelStays: readonly {
    databaseId: string | null;
    id: string;
    startDate: string;
    endDate: string;
    guestName: string;
    roomUnitId?: string | null;
  }[];
  knownUnitIds: ReadonlySet<string>;
  todayIso: string;
}): StaffHomeAttentionItem[] {
  const calendarHref = staffHomeUnassignedHref(todayIso);
  const items: StaffHomeAttentionItem[] = [];

  for (const booking of bookings) {
    if (booking.departureDate <= todayIso) continue;
    if (!stayNeedsRoomAssignment(booking, knownUnitIds)) continue;
    const id = booking.databaseId;
    items.push({
      key: id ?? `${booking.guest}-${booking.arrivalDate}`,
      label: booking.guest.trim() || "Guest",
      meta: `arrives ${booking.arrivalDate}`,
      href: id
        ? `/staff/calendar?booking=${encodeURIComponent(id)}&from=${todayIso}`
        : calendarHref,
    });
  }

  for (const stay of channelStays) {
    if (stay.endDate <= todayIso) continue;
    if (!stayNeedsRoomAssignment(stay, knownUnitIds)) continue;
    const id = stay.databaseId ?? stay.id;
    items.push({
      key: id,
      label: stay.guestName.trim() || "Channel stay",
      meta: `arrives ${stay.startDate}`,
      href: `/staff/calendar?from=${todayIso}`,
    });
  }

  return capItems(items);
}
