import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import {
  formatCalendarMonth,
  formatCalendarMonthLabel,
  parseCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/calendar";
import { getConfirmedBookings } from "@/lib/booking-requests";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffCalendarBlocks } from "@/lib/room-blocks";
import { getStaffRooms } from "@/lib/rooms";
import {
  attachRoomNumbers,
  getKnownUnitIdSet,
  getStaffRoomUnits,
} from "@/lib/room-units";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  buildReservationRows,
  countReservationSignals,
  filterReservationRows,
  parseReservationsAttention,
  parseReservationsKind,
  parseReservationsPayment,
  parseReservationsSource,
  reservationsListHref,
  reservationsMonthSelection,
  sortReservationRows,
  type ReservationsAttention,
  type ReservationsKindFilter,
  type ReservationsPaymentFilter,
} from "@/lib/staff-reservations";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import { BOOKING_SOURCE_LABELS, BOOKING_SOURCES } from "@/lib/booking-source";
import "@/app/staff-reservations.css";

export const dynamic = "force-dynamic";

function signalLabel(attention: ReservationsAttention, count: number) {
  switch (attention) {
    case "needs":
      return `Needs attention · ${count}`;
    case "unpaid":
      return `Unpaid · ${count}`;
    case "no-door":
      return `No door # · ${count}`;
    case "closed":
      return `Closed · ${count}`;
    case "all":
      return `All · ${count}`;
  }
}

export default async function StaffReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    attention?: string;
    kind?: string;
    payment?: string;
    source?: string;
  }>;
}) {
  await requireStaffSession();

  const params = await searchParams;
  const { year, month } = parseCalendarMonth(params.month);
  const monthKey = formatCalendarMonth(year, month);
  const monthLabel = formatCalendarMonthLabel(year, month);
  const prev = shiftCalendarMonth(year, month, -1);
  const next = shiftCalendarMonth(year, month, 1);
  const prevKey = formatCalendarMonth(prev.year, prev.month);
  const nextKey = formatCalendarMonth(next.year, next.month);
  const prevLabel = formatCalendarMonthLabel(prev.year, prev.month);
  const nextLabel = formatCalendarMonthLabel(next.year, next.month);
  const selection = reservationsMonthSelection(monthKey);

  const attention = parseReservationsAttention(params.attention);
  const kind = parseReservationsKind(params.kind);
  const payment = parseReservationsPayment(params.payment);
  const source = parseReservationsSource(params.source);

  const [bookingsResult, blocksResult, rooms, roomUnitsResult, settings, supabaseReady] =
    await Promise.all([
      getConfirmedBookings({ year, month }),
      getStaffCalendarBlocks({ year, month }),
      getStaffRooms(),
      getStaffRoomUnits(),
      getPropertySettings(),
      Promise.resolve(hasStaffSupabaseConfig()),
    ]);

  const knownUnitIds = getKnownUnitIdSet(roomUnitsResult.units);
  const bookings = attachRoomNumbers(bookingsResult.bookings, roomUnitsResult.units);
  const monthBlocks = attachRoomNumbers(blocksResult.monthBlocks, roomUnitsResult.units);

  const allRows = buildReservationRows({
    bookings,
    blocks: monthBlocks,
    knownUnitIds,
    monthKey,
    fromIso: selection.fromIso,
    toIso: selection.toIso,
    currency: settings.currency,
    roomShortNameById: new Map(rooms.map((room) => [room.id, room.shortName])),
  });
  const signals = countReservationSignals(allRows);
  const visibleRows = sortReservationRows(
    filterReservationRows(allRows, { attention, kind, payment, source }),
  );

  const warnings = [bookingsResult.error, blocksResult.error].filter(
    (message): message is string => Boolean(message),
  );

  const filterBase = {
    month: monthKey,
    attention,
    kind,
    payment,
    source,
  };

  return (
    <StaffShell current="reservations">
      <section
        className="staff-main staff-main--reservations"
        aria-labelledby="staff-reservations-title"
      >
        <div className="staff-header staff-header--compact staff-reservations__header">
          <div className="staff-reservations__intro">
            <h1 id="staff-reservations-title">Reservations</h1>
            <p>
              Scan stays and closures for this month. Open a row on the calendar.
            </p>
          </div>
          <nav className="staff-reservations__month" aria-label="Choose month">
            <Link
              aria-label={`Previous month, ${prevLabel}`}
              className="button button--quiet staff-reservations__month-btn"
              href={reservationsListHref({ ...filterBase, month: prevKey })}
            >
              <span aria-hidden="true">‹</span>
              <span className="staff-reservations__month-btn-text">{prevLabel}</span>
            </Link>
            <p className="staff-reservations__month-label" aria-live="polite">
              {monthLabel}
            </p>
            <Link
              aria-label={`Next month, ${nextLabel}`}
              className="button button--quiet staff-reservations__month-btn"
              href={reservationsListHref({ ...filterBase, month: nextKey })}
            >
              <span className="staff-reservations__month-btn-text">{nextLabel}</span>
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
                {message} Some stays may be missing — try again in a moment.
              </p>
            ))}

            <div
              className="staff-reservations__signals"
              aria-label="Attention filters"
              role="group"
            >
              {(
                [
                  ["needs", signals.needsAttention],
                  ["unpaid", signals.unpaid],
                  ["no-door", signals.noDoor],
                  ["closed", signals.closed],
                  ["all", signals.total],
                ] as const
              ).map(([key, count]) => (
                <Link
                  aria-current={attention === key ? "true" : undefined}
                  className={[
                    "staff-reservations__signal",
                    attention === key ? "staff-reservations__signal--active" : "",
                    key === "needs" && count > 0
                      ? "staff-reservations__signal--urgent"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  href={reservationsListHref({ ...filterBase, attention: key })}
                  key={key}
                >
                  {signalLabel(key, count)}
                </Link>
              ))}
            </div>

            <div className="staff-reservations__filters">
              <div className="booking-list__filters" aria-label="Booking type">
                {(
                  [
                    ["all", "All kinds"],
                    ["website", "Website"],
                    ["channel", "Channel"],
                    ["closure", "Closed"],
                  ] as const
                ).map(([value, label]) => (
                  <Link
                    aria-current={kind === value ? "true" : undefined}
                    className={[
                      "booking-list__filter",
                      kind === value ? "booking-list__filter--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    href={reservationsListHref({
                      ...filterBase,
                      kind: value as ReservationsKindFilter,
                    })}
                    key={value}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="booking-list__filters" aria-label="Payment">
                {(
                  [
                    ["all", "Any payment"],
                    ["unpaid", "Unpaid / hold"],
                    ["paid", "Paid"],
                  ] as const
                ).map(([value, label]) => (
                  <Link
                    aria-current={payment === value ? "true" : undefined}
                    className={[
                      "booking-list__filter",
                      payment === value ? "booking-list__filter--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    href={reservationsListHref({
                      ...filterBase,
                      payment: value as ReservationsPaymentFilter,
                    })}
                    key={value}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="booking-list__filters" aria-label="Source">
                <Link
                  aria-current={source === "all" ? "true" : undefined}
                  className={[
                    "booking-list__filter",
                    source === "all" ? "booking-list__filter--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  href={reservationsListHref({ ...filterBase, source: "all" })}
                >
                  Any source
                </Link>
                <Link
                  aria-current={source === "website" ? "true" : undefined}
                  className={[
                    "booking-list__filter",
                    source === "website" ? "booking-list__filter--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  href={reservationsListHref({
                    ...filterBase,
                    source: "website",
                  })}
                >
                  Website
                </Link>
                {BOOKING_SOURCES.map((value) => (
                  <Link
                    aria-current={source === value ? "true" : undefined}
                    className={[
                      "booking-list__filter",
                      source === value ? "booking-list__filter--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    href={reservationsListHref({ ...filterBase, source: value })}
                    key={value}
                  >
                    {BOOKING_SOURCE_LABELS[value]}
                  </Link>
                ))}
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <p className="staff-empty-state" role="status">
                Nothing in this filter for {monthLabel}.{" "}
                <Link href={reservationsListHref({ month: monthKey, attention: "all" })}>
                  Show all
                </Link>
                .
              </p>
            ) : (
              <ul className="staff-reservations__list" aria-label="Reservations">
                {visibleRows.map((row) => {
                  return (
                    <li
                      className={[
                        "staff-reservations__row",
                        reservationNeedsAttentionClass(row.isHold, row.needsRoom),
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={`${row.kind}-${row.id}`}
                    >
                      <Link className="staff-reservations__row-link" href={row.href}>
                        <span className="staff-reservations__row-main">
                          <strong>{row.label}</strong>
                          <span className="staff-reservations__row-meta">
                            {row.datesLabel}
                            <span aria-hidden="true"> · </span>
                            {row.sublabel}
                            {row.doorLabel ? (
                              <>
                                <span aria-hidden="true"> · </span>
                                {row.doorLabel}
                              </>
                            ) : row.needsRoom ? (
                              <>
                                <span aria-hidden="true"> · </span>
                                Needs room #
                              </>
                            ) : null}
                          </span>
                        </span>
                        <span className="staff-reservations__row-side">
                          <span className="staff-reservations__kind">{row.kindLabel}</span>
                          <span
                            className={[
                              "staff-status",
                              row.isHold ? "staff-status--pending_payment" : "",
                              row.kind === "closure" ? "staff-status--declined" : "",
                              row.kind === "channel" ? "staff-status--channel" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <span>{row.statusLabel}</span>
                          </span>
                          {row.sourceLabel && row.kind !== "closure" ? (
                            <span className="staff-reservations__source">
                              {row.sourceLabel}
                            </span>
                          ) : null}
                          {row.moneyLabel ? (
                            <span className="staff-reservations__money">
                              {row.moneyLabel}
                            </span>
                          ) : null}
                          <span className="staff-reservations__open">Open on calendar</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </StaffShell>
  );
}

function reservationNeedsAttentionClass(isHold: boolean, needsRoom: boolean) {
  if (isHold || needsRoom) {
    return "staff-reservations__row--urgent";
  }
  return "";
}
