import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import { getBookingsForDateRange } from "@/lib/booking-requests";
import { BOOKING_SOURCE_LABELS, BOOKING_SOURCES } from "@/lib/booking-source";
import { getTodayIso } from "@/lib/calendar";
import { getPropertySettings } from "@/lib/property-settings";
import { getChannelReservationsForRange } from "@/lib/room-blocks";
import { purgeUnassignedJuly2026Stays } from "@/lib/purge-unassigned-july";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  buildReservationRows,
  countLedgerStatuses,
  filterReservationRows,
  ledgerFilterLabel,
  ledgerStatusLabel,
  nextReservationsSortDir,
  parseReservationsDateRange,
  parseReservationsLedgerFilter,
  parseReservationsPayFilter,
  parseReservationsQuery,
  parseReservationsRoomFilter,
  parseReservationsSort,
  parseReservationsSortDir,
  parseReservationsSource,
  reservationsListHref,
  sortReservationRows,
  type ReservationsLedgerFilter,
  type ReservationsPayFilter,
  type ReservationsSortKey,
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

const PAY_FILTERS = [
  "all",
  "Paid",
  "Unpaid",
  "No charge",
  "No price",
  "Transfer to verify",
] as const satisfies readonly ReservationsPayFilter[];

const SORT_COLUMNS: { key: ReservationsSortKey; label: string }[] = [
  { key: "guest", label: "Guest" },
  { key: "stay", label: "Stay" },
  { key: "booked", label: "Booked" },
  { key: "room", label: "Room" },
  { key: "source", label: "Source" },
  { key: "payment", label: "Payment" },
  { key: "status", label: "Status" },
];

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
    q?: string;
    room?: string;
    pay?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  await requireStaffSession();

  const params = await searchParams;
  const { fromIso, toIso } = parseReservationsDateRange(params);
  const ledger = parseReservationsLedgerFilter(params.ledger);
  const source = parseReservationsSource(params.source);
  const query = parseReservationsQuery(params.q);
  const room = parseReservationsRoomFilter(params.room);
  const pay = parseReservationsPayFilter(params.pay);
  const sort = parseReservationsSort(params.sort);
  const dir = parseReservationsSortDir(params.dir);
  const todayIso = getTodayIso();
  const rangeLabel = formatRangeLabel(fromIso, toIso);

  const purgeJulyPromise = purgeUnassignedJuly2026Stays();

  const [bookingsResult, channelsResult, roomUnitsResult, settings, supabaseReady] =
    await Promise.all([
      getBookingsForDateRange(fromIso, toIso),
      getChannelReservationsForRange(fromIso, toIso),
      getStaffRoomUnits(),
      getPropertySettings(),
      Promise.resolve(hasStaffSupabaseConfig()),
    ]);
  await purgeJulyPromise;

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
  const matchedRows = filterReservationRows(allRows, {
    ledger: "all",
    query,
    room,
    pay,
    todayIso,
  });
  const counts = countLedgerStatuses(matchedRows);
  const visibleRows = sortReservationRows(
    filterReservationRows(matchedRows, { ledger, source, todayIso }),
    sort,
    dir,
  );

  const roomOptions = Array.from(
    new Set(allRows.map((row) => row.sublabel).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const warnings = [bookingsResult.error, channelsResult.error].filter(
    (message): message is string => Boolean(message),
  );

  const filterBase = {
    from: fromIso,
    to: toIso,
    ledger,
    source,
    query,
    room,
    pay,
    sort,
    dir,
  };
  const showingToday = fromIso === todayIso && toIso === todayIso;

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
              Stays that occupy a night in these dates, including guests who
              arrived earlier. Sort any column, filter room or payment, and open
              a stay on the calendar.
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
                <div className="field-pair staff-reservations__query">
                  <label htmlFor="reservations-q">Find</label>
                  <input
                    autoComplete="off"
                    defaultValue={query}
                    id="reservations-q"
                    name="q"
                    placeholder="Name, door, or phone"
                    type="search"
                  />
                </div>
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
                <div className="field-pair">
                  <label htmlFor="reservations-room">Room</label>
                  <select defaultValue={room} id="reservations-room" name="room">
                    <option value="">All rooms</option>
                    {roomOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-pair">
                  <label htmlFor="reservations-pay">Payment</label>
                  <select
                    defaultValue={pay === "all" ? "" : pay}
                    id="reservations-pay"
                    name="pay"
                  >
                    {PAY_FILTERS.map((option) => (
                      <option key={option} value={option === "all" ? "" : option}>
                        {option === "all" ? "All payments" : option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {ledger !== "all" ? (
                <input name="ledger" type="hidden" value={ledger} />
              ) : null}
              {source !== "all" ? (
                <input name="source" type="hidden" value={source} />
              ) : null}
              {sort !== "stay" ? <input name="sort" type="hidden" value={sort} /> : null}
              {dir !== "asc" ? <input name="dir" type="hidden" value={dir} /> : null}
              <button className="button button--primary" type="submit">
                Search
              </button>
            </form>

            <p className="staff-reservations__range-label" aria-live="polite">
              <span>
                Showing <strong>{visibleRows.length}</strong> of {matchedRows.length}{" "}
                stays, {rangeLabel}
                {query ? ` matching "${query}"` : ""}
                {room ? ` in ${room}` : ""}
                {pay !== "all" ? ` · ${pay}` : ""}
              </span>
              {showingToday ? null : (
                <Link
                  href={reservationsListHref({
                    from: todayIso,
                    to: todayIso,
                    query,
                    room,
                    pay,
                    sort,
                    dir,
                  })}
                >
                  In house today
                </Link>
              )}
            </p>

            {warnings.map((message) => (
              <p
                className="form-message form-message--warning"
                key={message}
                role="status"
              >
                {message} Some stays may be missing. Try again in a moment.
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
                No stays in this range
                {query ? ` matching "${query}"` : ""}.{" "}
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
                      {SORT_COLUMNS.map((column) => {
                        const active = sort === column.key;
                        const nextDir = nextReservationsSortDir(sort, dir, column.key);
                        return (
                          <th
                            aria-sort={
                              active
                                ? dir === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            key={column.key}
                            scope="col"
                          >
                            <Link
                              className={[
                                "staff-reservations__sort",
                                active ? "staff-reservations__sort--active" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              href={reservationsListHref({
                                ...filterBase,
                                sort: column.key,
                                dir: nextDir,
                              })}
                            >
                              <span>{column.label}</span>
                              <span aria-hidden="true" className="staff-reservations__sort-mark">
                                {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
                              </span>
                            </Link>
                          </th>
                        );
                      })}
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
                        <td data-label="Guest">
                          <Link className="staff-reservations__guest" href={row.href}>
                            {row.label}
                          </Link>
                          {row.phone ? (
                            <span className="staff-reservations__meta">{row.phone}</span>
                          ) : null}
                        </td>
                        <td data-label="Stay">
                          <span className="staff-reservations__stay">
                            {row.checkInLabel} to {row.checkOutLabel}
                          </span>
                          <span className="staff-reservations__meta">
                            {row.nights} {row.nights === 1 ? "night" : "nights"}
                          </span>
                        </td>
                        <td data-label="Booked">
                          {row.bookedLabel ? (
                            <span className="staff-reservations__stay">{row.bookedLabel}</span>
                          ) : (
                            <span className="staff-reservations__meta">—</span>
                          )}
                        </td>
                        <td data-label="Room">
                          <span>{row.sublabel}</span>
                          {row.doorLabel ? (
                            <span className="staff-reservations__door">{row.doorLabel}</span>
                          ) : row.needsRoom ? (
                            <span className="staff-reservations__door staff-reservations__door--missing">
                              Needs room #
                            </span>
                          ) : null}
                        </td>
                        <td data-label="Source">{row.sourceLabel}</td>
                        <td data-label="Payment">
                          {row.moneyLabel ? (
                            <span className="staff-reservations__money">{row.moneyLabel}</span>
                          ) : null}
                          <span className="staff-reservations__meta">{row.payLabel}</span>
                        </td>
                        <td data-label="Status">
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
