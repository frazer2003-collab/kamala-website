import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import { StaffCalendarTodayLink } from "@/components/staff-calendar-today-link";
import type { CalendarMonthStats } from "@/lib/calendar-timeline";
import type { CalendarColors } from "@/lib/calendar-colors";

type StaffCalendarToolbarProps = {
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  stats: CalendarMonthStats;
  unassignedCount: number;
  calendarColors: CalendarColors;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
};

export function StaffCalendarToolbar({
  monthKey,
  fromIso,
  toIso,
  stats,
  unassignedCount,
  calendarColors: _calendarColors,
  selectedBookingKey,
  selectedBlockKey,
}: StaffCalendarToolbarProps) {
  void _calendarColors;

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
        <StaffCalendarTodayLink
          monthKey={monthKey}
          selectedBlockKey={selectedBlockKey}
          selectedBookingKey={selectedBookingKey}
        />
      </div>

      <div className="staff-calendar-toolbar__meta" aria-label="Month summary">
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.currentGuests}</strong> In
        </span>
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.departed}</strong> Out
        </span>
        <span className="staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary">
          <strong>{stats.arriving}</strong> Arriving
        </span>
        <span
          className={`staff-calendar-toolbar__stat staff-calendar-toolbar__stat--primary${
            unassignedCount > 0 ? " staff-calendar-toolbar__stat--urgent" : ""
          }`}
        >
          <strong>{unassignedCount}</strong> No #
        </span>
      </div>

      <details className="staff-calendar-toolbar__legend-details">
        <summary>Key</summary>
        <div className="staff-calendar-toolbar__legend" aria-label="Calendar key">
          <span
            className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--guest-a"
            aria-hidden="true"
          />
          <span
            className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--guest-b"
            aria-hidden="true"
          />
          Guest
          <span
            className="staff-calendar-toolbar__swatch staff-calendar-toolbar__swatch--needs-room"
            aria-hidden="true"
          />
          No #
          <span className="staff-calendar-toolbar__cue" aria-hidden="true">
            ★
          </span>
          Allotment
          <span className="staff-calendar-toolbar__cue" aria-hidden="true">
            ฿
          </span>
          Rate
        </div>
      </details>
    </div>
  );
}
