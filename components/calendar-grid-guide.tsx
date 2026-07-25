"use client";

import { useEffect, useState } from "react";

const STORAGE_KEYS = {
  board: "kamala-calendar-grid-guide-dismissed",
  overview: "kamala-calendar-mosaic-guide-dismissed",
} as const;

type CalendarGridGuideProps = {
  variant?: "board" | "overview";
};

export function CalendarGridGuide({ variant = "board" }: CalendarGridGuideProps) {
  const [visible, setVisible] = useState(false);
  const storageKey = STORAGE_KEYS[variant];

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  if (!visible) {
    return null;
  }

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage failures — still hide for this session.
    }
    setVisible(false);
  }

  return (
    <div
      className="calendar-grid-guide"
      role="region"
      aria-label={variant === "overview" ? "How to use the overview" : "How to use the grid"}
    >
      <div className="calendar-grid-guide__body">
        {variant === "overview" ? (
          <p className="calendar-grid-guide__lede">
            Scan months at a glance. Each day shows how many bookings overnight —
            click a date to open stays and room actions.
          </p>
        ) : (
          <>
            <p className="calendar-grid-guide__lede">
              Each room block has labeled rows. Click a cell for that action:
            </p>
            <ul className="calendar-grid-guide__list">
              <li>
                <strong>Room status</strong> — open, close, or mark sold out for a day
              </li>
              <li>
                <strong>Rooms left</strong> — temporary allotment (how many to sell)
              </li>
              <li>
                <strong>Needs room #</strong> — assign a number to a stay on the bar
              </li>
            </ul>
          </>
        )}
      </div>
      <button className="button button--quiet" onClick={dismiss} type="button">
        Got it
      </button>
    </div>
  );
}
