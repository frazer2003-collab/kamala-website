import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import { getPropertyTodayIso } from "@/lib/calendar";
import {
  getConfirmedBookingsOverlappingRange,
  getStaffBookingRequests,
  openRequestsDetailParts,
  openRequestsHref,
  summarizeOpenRequests,
} from "@/lib/booking-requests";
import { getChannelBlocksOverlappingRange } from "@/lib/room-blocks";
import { getKnownUnitIdSet, getStaffRoomUnits } from "@/lib/room-units";
import { requireStaffSessionDetails } from "@/lib/staff-auth";
import {
  countUnassignedDoors,
  staffHomeTodayHref,
  staffHomeUnassignedHref,
  summarizeStaffHomeToday,
} from "@/lib/staff-home";
import {
  formatStaffPatchDate,
  getLatestStaffPatchNote,
} from "@/lib/staff-patch-notes";

export const dynamic = "force-dynamic";

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function StaffHomePage() {
  await requireStaffSessionDetails();

  const todayIso = getPropertyTodayIso();
  const horizonIso = addDaysIso(todayIso, 60);

  const [staffBookings, staysResult, channelsResult, unitsResult] =
    await Promise.all([
      getStaffBookingRequests(),
      getConfirmedBookingsOverlappingRange(todayIso, horizonIso),
      getChannelBlocksOverlappingRange(todayIso, horizonIso),
      getStaffRoomUnits(),
    ]);

  const inbox = summarizeOpenRequests(staffBookings.bookings);
  const transfersHref = openRequestsHref(inbox);
  const transferParts = openRequestsDetailParts(inbox);

  const today = summarizeStaffHomeToday({
    bookings: staysResult.bookings,
    channelStays: channelsResult.blocks,
    todayIso,
  });
  const todayHref = staffHomeTodayHref(todayIso);

  const knownUnitIds = getKnownUnitIdSet(unitsResult.units);
  const unassignedCount = countUnassignedDoors({
    bookings: staysResult.bookings,
    channelStays: channelsResult.blocks,
    knownUnitIds,
    todayIso,
  });
  const calendarHref = staffHomeUnassignedHref(todayIso);

  const todayBusy =
    today.arriving + today.departing + today.inHouse > 0;
  const latestPatch = getLatestStaffPatchNote();

  return (
    <StaffShell current="home">
      <section className="staff-main staff-main--home" aria-labelledby="staff-home-title">
        <header className="staff-home__header">
          <h1 id="staff-home-title">Home</h1>
          <p>Transfers first, then rooms.</p>
        </header>

        <div className="staff-home-grid">
          <Link
            className={`staff-home-card${
              inbox.total > 0 ? " staff-home-card--attention" : ""
            }`}
            href={transfersHref}
          >
            <span className="staff-home-card__eyebrow">Thai bank</span>
            <strong>Transfers</strong>
            <p>
              {inbox.total > 0
                ? `${inbox.total} open · ${transferParts.join(" · ") || "review inbox"}`
                : "No open bank items right now"}
            </p>
          </Link>

          <Link className="staff-home-card" href={todayHref}>
            <span className="staff-home-card__eyebrow">Today</span>
            <strong>At a glance</strong>
            <p>
              {todayBusy
                ? `${today.arriving} in · ${today.departing} out · ${today.inHouse} in-house`
                : "No arrivals, departures, or guests in-house today"}
            </p>
          </Link>

          <Link
            className={`staff-home-card${
              unassignedCount > 0 ? " staff-home-card--attention" : ""
            }`}
            href={calendarHref}
          >
            <span className="staff-home-card__eyebrow">Rooms</span>
            <strong>Calendar</strong>
            <p>
              {unassignedCount > 0
                ? `${unassignedCount} stay${unassignedCount === 1 ? "" : "s"} still need a door #`
                : "All upcoming stays have a door number"}
            </p>
          </Link>
        </div>

        <div className="staff-home-links">
          <Link className="staff-home-link" href="/staff/reservations">
            <strong>Reservations</strong>
            <span>Find a stay by name, door, or dates</span>
          </Link>
          <Link className="staff-home-link" href="/staff/sold">
            <strong>Finance</strong>
            <span>Month accounts. Refunds to send are on Transfers.</span>
          </Link>
        </div>

        {latestPatch ? (
          <Link className="staff-home-patch" href="/staff/home/patch-notes">
            <div className="staff-home-patch__copy">
              <span className="staff-home-card__eyebrow">
                Patch notes · {formatStaffPatchDate(latestPatch.date)}
              </span>
              <strong>{latestPatch.title}</strong>
              <p>{latestPatch.summary}</p>
            </div>
            <span className="staff-home-patch__action">Full list</span>
          </Link>
        ) : null}
      </section>
    </StaffShell>
  );
}
