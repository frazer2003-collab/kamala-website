import Link from "next/link";
import { syncAllRoomIcalFeedsAction } from "@/app/staff/auth-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import { StaffOtaSyncControls } from "@/components/staff-ota-sync-controls";
import { CalendarRangeFields } from "@/components/calendar-range-fields";
import {
  defaultStaffTimelineSelectionRange,
  formatCalendarMonth,
} from "@/lib/calendar";
import type { CalendarMonthStats } from "@/lib/calendar-timeline";
import type { CalendarColors } from "@/lib/calendar-colors";

type StaffCalendarToolbarProps = {
  monthKey: string;
  fromIso?: string;
  toIso?: string;
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

export function StaffCalendarToolbar({
  monthKey,
  fromIso,
  toIso,
  stats,
  unassignedCount,
  calendarColors: _calendarColors,
  canSyncOta = false,
  selectedBookingKey,
  selectedBlockKey,
}: StaffCalendarToolbarProps) {
  void _calendarColors;
  const today = new Date();
  const currentMonthKey = formatCalendarMonth(today.getFullYear(), today.getMonth() + 1);

  return (
    <div className="staff-calendar-toolbar">
      <div className="staff-calendar-toolbar__nav">
        <h2 className="staff-calendar-toolbar__title" id="staff-calendar-month-heading">
          <StaffCalendarMonthPicker
            fromIso={fromIso}
            monthKey={monthKey}
            selectedBlockKey={selectedBlockKey}
            selectedBookingKey={selectedBookingKey}
            toIso={toIso}
          />
        </h2>
        <Link
          className="staff-calendar-toolbar__today"
          href={`${buildMonthHref(currentMonthKey, selectedBookingKey, selectedBlockKey)}#calendar-today`}
        >
          Jump to today
        </Link>
        {canSyncOta ? (
          <form
            action={syncAllRoomIcalFeedsAction}
            className="staff-calendar-toolbar__sync"
            data-busy-message="Syncing channel calendars…"
          >
            <StaffFormBusyBridge message="Syncing channel calendars…" />
            <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
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
        <div className="staff-calendar-toolbar__legend" aria-label="Calendar legend">
          <span
            className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--guest-a"
            aria-hidden="true"
          />
          <span
            className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--guest-b"
            aria-hidden="true"
          />
          Guest color
          <span
            className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--needs-room"
            aria-hidden="true"
          />
          Needs room #
        </div>
      </details>
    </div>
  );
}
