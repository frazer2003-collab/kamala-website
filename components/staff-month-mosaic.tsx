import Link from "next/link";
import {
  buildCalendarDays,
  formatCalendarMonth,
  formatCalendarMonthLabel,
  getTodayIso,
  type CalendarDay,
} from "@/lib/calendar";
import {
  getDayOccupancyLevel,
  type DayOccupancySummary,
} from "@/lib/calendar-day-counts";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type MosaicMonth = {
  year: number;
  month: number;
  monthKey: string;
  label: string;
  days: CalendarDay[];
};

type StaffMonthMosaicProps = {
  months: MosaicMonth[];
  occupancyByIso: Map<string, DayOccupancySummary>;
  selectedDate?: string;
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

function dayCountLabel(count: number) {
  if (count <= 0) {
    return "Free";
  }

  return `${count}`;
}

function dayAriaLabel(day: CalendarDay, summary: DayOccupancySummary | undefined) {
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(day.date);
  const count = summary?.bookingCount ?? 0;

  if (count <= 0) {
    return `${dateLabel}, no bookings`;
  }

  if (summary?.isFull) {
    return `${dateLabel}, ${count} bookings, full`;
  }

  return `${dateLabel}, ${count} booking${count === 1 ? "" : "s"}`;
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

export function StaffMonthMosaic({
  months,
  occupancyByIso,
  selectedDate,
  anchorMonthKey,
}: StaffMonthMosaicProps) {
  const todayIso = getTodayIso();

  return (
    <div className="staff-month-mosaic" aria-label="Booking overview by date">
      {months.map((month) => {
        const weeks = chunkWeeks(month.days);

        return (
          <section
            aria-labelledby={`mosaic-month-${month.monthKey}`}
            className="staff-month-mosaic__month"
            key={month.monthKey}
          >
            <h3 className="staff-month-mosaic__month-title" id={`mosaic-month-${month.monthKey}`}>
              {month.label}
            </h3>

            <div className="staff-month-mosaic__weekdays" aria-hidden="true">
              {weekdayLabels.map((label) => (
                <span className="staff-month-mosaic__weekday" key={label}>
                  {label}
                </span>
              ))}
            </div>

            <div className="staff-month-mosaic__grid">
              {weeks.map((week) =>
                week.map((day) => {
                  if (!day.inCurrentMonth) {
                    return (
                      <div
                        aria-hidden="true"
                        className="staff-month-mosaic__cell staff-month-mosaic__cell--spacer"
                        key={`${month.monthKey}-${day.iso}`}
                      />
                    );
                  }

                  const summary = occupancyByIso.get(day.iso);
                  const level = getDayOccupancyLevel(
                    summary ?? {
                      bookingCount: 0,
                      occupancyPercent: 0,
                      isFull: false,
                    },
                  );
                  const isToday = day.iso === todayIso;
                  const isSelected = day.iso === selectedDate;
                  const count = summary?.bookingCount ?? 0;

                  return (
                    <Link
                      aria-current={isSelected ? "date" : undefined}
                      aria-label={dayAriaLabel(day, summary)}
                      className={[
                        "staff-month-mosaic__cell",
                        `staff-month-mosaic__cell--${level}`,
                        isToday ? "staff-month-mosaic__cell--today" : "",
                        isSelected ? "staff-month-mosaic__cell--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      href={buildDayHref(anchorMonthKey, day.iso)}
                      id={isToday ? "calendar-today" : undefined}
                      key={`${month.monthKey}-${day.iso}`}
                    >
                      <span className="staff-month-mosaic__date">{day.date.getDate()}</span>
                      <span className="staff-month-mosaic__count">
                        {dayCountLabel(count)}
                        {summary?.isFull && count > 0 ? (
                          <span className="staff-month-mosaic__full-mark"> Full</span>
                        ) : null}
                      </span>
                    </Link>
                  );
                }),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
