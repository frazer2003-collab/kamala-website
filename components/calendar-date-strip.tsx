"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";
import {
  STAFF_TIMELINE_MAX_MONTHS,
  buildStaffCalendarHref,
  clampStaffTimelineDateRange,
  maxStaffTimelineEndIso,
} from "@/lib/calendar";

type CalendarDateStripProps = {
  fromIso: string;
  toIso: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
  /** Defaults to staff calendar range links. */
  buildHref?: (fromIso: string, toIso: string) => string;
};

export function CalendarDateStrip({
  fromIso,
  toIso,
  selectedBookingKey,
  selectedBlockKey,
  buildHref,
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

  const maxTo = maxStaffTimelineEndIso(fromValue);
  const hint = `Up to ${STAFF_TIMELINE_MAX_MONTHS} months.`;

  function applyRange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) {
      return;
    }
    const clamped = clampStaffTimelineDateRange(nextFrom, nextTo);
    setFromValue(clamped.fromIso);
    setToValue(clamped.toIso);
    const href = buildHref
      ? buildHref(clamped.fromIso, clamped.toIso)
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
            max={toValue || undefined}
            name="from"
            onChange={(event) => {
              const nextFrom = event.target.value;
              setFromValue(nextFrom);
              if (nextFrom && toValue && toValue < nextFrom) {
                setToValue(nextFrom);
              } else if (nextFrom && toValue > maxStaffTimelineEndIso(nextFrom)) {
                setToValue(maxStaffTimelineEndIso(nextFrom));
              }
            }}
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
            max={maxTo}
            min={fromValue || undefined}
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
