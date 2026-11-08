import { createStaffSupabaseClient, hasStaffSupabaseConfig } from "@/lib/supabase";

export const STAFF_NOTIFICATION_KINDS = [
  "booking_created",
  "booking_confirmed",
  "booking_cancelled",
  "booking_moved",
  "transfer_verify",
  "reply_needed",
  "refund_due",
  "checkout_hold",
  "trip_sold",
  "other",
] as const;

export type StaffDeskNotificationKind = (typeof STAFF_NOTIFICATION_KINDS)[number];

export type StaffDeskNotification = {
  id: string;
  kind: StaffDeskNotificationKind;
  title: string;
  body: string;
  bookingId: string | null;
  tripSaleId: string | null;
  stayArrival: string | null;
  stayDeparture: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const PROPERTY_ID = "kamala";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  booking_id: string | null;
  trip_sale_id: string | null;
  stay_arrival: string | null;
  stay_departure: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function notificationsTable() {
  // Not yet in generated Database types — service_role only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (createStaffSupabaseClient() as any).from("staff_desk_notifications");
}

function mapRow(row: NotificationRow): StaffDeskNotification {
  const kind = STAFF_NOTIFICATION_KINDS.includes(
    row.kind as StaffDeskNotificationKind,
  )
    ? (row.kind as StaffDeskNotificationKind)
    : "other";
  return {
    id: row.id,
    kind,
    title: row.title,
    body: row.body ?? "",
    bookingId: row.booking_id,
    tripSaleId: row.trip_sale_id,
    stayArrival: row.stay_arrival,
    stayDeparture: row.stay_departure,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function formatNotificationAge(createdAt: string, nowMs = Date.now()) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "Just now";
  const minutes = Math.max(1, Math.round((nowMs - created.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(created);
}

export function notificationKindLabel(kind: StaffDeskNotificationKind) {
  switch (kind) {
    case "booking_created":
      return "New booking";
    case "booking_confirmed":
      return "Confirmed";
    case "booking_cancelled":
      return "Cancelled";
    case "booking_moved":
      return "Dates moved";
    case "transfer_verify":
      return "Verify transfer";
    case "reply_needed":
      return "Reply needed";
    case "refund_due":
      return "Refund due";
    case "checkout_hold":
      return "Checkout hold";
    case "trip_sold":
      return "Trip sold";
    default:
      return "Update";
  }
}

export async function recordStaffDeskNotification(input: {
  kind: StaffDeskNotificationKind;
  title: string;
  body?: string;
  bookingId?: string | null;
  tripSaleId?: string | null;
  stayArrival?: string | null;
  stayDeparture?: string | null;
  href?: string | null;
}): Promise<string | null> {
  if (!hasStaffSupabaseConfig()) return null;
  const title = input.title.trim();
  if (!title) return null;

  try {
    const { data, error } = await notificationsTable()
      .insert({
        property_id: PROPERTY_ID,
        kind: input.kind,
        title,
        body: (input.body ?? "").trim(),
        booking_id: input.bookingId || null,
        trip_sale_id: input.tripSaleId || null,
        stay_arrival: input.stayArrival || null,
        stay_departure: input.stayDeparture || null,
        href:
          input.href ||
          (input.bookingId
            ? `/staff/transfers?booking=${encodeURIComponent(input.bookingId)}`
            : null),
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("recordStaffDeskNotification", error?.message);
      return null;
    }
    return data.id as string;
  } catch (error) {
    console.error("recordStaffDeskNotification", error);
    return null;
  }
}

export async function listStaffDeskNotifications(limit = 80): Promise<{
  notifications: StaffDeskNotification[];
  error: string | null;
}> {
  if (!hasStaffSupabaseConfig()) {
    return { notifications: [], error: null };
  }

  try {
    const { data, error } = await notificationsTable()
      .select("*")
      .eq("property_id", PROPERTY_ID)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 200));

    if (error) {
      return { notifications: [], error: error.message };
    }

    return {
      notifications: ((data ?? []) as NotificationRow[]).map(mapRow),
      error: null,
    };
  } catch {
    return {
      notifications: [],
      error: "Could not load notifications.",
    };
  }
}

export async function markStaffDeskNotificationRead(id: string) {
  if (!hasStaffSupabaseConfig() || !id) return;
  try {
    await notificationsTable()
      .update({ read_at: new Date().toISOString() })
      .eq("property_id", PROPERTY_ID)
      .eq("id", id)
      .is("read_at", null);
  } catch (error) {
    console.error("markStaffDeskNotificationRead", error);
  }
}
