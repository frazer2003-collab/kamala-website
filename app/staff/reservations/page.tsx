import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import { getBookingsForDateRange } from "@/lib/booking-requests";
import { BOOKING_SOURCE_LABELS, BOOKING_SOURCES } from "@/lib/booking-source";
import { getTodayIso } from "@/lib/calendar";
import { getPropertySettings } from "@/lib/property-settings";
import {
  getChannelReservationsForRange,
  purgeIcalSyncedChannelBlocks,
} from "@/lib/room-blocks";
import { purgeUnassignedJuly2026Stays } from "@/lib/purge-unassigned-july";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  buildReservationRows,
  countLedgerStatuses,
  filterReservationRows,
  ledgerFilterLabel,
  ledgerStatusLabel,
  parseReservationsDateRange,
  parseReservationsLedgerFilter,
  parseReservationsSource,
  reservationsListHref,
  sortReservationRows,
  type ReservationsLedgerFilter,
} from "@/lib/staff-reservations";
import {
  attachRoomNumbers,
  getKnownUnitIdSet,
  getStaffRoomUnits,
} from "@/lib/room-units";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-reservations.css";

export const dynamic = "force-dynamic";

const LEDGER_FILTERS = [
  "all",
  "upcoming",
  "confirmed",
  "pending",
  "completed",
  "cancelled",
  "no-show",
] as const satisfies readonly ReservationsLedgerFilter[];

function formatRangeLabel(fromIso: string, toIso: string) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const from = formatter.format(new Date(`${fromIso}T00:00:00`));
  const to = formatter.format(new Date(`${toIso}T00:00:00`));
  return `${from} – ${to}`;
}

export default async function StaffReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    ledger?: string;
    source?: string;
  }>;
}) {
  await requireStaffSession();

  const params = await searchParams;
  const { fromIso, toIso } = parseReservationsDateRange(params);
  const ledger = parseReservationsLedgerFilter(params.ledger);
  const source = parseReservationsSource(params.source);
  const todayIso = getTodayIso();
  const rangeLabel = formatRangeLabel(fromIso, toIso);

  // Promote leftover iCal/OTA room_blocks into booking_requests (Conversation + cancel).
  await purgeIcalSyncedChannelBlocks();
  // Clear leftover No # stays that overlap July 2026.
  await purgeUnassignedJuly2026Stays();

  const [bookingsResult, channelsResult, roomUnitsResult, settings, supabaseReady] =
    await Promise.all([
      getBookingsForDateRange(fromIso, toIso),
      getChannelReservationsForRange(fromIso, toIso),
      getStaffRoomUnits(),
      getPropertySettings(),
      Promise.resolve(hasStaffSupabaseConfig()),
    ]);

  const knownUnitIds = getKnownUnitIdSet(roomUnitsResult.units);
  const bookings = attachRoomNumbers(bookingsResult.bookings, roomUnitsResult.units);
  const channelBlocks = attachRoomNumbers(channelsResult.blocks, roomUnitsResult.units);

  const allRows = buildReservationRows({
    bookings,
    blocks: channelBlocks,
    knownUnitIds,
    fromIso,
    toIso,
    currency: settings.currency,
    todayIso,
  });
  const counts = countLedgerStatuses(allRows);
  const visibleRows = sortReservationRows(
    filterReservationRows(allRows, { ledger, source, todayIso }),
  );

  const warnings = [bookingsResult.error, channelsResult.error].filter(
    (message): message is string => Boolean(message),
  );

  const filterBase = { from: fromIso, to: toIso, ledger, source };

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
              Cross-check bookings against Airbnb and other OTAs. Search a date
              range to list stays with check-in in that period, then filter by
              status or channel.
            </p>
          </div>
        </div>

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Booking data isn’t connected yet. Finish Supabase setup, then reload
            this page.
          </p>
        ) : (
          <>
            <form
              action="/staff/reservations"
              className="staff-reservations__search"
              method="get"
            >
              <div className="staff-reservations__search-fields">
                <div className="field-pair">
                  <label htmlFor="reservations-from">From</label>
                  <input
                    defaultValue={fromIso}
                    id="reservations-from"
                    name="from"
                    required
                    type="date"
                  />
                </div>
                <div className="field-pair">
                  <label htmlFor="reservations-to">To</label>
                  <input
                    defaultValue={toIso}
                    id="reservations-to"
                    name="to"
                    required
                    type="date"
                  />
                </div>
              </div>
              {ledger !== "all" ? (
                <input name="ledger" type="hidden" value={ledger} />
              ) : null}
              {source !== "all" ? (
                <input name="source" type="hidden" value={source} />
              ) : null}
              <button className="button button--primary" type="submit">
                Search
              </button>
            </form>

            <p className="staff-reservations__range-label" aria-live="polite">
              Showing <strong>{visibleRows.length}</strong> of {allRows.length}{" "}
              check-ins · {rangeLabel}
            </p>

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
              aria-label="Reservation status"
              role="group"
            >
              {LEDGER_FILTERS.map((key) => (
                <Link
                  aria-current={ledger === key ? "true" : undefined}
                  className={[
                    "staff-reservations__signal",
                    ledger === key ? "staff-reservations__signal--active" : "",
                    key === "pending" && counts.pending > 0
                      ? "staff-reservations__signal--urgent"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  href={reservationsListHref({ ...filterBase, ledger: key })}
                  key={key}
                >
                  {ledgerFilterLabel(key)} · {counts[key]}
                </Link>
              ))}
            </div>

            <div className="staff-reservations__filters">
              <div className="booking-list__filters" aria-label="Booking source">
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
                  All sources
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
                No reservations in this range and filter.{" "}
                <Link href={reservationsListHref({ from: fromIso, to: toIso })}>
                  Show all
                </Link>
                .
              </p>
            ) : (
              <div className="staff-reservations__table-wrap">
                <table className="staff-reservations__table">
                  <caption className="sr-only">
                    Reservations from {rangeLabel}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Status</th>
                      <th scope="col">Guest</th>
                      <th scope="col">Check-in</th>
                      <th scope="col">Checkout</th>
                      <th scope="col">Room</th>
                      <th scope="col">Source</th>
                      <th scope="col">Total</th>
                      <th scope="col">
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr
                        className={
                          row.needsRoom ? "staff-reservations__row--urgent" : undefined
                        }
                        key={`${row.kind}-${row.id}`}
                      >
                        <td>
                          <span
                            className={[
                              "staff-reservations__status-pill",
                              `staff-reservations__status-pill--${row.ledgerStatus}`,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {ledgerStatusLabel(row.ledgerStatus)}
                          </span>
                          {row.statusLabel !== ledgerStatusLabel(row.ledgerStatus) ? (
                            <span className="staff-reservations__substatus">
                              {row.statusLabel}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <strong>{row.label}</strong>
                          {row.doorLabel ? (
                            <span className="staff-reservations__door">
                              {row.doorLabel}
                            </span>
                          ) : row.needsRoom ? (
                            <span className="staff-reservations__door staff-reservations__door--missing">
                              Needs room #
                            </span>
                          ) : null}
                        </td>
                        <td>{row.checkInLabel}</td>
                        <td>{row.checkOutLabel}</td>
                        <td>{row.sublabel}</td>
                        <td>{row.sourceLabel}</td>
                        <td>{row.moneyLabel ?? "—"}</td>
                        <td>
                          <Link className="staff-reservations__open" href={row.href}>
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </StaffShell>
  );
}
