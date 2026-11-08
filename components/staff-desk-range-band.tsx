import Link from "next/link";
import { CalendarDateStrip } from "@/components/calendar-date-strip";
import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import {
  isoMonthRangeContaining,
  isoWeekRangeContaining,
} from "@/lib/desk-expenses";
import { deskListRangeHref } from "@/lib/desk-range";
import { staffT, type StaffLocale } from "@/lib/staff-i18n";

export function StaffDeskRangeBand({
  pathname,
  locale,
  fromIso,
  toIso,
  monthKey,
  todayIso,
  extraParams,
}: {
  pathname: string;
  locale: StaffLocale;
  fromIso: string;
  toIso: string;
  monthKey: string;
  todayIso: string;
  /** Preserved across Today / week / month / strip navigation. */
  extraParams?: Record<string, string | undefined>;
}) {
  const week = isoWeekRangeContaining(todayIso);
  const month = isoMonthRangeContaining(todayIso);

  return (
    <div className="staff-desk__range-band">
      <div className="staff-desk__view-pills" role="navigation" aria-label="Range">
        <Link
          className="button button--quiet"
          href={deskListRangeHref(pathname, todayIso, todayIso, {
            ...extraParams,
            view: "day",
          })}
          prefetch={false}
        >
          {staffT(locale, "desk.viewDay")}
        </Link>
        <Link
          className="button button--quiet"
          href={deskListRangeHref(pathname, week.fromIso, week.toIso, {
            ...extraParams,
            view: "week",
          })}
          prefetch={false}
        >
          {staffT(locale, "desk.viewWeek")}
        </Link>
        <Link
          className="button button--quiet"
          href={deskListRangeHref(pathname, month.fromIso, month.toIso, {
            ...extraParams,
            view: "month",
            month: month.fromIso.slice(0, 7),
          })}
          prefetch={false}
        >
          {staffT(locale, "desk.viewMonth")}
        </Link>
      </div>
      <StaffCalendarMonthPicker
        extraParams={extraParams}
        fromIso={fromIso}
        monthKey={monthKey}
        pathname={pathname}
        toIso={toIso}
      />
      <CalendarDateStrip
        extraParams={extraParams}
        fromIso={fromIso}
        pathname={pathname}
        toIso={toIso}
      />
    </div>
  );
}
