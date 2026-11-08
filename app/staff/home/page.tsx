import { StaffHomeBoard } from "@/components/staff-home-board";
import { StaffShell } from "@/components/staff-shell";
import { listStaffMessageThreads } from "@/lib/booking-chat";
import {
  getConfirmedBookingsOverlappingRange,
  getStaffBookingRequests,
} from "@/lib/booking-requests";
import { getPropertyTodayIso } from "@/lib/calendar";
import { listDeskTourSalesInRange } from "@/lib/desk-ops-data";
import { getPropertySettings } from "@/lib/property-settings";
import {
  requireStaffSessionDetails,
  staffCanWriteCalendar,
} from "@/lib/staff-auth";
import {
  homeBankHolds,
  homeDeepCleanDue,
  homeNeedsReply,
  homeTodayMoves,
  homeTourPickups,
} from "@/lib/staff-home-board";
import {
  formatStaffPatchDate,
  getLatestStaffPatchNote,
} from "@/lib/staff-patch-notes";
import Link from "next/link";
import "@/app/staff-ops.css";

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
  const session = await requireStaffSessionDetails();
  const canManage = staffCanWriteCalendar(session);
  const todayIso = getPropertyTodayIso();
  const tourFrom = addDaysIso(todayIso, -1);
  const tourTo = addDaysIso(todayIso, 2);

  const cleanFrom = addDaysIso(todayIso, -30);
  const cleanTo = addDaysIso(todayIso, 1);

  const [
    settings,
    staffBookings,
    staysResult,
    cleanStays,
    tourSales,
    threads,
    latestPatch,
  ] = await Promise.all([
    getPropertySettings(),
    getStaffBookingRequests(),
    getConfirmedBookingsOverlappingRange(todayIso, todayIso),
    getConfirmedBookingsOverlappingRange(cleanFrom, cleanTo),
    listDeskTourSalesInRange(tourFrom, tourTo),
    listStaffMessageThreads(60),
    Promise.resolve(getLatestStaffPatchNote()),
  ]);

  const bankHolds = homeBankHolds(staffBookings.bookings);
  const { arriving, departing } = homeTodayMoves(staysResult.bookings, todayIso);
  const tours = homeTourPickups(tourSales.sales);
  const cleanDue = homeDeepCleanDue(cleanStays.bookings, todayIso);
  const messages = homeNeedsReply(threads);

  return (
    <StaffShell current="home">
      <section className="staff-main staff-home" aria-labelledby="staff-home-title">
        <header className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-home-title">Home</h1>
            <p>Today’s desk board — bank, moves, tours, cleans, and replies.</p>
          </div>
        </header>

        <StaffHomeBoard
          arriving={arriving}
          bankHolds={bankHolds}
          canManage={canManage}
          cleanDue={cleanDue}
          currency={settings.currency}
          departing={departing}
          messages={messages}
          tours={tours}
        />

        {latestPatch ? (
          <Link
            className="staff-home-patch"
            href="/staff/whats-new"
            prefetch={false}
          >
            <span className="staff-home-patch__eyebrow">What’s new</span>
            <strong>{latestPatch.title}</strong>
            <span className="staff-home-patch__meta">
              {formatStaffPatchDate(latestPatch.date)} · {latestPatch.summary}
            </span>
          </Link>
        ) : null}
      </section>
    </StaffShell>
  );
}
