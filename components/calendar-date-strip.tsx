"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  STAFF_TIMELINE_MAX_MONTHS,
  clampCalendarMonthRange,
  formatCalendarMonth,
  formatCalendarMonthLabel,
  listCalendarMonths,
  parseCalendarMonth,
  shiftCalendarMonth,
  type CalendarMonthRef,
} from "@/lib/calendar";

type CalendarDateStripProps = {
  monthKey: string;
  throughKey: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
};

function monthKeyOf(ref: CalendarMonthRef) {
  return formatCalendarMonth(ref.year, ref.month);
}

function buildRangeHref(
  startKey: string,
  endKey: string,
  selectedBookingKey?: string,
  selectedBlockKey?: string,
) {
  const params = new URLSearchParams({
    month: startKey,
    through: endKey,
  });
  if (selectedBookingKey) {
    params.set("booking", selectedBookingKey);
  } else if (selectedBlockKey) {
    params.set("block", selectedBlockKey);
  }
  return `/staff/calendar?${params.toString()}`;
}

function shortMonthLabel(ref: CalendarMonthRef) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(
    new Date(ref.year, ref.month - 1, 1),
  );
}

export function CalendarDateStrip({
  monthKey,
  throughKey,
  selectedBookingKey,
  selectedBlockKey,
}: CalendarDateStripProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const start = parseCalendarMonth(monthKey);
  const end = parseCalendarMonth(throughKey);
  const [draftStart, setDraftStart] = useState<CalendarMonthRef | null>(null);

  const pickerMonths = useMemo(() => {
    const anchor = shiftCalendarMonth(start.year, start.month, -6);
    return listCalendarMonths(anchor, 24);
  }, [start.month, start.year]);

  const selectedKeys = useMemo(() => {
    const span = clampCalendarMonthRange(start, end).monthCount;
    return new Set(
      listCalendarMonths(start, span).map((month) => monthKeyOf(month)),
    );
  }, [end, start]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const focusKey = monthKey;
    const chip = scroller.querySelector<HTMLElement>(
      `[data-month-range="${CSS.escape(focusKey)}"]`,
    );
    if (!chip) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    const nextLeft =
      scroller.scrollLeft +
      (chipRect.left - scrollerRect.left) -
      scrollerRect.width * 0.2;

    scroller.scrollTo({ left: Math.max(0, nextLeft), behavior: "auto" });
  }, [monthKey, throughKey]);

  function applyRange(nextStart: CalendarMonthRef, nextEnd: CalendarMonthRef) {
    const clamped = clampCalendarMonthRange(nextStart, nextEnd);
    const startKey = monthKeyOf(clamped.start);
    const endKey = monthKeyOf(clamped.end);
    router.push(
      buildRangeHref(startKey, endKey, selectedBookingKey, selectedBlockKey),
    );
  }

  function onMonthClick(month: CalendarMonthRef) {
    if (!draftStart) {
      setDraftStart(month);
      return;
    }

    applyRange(draftStart, month);
    setDraftStart(null);
  }

  const draftKey = draftStart ? monthKeyOf(draftStart) : null;
  const hint = draftStart
    ? `Choose an end month (up to ${STAFF_TIMELINE_MAX_MONTHS} months from ${formatCalendarMonthLabel(draftStart.year, draftStart.month)}).`
    : `Select a start and end month — up to ${STAFF_TIMELINE_MAX_MONTHS} months at a time.`;

  return (
    <div className="calendar-date-strip" role="region" aria-label="Month range">
      <div className="calendar-date-strip__header">
        <p className="calendar-date-strip__hint">{hint}</p>
        {draftStart ? (
          <button
            className="calendar-date-strip__cancel"
            onClick={() => setDraftStart(null)}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <div className="calendar-date-strip__scroller" ref={scrollerRef}>
        {pickerMonths.map((month) => {
          const key = monthKeyOf(month);
          const inSelection = selectedKeys.has(key);
          const isDraft = draftKey === key;
          const isRangeStart = key === monthKey;
          const isRangeEnd = key === throughKey;
          const label = formatCalendarMonthLabel(month.year, month.month);

          return (
            <button
              aria-label={
                draftStart
                  ? `Set range end to ${label}`
                  : `Start range at ${label}`
              }
              aria-pressed={inSelection || isDraft}
              className={[
                "calendar-date-strip__month",
                inSelection ? "calendar-date-strip__month--selected" : "",
                isDraft ? "calendar-date-strip__month--draft" : "",
                isRangeStart ? "calendar-date-strip__month--start" : "",
                isRangeEnd ? "calendar-date-strip__month--end" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-month-range={key}
              key={key}
              onClick={() => onMonthClick(month)}
              type="button"
            >
              <span className="calendar-date-strip__month-name">
                {shortMonthLabel(month)}
              </span>
              <span className="calendar-date-strip__month-year">{month.year}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
