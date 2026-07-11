export type CalendarColors = {
  available: string;
  closed: string;
  booking: string;
  /** Sold-out inventory cells — distinct from reservation bar yellow. */
  soldOut: string;
};

export const DEFAULT_CALENDAR_COLORS: CalendarColors = {
  available: "#bbf7d0",
  closed: "#fecaca",
  booking: "#fef08a",
  soldOut: "#fdba74",
};

const hexPattern = /^#[0-9A-Fa-f]{6}$/;

export function normalizeCalendarColor(value: string, fallback: string) {
  const trimmed = value.trim();
  if (hexPattern.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }

  return fallback;
}

export function normalizeCalendarColors(input: Partial<CalendarColors>): CalendarColors {
  return {
    available: normalizeCalendarColor(
      input.available ?? "",
      DEFAULT_CALENDAR_COLORS.available,
    ),
    closed: normalizeCalendarColor(input.closed ?? "", DEFAULT_CALENDAR_COLORS.closed),
    booking: normalizeCalendarColor(input.booking ?? "", DEFAULT_CALENDAR_COLORS.booking),
    soldOut: normalizeCalendarColor(input.soldOut ?? "", DEFAULT_CALENDAR_COLORS.soldOut),
  };
}

export function getCalendarColorStyleProps(colors: CalendarColors) {
  return {
    ["--calendar-color-available" as string]: colors.available,
    ["--calendar-color-closed" as string]: colors.closed,
    ["--calendar-color-booking" as string]: colors.booking,
    ["--calendar-color-sold-out" as string]: colors.soldOut,
  };
}
