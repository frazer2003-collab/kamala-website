"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  defaultStaffTimelineSelectionRange,
  formatCalendarMonth,
  formatCalendarMonthLabel,
  parseCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/calendar";

type StaffCalendarMonthPickerProps = {
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
  /**
   * Staff page path for month links (e.g. `/staff/sold`).
   * Defaults to the calendar. Must be a string — not a function — so server
   * pages can pass it into this client component.
   */
  pathname?: string;
};

function buildMonthHref(
  pathname: string | undefined,
  monthKey: string,
  selectedBookingKey?: string,
  selectedBlockKey?: string,
) {
  const selection = defaultStaffTimelineSelectionRange(monthKey);
  const params = new URLSearchParams({
    month: monthKey,
    from: selection.fromIso,
    to: selection.toIso,
  });

  if (!pathname || pathname === "/staff/calendar") {
    if (selectedBookingKey) {
      params.set("booking", selectedBookingKey);
    } else if (selectedBlockKey) {
      params.set("block", selectedBlockKey);
    }
    return `/staff/calendar?${params.toString()}`;
  }

  return `${pathname}?${params.toString()}`;
}

export function StaffCalendarMonthPicker({
  monthKey,
  selectedBookingKey,
  selectedBlockKey,
  pathname,
}: StaffCalendarMonthPickerProps) {
  const router = useRouter();
  const { year, month } = parseCalendarMonth(monthKey);
  const label = formatCalendarMonthLabel(year, month);
  const prev = shiftCalendarMonth(year, month, -1);
  const next = shiftCalendarMonth(year, month, 1);
  const prevKey = formatCalendarMonth(prev.year, prev.month);
  const nextKey = formatCalendarMonth(next.year, next.month);
  const prevLabel = formatCalendarMonthLabel(prev.year, prev.month);
  const nextLabel = formatCalendarMonthLabel(next.year, next.month);
  const hrefFor = (key: string) =>
    buildMonthHref(pathname, key, selectedBookingKey, selectedBlockKey);

  return (
    <div className="staff-calendar-toolbar__month-nav">
      <Link
        aria-label={`Previous month, ${prevLabel}`}
        className="staff-calendar-toolbar__month-step"
        href={hrefFor(prevKey)}
      >
        <span aria-hidden="true">‹</span>
      </Link>
      <label className="staff-calendar-toolbar__month-picker">
        <span className="sr-only">Choose month and year</span>
        <span aria-hidden="true" className="staff-calendar-toolbar__month-label">
          {label}
        </span>
        <input
          className="staff-calendar-toolbar__month-input"
          onChange={(event) => {
            const nextValue = event.target.value;
            if (!nextValue || !/^\d{4}-\d{2}$/.test(nextValue)) {
              return;
            }
            router.push(hrefFor(nextValue));
          }}
          type="month"
          value={monthKey}
        />
      </label>
      <Link
        aria-label={`Next month, ${nextLabel}`}
        className="staff-calendar-toolbar__month-step"
        href={hrefFor(nextKey)}
      >
        <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}
