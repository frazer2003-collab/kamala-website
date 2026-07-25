import Link from "next/link";
import { syncAllRoomIcalFeedsAction } from "@/app/staff/auth-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import { StaffOtaSyncControls } from "@/components/staff-ota-sync-controls";
import { formatCalendarMonth } from "@/lib/calendar";
import type { CalendarMonthStats } from "@/lib/calendar-timeline";
import type { CalendarColors } from "@/lib/calendar-colors";

export type StaffCalendarView = "overview" | "board";

type StaffCalendarToolbarProps = {
  monthKey: string;
  stats: CalendarMonthStats;
  unassignedCount: number;
  calendarColors: CalendarColors;
  canSyncOta?: boolean;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
  view?: StaffCalendarView;
};

function buildCalendarHref({
  monthKey,
  view,
  selectedBookingKey,
  selectedBlockKey,
}: {
  monthKey: string;
  view?: StaffCalendarView;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
}) {
  const params = new URLSearchParams({ month: monthKey });

  if (view === "board") {
    params.set("view", "board");
  }

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
  view = "overview",
}: StaffCalendarToolbarProps) {
  const today = new Date();
  const currentMonthKey = formatCalendarMonth(today.getFullYear(), today.getMonth() + 1);
  const overviewHref = buildCalendarHref({
    monthKey,
    view: "overview",
    selectedBookingKey,
    selectedBlockKey,
  });
  const boardHref = buildCalendarHref({
    monthKey,
    view: "board",
    selectedBookingKey,
    selectedBlockKey,
  });
  const todayHref = `${buildCalendarHref({
    monthKey: currentMonthKey,
    view,
    selectedBookingKey,
    selectedBlockKey,
  })}#calendar-today`;

  return (
    <div className="staff-calendar-toolbar">
      <div className="staff-calendar-toolbar__nav">
        <h2 className="staff-calendar-toolbar__title" id="staff-calendar-month-heading">
          <StaffCalendarMonthPicker
            monthKey={monthKey}
            selectedBlockKey={selectedBlockKey}
            selectedBookingKey={selectedBookingKey}
            view={view}
          />
        </h2>
        <div
          aria-label="Calendar view"
          className="staff-calendar-toolbar__density"
          role="group"
        >
          <Link
            aria-current={view === "overview" ? "page" : undefined}
            className={`staff-calendar-toolbar__density-btn${
              view === "overview" ? " staff-calendar-toolbar__density-btn--active" : ""
            }`}
            href={overviewHref}
          >
            Overview
          </Link>
          <Link
            aria-current={view === "board" ? "page" : undefined}
            className={`staff-calendar-toolbar__density-btn${
              view === "board" ? " staff-calendar-toolbar__density-btn--active" : ""
            }`}
            href={boardHref}
          >
            Room board
          </Link>
        </div>
        <Link className="staff-calendar-toolbar__today" href={todayHref}>
          Jump to today
        </Link>
        {canSyncOta ? (
          <form action={syncAllRoomIcalFeedsAction} className="staff-calendar-toolbar__sync">
            <StaffFormBusyBridge message="Syncing channel calendars…" />
            <input name="month" type="hidden" value={monthKey} />
            {view === "board" ? <input name="view" type="hidden" value="board" /> : null}
            <StaffOtaSyncControls />
          </form>
        ) : null}
      </div>

      <div className="staff-calendar-toolbar__meta" aria-label="Month summary">
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.currentGuests}</strong> current guests
        </span>
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.departed}</strong> departed
        </span>
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.arriving}</strong> arriving
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
        <summary>Legend</summary>
        {view === "overview" ? (
          <div className="staff-calendar-toolbar__legend" aria-label="Overview booking marks">
            <span
              className="staff-calendar-toolbar__swatch staff-month-mosaic__legend-swatch staff-month-mosaic__legend-swatch--booking"
              aria-hidden="true"
              style={{ background: calendarColors.booking }}
            />
            Direct stay
            <span
              className="staff-calendar-toolbar__swatch staff-month-mosaic__legend-swatch staff-month-mosaic__legend-swatch--channel"
              aria-hidden="true"
            />
            Channel stay
            <span
              className="staff-calendar-toolbar__swatch staff-month-mosaic__legend-swatch staff-month-mosaic__legend-swatch--full"
              aria-hidden="true"
              style={{ background: calendarColors.soldOut }}
            />
            Full day
          </div>
        ) : (
          <div className="staff-calendar-toolbar__legend" aria-label="Status colors">
            <span className="extranet-status-mark extranet-status-mark--bookable" aria-hidden="true">
              O
            </span>
            Open
            <span className="extranet-status-mark extranet-status-mark--closed" aria-hidden="true">
              ×
            </span>
            Closed
            <span className="extranet-status-mark extranet-status-mark--sold-out" aria-hidden="true">
              F
            </span>
            Full
            <span
              className="extranet-status-mark extranet-status-mark--overbooked"
              aria-hidden="true"
            >
              !
            </span>
            Overbooked
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
        )}
      </details>
    </div>
  );
}
