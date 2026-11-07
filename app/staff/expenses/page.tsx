import Link from "next/link";
import { CalendarDateStrip } from "@/components/calendar-date-strip";
import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import { StaffDeskExpenses } from "@/components/staff-desk-expenses";
import { StaffShell } from "@/components/staff-shell";
import {
  getPropertyTodayIso,
  parseStaffTimelineRange,
} from "@/lib/calendar";
import {
  isoMonthRangeContaining,
  isoWeekRangeContaining,
} from "@/lib/desk-expenses";
import { listDeskExpensesInRange } from "@/lib/desk-ops-data";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
}) {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const params = await searchParams;
  const todayIso = getPropertyTodayIso();

  let fromIso: string;
  let toIso: string;
  let monthKey: string;

  if (params.view === "week") {
    ({ fromIso, toIso } = isoWeekRangeContaining(todayIso));
    monthKey = fromIso.slice(0, 7);
  } else if (params.view === "day") {
    fromIso = params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)
      ? params.from
      : todayIso;
    toIso = fromIso;
    monthKey = fromIso.slice(0, 7);
  } else if (params.view === "month" && !params.from && !params.to) {
    ({ fromIso, toIso } = isoMonthRangeContaining(
      params.month ? `${params.month}-01` : todayIso,
    ));
    monthKey = fromIso.slice(0, 7);
  } else {
    const range = parseStaffTimelineRange({
      month: params.month,
      from: params.from,
      to: params.to,
    });
    fromIso = range.fromIso;
    toIso = range.toIso;
    monthKey = range.monthKey;
  }

  const returnTo = `/staff/expenses?month=${encodeURIComponent(monthKey)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  const { expenses, truncated, totalSatang } = hasStaffSupabaseConfig()
    ? await listDeskExpensesInRange(fromIso, toIso)
    : { expenses: [], truncated: false, totalSatang: 0, count: 0 };

  const week = isoWeekRangeContaining(todayIso);
  const month = isoMonthRangeContaining(todayIso);

  return (
    <StaffShell current="expenses">
      <section className="staff-main staff-desk" aria-labelledby="desk-expenses-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-expenses-title">{staffT(locale, "expenses.title")}</h1>
            <p>{staffT(locale, "expenses.intro")}</p>
          </div>
        </header>

        <div className="staff-desk__range-band">
          <div className="staff-desk__view-pills" role="navigation" aria-label="Range">
            <Link
              className="button button--quiet"
              href={`/staff/expenses?view=day&from=${todayIso}&to=${todayIso}&month=${todayIso.slice(0, 7)}`}
            >
              {staffT(locale, "expenses.viewDay")}
            </Link>
            <Link
              className="button button--quiet"
              href={`/staff/expenses?view=week&from=${week.fromIso}&to=${week.toIso}&month=${week.fromIso.slice(0, 7)}`}
            >
              {staffT(locale, "expenses.viewWeek")}
            </Link>
            <Link
              className="button button--quiet"
              href={`/staff/expenses?view=month&month=${month.fromIso.slice(0, 7)}&from=${month.fromIso}&to=${month.toIso}`}
            >
              {staffT(locale, "expenses.viewMonth")}
            </Link>
          </div>
          <StaffCalendarMonthPicker
            fromIso={fromIso}
            monthKey={monthKey}
            pathname="/staff/expenses"
            toIso={toIso}
          />
          <CalendarDateStrip
            fromIso={fromIso}
            pathname="/staff/expenses"
            toIso={toIso}
          />
        </div>

        {!hasStaffSupabaseConfig() ? (
          <p className="form-message form-message--setup" role="status">
            Desk data is not connected yet. Finish Supabase setup, then reload.
          </p>
        ) : (
          <StaffDeskExpenses
            expenses={expenses}
            fromIso={fromIso}
            returnTo={returnTo}
            toIso={toIso}
            todayIso={todayIso}
            totalSatang={totalSatang}
            truncated={truncated}
          />
        )}
      </section>
    </StaffShell>
  );
}
