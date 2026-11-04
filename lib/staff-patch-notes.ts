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
