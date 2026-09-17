"use client";

import Link from "next/link";
import { useCallback, type MouseEvent } from "react";
import { scrollCalendarTodayIntoView } from "@/components/calendar-jump-to-today";
import {
  defaultStaffTimelineSelectionRange,
  formatCalendarMonth,
  getPropertyTodayIso,
} from "@/lib/calendar";

type StaffCalendarTodayLinkProps = {
  monthKey: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
};

function buildMonthHref(
  monthKey: string,
  selectedBookingKey?: string,
  selectedBlockKey?: string,
) {
  const selection = defaultStaffTimelineSelectionRange(monthKey);
  const params = new URLSearchParams({
    month: monthKey,
    from: selection.fromIso,
    to: selection.toIso,
  });

  if (selectedBookingKey) {
    params.set("booking", selectedBookingKey);
  } else if (selectedBlockKey) {
    params.set("block", selectedBlockKey);
  }

  return `/staff/calendar?${params.toString()}`;
}

/**
 * Jump to today without a full reload when today's column is already on the board.
 */
export function StaffCalendarTodayLink({
  monthKey,
  selectedBookingKey,
  selectedBlockKey,
}: StaffCalendarTodayLinkProps) {
  const propertyToday = getPropertyTodayIso();
  const currentMonthKey = formatCalendarMonth(
    Number(propertyToday.slice(0, 4)),
    Number(propertyToday.slice(5, 7)),
  );
  const href = `${buildMonthHref(currentMonthKey, selectedBookingKey, selectedBlockKey)}#calendar-today`;

  const onClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const todayOnBoard = Boolean(
      document.querySelector(".staff-extranet__dayhead--today") ||
        document.querySelector(".extranet-cell--today"),
    );
    if (!todayOnBoard) {
      return;
    }
    event.preventDefault();
    scrollCalendarTodayIntoView();
    const next = `${window.location.pathname}${window.location.search}#calendar-today`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
      window.history.replaceState(null, "", next);
    }
  }, []);

  return (
    <Link
      aria-current={monthKey === currentMonthKey ? "date" : undefined}
      className="staff-calendar-toolbar__today"
      href={href}
      onClick={onClick}
    >
      Today
    </Link>
  );
}
