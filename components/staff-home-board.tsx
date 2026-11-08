"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { markStayHousekeepingCleaned } from "@/app/staff/home-actions";
import { StaffDialog } from "@/components/staff-dialog";
import { StaffRequestDecisionPanel } from "@/components/staff-request-decision-panel";
import type { StaffBooking } from "@/lib/booking-requests";
import { getStaffBookingKey } from "@/lib/booking-requests";
import type { PropertyCurrency } from "@/lib/currency";
import type { StaffMessageThread } from "@/lib/booking-chat";
import type {
  HomeCleanRow,
  HomeGuestRow,
  HomeTourRow,
} from "@/lib/staff-home-board";

function Section({
  title,
  count,
  empty,
  hasItems,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  hasItems?: boolean;
  children: ReactNode;
}) {
  const showList = hasItems ?? count > 0;
  return (
    <section className="staff-home-board__section" aria-label={title}>
      <header className="staff-home-board__section-head">
        <h2>{title}</h2>
        <span className="staff-home-board__count">{count}</span>
      </header>
      {!showList ? (
        <p className="staff-home-board__empty">{empty}</p>
      ) : (
        <ul className="staff-home-board__list">{children}</ul>
      )}
    </section>
  );
}

function GuestRows({ rows }: { rows: HomeGuestRow[] }) {
  return (
    <>
      {rows.map((row) => (
        <li key={row.id}>
          <Link className="staff-home-board__row" href={row.href} prefetch={false}>
            <strong>{row.guest}</strong>
            <span>
              {row.room}
              {row.doorLabel ? ` · ${row.doorLabel}` : ""}
            </span>
          </Link>
        </li>
      ))}
    </>
  );
}

export function StaffHomeBoard({
  bankHolds,
  arriving,
  departing,
  tours,
  cleanDue,
  messages,
  canManage,
  currency,
}: {
  bankHolds: StaffBooking[];
  arriving: HomeGuestRow[];
  departing: HomeGuestRow[];
  tours: HomeTourRow[];
  cleanDue: HomeCleanRow[];
  messages: StaffMessageThread[];
  canManage: boolean;
  currency: PropertyCurrency;
}) {
  const router = useRouter();
  const [openBankId, setOpenBankId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selectedBank =
    bankHolds.find(
      (booking) => (booking.databaseId || getStaffBookingKey(booking)) === openBankId,
    ) ?? null;

  function markCleaned(bookingId: string) {
    const data = new FormData();
    data.set("booking-id", bookingId);
    startTransition(async () => {
      await markStayHousekeepingCleaned(data);
      router.refresh();
    });
  }

  return (
    <div className="staff-home-board">
      <Section
        count={bankHolds.length}
        empty="No Thai bank website payments waiting."
        title="Bank to confirm"
      >
        {bankHolds.map((booking) => {
          const id = booking.databaseId || getStaffBookingKey(booking);
          return (
            <li key={id}>
              <button
                className="staff-home-board__row staff-home-board__row--action"
                onClick={() => setOpenBankId(id)}
                type="button"
              >
                <strong>{booking.guest}</strong>
                <span>
                  {booking.room} · {booking.dates}
                </span>
                <span className="staff-home-board__cta">Confirm or reject</span>
              </button>
            </li>
          );
        })}
      </Section>

      <div className="staff-home-board__split">
        <Section count={arriving.length} empty="No arrivals today." title="Check-in today">
          <GuestRows rows={arriving} />
        </Section>
        <Section
          count={departing.length}
          empty="No departures today."
          title="Check-out today"
        >
          <GuestRows rows={departing} />
        </Section>
      </div>

      <Section
        count={tours.length}
        empty="No pickups in the next 24 hours."
        title="Tours · pickup soon"
      >
        {tours.map((tour) => (
          <li key={tour.id}>
            <Link className="staff-home-board__row" href={tour.href} prefetch={false}>
              <strong>{tour.name}</strong>
              <span>
                {tour.tripDate} · {tour.pickupTime}
                {tour.guestName ? ` · ${tour.guestName}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </Section>

      <Section
        count={cleanDue.filter((row) => !row.cleaned).length}
        empty="No rooms due for a 3-night clean."
        hasItems={cleanDue.length > 0}
        title="Deep clean due"
      >
        {cleanDue.map((row) => (
          <li
            className={[
              "staff-home-board__clean",
              row.cleaned ? "staff-home-board__clean--done" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={row.id}
          >
            <Link
              className={[
                "staff-home-board__row",
                row.cleaned ? "staff-home-board__row--muted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              href={row.href}
              prefetch={false}
            >
              <strong>{row.guest}</strong>
              <span>
                {row.room}
                {row.doorLabel ? ` · ${row.doorLabel}` : ""} · {row.nightsSinceClean}n
                {row.cleaned ? " · cleaned" : ""}
              </span>
            </Link>
            {row.cleaned ? (
              <span className="staff-home-board__done-label">Cleaned</span>
            ) : (
              <button
                className="button button--secondary button--compact"
                disabled={!canManage || pending}
                onClick={() => markCleaned(row.id)}
                type="button"
              >
                Cleaned
              </button>
            )}
          </li>
        ))}
      </Section>

      <Section
        count={messages.length}
        empty="No unanswered guest messages."
        title="Needs reply"
      >
        {messages.map((thread) => (
          <li key={thread.bookingId}>
            <Link
              className="staff-home-board__row"
              href={`/staff/messages?booking=${encodeURIComponent(thread.bookingId)}`}
              prefetch={false}
            >
              <strong>{thread.guestName}</strong>
              <span>
                {thread.roomName} · {thread.ageLabel} · {thread.lastBody}
              </span>
            </Link>
          </li>
        ))}
      </Section>

      <StaffDialog
        closeLabel="Close"
        onClose={() => setOpenBankId(null)}
        open={Boolean(selectedBank)}
        title={selectedBank?.guest ?? "Bank transfer"}
      >
        {selectedBank?.databaseId ? (
          <StaffRequestDecisionPanel
            alreadyConfirmed={false}
            bankTransferClaimed={selectedBank.bankTransferClaimed}
            bookingId={selectedBank.databaseId}
            canManage={canManage}
            currency={currency}
            depositAmount={selectedBank.depositAmount}
            depositPaid={selectedBank.depositPaid}
            guestEmail={selectedBank.contact}
            guestName={selectedBank.guest}
            needsReply={selectedBank.status === "needs-reply"}
            paidByCard={Boolean(selectedBank.stripePaymentIntentId)}
            unclaimedCheckout={false}
          />
        ) : null}
      </StaffDialog>
    </div>
  );
}
