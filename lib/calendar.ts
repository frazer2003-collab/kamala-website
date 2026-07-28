export type CalendarDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
};

export function parseCalendarMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatCalendarMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftCalendarMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function formatCalendarMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

/** Month label for a YYYY-MM-DD (or YYYY-MM) value. */
export function formatCalendarMonthLabelFromIso(iso: string) {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  if (!year || month < 1 || month > 12) {
    return formatCalendarMonthLabel(new Date().getFullYear(), new Date().getMonth() + 1);
  }
  return formatCalendarMonthLabel(year, month);
}

/**
 * Pick the first day column whose right edge clears the sticky label edge
 * (the leading visible day while scrolling the staff timeline).
 */
export function pickLeadingVisibleCalendarDayIso(
  days: Array<{ iso: string; left: number; right: number }>,
  labelRight: number,
) {
  if (days.length === 0) {
    return null;
  }

  for (const day of days) {
    if (day.right > labelRight + 1) {
      return day.iso;
    }
  }

  return days[days.length - 1]?.iso ?? null;
}

export const PROPERTY_TIME_ZONE = "Asia/Bangkok";

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTodayIsoInTimeZone(timeZone: string = PROPERTY_TIME_ZONE) {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

export function getPropertyTodayIso() {
  return getTodayIsoInTimeZone(PROPERTY_TIME_ZONE);
}

export function getTodayIso() {
  return toIsoDate(new Date());
}

export function isPastCalendarDate(iso: string) {
  return iso < getTodayIso();
}

/** Max months the staff timeline can show in one view. */
export const STAFF_TIMELINE_MAX_MONTHS = 3;

/**
 * Default board length past the anchor month start: current month plus the
 * next two, so staff can scroll right into months 2 and 3.
 */
export const STAFF_TIMELINE_DEFAULT_MONTHS = 3;

export type CalendarMonthRef = {
  year: number;
  month: number;
};

function parseIsoToLocalDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftIsoDate(iso: string, days: number) {
  const date = parseIsoToLocalDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function isIsoDateString(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = parseIsoToLocalDate(value);
  return toIsoDate(date) === value;
}

/** Inclusive month count from start through end (same month → 1). */
export function calendarMonthSpan(start: CalendarMonthRef, end: CalendarMonthRef) {
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

export function listCalendarMonths(
  start: CalendarMonthRef,
  monthCount: number,
): CalendarMonthRef[] {
  const count = Math.max(1, Math.floor(monthCount));
  return Array.from({ length: count }, (_, index) =>
    shiftCalendarMonth(start.year, start.month, index),
  );
}

/**
 * Normalize a month range so start ≤ end and the span is at most
 * STAFF_TIMELINE_MAX_MONTHS (extra months are trimmed from the end).
 */
export function clampCalendarMonthRange(
  start: CalendarMonthRef,
  end: CalendarMonthRef,
  maxMonths = STAFF_TIMELINE_MAX_MONTHS,
): { start: CalendarMonthRef; end: CalendarMonthRef; monthCount: number } {
  const ordered =
    calendarMonthSpan(start, end) > 0
      ? { start, end }
      : { start: end, end: start };
  const rawCount = calendarMonthSpan(ordered.start, ordered.end);
  const monthCount = Math.min(Math.max(1, rawCount), Math.max(1, maxMonths));
  const clampedEnd = shiftCalendarMonth(
    ordered.start.year,
    ordered.start.month,
    monthCount - 1,
  );

  return {
    start: ordered.start,
    end: clampedEnd,
    monthCount,
  };
}

/**
 * Latest end date allowed for a from date within maxMonths calendar months
 * (inclusive). Example: from 2026-07-10 with max 3 → 2026-09-30.
 */
export function maxStaffTimelineEndIso(
  fromIso: string,
  maxMonths = STAFF_TIMELINE_MAX_MONTHS,
) {
  const start = {
    year: Number(fromIso.slice(0, 4)),
    month: Number(fromIso.slice(5, 7)),
  };
  const end = shiftCalendarMonth(
    start.year,
    start.month,
    Math.max(1, maxMonths) - 1,
  );
  return getCalendarMonthBounds(end.year, end.month).monthEnd;
}

export type StaffCalendarHrefOptions = {
  month?: string;
  from?: string;
  to?: string;
  booking?: string;
  block?: string;
  room?: string;
  date?: string;
  mode?: string;
  extras?: Record<string, string | undefined | null>;
};

/** Build a staff calendar URL, preserving an optional from/to day range. */
export function buildStaffCalendarHref({
  month,
  from,
  to,
  booking,
  block,
  room,
  date,
  mode,
  extras,
}: StaffCalendarHrefOptions) {
  const params = new URLSearchParams();
  if (month) {
    params.set("month", month);
  }
  if (from && isIsoDateString(from)) {
    params.set("from", from);
  }
  if (to && isIsoDateString(to)) {
    params.set("to", to);
  }
  if (booking) {
    params.set("booking", booking);
  }
  if (block) {
    params.set("block", block);
  }
  if (room) {
    params.set("room", room);
  }
  if (date && isIsoDateString(date)) {
    params.set("date", date);
  }
  if (mode) {
    params.set("mode", mode);
  }
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  const query = params.toString();
  return query ? `/staff/calendar?${query}` : "/staff/calendar";
}

export function staffCalendarRangeFromFormData(formData: FormData) {
  const monthRaw = String(formData.get("month") ?? "").trim();
  const fromRaw = String(formData.get("from") ?? "").trim();
  const toRaw = String(formData.get("to") ?? "").trim();
  return {
    month: /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : "",
    from: isIsoDateString(fromRaw) ? fromRaw : "",
    to: isIsoDateString(toRaw) ? toRaw : "",
  };
}

export function clampStaffTimelineDateRange(
  fromIso: string,
  toIso: string,
  maxMonths = STAFF_TIMELINE_MAX_MONTHS,
) {
  const ordered =
    fromIso <= toIso
      ? { fromIso, toIso }
      : { fromIso: toIso, toIso: fromIso };
  const maxEnd = maxStaffTimelineEndIso(ordered.fromIso, maxMonths);
  return {
    fromIso: ordered.fromIso,
    toIso: ordered.toIso > maxEnd ? maxEnd : ordered.toIso,
  };
}

export function monthsOverlappingDateRange(fromIso: string, toIso: string) {
  const start = {
    year: Number(fromIso.slice(0, 4)),
    month: Number(fromIso.slice(5, 7)),
  };
  const end = {
    year: Number(toIso.slice(0, 4)),
    month: Number(toIso.slice(5, 7)),
  };
  const monthCount = Math.max(1, calendarMonthSpan(start, end));
  return listCalendarMonths(start, monthCount);
}

/** One-month from/to for the date inputs (default selection). */
export function defaultStaffTimelineSelectionRange(monthParam?: string) {
  const start = parseCalendarMonth(monthParam);
  const { monthStart, monthEnd } = getCalendarMonthBounds(start.year, start.month);
  return { fromIso: monthStart, toIso: monthEnd };
}

/** Scrollable board horizon: anchor month plus the next two. */
export function defaultStaffTimelineDateRange(monthParam?: string) {
  const start = parseCalendarMonth(monthParam);
  const end = shiftCalendarMonth(
    start.year,
    start.month,
    STAFF_TIMELINE_DEFAULT_MONTHS - 1,
  );
  const { monthStart } = getCalendarMonthBounds(start.year, start.month);
  const { monthEnd } = getCalendarMonthBounds(end.year, end.month);
  return { fromIso: monthStart, toIso: monthEnd };
}

/**
 * Resolve the staff timeline date window.
 * Prefers `from`/`to` day params for the selector; the board expands to a
 * three-month scroll horizon from the start month so months 2 and 3 can be
 * revealed by scrolling right.
 */
export function parseStaffTimelineRange({
  month: monthParam,
  through: throughParam,
  from: fromParam,
  to: toParam,
  maxMonths = STAFF_TIMELINE_MAX_MONTHS,
}: {
  month?: string;
  through?: string;
  from?: string;
  to?: string;
  maxMonths?: number;
} = {}) {
  let fromIso: string;
  let toIso: string;

  if (isIsoDateString(fromParam) || isIsoDateString(toParam)) {
    const fallback = defaultStaffTimelineSelectionRange(monthParam);
    fromIso = isIsoDateString(fromParam) ? fromParam : fallback.fromIso;
    toIso = isIsoDateString(toParam) ? toParam : fallback.toIso;
  } else if (throughParam) {
    const start = parseCalendarMonth(monthParam);
    const end = parseCalendarMonth(throughParam);
    const clampedMonths = clampCalendarMonthRange(start, end, maxMonths);
    fromIso = getCalendarMonthBounds(
      clampedMonths.start.year,
      clampedMonths.start.month,
    ).monthStart;
    toIso = getCalendarMonthBounds(
      clampedMonths.end.year,
      clampedMonths.end.month,
    ).monthEnd;
  } else {
    // Default selector: one month. Board still expands to +2 months below.
    ({ fromIso, toIso } = defaultStaffTimelineSelectionRange(monthParam));
  }

  const selected = clampStaffTimelineDateRange(fromIso, toIso, maxMonths);
  const horizon = defaultStaffTimelineDateRange(selected.fromIso.slice(0, 7));
  const startMonthEnd = defaultStaffTimelineSelectionRange(
    selected.fromIso.slice(0, 7),
  ).toIso;
  const isDefaultOneMonthSelection =
    selected.fromIso === horizon.fromIso && selected.toIso === startMonthEnd;
  // One-month default (and month-picker jumps) keep a 3-month scroll horizon.
  // Custom from/to ranges use the exact selected window (still max 3 months).
  const boardToIso = isDefaultOneMonthSelection ? horizon.toIso : selected.toIso;
  const board = clampStaffTimelineDateRange(
    selected.fromIso,
    boardToIso,
    maxMonths,
  );
  const months = monthsOverlappingDateRange(board.fromIso, board.toIso);
  const start = months[0] ?? parseCalendarMonth(monthParam);
  const end = months[months.length - 1] ?? start;
  const monthKey = formatCalendarMonth(start.year, start.month);
  const throughKey = formatCalendarMonth(end.year, end.month);

  return {
    fromIso: selected.fromIso,
    toIso: selected.toIso,
    boardFromIso: board.fromIso,
    boardToIso: board.toIso,
    start,
    end,
    monthCount: months.length,
    months,
    monthKey,
    throughKey,
  };
}

function buildIsoDayRange(startIso: string, endIso: string): CalendarDay[] {
  const days: CalendarDay[] = [];
  let cursor = startIso;

  while (cursor <= endIso) {
    const date = parseIsoToLocalDate(cursor);
    days.push({
      date,
      iso: cursor,
      // All days in the selected staff timeline range are interactive.
      inCurrentMonth: true,
    });
    cursor = shiftIsoDate(cursor, 1);
  }

  return days;
}

/**
 * Staff timeline day columns for an inclusive from/to date range
 * (clamped to STAFF_TIMELINE_MAX_MONTHS).
 */
export function buildStaffTimelineDays(
  fromIso: string,
  toIso: string,
  { maxMonths = STAFF_TIMELINE_MAX_MONTHS }: { maxMonths?: number } = {},
): CalendarDay[] {
  const range = clampStaffTimelineDateRange(fromIso, toIso, maxMonths);
  return buildIsoDayRange(range.fromIso, range.toIso);
}

export function dateRangeOverlapsBooking(
  booking: { arrivalDate: string; departureDate: string },
  fromIso: string,
  toIso: string,
) {
  return booking.arrivalDate <= toIso && booking.departureDate > fromIso;
}

export function buildCalendarDays(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingDays = firstOfMonth.getDay();
  const days: CalendarDay[] = [];

  for (let index = leadingDays - 1; index >= 0; index -= 1) {
    const date = new Date(year, month - 1, -index);
    days.push({
      date,
      iso: toIsoDate(date),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    days.push({
      date,
      iso: toIsoDate(date),
      inCurrentMonth: true,
    });
  }

  let trailingIndex = 1;
  while (days.length % 7 !== 0) {
    const date = new Date(year, month, trailingIndex);
    days.push({
      date,
      iso: toIsoDate(date),
      inCurrentMonth: false,
    });
    trailingIndex += 1;
  }

  return days;
}

export function bookingOccupiesDay(
  booking: { arrivalDate: string; departureDate: string },
  iso: string,
) {
  return iso >= booking.arrivalDate && iso < booking.departureDate;
}

export function monthOverlapsBooking(
  booking: { arrivalDate: string; departureDate: string },
  year: number,
  month: number,
) {
  const { monthStart, monthEnd } = getCalendarMonthBounds(year, month);
  return booking.arrivalDate <= monthEnd && booking.departureDate > monthStart;
}

export function getCalendarMonthBounds(year: number, month: number) {
  const monthStart = `${formatCalendarMonth(year, month)}-01`;
  const monthEnd = `${formatCalendarMonth(year, month)}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  return { monthStart, monthEnd };
}
