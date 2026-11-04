import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import {
  getStaffBookingRequests,
  openRequestsHref,
  summarizeOpenRequests,
} from "@/lib/booking-requests";
import { requireStaffSessionDetails } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function StaffHomePage() {
  await requireStaffSessionDetails();
  const staffBookings = await getStaffBookingRequests();
  const inbox = summarizeOpenRequests(staffBookings.bookings);
  const transfersHref = openRequestsHref(inbox);

  return (
    <StaffShell current="home">
      <section className="staff-main" aria-labelledby="staff-home-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-home-title">Home</h1>
            <p className="staff-home__lede">
              Prototype overview — shortcuts for today. We will flesh this out
              later.
            </p>
          </div>
        </div>

        <div className="staff-home-grid">
          <Link className="staff-home-card" href={transfersHref}>
            <span className="staff-home-card__eyebrow">Thai bank</span>
            <strong>Transfers</strong>
            <p>
              {inbox.total > 0
                ? `${inbox.total} open item${inbox.total === 1 ? "" : "s"} to check`
                : "No open bank items right now"}
            </p>
          </Link>

          <Link className="staff-home-card" href="/staff/calendar">
            <span className="staff-home-card__eyebrow">Rooms</span>
            <strong>Calendar</strong>
            <p>Stays, doors, and walk-ins.</p>
          </Link>

          <Link className="staff-home-card" href="/staff/reservations">
            <span className="staff-home-card__eyebrow">History</span>
            <strong>Reservations</strong>
            <p>Past and upcoming booking list.</p>
          </Link>

          <Link className="staff-home-card" href="/staff/sold">
            <span className="staff-home-card__eyebrow">Money</span>
            <strong>Finance</strong>
            <p>Collected, unpaid, and refunds to send.</p>
          </Link>

          <div className="staff-home-card staff-home-card--muted" aria-disabled="true">
            <span className="staff-home-card__eyebrow">Later</span>
            <strong>Today at a glance</strong>
            <p>Arrivals, departures, and open tasks — coming in a later pass.</p>
          </div>
        </div>
      </section>
    </StaffShell>
  );
}
