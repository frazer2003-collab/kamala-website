"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  calendarMonthSpan,
  formatCalendarMonth,
  formatCalendarMonthLabel,
  formatCalendarMonthRangeLabel,
  parseCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/calendar";

type StaffCalendarMonthPickerProps = {
  monthKey: string;
  throughKey?: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
};

function buildMonthHref(
  monthKey: string,
  throughKey: string | undefined,
  selectedBookingKey?: string,
  selectedBlockKey?: string,
) {
  const params = new URLSearchParams({
    month: monthKey,
    through: throughKey || monthKey,
  });

  if (selectedBookingKey) {
    params.set("booking", selectedBookingKey);
  } else if (selectedBlockKey) {
    params.set("block", selectedBlockKey);
  }

  return `/staff/calendar?${params.toString()}`;
}

function shiftRange(monthKey: string, throughKey: string, delta: number) {
  const start = parseCalendarMonth(monthKey);
  const end = parseCalendarMonth(throughKey);
  const span = Math.max(1, calendarMonthSpan(start, end));
  const nextStart = shiftCalendarMonth(start.year, start.month, delta);
  const nextEnd = shiftCalendarMonth(nextStart.year, nextStart.month, span - 1);
  return {
    monthKey: formatCalendarMonth(nextStart.year, nextStart.month),
    throughKey: formatCalendarMonth(nextEnd.year, nextEnd.month),
  };
}

export function StaffCalendarMonthPicker({
  monthKey,
  throughKey = monthKey,
  selectedBookingKey,
  selectedBlockKey,
}: StaffCalendarMonthPickerProps) {
  const router = useRouter();
  const start = parseCalendarMonth(monthKey);
  const end = parseCalendarMonth(throughKey);
  const label = formatCalendarMonthRangeLabel(start, end);
  const prev = shiftRange(monthKey, throughKey, -1);
  const next = shiftRange(monthKey, throughKey, 1);
  const prevLabel = formatCalendarMonthLabel(
    parseCalendarMonth(prev.monthKey).year,
    parseCalendarMonth(prev.monthKey).month,
  );
  const nextLabel = formatCalendarMonthLabel(
    parseCalendarMonth(next.monthKey).year,
    parseCalendarMonth(next.monthKey).month,
  );
  const span = Math.max(1, calendarMonthSpan(start, end));

  return (
    <div className="staff-calendar-toolbar__month-nav">
      <Link
        aria-label={`Previous range, starting ${prevLabel}`}
        className="staff-calendar-toolbar__month-step"
        href={buildMonthHref(
          prev.monthKey,
          prev.throughKey,
          selectedBookingKey,
          selectedBlockKey,
        )}
      >
        <span aria-hidden="true">‹</span>
      </Link>
      <label className="staff-calendar-toolbar__month-picker">
        <span className="sr-only">Choose starting month and year</span>
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
            const nextStart = parseCalendarMonth(nextValue);
            const nextEnd = shiftCalendarMonth(
              nextStart.year,
              nextStart.month,
              span - 1,
            );
            router.push(
              buildMonthHref(
                formatCalendarMonth(nextStart.year, nextStart.month),
                formatCalendarMonth(nextEnd.year, nextEnd.month),
                selectedBookingKey,
                selectedBlockKey,
              ),
            );
          }}
          type="month"
          value={monthKey}
        />
      </label>
      <Link
        aria-label={`Next range, starting ${nextLabel}`}
        className="staff-calendar-toolbar__month-step"
        href={buildMonthHref(
          next.monthKey,
          next.throughKey,
          selectedBookingKey,
          selectedBlockKey,
        )}
      >
        <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}
