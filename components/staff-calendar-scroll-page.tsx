"use client";

import { useEffect } from "react";

const VIEWPORT_PADDING_PX = 12;
const SETTLE_DELAYS_MS = [0, 120, 400, 900, 1600];

/**
 * On calendar load/reload, scroll past page chrome and size the tape so it
 * fills the remaining viewport height.
 */
export function StaffCalendarScrollPage() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    let cancelled = false;
    let frame = 0;
    const timers: number[] = [];

    const fitCalendarToViewport = () => {
      if (cancelled) {
        return;
      }

      const board = document.querySelector<HTMLElement>(".calendar-board--timeline");
      const extranetScroll = document.querySelector<HTMLElement>(".staff-extranet__scroll");

      if (!board) {
        return;
      }

      const boardTop = board.getBoundingClientRect().top + window.scrollY;
      const targetTop = Math.max(0, boardTop - VIEWPORT_PADDING_PX);

      window.scrollTo({
        top: targetTop,
        behavior: "auto",
      });

      if (extranetScroll) {
        const extranetTop = extranetScroll.getBoundingClientRect().top + window.scrollY;
        const extranetTopInViewport = extranetTop - targetTop;
        const available =
          window.innerHeight - extranetTopInViewport - VIEWPORT_PADDING_PX;
        extranetScroll.style.maxHeight = `${Math.max(18 * 16, available)}px`;
      }
    };

    const schedule = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(fitCalendarToViewport);
      });
    };

    for (const delay of SETTLE_DELAYS_MS) {
      timers.push(window.setTimeout(schedule, delay));
    }

    const board = document.querySelector(".calendar-board--timeline, .staff-extranet");
    const observer =
      board && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            schedule();
          })
        : null;
    if (board && observer) {
      observer.observe(board);
      timers.push(
        window.setTimeout(() => {
          observer.disconnect();
        }, 2500),
      );
    }

    const onResize = () => {
      schedule();
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelled = true;
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
