"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kamala-calendar-grid-guide-dismissed";

export function CalendarGridGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage failures — still hide for this session.
    }
    setVisible(false);
  }

  return (
    <div className="calendar-grid-guide" role="region" aria-label="How to use the grid">
      <div className="calendar-grid-guide__body">
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
      </div>
      <button className="button button--quiet" onClick={dismiss} type="button">
        Got it
      </button>
    </div>
  );
}
