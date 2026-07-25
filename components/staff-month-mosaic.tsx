import Link from "next/link";
import {
  buildCalendarDays,
  buildRoomBookingBars,
  formatCalendarMonth,
  formatCalendarMonthLabel,
  getCalendarWeekLaneCounts,
  getTodayIso,
  type CalendarBookingBar,
  type CalendarDay,
} from "@/lib/calendar";
import type { DayOccupancySummary } from "@/lib/calendar-day-counts";
import type { StaffBooking } from "@/lib/booking-requests";
import { getStaffBookingKey } from "@/lib/booking-requests";
import type { CalendarColors } from "@/lib/calendar-colors";
import { getCalendarColorStyleProps } from "@/lib/calendar-colors";
import {
  getStaffRoomBlockKey,
  type StaffRoomBlock,
} from "@/lib/room-blocks";

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];
/** Keep the overview short — overflow stays show as a day count chip. */
const LEAD_MAX_LANES = 2;
const SIDE_MAX_LANES = 1;

export type MosaicMonth = {
  year: number;
  month: number;
  monthKey: string;
  label: string;
  days: CalendarDay[];
};

type MosaicStay = {
  guest: string;
  stayStatus: "expected" | "checked-in" | "checked-out";
  arrivalDate: string;
  departureDate: string;
  itemKey: string;
  kind: "booking" | "channel";
};

type StaffMonthMosaicProps = {
  months: MosaicMonth[];
  occupancyByIso: Map<string, DayOccupancySummary>;
  bookings: StaffBooking[];
  channelStays: StaffRoomBlock[];
  calendarColors: CalendarColors;
  selectedDate?: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
  anchorMonthKey: string;
};

function chunkWeeks(calendarDays: CalendarDay[]) {
  const weeks: CalendarDay[][] = [];

  for (let index = 0; index < calendarDays.length; index += 7) {
    weeks.push(calendarDays.slice(index, index + 7));
  }

  return weeks;
}

function buildDayHref(anchorMonthKey: string, iso: string) {
  const params = new URLSearchParams({
    month: anchorMonthKey,
    date: iso,
  });
  return `/staff/calendar?${params.toString()}`;
}

function buildStayHref(
  stay: Pick<CalendarBookingBar, "itemKey"> & { kind?: "booking" | "channel" },
  stays: MosaicStay[],
  anchorMonthKey: string,
) {
  const source = stays.find((item) => item.itemKey === stay.itemKey);
  const params = new URLSearchParams({ month: anchorMonthKey });

  if (source?.kind === "channel") {
    params.set("block", source.itemKey);
  } else {
    params.set("booking", stay.itemKey);
  }

  return `/staff/calendar?${params.toString()}`;
}

function dayAriaLabel(day: CalendarDay, summary: DayOccupancySummary | undefined) {
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(day.date);
  const count = summary?.bookingCount ?? 0;

  if (count <= 0) {
    return `${dateLabel}, no bookings. Open day details`;
  }

  if (summary?.isFull) {
    return `${dateLabel}, ${count} bookings, full. Open day details`;
  }

  return `${dateLabel}, ${count} booking${count === 1 ? "" : "s"}. Open day details`;
}

function toMosaicStays(
  bookings: StaffBooking[],
  channelStays: StaffRoomBlock[],
): MosaicStay[] {
  return [
    ...bookings.map((booking) => ({
      guest: booking.guest,
      stayStatus: booking.stayStatus,
      arrivalDate: booking.arrivalDate,
      departureDate: booking.departureDate,
      itemKey: getStaffBookingKey(booking),
      kind: "booking" as const,
    })),
    ...channelStays.map((stay) => ({
      guest: stay.guestName || stay.channelLabel || "Channel stay",
      stayStatus: "expected" as const,
      arrivalDate: stay.startDate,
      departureDate: stay.endDate,
      itemKey: getStaffRoomBlockKey(stay),
      kind: "channel" as const,
    })),
  ];
}

export function buildMosaicMonths(
  startYear: number,
  startMonth: number,
  monthCount: number,
): MosaicMonth[] {
  const months: MosaicMonth[] = [];

  for (let index = 0; index < monthCount; index += 1) {
    const date = new Date(startYear, startMonth - 1 + index, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    months.push({
      year,
      month,
      monthKey: formatCalendarMonth(year, month),
      label: formatCalendarMonthLabel(year, month),
      days: buildCalendarDays(year, month),
    });
  }

  return months;
}

function MosaicMonthCard({
  month,
  stays,
  occupancyByIso,
  selectedDate,
  selectedBookingKey,
  selectedBlockKey,
  anchorMonthKey,
  variant,
  todayIso,
}: {
  month: MosaicMonth;
  stays: MosaicStay[];
  occupancyByIso: Map<string, DayOccupancySummary>;
  selectedDate?: string;
  selectedBookingKey?: string;
  selectedBlockKey?: string;
  anchorMonthKey: string;
  variant: "lead" | "side";
  todayIso: string;
}) {
  const weeks = chunkWeeks(month.days);
  const maxLanes = variant === "lead" ? LEAD_MAX_LANES : SIDE_MAX_LANES;
  const bars = buildRoomBookingBars(stays, month.days, (stay) => {
    // buildRoomBookingBars types the callback against a narrower stay shape.
    return (stay as MosaicStay).itemKey;
  });
  const laneCounts = getCalendarWeekLaneCounts(bars);

  return (
    <section
      aria-labelledby={`mosaic-month-${month.monthKey}`}
      className={`staff-month-mosaic__month staff-month-mosaic__month--${variant}`}
    >
      <h3 className="staff-month-mosaic__month-title" id={`mosaic-month-${month.monthKey}`}>
        {month.label}
      </h3>

      <div className="staff-month-mosaic__weekdays" aria-hidden="true">
        {weekdayLabels.map((label, index) => (
          <span className="staff-month-mosaic__weekday" key={`${label}-${index}`}>
            {label}
          </span>
        ))}
      </div>

      <div className="staff-month-mosaic__weeks">
        {weeks.map((week, weekIndex) => {
          const weekBars = bars.filter(
            (bar) => bar.weekIndex === weekIndex && bar.lane < maxLanes,
          );
          const totalLanes = laneCounts.get(weekIndex) ?? 0;
          const visibleLaneCount = Math.min(totalLanes, maxLanes);

          return (
            <div
              className="staff-month-mosaic__week"
              key={`${month.monthKey}-week-${weekIndex}`}
              style={{ ["--lane-count" as string]: visibleLaneCount }}
            >
              {week.map((day, columnIndex) => {
                if (!day.inCurrentMonth) {
                  return (
                    <div
                      aria-hidden="true"
                      className="staff-month-mosaic__cell staff-month-mosaic__cell--spacer"
                      key={`${month.monthKey}-${day.iso}`}
                      style={{ gridColumn: columnIndex + 1 }}
                    />
                  );
                }

                const summary = occupancyByIso.get(day.iso);
                const isToday = day.iso === todayIso;
                const isSelected = day.iso === selectedDate;
                const count = summary?.bookingCount ?? 0;
                const hiddenCount = Math.max(0, count - maxLanes);

                return (
                  <Link
                    aria-current={isSelected ? "date" : undefined}
                    aria-label={dayAriaLabel(day, summary)}
                    className={[
                      "staff-month-mosaic__cell",
                      isToday ? "staff-month-mosaic__cell--today" : "",
                      isSelected ? "staff-month-mosaic__cell--selected" : "",
                      count > 0 ? "staff-month-mosaic__cell--has-stays" : "",
                      summary?.isFull ? "staff-month-mosaic__cell--full" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    href={buildDayHref(anchorMonthKey, day.iso)}
                    id={isToday && variant === "lead" ? "calendar-today" : undefined}
                    key={`${month.monthKey}-${day.iso}`}
                    style={{ gridColumn: columnIndex + 1 }}
                  >
                    <span className="staff-month-mosaic__date">{day.date.getDate()}</span>
                    {hiddenCount > 0 ? (
                      <span className="staff-month-mosaic__count-chip">
                        +{hiddenCount}
                        <span className="sr-only"> more bookings</span>
                      </span>
                    ) : null}
                  </Link>
                );
              })}

              {weekBars.map((bar) => {
                const source = stays.find((stay) => stay.itemKey === bar.itemKey);
                const isSelected =
                  (source?.kind === "booking" && selectedBookingKey === bar.itemKey) ||
                  (source?.kind === "channel" && selectedBlockKey === bar.itemKey);

                return (
                  <Link
                    aria-label={`${bar.label}, ${source?.kind === "channel" ? "channel stay" : "direct stay"}`}
                    className={[
                      "staff-month-mosaic__bar",
                      source?.kind === "channel"
                        ? "staff-month-mosaic__bar--channel"
                        : "staff-month-mosaic__bar--booking",
                      bar.continuesLeft ? "staff-month-mosaic__bar--continues-left" : "",
                      bar.continuesRight ? "staff-month-mosaic__bar--continues-right" : "",
                      isSelected ? "staff-month-mosaic__bar--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    href={buildStayHref(bar, stays, anchorMonthKey)}
                    key={bar.key}
                    style={{
                      gridColumn: `${bar.startCol} / span ${bar.span}`,
                      ["--lane" as string]: bar.lane,
                    }}
                    title={bar.label}
                  >
                    {bar.showLabel && variant === "lead" ? (
                      <strong className="staff-month-mosaic__bar-label">{bar.label}</strong>
                    ) : (
                      <span className="staff-month-mosaic__bar-mark" aria-hidden="true" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StaffMonthMosaic({
  months,
  occupancyByIso,
  bookings,
  channelStays,
  calendarColors,
  selectedDate,
  selectedBookingKey,
  selectedBlockKey,
  anchorMonthKey,
}: StaffMonthMosaicProps) {
  const todayIso = getTodayIso();
  const stays = toMosaicStays(bookings, channelStays);
  const [leadMonth, ...sideMonths] = months;

  if (!leadMonth) {
    return null;
  }

  return (
    <div
      aria-label="Booking overview by date"
      className="staff-month-mosaic"
      style={getCalendarColorStyleProps(calendarColors)}
    >
      <MosaicMonthCard
        anchorMonthKey={anchorMonthKey}
        month={leadMonth}
        occupancyByIso={occupancyByIso}
        selectedBlockKey={selectedBlockKey}
        selectedBookingKey={selectedBookingKey}
        selectedDate={selectedDate}
        stays={stays}
        todayIso={todayIso}
        variant="lead"
      />

      {sideMonths.length > 0 ? (
        <div className="staff-month-mosaic__side">
          {sideMonths.map((month) => (
            <MosaicMonthCard
              anchorMonthKey={anchorMonthKey}
              key={month.monthKey}
              month={month}
              occupancyByIso={occupancyByIso}
              selectedBlockKey={selectedBlockKey}
              selectedBookingKey={selectedBookingKey}
              selectedDate={selectedDate}
              stays={stays}
              todayIso={todayIso}
              variant="side"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
