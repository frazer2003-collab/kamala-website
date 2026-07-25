"use client";

import { useEffect, useRef, useState } from "react";
import { getTodayIso, type CalendarDay } from "@/lib/calendar";

type CalendarDateStripProps = {
  days: CalendarDay[];
  selectedDate?: string;
};

function scrollTimelineToDay(iso: string) {
  const target = document.querySelector<HTMLElement>(
    `.staff-extranet__dayhead[data-calendar-day="${CSS.escape(iso)}"]`,
  );
  if (!target) {
    return;
  }

  const scrollRoot =
    target.closest<HTMLElement>(".staff-extranet__scroll") ??
    target.closest<HTMLElement>(".staff-timeline__scroll");

  if (!scrollRoot) {
    target.scrollIntoView({ block: "nearest", inline: "center" });
    return;
  }

  const rootRect = scrollRoot.getBoundingClientRect();
  const cellRect = target.getBoundingClientRect();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nextLeft =
    scrollRoot.scrollLeft +
    (cellRect.left - rootRect.left) -
    rootRect.width * 0.12;

  scrollRoot.scrollTo({
    left: Math.max(0, nextLeft),
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

export function CalendarDateStrip({ days, selectedDate }: CalendarDateStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const todayIso = getTodayIso();
  const [pickedIso, setPickedIso] = useState(todayIso);
  const activeIso = selectedDate || pickedIso;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const focusIso = days.some((day) => day.iso === activeIso) ? activeIso : todayIso;
    const chip = scroller.querySelector<HTMLElement>(
      `[data-date-strip-day="${CSS.escape(focusIso)}"]`,
    );
    if (!chip) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    const nextLeft =
      scroller.scrollLeft +
      (chipRect.left - scrollerRect.left) -
      scrollerRect.width * 0.35;

    scroller.scrollTo({ left: Math.max(0, nextLeft), behavior: "auto" });
  }, [activeIso, days, todayIso]);

  if (days.length === 0) {
    return null;
  }

  return (
    <div className="calendar-date-strip" role="region" aria-label="Jump to date">
      <div className="calendar-date-strip__scroller" ref={scrollerRef}>
        {days.map((day) => {
          const isToday = day.iso === todayIso;
          const isActive = day.iso === activeIso;
          const weekday = new Intl.DateTimeFormat("en", { weekday: "short" }).format(
            day.date,
          );
          const label = new Intl.DateTimeFormat("en", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(day.date);

          return (
            <button
              aria-current={isActive ? "date" : undefined}
              aria-label={`Show ${label}`}
              className={[
                "calendar-date-strip__day",
                isToday ? "calendar-date-strip__day--today" : "",
                isActive ? "calendar-date-strip__day--active" : "",
                !day.inCurrentMonth ? "calendar-date-strip__day--muted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-date-strip-day={day.iso}
              key={day.iso}
              onClick={() => {
                setPickedIso(day.iso);
                scrollTimelineToDay(day.iso);
              }}
              type="button"
            >
              <span className="calendar-date-strip__weekday">{weekday}</span>
              <span className="calendar-date-strip__num">{day.date.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
