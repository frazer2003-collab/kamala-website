import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import {
  defaultStaffTimelineSelectionRange,
  formatCalendarMonth,
  formatCalendarMonthLabel,
  parseCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/calendar";
import { getConfirmedBookings } from "@/lib/booking-requests";
import { formatMoneySuffix } from "@/lib/currency";
import { getPropertySettings } from "@/lib/property-settings";
import {
  buildRateLookup,
  getRoomDayRatesForMonth,
} from "@/lib/room-day-rates";
import { getStaffCalendarBlocks } from "@/lib/room-blocks";
import { getStaffRoomPromotions } from "@/lib/room-promotions";
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

function sourceLine(sources: { label: string; stays: number }[]) {
  return sources
    .map(
      (source) =>
        `${source.label} · ${source.stays === 1 ? "1 stay" : `${source.stays} stays`}`,
    )
    .join(", ");
}

function moneyCaption(row: {
  websiteRevenue: number;
  channelRevenue: number;
  estimatedRevenue: number;
}) {
  if (row.estimatedRevenue <= 0) {
    return null;
  }
  if (row.websiteRevenue > 0 && row.channelRevenue > 0) {
    return "Website total + quoted channels";
  }
  if (row.channelRevenue > 0) {
    return "Quoted estimate";
  }
  return "Website stay total";
}

function calendarRoomHref(monthKey: string, roomId: string) {
  const selection = defaultStaffTimelineSelectionRange(monthKey);
  const params = new URLSearchParams({
    month: monthKey,
    from: selection.fromIso,
    to: selection.toIso,
    room: roomId,
  });
  return `/staff/calendar?${params.toString()}`;
}

export default async function StaffSoldPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireStaffCalendarWrite();

  const { month: monthParam } = await searchParams;
  const { year, month } = parseCalendarMonth(monthParam);
  const monthKey = formatCalendarMonth(year, month);
  const prev = shiftCalendarMonth(year, month, -1);
  const next = shiftCalendarMonth(year, month, 1);
  const prevKey = formatCalendarMonth(prev.year, prev.month);
  const nextKey = formatCalendarMonth(next.year, next.month);
  const prevLabel = formatCalendarMonthLabel(prev.year, prev.month);
  const nextLabel = formatCalendarMonthLabel(next.year, next.month);

  const [
    rooms,
    bookingsResult,
    blocksResult,
    settings,
    promotions,
    dayRatesResult,
    supabaseReady,
  ] = await Promise.all([
    getStaffRooms(),
    getConfirmedBookings({ year, month }),
    getStaffCalendarBlocks({ year, month }),
    getPropertySettings(),
    getStaffRoomPromotions(),
    getRoomDayRatesForMonth({ year, month }),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);

  const warnings = [
    bookingsResult.error,
    blocksResult.error,
    dayRatesResult.error,
  ].filter((message): message is string => Boolean(message));

  const report = buildStaffInsightsReport({
    year,
    month,
    rooms,
    bookings: bookingsResult.bookings,
    channelBlocks: blocksResult.channelBlocks,
    monthBlocks: blocksResult.monthBlocks,
    promotions,
    rateOverrides: buildRateLookup(dayRatesResult.entries),
  });
  const currency = settings.currency;
  const soldRooms = report.rooms.filter((row) => row.nightsSold > 0);
  const quietRooms = report.rooms.filter((row) => row.nightsSold === 0);
  const noRoomsConfigured = rooms.length === 0;

  return (
    <StaffShell current="sold">
      <section
        className="staff-main staff-main--sold"
        aria-labelledby="staff-sold-title"
      >
        <div className="staff-header staff-header--compact staff-sold__header">
          <div className="staff-sold__intro">
            <h1 id="staff-sold-title">Sold</h1>
            <p>
              Which rooms sold this month — nights and money from website stays
              and quoted channel nights.
            </p>
          </div>
          <nav className="staff-sold__month" aria-label="Choose month">
            <Link
              aria-label={`Previous month, ${prevLabel}`}
              className="button button--quiet staff-sold__month-btn"
              href={`/staff/sold?month=${prevKey}`}
            >
              <span aria-hidden="true">‹</span>
              <span className="staff-sold__month-btn-text">{prevLabel}</span>
            </Link>
            <p className="staff-sold__month-label" aria-live="polite">
              {report.monthLabel}
            </p>
            <Link
              aria-label={`Next month, ${nextLabel}`}
              className="button button--quiet staff-sold__month-btn"
              href={`/staff/sold?month=${nextKey}`}
            >
              <span className="staff-sold__month-btn-text">{nextLabel}</span>
              <span aria-hidden="true">›</span>
            </Link>
          </nav>
        </div>

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Booking data isn’t connected yet. Finish Supabase setup, then reload
            this page.
          </p>
        ) : (
          <>
            {warnings.map((message) => (
              <p
                className="form-message form-message--warning"
                key={message}
                role="status"
              >
                {message} Some numbers may be missing — try again in a moment.
              </p>
            ))}

            {noRoomsConfigured ? (
              <p className="staff-sold__empty" role="status">
                No room types yet.{" "}
                <Link href="/staff/settings/rooms">Add rooms in Settings</Link>{" "}
                before you can see what sold.
              </p>
            ) : (
              <div className="staff-sold__body">
                <div className="staff-sold__sold">
                  {soldRooms.length === 0 ? (
                    <p className="staff-sold__empty" role="status">
                      Nothing sold in {report.monthLabel} yet. Confirmed stays
                      that land in this month will appear here.
                    </p>
                  ) : (
                    <ol
                      className="staff-sold__list"
                      aria-label="Rooms ranked by nights sold"
                      role="list"
                    >
                      {soldRooms.map((row) => {
                        const caption = moneyCaption(row);
                        return (
                          <li className="staff-sold__row" key={row.roomId}>
                            <div className="staff-sold__row-main">
                              <h2>
                                <Link
                                  className="staff-sold__room-link"
                                  href={calendarRoomHref(monthKey, row.roomId)}
                                >
                                  {row.roomName}
                                  <span className="sr-only">
                                    {` (open on calendar for ${report.monthLabel})`}
                                  </span>
                                </Link>
                              </h2>
                              <p className="staff-sold__row-stats">
                                <span>{nightLabel(row.nightsSold)}</span>
                                <span aria-hidden="true">·</span>
                                <span>{stayLabel(row.stayCount)}</span>
                              </p>
                              {row.sources.length > 0 ? (
                                <p className="staff-sold__sources">
                                  {sourceLine(row.sources)}
                                </p>
                              ) : null}
                            </div>
                            <div className="staff-sold__row-money">
                              {row.estimatedRevenue > 0 && caption ? (
                                <p>
                                  <strong>
                                    {formatMoneySuffix(
                                      row.estimatedRevenue,
                                      currency,
                                    )}
                                  </strong>
                                  <span>{caption}</span>
                                </p>
                              ) : (
                                <p className="staff-sold__row-money--quiet">
                                  <span>No stay total yet</span>
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  <div
                    className="staff-sold__summary"
                    role="region"
                    aria-label="Month totals"
                  >
                    <p className="staff-sold__summary-line">
                      <span>
                        {nightLabel(report.totals.nightsSold)}
                        <span aria-hidden="true"> · </span>
                        {stayLabel(report.totals.stayCount)}
                      </span>
                      {report.totals.estimatedRevenue > 0 ? (
                        <span>
                          {formatMoneySuffix(
                            report.totals.estimatedRevenue,
                            currency,
                          )}
                        </span>
                      ) : null}
                    </p>
                    <p className="staff-sold__note">{report.revenueNote}</p>
                  </div>
                </div>

                {soldRooms.length > 0 && quietRooms.length > 0 ? (
                  <div className="staff-sold__quiet">
                    <h2>Didn’t sell this month</h2>
                    <ul role="list">
                      {quietRooms.map((row) => (
                        <li key={row.roomId}>
                          <Link
                            className="staff-sold__quiet-link"
                            href={calendarRoomHref(monthKey, row.roomId)}
                          >
                            {row.roomName}
                            <span className="sr-only">
                              {` (open on calendar for ${report.monthLabel})`}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </section>
    </StaffShell>
  );
}
