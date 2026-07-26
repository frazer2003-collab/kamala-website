"use client";

import { useEffect } from "react";

/**
 * Scrolls the window to the bottom so the staff calendar board is fully in
 * view — chrome above the tape otherwise leaves the lower edge off-screen.
 */
export function StaffCalendarScrollPage() {
  useEffect(() => {
    let frame = 0;
    let timer = 0;

    const scrollToBottom = () => {
      const top = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    const schedule = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(scrollToBottom);
      });
    };

    schedule();
    // Dynamic calendar chunk + sticky headers settle a beat later.
    timer = window.setTimeout(schedule, 120);

    const board = document.querySelector(".calendar-board--timeline, .staff-extranet");
    const observer =
      board && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            schedule();
          })
        : null;
    if (board && observer) {
      observer.observe(board);
      // Only react to the first couple of size settles, then stop fighting the user.
      window.setTimeout(() => observer.disconnect(), 1500);
    }

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  return null;
}
