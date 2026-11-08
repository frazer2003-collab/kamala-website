import Link from "next/link";
import { StaffDeskRangeBand } from "@/components/staff-desk-range-band";
import { StaffDeskReservations } from "@/components/staff-desk-reservations";
import { StaffShell } from "@/components/staff-shell";
import {
  getBookingsBookedInDateRange,
  getBookingsForDateRange,
} from "@/lib/booking-requests";
import { parseDeskListRange } from "@/lib/desk-range";
import { getPropertySettings } from "@/lib/property-settings";
import {
  getChannelReservationsBookedInRange,
  getChannelReservationsForRange,
} from "@/lib/room-blocks";
import {
  attachRoomNumbers,
  getKnownUnitIdSet,
  getStaffRoomUnits,
} from "@/lib/room-units";
import { requireStaffSession } from "@/lib/staff-auth";
import { staffT } from "@/lib/staff-i18n";
import { getStaffLocale } from "@/lib/staff-locale-server";
import {
  buildReservationRows,
  countLedgerStatuses,
  filterReservationRows,
  parseReservationsDateMode,
  parseReservationsLedgerFilter,
  parseReservationsPayFilter,
  parseReservationsQuery,
  parseReservationsRoomFilter,
  parseReservationsSort,
  parseReservationsSortDir,
  parseReservationsSource,
  reservationsListHref,
  sortReservationRows,
} from "@/lib/staff-reservations";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    month?: string;
    view?: string;
    by?: string;
    ledger?: string;
    source?: string;
    q?: string;
    room?: string;
    pay?: string;
    sort?: string;
    dir?: string;
    open?: string;
  }>;
}) {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const params = await searchParams;
  const { fromIso, toIso, monthKey, todayIso } = parseDeskListRange(params);
  const dateMode = parseReservationsDateMode(params.by);
  const ledger = parseReservationsLedgerFilter(params.ledger);
  const source = parseReservationsSource(params.source);
  const query = parseReservationsQuery(params.q);
  const room = parseReservationsRoomFilter(params.room);
  const pay = parseReservationsPayFilter(params.pay);
  const sort = parseReservationsSort(params.sort);
  const dir = parseReservationsSortDir(params.dir, sort);

  const loadBookings =
    dateMode === "booked" ? getBookingsBookedInDateRange : getBookingsForDateRange;
  const loadChannels =
    dateMode === "booked"
      ? getChannelReservationsBookedInRange
      : getChannelReservationsForRange;

  const [bookingsResult, channelsResult, roomUnitsResult, settings, supabaseReady] =
    await Promise.all([
      loadBookings(fromIso, toIso),
      loadChannels(fromIso, toIso),
      getStaffRoomUnits(),
      getPropertySettings(),
      Promise.resolve(hasStaffSupabaseConfig()),
    ]);

  const knownUnitIds = getKnownUnitIdSet(roomUnitsResult.units);
  const bookings = attachRoomNumbers(
    bookingsResult.bookings,
    roomUnitsResult.units,
  );
  const channelBlocks = attachRoomNumbers(
    channelsResult.blocks,
    roomUnitsResult.units,
  );

  const allRows = buildReservationRows({
    bookings,
    blocks: channelBlocks,
    knownUnitIds,
    fromIso,
    toIso,
    currency: settings.currency,
    todayIso,
    dateMode,
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
    dateMode,
    ledger,
    source,
    query,
    room,
    pay,
    sort,
    dir,
  };
  const returnTo = reservationsListHref(filterBase);
  const rangeExtra =
    dateMode === "booked"
      ? {
          by: "booked",
          ...(ledger !== "all" ? { ledger } : {}),
          ...(source !== "all" ? { source } : {}),
          ...(query ? { q: query } : {}),
          ...(room ? { room } : {}),
          ...(pay !== "all" ? { pay } : {}),
          ...(sort !== "booked" ? { sort } : {}),
          ...(dir !== "desc" || sort !== "booked" ? { dir } : {}),
        }
      : {
          ...(ledger !== "all" ? { ledger } : {}),
          ...(source !== "all" ? { source } : {}),
          ...(query ? { q: query } : {}),
          ...(room ? { room } : {}),
          ...(pay !== "all" ? { pay } : {}),
          ...(sort !== "booked" ? { sort } : {}),
          ...(dir !== "desc" || sort !== "booked" ? { dir } : {}),
        };

  return (
    <StaffShell current="reservations">
      <section
        className="staff-main staff-desk staff-desk--fill"
        aria-labelledby="desk-reservations-title"
      >
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-reservations-title">
              {staffT(locale, "reservations.title")}
            </h1>
          </div>
        </header>

        <div
          className="staff-desk__filter-row"
          aria-label={staffT(locale, "reservations.dateMode")}
          role="group"
        >
          <Link
            aria-current={dateMode === "stay" ? "true" : undefined}
            className={[
              "staff-desk__chip",
              dateMode === "stay" ? "staff-desk__chip--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={reservationsListHref({ ...filterBase, dateMode: "stay" })}
            prefetch={false}
          >
            {staffT(locale, "reservations.byStay")}
          </Link>
          <Link
            aria-current={dateMode === "booked" ? "true" : undefined}
            className={[
              "staff-desk__chip",
              dateMode === "booked" ? "staff-desk__chip--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={reservationsListHref({ ...filterBase, dateMode: "booked" })}
            prefetch={false}
          >
            {staffT(locale, "reservations.byBooked")}
          </Link>
        </div>

        <StaffDeskRangeBand
          extraParams={rangeExtra}
          fromIso={fromIso}
          locale={locale}
          monthKey={monthKey}
          pathname="/staff/reservations"
          toIso={toIso}
          todayIso={todayIso}
        />

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Booking data isn’t connected yet. Finish Supabase setup, then reload
            this page.
          </p>
        ) : (
          <StaffDeskReservations
            counts={counts}
            filterBase={filterBase}
            initialOpenId={params.open ?? null}
            matchedCount={matchedRows.length}
            returnTo={returnTo}
            roomOptions={roomOptions}
            rows={visibleRows}
            warnings={warnings}
          />
        )}
      </section>
    </StaffShell>
  );
}
