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
      "Paid calendar stays show Cancel & refund only (no separate Cancel).",
      "Stripe Cancel & refund closes the stay and starts the card refund immediately (6% bank charge kept).",
      "Thai bank Cancel & refund closes the stay, opens Transfers, and emails staff that a refund is waiting for the owner to start.",
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
