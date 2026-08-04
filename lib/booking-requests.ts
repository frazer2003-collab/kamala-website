import { type Booking, type BookingStatus } from "@/lib/content";
import { parseBedSetup } from "@/lib/bed-setup";
import { parseBookingSource } from "@/lib/booking-source";
import { parseStayEndReason } from "@/lib/stay-end-reason";
import { resolveStayStatusFromDates } from "@/lib/stay-status";
import { getCalendarMonthBounds, monthOverlapsBooking } from "@/lib/calendar";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type BookingRequestRow,
} from "@/lib/supabase";

export const PENDING_BOOKING_STATUSES = ["awaiting", "needs-reply", "new"] as const;

/**
 * Stays that hold guest inventory — must match `bookingReservesRoom` /
 * `isCalendarBooking` so the tape never looks empty while the site says Full.
 */
export const CALENDAR_BOOKING_FILTER =
  "status.eq.confirmed,status.eq.pending_payment,deposit_paid_at.not.is.null,bank_transfer_claimed_at.not.is.null";

export type StaffBooking = Booking & {
  databaseId: string | null;
  bankTransferClaimed: boolean;
};

export function getStaffBookingKey(booking: StaffBooking) {
  return booking.databaseId ?? booking.id;
}

function formatDateRange(arrival: string, departure: string) {
  const arrivalDate = new Date(`${arrival}T00:00:00`);
  const departureDate = new Date(`${departure}T00:00:00`);
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });

  if (
    Number.isNaN(arrivalDate.getTime()) ||
    Number.isNaN(departureDate.getTime())
  ) {
    return `${arrival} - ${departure}`;
  }

  return `${formatter.format(arrivalDate)}-${formatter.format(departureDate)}`;
}

function formatRequestedAt(createdAt: string) {
  const created = new Date(createdAt);
  const diffMs = Date.now() - created.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));

  if (Number.isNaN(created.getTime())) {
    return "Recently";
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(created);
}

function mapStatus(status: BookingRequestRow["status"]): BookingStatus {
  return status;
}

export function mapBookingRequest(
  row: BookingRequestRow,
  roomUnitIdOverride?: string | null,
): StaffBooking {
  return {
    databaseId: row.id,
    id: row.id.slice(0, 8).toUpperCase(),
    guest: row.guest_name,
    room: row.room_name,
    dates: formatDateRange(row.arrival_date, row.departure_date),
    nights: row.nights,
    status: mapStatus(row.status),
    requestedAt: formatRequestedAt(row.created_at),
    note: row.note ?? "",
    contact: row.guest_email,
    phone: row.guest_phone ?? "",
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    roomId: row.room_id,
    estimatedTotal: row.estimated_total,
    depositAmount: row.deposit_amount ?? row.estimated_total,
    depositPaid: Boolean(row.deposit_paid_at),
    bookingSource: parseBookingSource(row.booking_source),
    bankTransferClaimed: Boolean(row.bank_transfer_claimed_at),
    stayStatus: resolveStayStatusFromDates(row.arrival_date, row.departure_date),
    stayEndReason: parseStayEndReason(row.stay_end_reason),
    staffNote: row.staff_note ?? "",
    roomUnitId: roomUnitIdOverride ?? row.room_unit_id ?? null,
    roomNumber: null,
    bedSetup: parseBedSetup(row.bed_setup),
  };
}

async function getBookingRoomUnitMap(
  supabase: ReturnType<typeof createStaffSupabaseClient>,
) {
  const map = new Map<string, string>();
  const { data, error } = await supabase.rpc("staff_booking_room_unit_map");
  if (error || !data) {
    return map;
  }

  for (const row of data) {
    if (row.id && row.room_unit_id) {
      map.set(row.id, row.room_unit_id);
    }
  }

  return map;
}

export function isPendingBooking(booking: StaffBooking) {
  if (booking.status === "awaiting") {
    return booking.depositPaid || booking.bankTransferClaimed;
  }

  return PENDING_BOOKING_STATUSES.includes(
    booking.status as (typeof PENDING_BOOKING_STATUSES)[number],
  );
}

/**
 * Visible on the staff calendar tape. Keep in lockstep with
 * `bookingReservesRoom` so payment holds are not invisible inventory.
 */
export function isCalendarBooking(
  booking: Pick<Booking, "status" | "depositPaid"> & {
    bankTransferClaimed?: boolean;
  },
) {
  if (booking.status === "declined") {
    return false;
  }

  if (booking.status === "pending_payment" || booking.status === "confirmed") {
    return true;
  }

  if (booking.depositPaid) {
    return true;
  }

  if (booking.bankTransferClaimed) {
    return true;
  }

  return false;
}

/** Guest-facing hold that is not yet a paid/confirmed stay. */
export function isInventoryHoldBooking(
  booking: Pick<Booking, "status" | "depositPaid"> & {
    bankTransferClaimed?: boolean;
  },
) {
  if (!isCalendarBooking(booking)) {
    return false;
  }

  if (booking.status === "pending_payment") {
    return true;
  }

  return Boolean(booking.bankTransferClaimed && !booking.depositPaid);
}

function isConfirmedBooking(booking: Booking) {
  return isCalendarBooking(booking);
}

type BookingQueryResult = {
  bookings: StaffBooking[];
  source: "sample" | "supabase";
  error: string | null;
};

async function fetchBookingsFromSupabase(
  statuses: BookingRequestRow["status"][],
  orderBy: "created_at" | "arrival_date" | "updated_at",
) {
  if (!hasStaffSupabaseConfig()) {
    return {
      bookings: [],
      source: "sample",
      error: "Supabase is not configured. Connect the database to load live bookings.",
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .in("status", statuses)
      .order(orderBy, {
        ascending: orderBy === "arrival_date",
      })
      .limit(100);

    if (error || !data) {
      return {
        bookings: [],
        source: "supabase",
        error: "Could not load bookings from Supabase.",
      };
    }

    return {
      bookings: data.map((row) => mapBookingRequest(row)),
      source: "supabase",
      error: null,
    };
  } catch {
    return {
      bookings: [],
      source: "supabase",
      error: "Supabase is not configured correctly.",
    };
  }
}

export async function getStaffBookingRequests() {
  const result = await fetchBookingsFromSupabase([...PENDING_BOOKING_STATUSES], "created_at");

  return {
    ...result,
    bookings: result.bookings.filter(isPendingBooking),
  };
}

export async function getDeclinedBookings() {
  return fetchBookingsFromSupabase(["declined"], "updated_at");
}

/** Bookings with check-in inside a date range for the reservations ledger (includes declined). */
export async function getBookingsForDateRange(fromIso: string, toIso: string) {
  if (!hasStaffSupabaseConfig()) {
    return {
      bookings: [],
      source: "sample" as const,
      error: "Supabase is not configured. Connect the database to load live bookings.",
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .gte("arrival_date", fromIso)
      .lte("arrival_date", toIso)
      .in("status", [
        "confirmed",
        "pending_payment",
        "awaiting",
        "needs-reply",
        "declined",
        "new",
      ])
      .order("arrival_date", { ascending: true })
      .limit(500);

    const unitMap =
      error || !data ? new Map<string, string>() : await getBookingRoomUnitMap(supabase);

    if (error || !data) {
      return {
        bookings: [],
        source: "supabase" as const,
        error: "Could not load bookings from Supabase.",
      };
    }

    return {
      bookings: data.map((row) =>
        mapBookingRequest(row, unitMap.get(row.id) ?? row.room_unit_id ?? null),
      ),
      source: "supabase" as const,
      error: null,
    };
  } catch {
    return {
      bookings: [],
      source: "supabase" as const,
      error: "Supabase is not configured correctly.",
    };
  }
}

export async function getStaffBookingById(bookingId: string) {
  if (!bookingId) {
    return null;
  }

  if (!hasStaffSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapBookingRequest(data);
  } catch {
    return null;
  }
}

export async function getConfirmedBookings(month?: { year: number; month: number }) {
  if (!hasStaffSupabaseConfig()) {
    return {
      bookings: [],
      source: "sample" as const,
      error: "Supabase is not configured. Connect the database to load the calendar.",
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    let query = supabase
      .from("booking_requests")
      .select("*")
      .or(CALENDAR_BOOKING_FILTER)
      .order("arrival_date", { ascending: true });

    if (month) {
      const { monthStart, monthEnd } = getCalendarMonthBounds(month.year, month.month);
      query = query.lte("arrival_date", monthEnd).gt("departure_date", monthStart);
    } else {
      query = query.limit(300);
    }

    const { data, error } = await query;
    const unitMap = error || !data ? new Map<string, string>() : await getBookingRoomUnitMap(supabase);

    if (error || !data) {
      return {
        bookings: [],
        source: "supabase" as const,
        error: "Could not load bookings from Supabase.",
      };
    }

    const calendarBookings = data
      .map((row) => mapBookingRequest(row, unitMap.get(row.id) ?? row.room_unit_id ?? null))
      .filter(isCalendarBooking);

    return {
      bookings: calendarBookings,
      source: "supabase" as const,
      error: null,
    };
  } catch {
    return {
      bookings: [],
      source: "supabase" as const,
      error: "Supabase is not configured correctly.",
    };
  }
}

export async function getConfirmedBookingById(bookingId: string) {
  if (!bookingId) {
    return null;
  }

  if (!hasStaffSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const [{ data, error }, unitMap] = await Promise.all([
      supabase.from("booking_requests").select("*").eq("id", bookingId).maybeSingle(),
      getBookingRoomUnitMap(supabase),
    ]);

    if (error || !data) {
      return null;
    }

    const booking = mapBookingRequest(
      data,
      unitMap.get(data.id) ?? data.room_unit_id ?? null,
    );
    if (!isCalendarBooking(booking)) {
      return null;
    }

    return booking;
  } catch {
    return null;
  }
}
