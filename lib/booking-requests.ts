import { type Booking, type BookingStatus } from "@/lib/content";
import { parseBedSetup } from "@/lib/bed-setup";
import { parseBookingSource } from "@/lib/booking-source";
import { bookingReservesRoom } from "@/lib/booking-reservation";
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
 * Stays fetched for the staff calendar tape.
 * Unverified Thai bank claims (`bank_transfer_claimed`, unpaid) stay in Requests
 * until staff confirm — they hold guest inventory once the guest taps "I've paid".
 */
export const CALENDAR_BOOKING_FILTER =
  "status.eq.confirmed,deposit_paid_at.not.is.null,bank_transfer_claimed_at.not.is.null";

export type StaffBooking = Booking & {
  databaseId: string | null;
  bankTransferClaimed: boolean;
  stripePaymentIntentId: string | null;
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
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
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

/** Guest started checkout but did not finish (bank/QR hold or abandoned card page). */
export function isAbandonedCheckoutHold(
  booking: Pick<
    StaffBooking,
    "status" | "depositPaid" | "bankTransferClaimed" | "stripePaymentIntentId"
  >,
) {
  return (
    booking.status === "pending_payment" &&
    !booking.depositPaid &&
    !booking.bankTransferClaimed &&
    !booking.stripePaymentIntentId
  );
}

/** Guest tapped I've paid; staff has not verified the transfer yet. */
export function isUnverifiedBankHold(
  booking: Pick<StaffBooking, "status" | "depositPaid" | "bankTransferClaimed">,
) {
  if (booking.depositPaid || !booking.bankTransferClaimed) {
    return false;
  }

  return (
    booking.status === "awaiting" ||
    booking.status === "needs-reply" ||
    booking.status === "new"
  );
}

/** Holds staff can cancel from Requests without a decline email (no verified payment). */
export function isStaffCancellableHold(booking: StaffBooking) {
  return isAbandonedCheckoutHold(booking) || isUnverifiedBankHold(booking);
}

export function isPendingBooking(booking: StaffBooking) {
  if (isAbandonedCheckoutHold(booking)) {
    return true;
  }

  if (booking.status === "awaiting") {
    return booking.depositPaid || booking.bankTransferClaimed;
  }

  return PENDING_BOOKING_STATUSES.includes(
    booking.status as (typeof PENDING_BOOKING_STATUSES)[number],
  );
}

export type OpenRequestsSummary = {
  total: number;
  needsReply: number;
  checkoutHolds: number;
  awaitingPayment: number;
  newRequests: number;
};

export function summarizeOpenRequests(bookings: StaffBooking[]): OpenRequestsSummary {
  let needsReply = 0;
  let checkoutHolds = 0;
  let awaitingPayment = 0;
  let newRequests = 0;

  for (const booking of bookings) {
    if (booking.status === "needs-reply") {
      needsReply += 1;
    } else if (isAbandonedCheckoutHold(booking)) {
      checkoutHolds += 1;
    } else if (booking.status === "awaiting") {
      awaitingPayment += 1;
    } else if (booking.status === "new") {
      newRequests += 1;
    }
  }

  return {
    total: bookings.length,
    needsReply,
    checkoutHolds,
    awaitingPayment,
    newRequests,
  };
}

export function openRequestsHref(summary: OpenRequestsSummary) {
  if (summary.needsReply > 0) {
    return "/staff?filter=needs-reply&view=inbox";
  }

  if (summary.awaitingPayment > 0) {
    return "/staff?filter=awaiting&view=inbox";
  }

  return "/staff?view=inbox";
}

export function openRequestsWarningCopy(summary: OpenRequestsSummary) {
  if (summary.total === 0) {
    return null;
  }

  const parts: string[] = [];
  if (summary.needsReply > 0) {
    parts.push(
      `${summary.needsReply} waiting for a reply`,
    );
  }
  if (summary.checkoutHolds > 0) {
    parts.push(
      `${summary.checkoutHolds} checkout hold${summary.checkoutHolds === 1 ? "" : "s"}`,
    );
  }
  if (summary.awaitingPayment > 0) {
    parts.push(
      `${summary.awaitingPayment} payment review`,
    );
  }
  if (summary.newRequests > 0) {
    parts.push(`${summary.newRequests} new`);
  }

  const detail = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  const requestLabel = summary.total === 1 ? "request" : "requests";

  return `${summary.total} open ${requestLabel} in Requests${detail}. Review there before assigning doors on the calendar.`;
}

/**
 * Visible on the staff calendar tape for room assignment.
 * Unverified bank-transfer claims stay off the tape until Requests approval.
 * Guest inventory is held separately by `bookingReservesRoom`.
 */
export function isCalendarBooking(
  booking: Pick<Booking, "status" | "depositPaid"> & {
    bankTransferClaimed?: boolean;
    stripePaymentIntentId?: string | null;
  },
) {
  if (booking.status === "declined") {
    return false;
  }

  // Waiting in Requests — not assignable on the calendar yet.
  if (booking.bankTransferClaimed && !booking.depositPaid) {
    return false;
  }

  // Unpaid checkout — no calendar tape until card paid or bank "I've paid".
  if (booking.status === "pending_payment") {
    return false;
  }

  if (booking.status === "confirmed") {
    return true;
  }

  if (booking.depositPaid) {
    return true;
  }

  return false;
}

/** Guest-facing hold that blocks inventory before confirmation (bank claim, not paid card). */
export function isInventoryHoldBooking(
  booking: Pick<Booking, "status" | "depositPaid"> & {
    bankTransferClaimed?: boolean;
  },
) {
  if (booking.status === "declined" || booking.depositPaid) {
    return false;
  }

  return bookingReservesRoom({
    status: booking.status,
    deposit_paid_at: null,
    bank_transfer_claimed_at: booking.bankTransferClaimed ? "claimed" : null,
  });
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
  const result = await fetchBookingsFromSupabase(
    [...PENDING_BOOKING_STATUSES, "pending_payment"],
    "created_at",
  );

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

/** Confirmed/calendar stays whose nights overlap [fromIso, toIso] inclusive. */
export async function getConfirmedBookingsOverlappingRange(
  fromIso: string,
  toIso: string,
) {
  if (!hasStaffSupabaseConfig()) {
    return {
      bookings: [],
      source: "sample" as const,
      error: "Supabase is not configured. Connect the database to load the calendar.",
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .or(CALENDAR_BOOKING_FILTER)
      .lte("arrival_date", toIso)
      .gt("departure_date", fromIso)
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
      bookings: data
        .map((row) =>
          mapBookingRequest(row, unitMap.get(row.id) ?? row.room_unit_id ?? null),
        )
        .filter(isCalendarBooking),
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
