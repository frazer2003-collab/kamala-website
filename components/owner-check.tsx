import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import { formatCalendarMonth, getCalendarMonthBounds, getTodayIso } from "@/lib/calendar";
import { formatMoneySuffix } from "@/lib/currency";
import {
  ownerAttentionLabel,
  ownerBookingHref,
  ownerCalendarRoomHref,
  ownerFinanceHref,
  ownerOpenRange,
  ownerRateAction,
  pickOwnerRateRoom,
} from "@/lib/owner-check";
import { buildStaffInsightsReport } from "@/lib/staff-insights";
import { loadStaffFinancePageData } from "@/lib/staff-finance-data";
import { requireStaffSessionDetails } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

function nightLabel(count: number) {
  return count === 1 ? "1 night" : `${count} nights`;
}

export async function OwnerCheck() {
  await requireStaffSessionDetails();
  const todayIso = getTodayIso();
  const year = Number(todayIso.slice(0, 4));
  const month = Number(todayIso.slice(5, 7));
  const monthKey = formatCalendarMonth(year, month);
  const { monthStart, monthEnd } = getCalendarMonthBounds(year, month);

  if (!hasStaffSupabaseConfig()) {
    return (
      <StaffShell current="home">
        <section className="staff-main staff-main--check" aria-labelledby="owner-check-title">
          <header className="staff-header staff-header--compact">
            <div>
              <h1 id="owner-check-title">Check</h1>
            </div>
            <Link className="staff-header__quiet-link" href="/staff?view=inbox">
              Requests
            </Link>
          </header>
          <p className="form-message form-message--setup" role="status">
            Booking data isn’t connected yet. Finish Supabase setup, then reload this page.
          </p>
        </section>
      </StaffShell>
    );
  }

  const data = await loadStaffFinancePageData(monthStart, monthEnd);
  const warnings = [
    data.bookingsResult.error,
    data.channelsResult.error,
    data.closuresResult.error,
  ].filter((message): message is string => Boolean(message));
  const report = buildStaffInsightsReport({
    year,
    month,
    fromIso: monthStart,
    toIso: monthEnd,
    rooms: data.rooms,
    bookings: data.bookingsResult.bookings,
    channelBlocks: data.channelsResult.blocks,
    monthBlocks: data.closuresResult.blocks,
    todayIso,
  });
  const currency = data.settings.currency;
  const openRange = ownerOpenRange(todayIso, monthStart, monthEnd);
  const openRooms = report.rooms
    .filter((room) => !room.isUnconfigured && room.nightsStillOpen > 0)
    .sort((a, b) => b.nightsStillOpen - a.nightsStillOpen || a.roomName.localeCompare(b.roomName));
  const rateRoom = pickOwnerRateRoom(report.rooms);
  const rateAction = rateRoom ? ownerRateAction(rateRoom, openRange.fromIso, openRange.toIso) : null;
  const hasMoney =
    report.totals.earnedRevenue > 0 ||
    report.totals.unearnedRevenue > 0 ||
    report.totals.recordedStayCount > 0;

  return (
    <StaffShell current="home">
      <section className="staff-main staff-main--check" aria-labelledby="owner-check-title">
        <header className="staff-header staff-header--compact">
          <div>
            <h1 id="owner-check-title">Check</h1>
            <p>
              {report.monthLabel}. What has been earned, which nights are still open, and what
              needs a decision.
            </p>
          </div>
          <Link className="staff-header__quiet-link" href="/staff?view=inbox">
            Requests
          </Link>
        </header>

        {warnings.map((message) => (
          <p className="form-message form-message--warning" key={message} role="status">
            {message} Some numbers may be missing — try again in a moment.
          </p>
        ))}

        <div className="staff-check">
          <section className="staff-check__block" aria-labelledby="owner-check-earned">
            <h2 id="owner-check-earned">Earned</h2>
            <Link className="staff-check__link" href={ownerFinanceHref(monthKey)}>
              <span className="staff-check__figure">
                {hasMoney
                  ? formatMoneySuffix(report.totals.earnedRevenue, currency)
                  : "No stay totals yet"}
              </span>
              <span>
                {report.totals.unearnedRevenue > 0
                  ? `Still to provide ${formatMoneySuffix(report.totals.unearnedRevenue, currency)}`
                  : "Open finance"}
              </span>
            </Link>
          </section>

          <section className="staff-check__block" aria-labelledby="owner-check-open">
            <h2 id="owner-check-open">Still open</h2>
            {openRooms.length === 0 ? (
              <p className="staff-check__quiet">
                Every night still ahead this month is sold.{" "}
                <Link href={`/staff/calendar?month=${monthKey}`}>Open the calendar</Link>
              </p>
            ) : (
              <ul className="staff-check__list">
                {openRooms.map((room) => (
                  <li key={room.roomId}>
                    <Link
                      className="staff-check__link"
                      href={ownerCalendarRoomHref(openRange.fromIso, openRange.toIso, room.roomId)}
                    >
                      <span>{room.roomName}</span>
                      <span>{nightLabel(room.nightsStillOpen)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="staff-check__block" aria-labelledby="owner-check-rate">
            <h2 id="owner-check-rate">Rate</h2>
            {rateRoom ? (
              <>
                <p className="staff-check__rate-name">{rateRoom.roomName}</p>
                <p className="staff-check__meta">
                  Published{" "}
                  {rateRoom.publishedRate === null
                    ? "—"
                    : formatMoneySuffix(rateRoom.publishedRate, currency)}
                  {rateRoom.agreedNightlyRate !== null ? (
                    <>
                      {" "}
                      · Agreed {formatMoneySuffix(rateRoom.agreedNightlyRate, currency)}
                    </>
                  ) : null}
                </p>
                {rateRoom.priceCue ? <p className="staff-check__cue">{rateRoom.priceCue}</p> : null}
                {rateAction ? (
                  <p className="staff-check__action">
                    <Link href={rateAction.href}>{rateAction.label}</Link>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="staff-check__quiet">
                No room types yet. <Link href="/staff/settings/rooms">Add rooms in Settings</Link>
              </p>
            )}
          </section>

          <section className="staff-check__block" aria-labelledby="owner-check-payments">
            <h2 id="owner-check-payments">Payments</h2>
            {report.attention.length === 0 ? (
              <p className="staff-check__quiet">
                Nothing to collect for nights already stayed, and no refund is waiting to be sent.
              </p>
            ) : (
              <ul className="staff-check__list">
                {report.attention.map((item) => (
                  <li key={`${item.kind}-${item.bookingId}`}>
                    <Link className="staff-check__link" href={ownerBookingHref(item.bookingId)}>
                      <span>{ownerAttentionLabel(item)}</span>
                      <span>{formatMoneySuffix(item.amount, currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </StaffShell>
  );
}
