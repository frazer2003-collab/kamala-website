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
  densityMode?: "desk" | "full";
};

function buildMonthHref(
  monthKey: string,
  selectedBookingKey?: string,
  selectedBlockKey?: string,
  densityMode: "desk" | "full" = "desk",
) {
  const params = new URLSearchParams({ month: monthKey });

  if (selectedBookingKey) {
    params.set("booking", selectedBookingKey);
  } else if (selectedBlockKey) {
    params.set("block", selectedBlockKey);
  }

  if (densityMode === "full") {
    params.set("view", "full");
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
  densityMode = "desk",
}: StaffCalendarToolbarProps) {
  const previousMonth = shiftCalendarMonth(year, month, -1);
  const nextMonth = shiftCalendarMonth(year, month, 1);
  const previousMonthLabel = formatCalendarMonthLabel(
    previousMonth.year,
    previousMonth.month,
  );
  const nextMonthLabel = formatCalendarMonthLabel(nextMonth.year, nextMonth.month);
  const today = new Date();
  const currentMonthKey = formatCalendarMonth(today.getFullYear(), today.getMonth() + 1);

  return (
    <div className="staff-calendar-toolbar">
      <div className="staff-calendar-toolbar__nav">
        <Link
          aria-label={`Previous month, ${previousMonthLabel}`}
          className="staff-calendar-toolbar__arrow"
          href={buildMonthHref(
            formatCalendarMonth(previousMonth.year, previousMonth.month),
            selectedBookingKey,
            selectedBlockKey,
            densityMode,
          )}
        >
          <span aria-hidden="true">←</span>
        </Link>
        <h2 className="staff-calendar-toolbar__title">
          {formatCalendarMonthLabel(year, month)}
        </h2>
        <Link
          aria-label={`Next month, ${nextMonthLabel}`}
          className="staff-calendar-toolbar__arrow"
          href={buildMonthHref(
            formatCalendarMonth(nextMonth.year, nextMonth.month),
            selectedBookingKey,
            selectedBlockKey,
            densityMode,
          )}
        >
          <span aria-hidden="true">→</span>
        </Link>
        {monthKey !== currentMonthKey ? (
          <Link
            className="staff-calendar-toolbar__today"
            href={buildMonthHref(currentMonthKey, selectedBookingKey, selectedBlockKey, densityMode)}
          >
            Today
          </Link>
        ) : null}
        <div
          aria-label="Calendar density"
          className="staff-calendar-toolbar__density"
          role="group"
        >
          <Link
            aria-current={densityMode === "desk" ? "true" : undefined}
            className={[
              "staff-calendar-toolbar__density-btn",
              densityMode === "desk" ? "staff-calendar-toolbar__density-btn--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={buildMonthHref(monthKey, selectedBookingKey, selectedBlockKey, "desk")}
          >
            Desk
          </Link>
          <Link
            aria-current={densityMode === "full" ? "true" : undefined}
            className={[
              "staff-calendar-toolbar__density-btn",
              densityMode === "full" ? "staff-calendar-toolbar__density-btn--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={buildMonthHref(monthKey, selectedBookingKey, selectedBlockKey, "full")}
          >
            Full
          </Link>
        </div>
      </div>

      <div className="staff-calendar-toolbar__meta" aria-label="Month summary">
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.occupancyPercent}%</strong> occupancy
        </span>
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stayCount}</strong> stays
        </span>
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.arrivals}</strong> arrivals
        </span>
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.departures}</strong> departures
        </span>
        {channelCount > 0 ? (
          <span className="staff-calendar-toolbar__stat">
            <strong>{channelCount}</strong> channel
          </span>
        ) : null}
        <span className="staff-calendar-toolbar__stat">
          <strong>{closureCount}</strong> closures
        </span>
        <span className="staff-calendar-toolbar__stat">
          <strong>{roomCount}</strong> room types
        </span>
      </div>

      <div className="staff-calendar-toolbar__legend" aria-label="Status colors">
        <span
          className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--bookable"
          style={{ background: calendarColors.available }}
        />
        Bookable
        <span
          className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--closed"
          style={{ background: calendarColors.closed }}
        />
        Closed
        <span
          className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--sold"
          style={{ background: calendarColors.soldOut }}
        />
        Sold out
        <span
          className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--booking"
          style={{ background: calendarColors.booking }}
        />
        Reservation
        <span
          className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--needs-room"
          aria-hidden="true"
        />
        Needs room #
        <span
          className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--channel"
          aria-hidden="true"
        />
        Channel
        <span className="staff-calendar-toolbar__mark" aria-hidden="true">
          *
        </span>
        Temp allotment
      </div>
    </div>
  );
}
