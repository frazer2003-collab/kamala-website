"use client";

import { useEffect } from "react";

/**
 * When the URL hash is #calendar-today (toolbar "Jump to today"), scroll the
 * timeline so today's column sits near the left. Initial load without the hash
 * stays on the 1st of the month.
 */
export function CalendarJumpToToday() {
  useEffect(() => {
    if (window.location.hash !== "#calendar-today") {
      return;
    }

    const today = document.querySelector<HTMLElement>(".extranet-cell--today");
    if (!today) {
      return;
    }

    const scrollRoot =
      today.closest<HTMLElement>(".staff-extranet__scroll") ??
      today.closest<HTMLElement>(".staff-timeline__scroll");
    if (!scrollRoot) {
      today.scrollIntoView({ block: "nearest", inline: "nearest" });
      return;
    }

    const rootRect = scrollRoot.getBoundingClientRect();
    const cellRect = today.getBoundingClientRect();
    const nextLeft =
      scrollRoot.scrollLeft +
      (cellRect.left - rootRect.left) -
      rootRect.width * 0.12;

    scrollRoot.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);

  return null;
}
