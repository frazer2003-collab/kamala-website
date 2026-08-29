import Link from "next/link";
import { CalendarDateStrip } from "@/components/calendar-date-strip";
import { FinanceSoldPie } from "@/components/finance-revenue-pie";
import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import { StaffShell } from "@/components/staff-shell";
import { parseStaffTimelineRange } from "@/lib/calendar";
import { formatMoneySuffix } from "@/lib/currency";
import { buildStaffInsightsReport } from "@/lib/staff-insights";
import { loadStaffFinancePageData } from "@/lib/staff-finance-data";
import { requireStaffSensitiveAccess } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-sold.css";

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
    return "Website + quoted channels";
  }
  if (row.channelRevenue > 0) {
    return "Quoted estimate";
  }
  return "Website (in range)";
}

function calendarRoomHref(fromIso: string, toIso: string, roomId: string) {
  const params = new URLSearchParams({
    month: fromIso.slice(0, 7),
    from: fromIso,
    to: toIso,
    room: roomId,
  });
  return `/staff/calendar?${params.toString()}`;
}

function FinancePageHeader({
  fromIso,
  monthKey,
  toIso,
}: {
  fromIso: string;
  monthKey: string;
  toIso: string;
}) {
  return (
    <div className="staff-header staff-header--compact staff-sold__header">
      <div className="staff-sold__intro">
        <h1 id="staff-sold-title">Finance</h1>
        <p>
          Nights and money sold for the selected dates — website stays and
          quoted channel nights.
        </p>
      </div>
      <div className="staff-sold__dates">
        <StaffCalendarMonthPicker
          fromIso={fromIso}
          monthKey={monthKey}
          pathname="/staff/sold"
          toIso={toIso}
        />
        <CalendarDateStrip
          fromIso={fromIso}
          pathname="/staff/sold"
          toIso={toIso}
        />
      </div>
    </div>
  );
}

export default async function StaffSoldPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; from?: string; to?: string }>;
}) {
  await requireStaffSensitiveAccess("/staff/sold");

  const { month: monthParam, from: fromParam, to: toParam } = await searchParams;
  const timelineRange = parseStaffTimelineRange({
    month: monthParam,
    from: fromParam,
    to: toParam,
  });
  const monthKey = timelineRange.monthKey;
  const fromIso = timelineRange.fromIso;
  const toIso = timelineRange.toIso;

  if (!hasStaffSupabaseConfig()) {
    return (
      <StaffShell current="sold">
        <section
          className="staff-main staff-main--sold"
          aria-labelledby="staff-sold-title"
        >
          <FinancePageHeader fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
          <p className="form-message form-message--setup" role="status">
            Booking data isn’t connected yet. Finish Supabase setup, then reload
            this page.
          </p>
        </section>
      </StaffShell>
    );
  }

  const {
    rooms,
    bookingsResult,
    channelsResult,
    closuresResult,
    settings,
    promotions,
    dayRatesParts,
    rateOverrides,
  } = await loadStaffFinancePageData(fromIso, toIso);

  const warnings = [
    bookingsResult.error,
    channelsResult.error,
    closuresResult.error,
    dayRatesParts.find((part) => part.error)?.error ?? null,
  ].filter((message): message is string => Boolean(message));

  const report = buildStaffInsightsReport({
    year: timelineRange.start.year,
    month: timelineRange.start.month,
    fromIso,
    toIso,
    rooms,
    bookings: bookingsResult.bookings,
    channelBlocks: channelsResult.blocks,
    monthBlocks: closuresResult.blocks,
    promotions,
    rateOverrides,
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
        <FinancePageHeader fromIso={fromIso} monthKey={monthKey} toIso={toIso} />

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
                      Nothing sold in {report.rangeLabel} yet. Confirmed stays
                      that land in this range will appear here.
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
                              <h3>
                                <Link
                                  className="staff-sold__room-link"
                                  href={calendarRoomHref(
                                    fromIso,
                                    toIso,
                                    row.roomId,
                                  )}
                                >
                                  {row.roomName}
                                  <span className="sr-only">
                                    {` (open on calendar for ${report.rangeLabel})`}
                                  </span>
                                </Link>
                              </h3>
                              <p className="staff-sold__row-stats">
                                <span>{nightLabel(row.nightsSold)}</span>
                                <span aria-hidden="true">·</span>
                                <span>{stayLabel(row.stayCount)}</span>
                                {row.soldPercent !== null ? (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{row.soldPercent}% sold</span>
                                  </>
                                ) : null}
                                {row.nightsOverCapacity > 0 ? (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      {row.nightsOverCapacity} over capacity
                                    </span>
                                  </>
                                ) : null}
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

                  {soldRooms.length > 0 && quietRooms.length > 0 ? (
                    <div
                      className="staff-sold__quiet"
                      aria-labelledby="staff-sold-quiet-title"
                    >
                      <h2 id="staff-sold-quiet-title">Didn’t sell in this range</h2>
                      <ul role="list">
                        {quietRooms.map((row) => (
                          <li key={row.roomId}>
                            <Link
                              className="staff-sold__quiet-link"
                              href={calendarRoomHref(fromIso, toIso, row.roomId)}
                            >
                              {row.roomName}
                              <span className="sr-only">
                                {` (open on calendar for ${report.rangeLabel})`}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <FinanceSoldPie
                  nightsAvailable={report.totals.nightsAvailable}
                  nightsOverCapacity={report.totals.nightsOverCapacity}
                  nightsSold={report.totals.nightsSold}
                />

                <div
                  className="staff-sold__summary"
                  role="region"
                  aria-label="Range totals"
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
                  {report.totals.averageNightlyRate !== null ? (
                    <p className="staff-sold__summary-avg">
                      Avg nightly rate{" "}
                      <strong>
                        {formatMoneySuffix(
                          report.totals.averageNightlyRate,
                          currency,
                        )}
                      </strong>
                    </p>
                  ) : null}
                  <p className="staff-sold__note">{report.revenueNote}</p>
                </div>
              </div>
            )}
        </>
      </section>
    </StaffShell>
  );
}
