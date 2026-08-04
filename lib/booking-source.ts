/** Staff-facing booking channel labels on calendar stays. */
export const BOOKING_SOURCES = [
  "walk-in",
  "airbnb",
  "expedia",
  "booking",
] as const;

export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  "walk-in": "Walk-in",
  airbnb: "Airbnb",
  expedia: "Expedia",
  booking: "Booking.com",
};

export function isBookingSource(value: string): value is BookingSource {
  return (BOOKING_SOURCES as readonly string[]).includes(value);
}

export function parseBookingSource(raw: string | null | undefined): BookingSource | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  return isBookingSource(value) ? value : null;
}

export function formatBookingSource(source: BookingSource | null | undefined): string {
  if (!source) {
    return "—";
  }
  return BOOKING_SOURCE_LABELS[source];
}

const OTA_BOOKING_SOURCES = ["airbnb", "expedia", "booking"] as const satisfies readonly BookingSource[];

export type OtaBookingSource = (typeof OTA_BOOKING_SOURCES)[number];

export function isOtaBookingSource(source: BookingSource | null | undefined): source is OtaBookingSource {
  return source !== null && source !== undefined && (OTA_BOOKING_SOURCES as readonly string[]).includes(source);
}

/** Infer a source from an iCal feed / channel label when staff have not set one. */
export function inferBookingSourceFromChannelLabel(
  label: string | null | undefined,
): BookingSource | null {
  if (!label) {
    return null;
  }
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("airbnb")) {
    return "airbnb";
  }
  if (normalized.includes("expedia")) {
    return "expedia";
  }
  if (normalized.includes("booking")) {
    return "booking";
  }
  return null;
}
