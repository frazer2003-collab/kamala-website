import Link from "next/link";
import { CalendarDateStrip } from "@/components/calendar-date-strip";
import { FinanceSoldPie } from "@/components/finance-revenue-pie";
import { StaffCalendarMonthPicker } from "@/components/staff-calendar-month-picker";
import { StaffShell } from "@/components/staff-shell";
import { getTodayIso, parseStaffTimelineRange } from "@/lib/calendar";
import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
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
    .join(" · ");
}

/**
 * Says where a row's money came from. A row built from saved totals shows its
 * amount even when that amount is 0, because a comped stay is a real answer and
 * not missing data.
 */
function moneyCaption(row: {
  recordedStayCount: number;
  bankCharge: number;
  unpricedNights: number;
  unearnedRevenue: number;
}) {
  const parts: string[] = [];
  if (row.recordedStayCount > 0) {
    parts.push(row.bankCharge > 0 ? "Room price plus card bank charge" : "Saved room price");
  }
  if (row.unpricedNights > 0) {
    parts.push(
      row.unpricedNights === 1
        ? "1 channel night has no saved price"
        : `${row.unpricedNights} channel nights have no saved price`,
    );
  }
  if (row.unearnedRevenue > 0) {
    parts.push("Some nights in this range are still ahead");
  }
  return parts.length > 0 ? parts.join(". ") : null;
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
    <header className="staff-header staff-header--compact staff-sold__header">
      <div className="staff-sold__intro">
        <h1 id="staff-sold-title">Finance</h1>
        <p>
          What has been earned, how the published rates compare with what guests
          paid, and which payments still need a check.
        </p>
      </div>
      <div className="staff-sold__dates-band">
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
    </header>
  );
}

type FinanceRangeOverviewProps = {
  currency: PropertyCurrency;
  report: ReturnType<typeof buildStaffInsightsReport>;
};

function FinanceRangeOverview({ currency, report }: FinanceRangeOverviewProps) {
  // A range of comped stays totals 0 without being empty, so show the figure
  // whenever any stay carried a saved total.
  const hasMoney =
    report.totals.earnedRevenue > 0 ||
    report.totals.unearnedRevenue > 0 ||
    report.totals.recordedStayCount > 0;

  return (
    <aside className="staff-sold__aside" aria-label="Range overview">
      <div className="staff-sold__overview">
        <div className="staff-sold__summary">
          <p className="staff-sold__range-chip">{report.rangeLabel}</p>
          <h2 className="staff-sold__section-title">Earned</h2>
          <p className="staff-sold__total">
            {hasMoney ? (
              <span className="staff-sold__total-value">
                {formatMoneySuffix(report.totals.earnedRevenue, currency)}
              </span>
            ) : (
              <span className="staff-sold__total-empty">No stay totals yet</span>
            )}
          </p>
          {hasMoney ? (
            <p className="staff-sold__summary-line">
              <span>
                Room {formatMoneySuffix(report.totals.earnedRoomRevenue, currency)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Bank charge {formatMoneySuffix(report.totals.earnedBankCharge, currency)}
              </span>
            </p>
          ) : null}
          {report.totals.unearnedRevenue > 0 ? (
            <p className="staff-sold__summary-avg">
              Still to provide{" "}
              <strong>
                {formatMoneySuffix(report.totals.unearnedRevenue, currency)}
              </strong>
            </p>
          ) : null}
          {report.totals.unpricedNights > 0 ? (
            <p className="staff-sold__summary-avg">
              {report.totals.unpricedNights === 1
                ? "1 channel night is not in the money"
                : `${report.totals.unpricedNights} channel nights are not in the money`}
            </p>
          ) : null}
          <p className="staff-sold__summary-line">
            <span>{nightLabel(report.totals.nightsSold)}</span>
            <span aria-hidden="true">·</span>
            <span>{stayLabel(report.totals.stayCount)}</span>
            {report.totals.soldPercent !== null ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{report.totals.soldPercent}% of capacity</span>
              </>
            ) : null}
          </p>
          {report.totals.averageNightlyRate !== null ? (
            <p className="staff-sold__summary-avg">
              Avg room rate{" "}
              <strong>
                {formatMoneySuffix(report.totals.averageNightlyRate, currency)}
              </strong>
            </p>
          ) : null}
          <p className="staff-sold__note">{report.revenueNote}</p>
        </div>

        <FinanceSoldPie
          nightsAvailable={report.totals.nightsAvailable}
          nightsOverCapacity={report.totals.nightsOverCapacity}
          nightsPassedUnsold={report.totals.nightsPassedUnsold}
          nightsSold={report.totals.nightsSoldInCapacity}
          nightsStillOpen={report.totals.nightsStillOpen}
        />
      </div>
    </aside>
  );
}

function rateGapLabel(
  publishedRate: number,
  agreedNightlyRate: number,
  currency: PropertyCurrency,
) {
  const gap = Math.round(publishedRate - agreedNightlyRate);
  if (gap === 0) {
    return "Same as the published rate";
  }
  if (gap > 0) {
    return `${formatMoneySuffix(gap, currency)} under the published rate`;
  }
  return `${formatMoneySuffix(Math.abs(gap), currency)} over the published rate`;
}

function FinancePriceGuide({
  currency,
  fromIso,
  report,
  toIso,
}: {
  currency: PropertyCurrency;
  fromIso: string;
  report: ReturnType<typeof buildStaffInsightsReport>;
  toIso: string;
}) {
  const priceRooms = report.rooms
    .filter((row) => !row.isUnconfigured)
    .slice()
    .sort(
      (a, b) =>
        b.nightsStillOpen - a.nightsStillOpen ||
        a.roomName.localeCompare(b.roomName),
    );

  return (
    <section className="staff-sold__ledger-panel" aria-label="Room prices">
      <header className="staff-sold__ledger-head">
        <h2 className="staff-sold__section-title">Room prices</h2>
        <p className="staff-sold__ledger-count">
          <Link href="/staff/settings/rooms">Change rates</Link>
        </p>
      </header>
      <p className="staff-sold__section-lead">
        Published rate against the saved room price for nights in this range.
        Still open counts nights that can still be booked.
      </p>
      {priceRooms.length === 0 ? (
        <p className="staff-sold__empty" role="status">
          No room types to compare.
        </p>
      ) : (
        <ol className="staff-sold__list" aria-label="Published rate against agreed rate">
          {priceRooms.map((row) => (
            <li className="staff-sold__row" key={row.roomId}>
              <div className="staff-sold__row-main">
                <h3>
                  <Link
                    className="staff-sold__room-link"
                    href={calendarRoomHref(fromIso, toIso, row.roomId)}
                  >
                    {row.roomName}
                    <span className="sr-only">
                      {` (open on calendar for ${report.rangeLabel})`}
                    </span>
                  </Link>
                </h3>
                <p className="staff-sold__row-stats">
                  <span>
                    Published{" "}
                    {row.publishedRate === null
                      ? "—"
                      : formatMoneySuffix(row.publishedRate, currency)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Agreed{" "}
                    {row.agreedNightlyRate === null
                      ? "—"
                      : formatMoneySuffix(row.agreedNightlyRate, currency)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Still open {nightLabel(row.nightsStillOpen)}</span>
                </p>
                {row.priceCue ? <p className="staff-sold__cue">{row.priceCue}</p> : null}
              </div>
              <div className="staff-sold__row-money">
                {row.publishedRate !== null && row.agreedNightlyRate !== null ? (
                  <p>
                    <strong>
                      {rateGapLabel(row.publishedRate, row.agreedNightlyRate, currency)}
                    </strong>
                  </p>
                ) : (
                  <p className="staff-sold__row-money--quiet">
                    <span>No agreed rate yet</span>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {report.totals.unpricedNights > 0 ? (
        <p className="staff-sold__note">
          Booking-channel nights are left out of the agreed rate. No selling
          price is saved for them.
        </p>
      ) : null}
    </section>
  );
}

function FinanceAccounts({
  currency,
  report,
}: {
  currency: PropertyCurrency;
  report: ReturnType<typeof buildStaffInsightsReport>;
}) {
  const { accounts } = report;
  const hasCheck =
    accounts.collected > 0 ||
    accounts.unpaid > 0 ||
    accounts.refundsToSend > 0 ||
    report.totals.recordedStayCount > 0;
  const unpaidDetail =
    accounts.unpaidEarned > 0
      ? `${formatMoneySuffix(accounts.unpaidEarned, currency)} is for nights that have already happened.`
      : accounts.unpaid > 0
        ? "The unpaid nights are still ahead."
        : "Nothing is unpaid for nights that have already happened.";
  const claimedDetail =
    accounts.bankClaimedUnpaid > 0
      ? ` ${formatMoneySuffix(accounts.bankClaimedUnpaid, currency)} is a bank transfer the guest said they sent. It is not marked paid.`
      : "";

  return (
    <section className="staff-sold__ledger-panel" aria-label="Accounts">
      <header className="staff-sold__ledger-head">
        <h2 className="staff-sold__section-title">Accounts</h2>
      </header>
      <p className="staff-sold__section-lead">
        Payments marked on stays in this range. Earned money can include a night
        the guest has not paid for yet.
      </p>
      {hasCheck ? (
        <dl className="staff-sold__accounts">
          <div>
            <dt>Collected</dt>
            <dd>{formatMoneySuffix(accounts.collected, currency)}</dd>
            <dd className="staff-sold__account-detail">
              {formatMoneySuffix(accounts.collectedEarned, currency)} already earned.{" "}
              {formatMoneySuffix(accounts.collectedAhead, currency)} is paid for nights
              still ahead.
              {accounts.collectedBankCharge > 0
                ? ` Includes ${formatMoneySuffix(accounts.collectedBankCharge, currency)} card bank charge.`
                : ""}
            </dd>
          </div>
          <div>
            <dt>Still to collect</dt>
            <dd>{formatMoneySuffix(accounts.unpaid, currency)}</dd>
            <dd className="staff-sold__account-detail">
              {unpaidDetail}
              {claimedDetail}
            </dd>
          </div>
          {accounts.refundsToSend > 0 ? (
            <div>
              <dt>Refunds still to send</dt>
              <dd>{formatMoneySuffix(accounts.refundsToSend, currency)}</dd>
              <dd className="staff-sold__account-detail">
                Send these from the guesthouse bank. The site does not move this
                money.
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="staff-sold__empty" role="status">
          No payments to check in this range.
        </p>
      )}
    </section>
  );
}

function SoldOccupancyMeter({ percent }: { percent: number }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="staff-sold__meter"
      aria-hidden="true"
      style={{ ["--sold-meter" as string]: `${width}%` }}
    >
      <span className="staff-sold__meter-fill" />
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
    todayIso: getTodayIso(),
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
        <FinancePageHeader
          fromIso={fromIso}
          monthKey={monthKey}
          toIso={toIso}
        />

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
            <Link href="/staff/settings/rooms">Add rooms in Settings</Link> before
            you can see what sold.
          </p>
        ) : (
          <div className="staff-sold__body">
            <FinanceRangeOverview currency={currency} report={report} />

            <div className="staff-sold__ledger">
              <section
                className="staff-sold__ledger-panel"
                aria-label="Sold by room"
              >
                <header className="staff-sold__ledger-head">
                  <h2 className="staff-sold__section-title">Sold by room</h2>
                  {soldRooms.length > 0 ? (
                    <p className="staff-sold__ledger-count">
                      {soldRooms.length === 1
                        ? "1 room type"
                        : `${soldRooms.length} room types`}
                    </p>
                  ) : null}
                </header>

                {soldRooms.length === 0 ? (
                  <p className="staff-sold__empty" role="status">
                    Nothing sold in {report.rangeLabel} yet. Confirmed stays that
                    land in this range will appear here.
                  </p>
                ) : (
                  <ol
                    className="staff-sold__list"
                    aria-label="Rooms ranked by nights sold"
                  >
                    {soldRooms.map((row) => {
                      const caption = moneyCaption(row);
                      return (
                        <li className="staff-sold__row" key={row.roomId}>
                          <div className="staff-sold__row-main">
                            <h3>
                              {row.isUnconfigured ? (
                                row.roomName
                              ) : (
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
                              )}
                            </h3>
                            {row.isUnconfigured ? (
                              <p className="staff-sold__row-retired">
                                Room type removed from Settings — kept here so its
                                money still counts.
                              </p>
                            ) : null}
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
                                  <span className="staff-sold__over">
                                    {row.nightsOverCapacity} over capacity
                                  </span>
                                </>
                              ) : null}
                            </p>
                            {row.soldPercent !== null ? (
                              <SoldOccupancyMeter percent={row.soldPercent} />
                            ) : null}
                            {row.sources.length > 0 ? (
                              <p className="staff-sold__sources">
                                {sourceLine(row.sources)}
                              </p>
                            ) : null}
                          </div>
                          <div className="staff-sold__row-money">
                            {caption ? (
                              <p>
                                <strong>
                                  {formatMoneySuffix(row.earnedRevenue, currency)}
                                </strong>
                                <span>{caption}</span>
                                {row.unearnedRevenue > 0 ? (
                                  <span>
                                    Still to provide{" "}
                                    {formatMoneySuffix(row.unearnedRevenue, currency)}
                                  </span>
                                ) : null}
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
                    <h2
                      className="staff-sold__section-title"
                      id="staff-sold-quiet-title"
                    >
                      Didn’t sell in this range
                    </h2>
                    <ul>
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
              </section>

              <FinancePriceGuide
                currency={currency}
                fromIso={fromIso}
                report={report}
                toIso={toIso}
              />
              <FinanceAccounts currency={currency} report={report} />
            </div>
          </div>
        )}
      </section>
    </StaffShell>
  );
}
