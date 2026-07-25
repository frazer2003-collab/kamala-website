"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  STAFF_TIMELINE_MAX_MONTHS,
  clampStaffTimelineDateRange,
  maxStaffTimelineEndIso,
} from "@/lib/calendar";

type CalendarDateStripProps = {
  fromIso: string;
  toIso: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
};

function buildRangeHref(
  fromIso: string,
  toIso: string,
  selectedBookingKey?: string,
  selectedBlockKey?: string,
) {
  const params = new URLSearchParams({
    from: fromIso,
    to: toIso,
    month: fromIso.slice(0, 7),
  });
  if (selectedBookingKey) {
    params.set("booking", selectedBookingKey);
  } else if (selectedBlockKey) {
    params.set("block", selectedBlockKey);
  }
  return `/staff/calendar?${params.toString()}`;
}

export function CalendarDateStrip({
  fromIso,
  toIso,
  selectedBookingKey,
  selectedBlockKey,
}: CalendarDateStripProps) {
  const router = useRouter();
  const [fromValue, setFromValue] = useState(fromIso);
  const [toValue, setToValue] = useState(toIso);

  useEffect(() => {
    setFromValue(fromIso);
    setToValue(toIso);
  }, [fromIso, toIso]);

  const maxTo = maxStaffTimelineEndIso(fromValue);
  const hint = `Choose a start and end date — up to ${STAFF_TIMELINE_MAX_MONTHS} months. Scroll the board to move through the range.`;

  function applyRange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) {
      return;
    }
    const clamped = clampStaffTimelineDateRange(nextFrom, nextTo);
    setFromValue(clamped.fromIso);
    setToValue(clamped.toIso);
    router.push(
      buildRangeHref(
        clamped.fromIso,
        clamped.toIso,
        selectedBookingKey,
        selectedBlockKey,
      ),
    );
  }

  return (
    <form
      className="calendar-date-strip"
      onSubmit={(event) => {
        event.preventDefault();
        applyRange(fromValue, toValue);
      }}
      role="region"
      aria-label="Date range"
    >
      <div className="calendar-date-strip__header">
        <p className="calendar-date-strip__hint">{hint}</p>
      </div>
      <div className="calendar-date-strip__fields">
        <label className="calendar-date-strip__field">
          <span className="calendar-date-strip__field-label">From</span>
          <input
            className="calendar-date-strip__input"
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
