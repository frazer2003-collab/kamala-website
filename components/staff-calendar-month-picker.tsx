"use client";

import { useRouter } from "next/navigation";
import { formatCalendarMonthLabel, parseCalendarMonth } from "@/lib/calendar";

type StaffCalendarMonthPickerProps = {
  monthKey: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
};

function buildMonthHref(
  monthKey: string,
  selectedBookingKey?: string,
  selectedBlockKey?: string,
) {
  const params = new URLSearchParams({ month: monthKey });

  if (selectedBookingKey) {
    params.set("booking", selectedBookingKey);
  } else if (selectedBlockKey) {
    params.set("block", selectedBlockKey);
  }

  return `/staff/calendar?${params.toString()}`;
}

export function StaffCalendarMonthPicker({
  monthKey,
  selectedBookingKey,
  selectedBlockKey,
}: StaffCalendarMonthPickerProps) {
  const router = useRouter();
  const { year, month } = parseCalendarMonth(monthKey);
  const label = formatCalendarMonthLabel(year, month);

  return (
    <label className="staff-calendar-toolbar__month-picker">
      <span className="sr-only">Choose month and year</span>
      <span aria-hidden="true" className="staff-calendar-toolbar__month-label">
        {label}
      </span>
      <input
        className="staff-calendar-toolbar__month-input"
        onChange={(event) => {
          const next = event.target.value;
          if (!next || !/^\d{4}-\d{2}$/.test(next)) {
            return;
          }
          router.push(buildMonthHref(next, selectedBookingKey, selectedBlockKey));
        }}
        type="month"
        value={monthKey}
      />
    </label>
  );
}
