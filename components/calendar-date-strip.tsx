"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";
import {
  STAFF_TIMELINE_MAX_MONTHS,
  buildStaffCalendarHref,
  clampStaffTimelineDateRange,
} from "@/lib/calendar";

type CalendarDateStripProps = {
  fromIso: string;
  toIso: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
  /**
   * Staff page path for range links (e.g. `/staff/sold`).
   * Defaults to the calendar. Must be a string — not a function — so server
   * pages can pass it into this client component.
   */
  pathname?: string;
};

function buildPathHref(
  pathname: string,
  fromIso: string,
  toIso: string,
) {
  const params = new URLSearchParams({
    month: fromIso.slice(0, 7),
    from: fromIso,
    to: toIso,
  });
  return `${pathname}?${params.toString()}`;
}

export function CalendarDateStrip({
  fromIso,
  toIso,
  selectedBookingKey,
  selectedBlockKey,
  pathname,
}: CalendarDateStripProps) {
  const router = useRouter();
  const staySelection = useCalendarStaySelection();
  const activeBookingKey = staySelection?.bookingKey || selectedBookingKey;
  const activeBlockKey = staySelection?.blockKey || selectedBlockKey;
  const [fromValue, setFromValue] = useState(fromIso);
  const [toValue, setToValue] = useState(toIso);
  const hintId = "calendar-date-range-hint";

  useEffect(() => {
    setFromValue(fromIso);
    setToValue(toIso);
  }, [fromIso, toIso]);

  const hint = `Up to ${STAFF_TIMELINE_MAX_MONTHS} months. Either date can be changed first.`;

  function applyRange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) {
      return;
    }
    const clamped = clampStaffTimelineDateRange(nextFrom, nextTo);
    setFromValue(clamped.fromIso);
    setToValue(clamped.toIso);
    const href = pathname
      ? buildPathHref(pathname, clamped.fromIso, clamped.toIso)
      : buildStaffCalendarHref({
          month: clamped.fromIso.slice(0, 7),
          from: clamped.fromIso,
          to: clamped.toIso,
          booking: activeBookingKey,
          block: activeBookingKey ? undefined : activeBlockKey,
        });
    router.push(href);
  }

  return (
    <form
      aria-describedby={hintId}
      aria-label="Date range"
      className="calendar-date-strip"
      onSubmit={(event) => {
        event.preventDefault();
        applyRange(fromValue, toValue);
      }}
    >
      <div className="calendar-date-strip__header">
        <p className="calendar-date-strip__hint" id={hintId}>
          {hint}
        </p>
      </div>
      <div className="calendar-date-strip__fields">
        <label className="calendar-date-strip__field">
          <span className="calendar-date-strip__field-label">From</span>
          <input
            className="calendar-date-strip__input"
            name="from"
            onChange={(event) => setFromValue(event.target.value)}
            type="date"
            value={fromValue}
          />
        </label>
        <span className="calendar-date-strip__separator" aria-hidden="true">
          –
        </span>
        <label className="calendar-date-strip__field">
          <span className="calendar-date-strip__field-label">To</span>
          <input
            className="calendar-date-strip__input"
            name="to"
            onChange={(event) => setToValue(event.target.value)}
            type="date"
            value={toValue}
          />
        </label>
        <button className="calendar-date-strip__apply" type="submit">
          Show
        </button>
      </div>
    </form>
  );
}
