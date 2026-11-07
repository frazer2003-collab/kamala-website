export type StaffPatchNote = {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  title: string;
  /** One-line blurb for Home. */
  summary: string;
  changes: string[];
  /** Small UI crop under the note, served from /public. */
  image: {
    src: string;
    alt: string;
  };
};

/**
 * Newest first. Add a new entry at the top when shipping staff-facing work.
 */
export const STAFF_PATCH_NOTES: StaffPatchNote[] = [
  {
    id: "2026-11-07-desk-money-integrity",
    date: "2026-11-07",
    title: "Stock prices on bills and safer portals",
    summary:
      "Selling stock on a bill asks for a baht price. Clear warns when lines have no recipe. Desk portals sign out when idle.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Bill popup with stock price field and clear warning",
    },
    changes: [
      "Adding a stock item to a bill requires a baht price the first time (no silent ฿50).",
      "Clear bill warns if any lines have no recipe and will not cut stock.",
      "Bills and laundry portals use a shorter session and the same idle sign-out as full staff.",
    ],
  },
  {
    id: "2026-11-07-bill-item-pick",
    date: "2026-11-07",
    title: "Bill item pick shows the chosen name",
    summary:
      "Choosing an item on a bill keeps the name in the field so you can see what you picked before Add.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Bill popup with selected item name in the add field",
    },
    changes: [
      "Add item keeps the selected name visible until you press Add.",
      "The item list no longer sits under the dialog or collapses when you pick.",
    ],
  },
  {
    id: "2026-11-07-desk-trust-slice",
    date: "2026-11-07",
    title: "Safer clear bill and clearer open tabs",
    summary:
      "Clearing a bill asks for confirm and won’t run on an empty tab. Home shows open-tab baht at risk.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff bill clear confirm with total and stock note",
    },
    changes: [
      "Clear bill is two steps: review guest, total, and stock note, then confirm.",
      "Empty open tabs cannot be cleared — add items first.",
      "The bills list pauses live refresh while a bill popup is open so typing is not interrupted.",
      "Home Bills card shows open count, baht total, and oldest age — not “to clear.”",
    ],
  },
  {
    id: "2026-11-07-combo-above-fold",
    date: "2026-11-07",
    title: "Bill item search stays on screen",
    summary:
      "The Add item dropdown no longer drops under the dialog edge; it opens where there is room.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff bill popup with item search list visible on screen",
    },
    changes: [
      "Desk search lists float above the page and flip upward when space below is tight.",
    ],
  },
  {
    id: "2026-11-07-live-bills",
    date: "2026-11-07",
    title: "New bill opens a live tab",
    summary:
      "Pressing New bill creates the open tab immediately. Items save to that bill as you add them so the desk stays accurate.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff desk bills list with an open live tab",
    },
    changes: [
      "New bill creates an open tab right away and opens it for naming and items.",
      "Each add or remove updates the bill record immediately for anyone on Bills.",
      "The bills list refreshes every few seconds so the desk sees open tabs and lines live.",
    ],
  },
  {
    id: "2026-11-07-desk-portals-home",
    date: "2026-11-07",
    title: "Menu items, desk portals, and priority Home",
    summary:
      "Home leads with what needs attention. Bills and laundry have portal logins, and stock can be sold on bills.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff home priority cards and desk tools",
    },
    changes: [
      "Items is renamed to Menu items in the sidebar and desk tools.",
      "Home puts Transfers, doors, low stock, open laundry, and open bills first when they need attention.",
      "Whole record rows open the popup, not only the name link.",
      "Laundry notes can be edited in the slip popup.",
      "Bills can add stock items as well as menu items; clearing a bill posts stock movements again.",
      "Desk portals at /staff/portal/login for bills and sheets-only laundry.",
      "Search dropdowns keep showing matching options while you type.",
    ],
  },
  {
    id: "2026-11-07-desk-speed-th",
    date: "2026-11-07",
    title: "Faster desk tools and Thai staff language",
    summary:
      "Desk lists open in popups, search picks items with Enter, and EN/TH switches the whole staff site.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff desk bills popup with searchable item picker",
    },
    changes: [
      "Desk dropdowns are typeable: search, Enter to choose, then the field clears for the next pick.",
      "Laundry uses one measure field that follows Type (kilograms or piece count).",
      "Items recipes use a search list to add ingredients quickly.",
      "Clicking a laundry, stock, bill, or catalog record opens a popup instead of reloading the page.",
      "An EN/TH button in the sidebar translates staff navigation and page wording.",
    ],
  },
  {
    id: "2026-11-07-reservations-sort-filter",
    date: "2026-11-07",
    title: "Reservations shows booked date and sortable columns",
    summary:
      "Each stay shows when it was booked. Click a column to sort, and filter by room or payment.",
    image: {
      src: "/staff/patch-notes/reservations-sort.jpg",
      alt: "Reservations table with Booked column and sortable headers",
    },
    changes: [
      "A Booked column shows the Bangkok calendar day the stay was created.",
      "Every column sorts ascending or descending from the header.",
      "Room and Payment filters sit with Find and the date range.",
    ],
  },
  {
    id: "2026-11-07-desk-operations",
    date: "2026-11-07",
    title: "Bills, stock, laundry, and desk items",
    summary:
      "The Desk section now keeps guest tabs, stock counts, laundry slips, prices, and recipes together.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Kamala staff Desk pages for bills, stock, laundry, and sellable items",
    },
    changes: [
      "Bills keeps open guest tabs, adds catalog items, totals in baht, and deducts recipe stock when a bill is cleared.",
      "Stock puts the shortest headroom first, estimates meals left, and records purchases, waste, and count corrections.",
      "Laundry records bags or piece counts and opens a simple slip for return status.",
      "Items manages Thai and English names, baht prices, categories, recipes, and laundry attached to room items.",
      "The sidebar groups Stay, Desk, and Money & site so the new tools stay easy to find.",
    ],
  },
  {
    id: "2026-11-07-reservations-in-house",
    date: "2026-11-07",
    title: "Reservations shows who is actually here",
    summary:
      "The list includes stays that overlap the dates, and you can find a guest by name, door, or phone. Payment says paid, unpaid, no charge, or no price.",
    image: {
      src: "/staff/patch-notes/reservations-ledger.jpg",
      alt: "Reservations table with guest, stay, room number, source, and payment",
    },
    changes: [
      "A date range now lists every stay that occupies a night in it, including guests who checked in earlier.",
      "Find searches name, door number, and phone. In house today jumps to whoever is staying tonight.",
      "Each row shows nights, room and door, and whether the stay is paid, unpaid, a no-charge stay, or an OTA stay with no price.",
      "The guest name opens that stay on the calendar. Channel rows show the room type instead of repeating the channel name.",
    ],
  },
  {
    id: "2026-11-07-home-desk-spacing",
    date: "2026-11-07",
    title: "Home desk spacing",
    summary:
      "Today's work sits in one row. Reservations and Finance are quieter links underneath, and patch notes follow.",
    image: {
      src: "/staff/patch-notes/home-spacing.jpg",
      alt: "Staff Home with Transfers, today, and Calendar in one row, then shorter Reservations and Finance links",
    },
    changes: [
      "Transfers, today, and Calendar stay in one row and hug their text instead of stretching into tall empty cards.",
      "Reservations and Finance sit on a shorter second row so they do not compete with live work.",
      "The latest patch note sits under the desk, not above it.",
    ],
  },
  {
    id: "2026-11-07-park-door-for-swap",
    date: "2026-11-07",
    title: "Park a stay to swap doors",
    summary:
      "Clear a door number to move stays around. The night stays sold, so guests cannot book the gap.",
    image: {
      src: "/staff/patch-notes/park-door.jpg",
      alt: "Room number set to Unassigned, hold for a swap",
    },
    changes: [
      "Room number includes Unassigned, hold for a swap. Saving it, or dropping the bar on No #, clears the door.",
      "The empty door can take another stay so you can finish a swap.",
      "A parked stay still holds one sellable door. The website, a new booking, and a guest date change will not take that night.",
    ],
  },
  {
    id: "2026-11-07-ota-cancel-skips-transfers",
    date: "2026-11-07",
    title: "OTA cancels skip Transfers",
    summary:
      "Airbnb, Booking.com, and Expedia cancels close the stay. The channel refunds the guest, so nothing is queued.",
    image: {
      src: "/staff/patch-notes/ota-cancel.jpg",
      alt: "Airbnb cancel confirmation saying nothing is sent to Transfers",
    },
    changes: [
      "A saved Airbnb, Booking.com, or Expedia source cancels like cash: the stay closes and Transfers is not opened.",
      "Cancel & refund is hidden for those sources, including when a card is on the booking. The channel refunds the guest.",
      "Website, walk-in, card, and Thai bank cancels are unchanged.",
    ],
  },
  {
    id: "2026-11-04-finance-capacity-comps",
    date: "2026-11-04",
    title: "Finance: true capacity and stay totals",
    summary:
      "October shows 279 nights available (9 doors × 31 days). Money uses the saved stay total — a total of 0 is left out.",
    image: {
      src: "/staff/patch-notes/finance-capacity.jpg",
      alt: "Finance occupancy showing 248 of 279 nights available for October",
    },
    changes: [
      "Available nights follow the door chart: Superior 4, Deluxe 3, Family 1, Family GF 1 — so October is 279, not a phantom tenth door.",
      "Occupancy copy shows sold of available nights (for example 248 of 279).",
      "Finance money, averages, and accounts use only stay totals above 0.",
      "A stay total of 0 (owner stay or giveaway) still occupies the door for occupancy, but does not enter earned money.",
    ],
  },
  {
    id: "2026-11-04-calendar-door-drag",
    date: "2026-11-04",
    title: "Drag bookings between doors",
    summary:
      "Drag a stay onto another door to reassign it, or onto a replaceable stay to swap or take that door.",
    image: {
      src: "/staff/patch-notes/door-drag.jpg",
      alt: "Dragging a stay from one door row onto another",
    },
    changes: [
      "Drag a booking bar onto an empty door row to assign that number (same room type only).",
      "Drop onto another booking when it is replaceable: swap doors if both fit, otherwise take the door and move the other stay to No #.",
      "Drop onto No # to clear a door assignment.",
      "Channel blocks stay put — only staff-managed bookings drag.",
    ],
  },
  {
    id: "2026-11-04-paid-cash-or-bank",
    date: "2026-11-04",
    title: "Mark Paid: Cash or Thai bank",
    summary:
      "Ticking Paid on a stay now asks Cash or Thai bank so cancel and refunds follow the right rail.",
    image: {
      src: "/staff/patch-notes/paid-cash-bank.jpg",
      alt: "Paid checkbox with Cash and Thai bank options",
    },
    changes: [
      "Booking details and new bookings: when you tick Paid, choose Cash or Thai bank before saving.",
      "Stay header shows Paid · Cash, Paid · Thai bank, or Paid · Card.",
      "Cash Cancel closes the stay without sending work to Transfers — refund the guest in cash if needed.",
      "Thai bank Cancel & refund still opens Transfers and emails staff; Stripe card stays refund immediately.",
    ],
  },
  {
    id: "2026-11-04-cancel-refund-rails",
    date: "2026-11-04",
    title: "Cancel & refund by payment type",
    summary:
      "Paid stays only show Cancel & refund — Stripe refunds now; Thai bank waits on Transfers with a staff email.",
    image: {
      src: "/staff/patch-notes/cancel-refund.jpg",
      alt: "Cancel and refund confirmation with Stripe refund button",
    },
    changes: [
      "Paid stays show Cancel and Cancel & refund side by side (cash shows Cancel only).",
      "Cancel & refund: Stripe refunds the card now; Thai bank opens Transfers and emails staff that a refund is waiting.",
      "Cancel alone closes the stay and opens Transfers for a later refund — no automatic Stripe refund.",
      "Unpaid Cancel deletes the stay from the system so staff can rebook cleanly (not kept as cancelled history).",
    ],
  },
  {
    id: "2026-11-04-home-desk",
    date: "2026-11-04",
    title: "Staff Home desk overview",
    summary:
      "Home shows live Transfers work, today in/out, and stays missing a door #.",
    image: {
      src: "/staff/patch-notes/home-desk.jpg",
      alt: "Staff Home cards for Transfers, today, and door numbers",
    },
    changes: [
      "Home cards pull live Transfers breakdown (replies, bank checks, refunds, stay changes).",
      "Today at a glance: arrivals, departures, and guests in-house.",
      "Calendar card counts upcoming stays that still need a door number.",
      "Finance card points refunds back to Transfers instead of promising them there.",
      "Sidebar: collapsible rail with icons; fixed no-entry cursor on link labels.",
      "Login lands on Staff Home.",
      "Requests renamed to Transfers with honest Thai-bank copy.",
    ],
  },
];

export function getLatestStaffPatchNote() {
  return STAFF_PATCH_NOTES[0] ?? null;
}

export function formatStaffPatchDate(iso: string) {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
