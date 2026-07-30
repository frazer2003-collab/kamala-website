import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import {
  formatCalendarMonth,
  formatCalendarMonthLabel,
  parseCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/calendar";
import { getConfirmedBookings } from "@/lib/booking-requests";
import { formatMoneySuffix } from "@/lib/currency";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffCalendarBlocks } from "@/lib/room-blocks";
import { getStaffRooms } from "@/lib/rooms";
import { buildStaffInsightsReport } from "@/lib/staff-insights";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function stayLabel(count: number) {
  return count === 1 ? "1 stay" : `${count} stays`;
}

function nightLabel(count: number) {
  return count === 1 ? "1 night" : `${count} nights`;
}

export default async function StaffInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireStaffCalendarWrite();

  const { month: monthParam } = await searchParams;
  const { year, month } = parseCalendarMonth(monthParam);
  const prev = shiftCalendarMonth(year, month, -1);
  const next = shiftCalendarMonth(year, month, 1);

  const [rooms, bookingsResult, blocksResult, settings, supabaseReady] =
    await Promise.all([
      getStaffRooms(),
      getConfirmedBookings({ year, month }),
      getStaffCalendarBlocks({ year, month }),
      getPropertySettings(),
      Promise.resolve(hasStaffSupabaseConfig()),
    ]);

  const loadError = bookingsResult.error || blocksResult.error;
  const report = buildStaffInsightsReport({
    year,
    month,
    rooms,
    bookings: bookingsResult.bookings,
    channelBlocks: blocksResult.channelBlocks,
    monthBlocks: blocksResult.monthBlocks,
  });
  const currency = settings.currency;
  const soldRooms = report.rooms.filter((row) => row.nightsSold > 0);
  const quietRooms = report.rooms.filter((row) => row.nightsSold === 0);

  return (
    <StaffShell current="insights">
      <section className="staff-main staff-main--insights" aria-labelledby="staff-insights-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-insights-title">Insights</h1>
            <p>Which room types sold in {report.monthLabel} — website, walk-in, and channel stays.</p>
          </div>
          <nav className="staff-insights__month" aria-label="Choose month">
            <Link
              className="button button--quiet"
              href={`/staff/insights?month=${formatCalendarMonth(prev.year, prev.month)}`}
            >
              Previous
            </Link>
            <p className="staff-insights__month-label">{formatCalendarMonthLabel(year, month)}</p>
            <Link
              className="button button--quiet"
              href={`/staff/insights?month=${formatCalendarMonth(next.year, next.month)}`}
            >
              Next
            </Link>
          </nav>
        </div>

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Connect Supabase to load live booking insights.
          </p>
        ) : null}

        {loadError ? (
          <p className="form-message form-message--warning" role="status">
            {loadError}
          </p>
        ) : null}

        <div className="staff-insights__summary" role="region" aria-label="Month totals">
          <p>
            <strong>{nightLabel(report.totals.nightsSold)}</strong> sold across{" "}
            <strong>{stayLabel(report.totals.stayCount)}</strong>
            {report.totals.occupancyPercent !== null ? (
              <>
                {" "}
                · <strong>{report.totals.occupancyPercent}% occupancy</strong>
              </>
            ) : null}
          </p>
          {report.totals.websiteRevenue > 0 ? (
            <p>
              Website stay totals:{" "}
              <strong>{formatMoneySuffix(report.totals.websiteRevenue, currency)}</strong>
              {report.totals.websiteStayCount > 0
                ? ` · ${stayLabel(report.totals.websiteStayCount)} with a saved total`
                : null}
            </p>
          ) : (
            <p>No website stay totals recorded for this month.</p>
          )}
          <p className="staff-insights__note">{report.revenueNote}</p>
        </div>

        {soldRooms.length === 0 ? (
          <p className="staff-insights__empty" role="status">
            No sold nights in {report.monthLabel}. Confirmed website stays and
            channel reservations will show here.
          </p>
        ) : (
          <ol className="staff-insights__list" aria-label="Rooms ranked by nights sold">
            {soldRooms.map((row, index) => (
              <li className="staff-insights__row" key={row.roomId}>
                <div className="staff-insights__rank" aria-hidden="true">
                  {index + 1}
                </div>
                <div className="staff-insights__row-main">
                  <h2>{row.roomName}</h2>
                  <p>
                    {nightLabel(row.nightsSold)} · {stayLabel(row.stayCount)}
                    {row.sources.length > 0
                      ? ` · ${row.sources
                          .map((source) => `${source.label} ${source.stays}`)
                          .join(", ")}`
                      : null}
                  </p>
                </div>
                <div className="staff-insights__row-money">
                  {row.websiteRevenue > 0 ? (
                    <p>
                      <strong>{formatMoneySuffix(row.websiteRevenue, currency)}</strong>
                      <span>website totals</span>
                    </p>
                  ) : (
                    <p className="staff-insights__row-money--quiet">
                      <span>No website totals</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {quietRooms.length > 0 ? (
          <div className="staff-insights__quiet">
            <h2>No sold nights</h2>
            <p>{quietRooms.map((row) => row.roomName).join(" · ")}</p>
          </div>
        ) : null}
      </section>
    </StaffShell>
  );
}
