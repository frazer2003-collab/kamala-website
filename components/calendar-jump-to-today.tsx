"use client";

import { useEffect } from "react";

/** Scrolls the timeline so today's column is in view after month load. */
export function CalendarJumpToToday() {
  useEffect(() => {
    const today = document.querySelector<HTMLElement>(".extranet-cell--today");
    if (!today) {
      return;
    }

    const scrollRoot = today.closest<HTMLElement>(".staff-timeline__scroll");
    if (!scrollRoot) {
      today.scrollIntoView({ block: "nearest", inline: "center" });
      return;
    }

    const rootRect = scrollRoot.getBoundingClientRect();
    const cellRect = today.getBoundingClientRect();
    const nextLeft =
      scrollRoot.scrollLeft +
      (cellRect.left - rootRect.left) -
      rootRect.width * 0.35;

    scrollRoot.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);

  return null;
}
