import Link from "next/link";
import { syncAllRoomIcalFeedsAction } from "@/app/staff/auth-actions";
import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import { formatCalendarMonth } from "@/lib/calendar";
import type { CalendarMonthStats } from "@/lib/calendar-timeline";
import type { CalendarColors } from "@/lib/calendar-colors";

type StaffCalendarToolbarProps = {
  monthKey: string;
  stats: CalendarMonthStats;
  unassignedCount: number;
  calendarColors: CalendarColors;
  canSyncOta?: boolean;
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
  monthKey,
  stats,
  unassignedCount,
  calendarColors,
  canSyncOta = false,
  selectedBookingKey,
  selectedBlockKey,
}: StaffCalendarToolbarProps) {
  const today = new Date();
  const currentMonthKey = formatCalendarMonth(today.getFullYear(), today.getMonth() + 1);

  return (
    <div className="staff-calendar-toolbar">
      <div className="staff-calendar-toolbar__nav">
        <h2 className="staff-calendar-toolbar__title" id="staff-calendar-month-heading">
          <StaffCalendarMonthPicker
            monthKey={monthKey}
            selectedBlockKey={selectedBlockKey}
            selectedBookingKey={selectedBookingKey}
          />
        </h2>
        <Link
          className="staff-calendar-toolbar__today"
          href={`${buildMonthHref(currentMonthKey, selectedBookingKey, selectedBlockKey)}#calendar-today`}
        >
          Jump to today
        </Link>
        {canSyncOta ? (
          <form action={syncAllRoomIcalFeedsAction} className="staff-calendar-toolbar__sync">
            <input name="month" type="hidden" value={monthKey} />
            <button className="button button--quiet" type="submit">
              Sync OTA bookings
            </button>
          </form>
        ) : null}
      </div>

      <div className="staff-calendar-toolbar__meta" aria-label="Month summary">
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.arrivals}</strong> arrivals
        </span>
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.departures}</strong> departures
        </span>
        <span
          className={`staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary${
            unassignedCount > 0 ? " staff-calendar-toolbar__stat--urgent" : ""
          }`}
        >
          <strong>{unassignedCount}</strong> need room #
        </span>
      </div>

      <details className="staff-calendar-toolbar__legend-details">
        <summary>Colors</summary>
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
      </details>
    </div>
  );
}
