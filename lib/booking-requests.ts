import { bookings, type Booking, type BookingStatus } from "@/lib/content";
import { monthOverlapsBooking } from "@/lib/calendar";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type BookingRequestRow,
} from "@/lib/supabase";

export const PENDING_BOOKING_STATUSES = ["awaiting", "needs-reply", "new"] as const;

export const CALENDAR_BOOKING_FILTER =
  "status.eq.confirmed,and(status.eq.awaiting,deposit_paid_at.not.is.null)";

export type StaffBooking = Booking & {
  databaseId: string | null;
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

function mapBookingRequest(row: BookingRequestRow): StaffBooking {
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
    depositAmount: row.deposit_amount ?? Math.round(row.estimated_total * 0.5),
    depositPaid: Boolean(row.deposit_paid_at),
    stayStatus: row.stay_status ?? "expected",
    staffNote: row.staff_note ?? "",
  };
}

function mapFallbackBooking(booking: Booking): StaffBooking {
  return {
    ...booking,
    databaseId: null,
  };
}

function isPendingBooking(booking: Booking) {
  if (booking.status === "awaiting") {
    return booking.depositPaid;
  }

  return PENDING_BOOKING_STATUSES.includes(
    booking.status as (typeof PENDING_BOOKING_STATUSES)[number],
  );
}

function isCalendarBooking(booking: Booking) {
  return booking.status === "confirmed" || (booking.status === "awaiting" && booking.depositPaid);
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
    const filtered = bookings
      .filter((booking) => statuses.includes(booking.status))
      .map(mapFallbackBooking);

    return {
      bookings: filtered,
      source: "sample",
      error: null,
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
        bookings: bookings
          .filter((booking) => statuses.includes(booking.status))
          .map(mapFallbackBooking),
        source: "sample",
        error: "Could not load Supabase bookings. Showing sample data.",
      };
    }

    return {
      bookings: data.map(mapBookingRequest),
      source: "supabase",
      error: null,
    };
  } catch {
    return {
      bookings: bookings
        .filter((booking) => statuses.includes(booking.status))
        .map(mapFallbackBooking),
      source: "sample",
      error: "Supabase is not configured correctly. Showing sample data.",
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

export async function getStaffBookingById(bookingId: string) {
  if (!bookingId) {
    return null;
  }

  if (!hasStaffSupabaseConfig()) {
    return (
      bookings
        .map(mapFallbackBooking)
        .find((booking) => getStaffBookingKey(booking) === bookingId) ?? null
    );
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
    const calendarBookings = bookings.filter(isCalendarBooking).map(mapFallbackBooking);

    if (!month) {
      return {
        bookings: calendarBookings,
        source: "sample" as const,
        error: null,
      };
    }

    return {
      bookings: calendarBookings.filter((booking) =>
        monthOverlapsBooking(booking, month.year, month.month),
      ),
      source: "sample" as const,
      error: null,
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .or(CALENDAR_BOOKING_FILTER)
      .order("arrival_date", { ascending: true })
      .limit(100);

    if (error || !data) {
      const calendarBookings = bookings.filter(isCalendarBooking).map(mapFallbackBooking);
      return {
        bookings: month
          ? calendarBookings.filter((booking) =>
              monthOverlapsBooking(booking, month.year, month.month),
            )
          : calendarBookings,
        source: "sample" as const,
        error: "Could not load Supabase bookings. Showing sample data.",
      };
    }

    const calendarBookings = data.map(mapBookingRequest).filter(isCalendarBooking);

    if (!month) {
      return {
        bookings: calendarBookings,
        source: "supabase" as const,
        error: null,
      };
    }

    return {
      bookings: calendarBookings.filter((booking) =>
        monthOverlapsBooking(booking, month.year, month.month),
      ),
      source: "supabase" as const,
      error: null,
    };
  } catch {
    const calendarBookings = bookings.filter(isCalendarBooking).map(mapFallbackBooking);
    return {
      bookings: month
        ? calendarBookings.filter((booking) =>
            monthOverlapsBooking(booking, month.year, month.month),
          )
        : calendarBookings,
      source: "sample" as const,
      error: "Supabase is not configured correctly. Showing sample data.",
    };
  }
}

export async function getConfirmedBookingById(bookingId: string) {
  if (!bookingId) {
    return null;
  }

  if (!hasStaffSupabaseConfig()) {
    return (
      bookings
        .filter(isCalendarBooking)
        .map(mapFallbackBooking)
        .find((booking) => getStaffBookingKey(booking) === bookingId) ?? null
    );
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (
      error ||
      !data ||
      (data.status !== "confirmed" &&
        !(data.status === "awaiting" && data.deposit_paid_at))
    ) {
      return null;
    }

    return mapBookingRequest(data);
  } catch {
    return null;
  }
}
