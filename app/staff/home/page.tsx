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
import {
  listDeskBills,
  listDeskCountedItems,
  listDeskLaundry,
} from "@/lib/desk-ops-data";
import { headroom } from "@/lib/desk-stock";
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

type PriorityCard = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  attention: boolean;
  rank: number;
};

export default async function StaffHomePage() {
  await requireStaffSessionDetails();

  const todayIso = getPropertyTodayIso();
  const horizonIso = addDaysIso(todayIso, 60);

  const [
    staffBookings,
    staysResult,
    channelsResult,
    unitsResult,
    bills,
    laundry,
    counted,
  ] = await Promise.all([
    getStaffBookingRequests(),
    getConfirmedBookingsOverlappingRange(todayIso, horizonIso),
    getChannelBlocksOverlappingRange(todayIso, horizonIso),
    getStaffRoomUnits(),
    listDeskBills(),
    listDeskLaundry(),
    listDeskCountedItems(),
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

  const openBills = bills.filter((bill) => bill.status === "open").length;
  const openLaundry = laundry.filter(
    (record) => record.status === "sent" || record.status === "incomplete",
  ).length;
  const lowStock = counted.filter(
    (item) => item.active && headroom(item.onHand, item.minimum) <= 0,
  ).length;

  const todayBusy = today.arriving + today.departing + today.inHouse > 0;
  const latestPatch = getLatestStaffPatchNote();

  const priority: PriorityCard[] = [
    {
      key: "transfers",
      eyebrow: "Thai bank",
      title: "Transfers",
      body:
        inbox.total > 0
          ? `${inbox.total} open · ${transferParts.join(" · ") || "review inbox"}`
          : "No open bank items right now",
      href: transfersHref,
      attention: inbox.total > 0,
      rank: inbox.total > 0 ? 0 : 50,
    },
    {
      key: "doors",
      eyebrow: "Rooms",
      title: "Calendar",
      body:
        unassignedCount > 0
          ? `${unassignedCount} stay${unassignedCount === 1 ? "" : "s"} still need a door #`
          : "All upcoming stays have a door number",
      href: calendarHref,
      attention: unassignedCount > 0,
      rank: unassignedCount > 0 ? 1 : 51,
    },
    {
      key: "stock",
      eyebrow: "Desk",
      title: "Stock",
      body:
        lowStock > 0
          ? `${lowStock} item${lowStock === 1 ? "" : "s"} at or below minimum`
          : "Stock is above minimums",
      href: "/staff/stock",
      attention: lowStock > 0,
      rank: lowStock > 0 ? 2 : 52,
    },
    {
      key: "laundry",
      eyebrow: "Desk",
      title: "Laundry",
      body:
        openLaundry > 0
          ? `${openLaundry} slip${openLaundry === 1 ? "" : "s"} still out`
          : "No open laundry slips",
      href: "/staff/laundry",
      attention: openLaundry > 0,
      rank: openLaundry > 0 ? 3 : 53,
    },
    {
      key: "bills",
      eyebrow: "Desk",
      title: "Bills",
      body:
        openBills > 0
          ? `${openBills} open tab${openBills === 1 ? "" : "s"} to clear`
          : "No open desk bills",
      href: "/staff/bills",
      attention: openBills > 0,
      rank: openBills > 0 ? 4 : 54,
    },
    {
      key: "today",
      eyebrow: "Today",
      title: "At a glance",
      body: todayBusy
        ? `${today.arriving} in · ${today.departing} out · ${today.inHouse} in-house`
        : "No arrivals, departures, or guests in-house today",
      href: todayHref,
      attention: false,
      rank: 40,
    },
  ].sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));

  const attentionCards = priority.filter((card) => card.attention).slice(0, 3);
  const remainingCards = priority.filter(
    (card) => !attentionCards.some((attention) => attention.key === card.key),
  );

  return (
    <StaffShell current="home">
      <section className="staff-main staff-main--home" aria-labelledby="staff-home-title">
        <header className="staff-home__header">
          <h1 id="staff-home-title">Home</h1>
          <p>Priority work first, then the quieter desk and stay tools.</p>
        </header>

        <div className="staff-home-grid">
          {(attentionCards.length ? attentionCards : priority.slice(0, 3)).map((card) => (
            <Link
              className={`staff-home-card${
                card.attention ? " staff-home-card--attention" : ""
              }`}
              href={card.href}
              key={card.key}
            >
              <span className="staff-home-card__eyebrow">{card.eyebrow}</span>
              <strong>{card.title}</strong>
              <p>{card.body}</p>
            </Link>
          ))}
        </div>

        <div className="staff-home-links">
          {remainingCards.map((card) => (
            <Link className="staff-home-link" href={card.href} key={card.key}>
              <strong>{card.title}</strong>
              <span>{card.body}</span>
            </Link>
          ))}
          <Link className="staff-home-link" href="/staff/reservations">
            <strong>Reservations</strong>
            <span>Find a stay by name, door, or dates</span>
          </Link>
          <Link className="staff-home-link" href="/staff/sold">
            <strong>Finance</strong>
            <span>Month accounts. Refunds to send are on Transfers.</span>
          </Link>
          <Link className="staff-home-link" href="/staff/items">
            <strong>Menu items</strong>
            <span>Prices, recipes, and room extras</span>
          </Link>
          <Link className="staff-home-link" href="/staff/portal/login?portal=bills">
            <strong>Bills portal</strong>
            <span>Desk-only login for bills</span>
          </Link>
          <Link className="staff-home-link" href="/staff/portal/login?portal=laundry">
            <strong>Laundry portal</strong>
            <span>Sheets-only laundry login</span>
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
