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
import { billTotalSatang } from "@/lib/desk-bills";
import { formatSatang } from "@/lib/desk-money";
import {
  listDeskBills,
  listDeskCountedItems,
  listDeskLaundry,
  listDeskSellables,
} from "@/lib/desk-ops-data";
import { headroom } from "@/lib/desk-stock";
import { getChannelBlocksOverlappingRange } from "@/lib/room-blocks";
import { getKnownUnitIdSet, getStaffRoomUnits } from "@/lib/room-units";
import { requireStaffSessionDetails } from "@/lib/staff-auth";
import {
  homeLowStockItems,
  homeOpenBillItems,
  homeOpenLaundryItems,
  homeTransferAttentionItems,
  homeUnassignedDoorItems,
  type StaffHomeAttentionItem,
} from "@/lib/staff-home-attention";
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

/** Short age label for the oldest open tab’s service date. */
function oldestOpenBillAge(oldestServiceDate: string, todayIso: string): string {
  if (oldestServiceDate >= todayIso) return "oldest today";
  const yesterdayIso = addDaysIso(todayIso, -1);
  if (oldestServiceDate === yesterdayIso) return "oldest yesterday";
  const today = new Date(`${todayIso}T12:00:00`);
  const oldest = new Date(`${oldestServiceDate}T12:00:00`);
  const days = Math.round(
    (today.getTime() - oldest.getTime()) / (24 * 60 * 60 * 1000),
  );
  return days > 1 ? `oldest ${days}d` : "oldest today";
}

type PriorityCard = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  attention: boolean;
  rank: number;
  items?: StaffHomeAttentionItem[];
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
    sellables,
    laundry,
    counted,
  ] = await Promise.all([
    getStaffBookingRequests(),
    getConfirmedBookingsOverlappingRange(todayIso, horizonIso),
    getChannelBlocksOverlappingRange(todayIso, horizonIso),
    getStaffRoomUnits(),
    listDeskBills(),
    listDeskSellables(),
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

  const openBillList = bills.filter((bill) => bill.status === "open");
  const openBills = openBillList.length;
  const openBillsTotalSatang = openBillList.reduce(
    (sum, bill) => sum + billTotalSatang(bill.lines, sellables),
    0,
  );
  const oldestOpenServiceDate = openBillList.reduce<string | null>(
    (oldest, bill) =>
      oldest == null || bill.serviceDate < oldest ? bill.serviceDate : oldest,
    null,
  );
  const openBillsBody =
    openBills > 0 && oldestOpenServiceDate
      ? `${openBills} open · ${formatSatang(openBillsTotalSatang)} · ${oldestOpenBillAge(oldestOpenServiceDate, todayIso)}`
      : "No open desk bills";
  const openLaundryList = laundry.filter(
    (record) => record.status === "sent" || record.status === "incomplete",
  );
  const openLaundry = openLaundryList.length;
  const lowStockList = counted.filter(
    (item) => item.active && headroom(item.onHand, item.minimum) <= 0,
  );
  const lowStock = lowStockList.length;

  const todayBusy = today.arriving + today.departing + today.inHouse > 0;
  const latestPatch = getLatestStaffPatchNote();

  const transferItems = homeTransferAttentionItems(staffBookings.bookings);
  const doorItems = homeUnassignedDoorItems({
    bookings: staysResult.bookings,
    channelStays: channelsResult.blocks,
    knownUnitIds,
    todayIso,
  });
  const stockItems = homeLowStockItems(counted);
  const laundryItems = homeOpenLaundryItems(laundry);
  const billItems = homeOpenBillItems(bills, sellables);

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
      items: transferItems,
    },
    {
      key: "doors",
      eyebrow: "Rooms",
      title: "Doors",
      body:
        unassignedCount > 0
          ? `${unassignedCount} stay${unassignedCount === 1 ? "" : "s"} still need a door #`
          : "All upcoming stays have a door number",
      href: calendarHref,
      attention: unassignedCount > 0,
      rank: unassignedCount > 0 ? 1 : 51,
      items: doorItems,
    },
    {
      key: "stock",
      eyebrow: "Desk",
      title: "Stock",
      body:
        lowStock > 0
          ? `${lowStock} item${lowStock === 1 ? "" : "s"} at or below minimum`
          : "Stock is above minimums",
      href: "/staff/items",
      attention: lowStock > 0,
      rank: lowStock > 0 ? 2 : 52,
      items: stockItems,
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
      items: laundryItems,
    },
    {
      key: "bills",
      eyebrow: "Desk",
      title: "Bills",
      body: openBillsBody,
      href: "/staff/bills",
      attention: openBills > 0,
      rank: openBills > 0 ? 4 : 54,
      items: billItems,
    },
    {
      key: "today",
      eyebrow: "Today",
      title: "At a glance",
      body: todayBusy
        ? `${today.arriving} in · ${today.departing} out · ${today.inHouse} in-house`
        : "No arrivals, departures, or guests in-house today",
      href: todayHref,
      attention: today.arriving + today.departing > 0,
      rank: today.arriving + today.departing > 0 ? 5 : 40,
    },
  ].sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));

  const attentionCards = priority.filter((card) => card.attention);
  const remainingCards = priority.filter((card) => !card.attention);

  return (
    <StaffShell current="home">
      <section className="staff-main staff-main--home" aria-labelledby="staff-home-title">
        <header className="staff-home__header">
          <h1 id="staff-home-title">Home</h1>
          <p>Priority work first, then the quieter desk and stay tools.</p>
        </header>

        {attentionCards.length ? (
          <div className="staff-home-attention">
            <h2 className="staff-home-attention__title">Needs attention</h2>
            <div className="staff-home-attention__grid">
              {attentionCards.map((card) => (
                <section
                  aria-labelledby={`home-attention-${card.key}`}
                  className="staff-home-attention-card"
                  key={card.key}
                >
                  <header className="staff-home-attention-card__head">
                    <span className="staff-home-card__eyebrow">{card.eyebrow}</span>
                    <div className="staff-home-attention-card__title-row">
                      <h3 id={`home-attention-${card.key}`}>{card.title}</h3>
                      <Link className="staff-home-attention-card__all" href={card.href}>
                        Open list
                      </Link>
                    </div>
                    <p>{card.body}</p>
                  </header>
                  {card.items?.length ? (
                    <ul className="staff-home-attention-list">
                      {card.items.map((item) => (
                        <li key={item.key}>
                          <Link
                            className="staff-home-attention-list__item"
                            href={item.href}
                          >
                            <span className="staff-home-attention-list__label">
                              {item.label}
                            </span>
                            <span className="staff-home-attention-list__meta">
                              {item.meta}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="staff-home-grid">
            {priority.slice(0, 3).map((card) => (
              <Link className="staff-home-card" href={card.href} key={card.key}>
                <span className="staff-home-card__eyebrow">{card.eyebrow}</span>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </Link>
            ))}
          </div>
        )}

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
