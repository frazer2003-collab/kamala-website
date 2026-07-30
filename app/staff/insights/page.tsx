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
  const prevKey = formatCalendarMonth(prev.year, prev.month);
  const nextKey = formatCalendarMonth(next.year, next.month);
  const prevLabel = formatCalendarMonthLabel(prev.year, prev.month);
  const nextLabel = formatCalendarMonthLabel(next.year, next.month);

  const [rooms, bookingsResult, blocksResult, settings, supabaseReady] =
    await Promise.all([
      getStaffRooms(),
      getConfirmedBookings({ year, month }),
      getStaffCalendarBlocks({ year, month }),
      getPropertySettings(),
      Promise.resolve(hasStaffSupabaseConfig()),
    ]);

  const warnings = [bookingsResult.error, blocksResult.error].filter(
    (message): message is string => Boolean(message),
  );
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
  const noRoomsConfigured = rooms.length === 0;

  return (
    <StaffShell current="insights">
      <section className="staff-main staff-main--insights" aria-labelledby="staff-insights-title">
        <div className="staff-header staff-header--compact staff-insights__header">
          <div className="staff-insights__intro">
            <h1 id="staff-insights-title">Insights</h1>
            <p>
              Room types sold in {report.monthLabel} — website, walk-in, and
              channel stays.
            </p>
          </div>
          <nav className="staff-insights__month" aria-label="Choose month">
            <Link
              aria-label={`Previous month, ${prevLabel}`}
              className="button button--quiet staff-insights__month-btn"
              href={`/staff/insights?month=${prevKey}`}
            >
              <span aria-hidden="true">‹</span>
              <span className="staff-insights__month-btn-text">{prevLabel}</span>
            </Link>
            <p className="staff-insights__month-label" aria-current="date">
              {report.monthLabel}
            </p>
            <Link
              aria-label={`Next month, ${nextLabel}`}
              className="button button--quiet staff-insights__month-btn"
              href={`/staff/insights?month=${nextKey}`}
            >
              <span className="staff-insights__month-btn-text">{nextLabel}</span>
              <span aria-hidden="true">›</span>
            </Link>
          </nav>
        </div>

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Connect Supabase to load live booking insights, then reload this page.
          </p>
        ) : null}

        {warnings.map((message) => (
          <p className="form-message form-message--warning" key={message} role="status">
            {message} Figures below may be incomplete — try again in a moment.
          </p>
        ))}

        {noRoomsConfigured ? (
          <p className="staff-insights__empty" role="status">
            No room types yet.{" "}
            <Link href="/staff/settings/rooms">Add rooms in Settings</Link> to
            start tracking what sells.
          </p>
        ) : (
          <>
            <div className="staff-insights__summary" role="region" aria-label="Month totals">
              <dl className="staff-insights__facts">
                <div>
                  <dt>Nights sold</dt>
                  <dd>{report.totals.nightsSold}</dd>
                </div>
                <div>
                  <dt>Stays</dt>
                  <dd>{report.totals.stayCount}</dd>
                </div>
                {report.totals.occupancyPercent !== null ? (
                  <div>
                    <dt>Occupancy</dt>
                    <dd>{report.totals.occupancyPercent}%</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Website totals</dt>
                  <dd>
                    {report.totals.websiteRevenue > 0
                      ? formatMoneySuffix(report.totals.websiteRevenue, currency)
                      : "—"}
                  </dd>
                </div>
              </dl>
              {report.totals.websiteStayCount > 0 ? (
                <p className="staff-insights__summary-meta">
                  {stayLabel(report.totals.websiteStayCount)} with a saved website
                  total.
                </p>
              ) : (
                <p className="staff-insights__summary-meta">
                  No website stay totals recorded for this month.
                </p>
              )}
              <p className="staff-insights__note">{report.revenueNote}</p>
            </div>

            {soldRooms.length === 0 ? (
              <p className="staff-insights__empty" role="status">
                No sold nights in {report.monthLabel}. Confirmed website stays and
                channel reservations will show here when they overlap this month.
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
                      <p className="staff-insights__row-stats">
                        <span>{nightLabel(row.nightsSold)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{stayLabel(row.stayCount)}</span>
                      </p>
                      {row.sources.length > 0 ? (
                        <ul className="staff-insights__sources">
                          {row.sources.map((source) => (
                            <li key={source.label}>
                              {source.label}{" "}
                              <span>
                                {source.stays === 1 ? "1 stay" : `${source.stays} stays`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="staff-insights__row-money">
                      {row.websiteRevenue > 0 ? (
                        <p>
                          <strong>
                            {formatMoneySuffix(row.websiteRevenue, currency)}
                          </strong>
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

            {soldRooms.length > 0 && quietRooms.length > 0 ? (
              <div className="staff-insights__quiet">
                <h2>No sold nights this month</h2>
                <ul>
                  {quietRooms.map((row) => (
                    <li key={row.roomId}>{row.roomName}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>
    </StaffShell>
  );
}
