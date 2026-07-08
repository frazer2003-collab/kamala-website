import Link from "next/link";
import {
  formatCalendarMonth,
  formatCalendarMonthLabel,
  shiftCalendarMonth,
} from "@/lib/calendar";
import type { CalendarMonthStats } from "@/lib/calendar-timeline";
import type { CalendarColors } from "@/lib/calendar-colors";

type StaffCalendarToolbarProps = {
  year: number;
  month: number;
  monthKey: string;
  stats: CalendarMonthStats;
  stayCount: number;
  closureCount: number;
  channelCount: number;
  roomCount: number;
  calendarColors: CalendarColors;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
};

function buildMonthHref(
  monthKey: string,
  selectedBookingKey?: string,
  selectedBlockKey?: string,
) {
  const params = new URLSearchParams({ month: monthKey });

  if (selectedBookingKey) {
    params.set("booking", selectedBookingKey);
  } else if (selectedBlockKey) {
    params.set("block", selectedBlockKey);
  }

  return `/staff/calendar?${params.toString()}`;
}

export function StaffCalendarToolbar({
  year,
  month,
  monthKey,
  stats,
  stayCount,
  closureCount,
  channelCount,
  roomCount,
  calendarColors,
  selectedBookingKey,
  selectedBlockKey,
}: StaffCalendarToolbarProps) {
  const previousMonth = shiftCalendarMonth(year, month, -1);
  const nextMonth = shiftCalendarMonth(year, month, 1);
  const today = new Date();
  const currentMonthKey = formatCalendarMonth(today.getFullYear(), today.getMonth() + 1);

  return (
    <div className="staff-calendar-toolbar">
      <div className="staff-calendar-toolbar__nav">
        <Link
          className="staff-calendar-toolbar__arrow"
          href={buildMonthHref(
            formatCalendarMonth(previousMonth.year, previousMonth.month),
            selectedBookingKey,
            selectedBlockKey,
          )}
        >
          ←
        </Link>
        <h2 className="staff-calendar-toolbar__title">
          {formatCalendarMonthLabel(year, month)}
        </h2>
        <Link
          className="staff-calendar-toolbar__arrow"
          href={buildMonthHref(
            formatCalendarMonth(nextMonth.year, nextMonth.month),
            selectedBookingKey,
            selectedBlockKey,
          )}
        >
          →
        </Link>
        {monthKey !== currentMonthKey ? (
          <Link
            className="staff-calendar-toolbar__today"
            href={buildMonthHref(currentMonthKey, selectedBookingKey, selectedBlockKey)}
          >
            Today
          </Link>
        ) : null}
      </div>

      <div className="staff-calendar-toolbar__meta" aria-label="Month summary">
        <span>
          <strong>{stats.occupancyPercent}%</strong> occupancy
        </span>
        <span>
          <strong>{stayCount}</strong> stays
        </span>
        {channelCount > 0 ? (
          <span>
            <strong>{channelCount}</strong> channel
          </span>
        ) : null}
        <span>
          <strong>{stats.arrivals}</strong> arrivals
        </span>
        <span>
          <strong>{stats.departures}</strong> departures
        </span>
        <span>
          <strong>{closureCount}</strong> closures
        </span>
        <span>
          <strong>{roomCount}</strong> room types
        </span>
      </div>

      <div className="staff-calendar-toolbar__legend" aria-label="Status colors">
        <span className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--bookable" />
        Bookable
        <span className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--sold" />
        Sold out / closed
        <span
          className="staff-calendar-toolbar__swatch"
          style={{ background: calendarColors.booking }}
        />
        Reservation
      </div>
    </div>
  );
}
