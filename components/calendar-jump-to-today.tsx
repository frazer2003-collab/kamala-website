"use client";

import { useEffect } from "react";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Scroll the staff timeline so today's column sits near the left of the
 * horizontal frame. Runs on every calendar open when today is in range, and
 * again when Jump to today sets #calendar-today.
 */
export function scrollCalendarTodayIntoView() {
  const today =
    document.querySelector<HTMLElement>(".staff-extranet__dayhead--today") ??
    document.querySelector<HTMLElement>(".staff-timeline__dayhead--today") ??
    document.querySelector<HTMLElement>(".extranet-cell--today");
  if (!today) {
    return false;
  }

  const scrollRoot =
    today.closest<HTMLElement>(".staff-extranet__scroll") ??
    today.closest<HTMLElement>(".staff-timeline__scroll");
  if (!scrollRoot) {
    today.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }

  const rootRect = scrollRoot.getBoundingClientRect();
  const cellRect = today.getBoundingClientRect();
  const nextLeft =
    scrollRoot.scrollLeft +
    (cellRect.left - rootRect.left) -
    rootRect.width * 0.12;

  scrollRoot.scrollTo({
    left: Math.max(0, nextLeft),
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
  return true;
}

export function CalendarJumpToToday() {
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const tryScroll = () => {
      if (cancelled) {
        return;
      }
      const scrolled = scrollCalendarTodayIntoView();
      attempts += 1;
      // Layout may still be settling on first paint; retry briefly.
      if (!scrolled && attempts < 8) {
        window.requestAnimationFrame(tryScroll);
      }
    };

    tryScroll();

    const onHashChange = () => {
      if (window.location.hash === "#calendar-today") {
        scrollCalendarTodayIntoView();
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return null;
}
