import Link from "next/link";
import { CalendarDateStrip } from "@/components/calendar-date-strip";
import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import {
  isoMonthRangeContaining,
  isoWeekRangeContaining,
} from "@/lib/desk-expenses";
import { staffT, type StaffLocale } from "@/lib/staff-i18n";

export function StaffDeskRangeBand({
  pathname,
  locale,
  fromIso,
  toIso,
  monthKey,
  todayIso,
}: {
  pathname: string;
  locale: StaffLocale;
  fromIso: string;
  toIso: string;
  monthKey: string;
  todayIso: string;
}) {
  const week = isoWeekRangeContaining(todayIso);
  const month = isoMonthRangeContaining(todayIso);

  return (
    <div className="staff-desk__range-band">
      <div className="staff-desk__view-pills" role="navigation" aria-label="Range">
        <Link
          className="button button--quiet"
          href={`${pathname}?view=day&from=${todayIso}&to=${todayIso}&month=${todayIso.slice(0, 7)}`}
        >
          {staffT(locale, "desk.viewDay")}
        </Link>
        <Link
          className="button button--quiet"
          href={`${pathname}?view=week&from=${week.fromIso}&to=${week.toIso}&month=${week.fromIso.slice(0, 7)}`}
        >
          {staffT(locale, "desk.viewWeek")}
        </Link>
        <Link
          className="button button--quiet"
          href={`${pathname}?view=month&month=${month.fromIso.slice(0, 7)}&from=${month.fromIso}&to=${month.toIso}`}
        >
          {staffT(locale, "desk.viewMonth")}
        </Link>
      </div>
      <StaffCalendarMonthPicker
        fromIso={fromIso}
        monthKey={monthKey}
        pathname={pathname}
        toIso={toIso}
      />
      <CalendarDateStrip
        fromIso={fromIso}
        pathname={pathname}
        toIso={toIso}
      />
    </div>
  );
}
