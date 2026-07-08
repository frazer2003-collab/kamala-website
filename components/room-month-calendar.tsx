import Link from "next/link";
import {
  buildRoomCalendarBars,
  getCalendarWeekLaneCounts,
  getTodayIso,
  isPastCalendarDate,
  type CalendarDay,
} from "@/lib/calendar";
import {
  getCalendarColorStyleProps,
  getCalendarDayStateClass,
  getRoomCalendarDayState,
  type CalendarColors,
} from "@/lib/calendar-colors";
import { getStaffBookingKey, type StaffBooking } from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import { getStaffRoomBlockKey, type StaffRoomBlock } from "@/lib/room-blocks";
import { STAY_STATUS_LABELS } from "@/lib/stay-status";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type RoomMonthCalendarProps = {
  room: Room;
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  calendarColors: CalendarColors;
  monthKey: string;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
};

function chunkWeeks(calendarDays: CalendarDay[]) {
  const weeks: CalendarDay[][] = [];

  for (let index = 0; index < calendarDays.length; index += 7) {
    weeks.push(calendarDays.slice(index, index + 7));
  }

  return weeks;
}

function getBarHref(bar: { kind: "booking" | "block"; itemKey: string }, monthKey: string) {
  if (bar.kind === "block") {
    return `/staff/calendar?month=${monthKey}&block=${encodeURIComponent(bar.itemKey)}`;
  }

  return `/staff/calendar?month=${monthKey}&booking=${encodeURIComponent(bar.itemKey)}`;
}

function getBarLabel(bar: {
  kind: "booking" | "block";
  label: string;
  stayStatus: string;
}) {
  if (bar.kind === "block") {
    return `${bar.label}, closed`;
  }

  return `${bar.label}, ${STAY_STATUS_LABELS[bar.stayStatus as keyof typeof STAY_STATUS_LABELS]}`;
}

export function RoomMonthCalendar({
  room,
  bookings,
  blocks,
  calendarDays,
  calendarColors,
  monthKey,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
}: RoomMonthCalendarProps) {
  const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
  const roomBlocks = blocks.filter((block) => block.roomId === room.id);
  const roomBookingDays = roomBookings.map((booking) => ({
    arrivalDate: booking.arrivalDate,
    departureDate: booking.departureDate,
  }));
  const roomBlockDays = roomBlocks.map((block) => ({
    startDate: block.startDate,
    endDate: block.endDate,
  }));
  const calendarBars = buildRoomCalendarBars(
    roomBookings,
    roomBlocks.map((block) => ({
      id: getStaffRoomBlockKey(block),
      reason: block.reason,
      startDate: block.startDate,
      endDate: block.endDate,
    })),
    calendarDays,
    getStaffBookingKey,
  );
  const laneCounts = getCalendarWeekLaneCounts(calendarBars);
  const weeks = chunkWeeks(calendarDays);
  const todayIso = getTodayIso();

  return (
    <section
      aria-labelledby={`calendar-room-${room.id}`}
      className="calendar-room calendar-room--colored"
      style={getCalendarColorStyleProps(calendarColors)}
    >
      <div className="calendar-room__header">
        <div className={`calendar-room__mark room-figure room-figure--${room.tone}`}>
          <span>{room.shortName}</span>
        </div>
        <div>
          <h3 id={`calendar-room-${room.id}`}>{room.name}</h3>
          <p>
            {roomBookings.length} stay{roomBookings.length === 1 ? "" : "s"}
            {roomBlocks.length > 0
              ? ` · ${roomBlocks.length} closure${roomBlocks.length === 1 ? "" : "s"}`
              : ""}{" "}
            this month · ${room.rate}/night
          </p>
        </div>
      </div>

      <div
        className="calendar-grid calendar-grid--room"
        role="grid"
        aria-label={`${room.name} bookings`}
      >
        {weekdayLabels.map((label) => (
          <div className="calendar-grid__weekday" key={label} role="columnheader">
            {label}
          </div>
        ))}

        <div className="calendar-room__weeks">
          {weeks.map((week, weekIndex) => {
            const weekBars = calendarBars.filter((bar) => bar.weekIndex === weekIndex);
            const laneCount = laneCounts.get(weekIndex) ?? 1;

            return (
              <div
                className="calendar-week"
                key={`${room.id}-week-${weekIndex}`}
                style={{ ["--lane-count" as string]: laneCount }}
              >
                {week.map((day, columnIndex) => {
                  const isPast = isPastCalendarDate(day.iso);
                  const isToday = day.iso === todayIso;
                  const isSelectedDay = selectedDate === day.iso;
                  const dayState = getRoomCalendarDayState(
                    day.iso,
                    roomBookingDays,
                    roomBlockDays,
                  );
                  const dayHref = `/staff/calendar?month=${monthKey}&room=${encodeURIComponent(room.id)}&date=${encodeURIComponent(day.iso)}`;
                  const dayClassName = [
                    "calendar-day",
                    "calendar-day-cell",
                    getCalendarDayStateClass(dayState),
                    isPast ? "calendar-day-cell--past" : "calendar-day-cell--clickable",
                    isToday ? "calendar-day-cell--today" : "",
                    !day.inCurrentMonth ? "calendar-day--muted" : "",
                    isSelectedDay && !isPast ? "calendar-day-cell--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  if (isPast) {
                    return (
                      <div
                        aria-disabled="true"
                        aria-label={`${day.iso}${isToday ? " (today)" : ""} (past date)`}
                        className={dayClassName}
                        key={`${room.id}-${day.iso}`}
                        role="gridcell"
                        style={{ gridColumn: columnIndex + 1, gridRow: 1 }}
                      >
                        <span className="calendar-day__label">{day.date.getDate()}</span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${isToday ? "Today, " : ""}Manage ${room.name} on ${day.iso}`}
                      className={dayClassName}
                      href={dayHref}
                      key={`${room.id}-${day.iso}`}
                      role="gridcell"
                      style={{ gridColumn: columnIndex + 1, gridRow: 1 }}
                    >
                      <span className="calendar-day__label">{day.date.getDate()}</span>
                    </Link>
                  );
                })}

                {weekBars.map((bar) => {
                  const isSelected =
                    (bar.kind === "booking" && selectedBookingKey === bar.itemKey) ||
                    (bar.kind === "block" && selectedBlockKey === bar.itemKey);
                  const sublabel =
                    bar.kind === "block"
                      ? "Closed"
                      : STAY_STATUS_LABELS[bar.stayStatus as keyof typeof STAY_STATUS_LABELS];

                  return (
                    <Link
                      aria-label={getBarLabel(bar)}
                      className={[
                        "calendar-booking-bar",
                        bar.kind === "block"
                          ? "calendar-booking-bar--blocked"
                          : "calendar-booking-bar--booking",
                        bar.continuesLeft ? "calendar-booking-bar--continues-left" : "",
                        bar.continuesRight ? "calendar-booking-bar--continues-right" : "",
                        isSelected ? "calendar-booking-bar--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      href={getBarHref(bar, monthKey)}
                      key={bar.key}
                      style={{
                        gridColumn: `${bar.startCol} / span ${bar.span}`,
                        gridRow: 2,
                        ["--lane" as string]: bar.lane,
                      }}
                      title={`${bar.label} · ${sublabel}`}
                    >
                      {bar.showLabel ? (
                        <>
                          <strong>{bar.label}</strong>
                          <span>{sublabel}</span>
                        </>
                      ) : (
                        <span className="calendar-booking-bar__continued" aria-hidden="true" />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
