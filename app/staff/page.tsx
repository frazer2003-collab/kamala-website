import Link from "next/link";
import nextDynamic from "next/dynamic";
import { StaffRequestDecisionPanel } from "@/components/staff-request-decision-panel";
import { StaffSidebar } from "@/components/staff-sidebar";
import {
  getStaffBookingKey,
  getDeclinedBookings,
  getStaffBookingById,
  getStaffBookingRequests,
} from "@/lib/booking-requests";
import { requireStaffSession } from "@/lib/staff-auth";

const BookingChat = nextDynamic(
  () => import("@/components/booking-chat").then((module) => module.BookingChat),
  {
    loading: () => (
      <p className="booking-summary__hint" aria-live="polite">
        Loading messages…
      </p>
    ),
  },
);

export const dynamic = "force-dynamic";

const statusCopy = {
  new: "New request",
  awaiting: "Deposit paid",
  "needs-reply": "Needs staff reply",
  declined: "Closed",
};

const nextActions = {
  new: "Review & decide",
  awaiting: "Confirm deposit",
  "needs-reply": "Reply to guest",
};

export default async function StaffBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  await requireStaffSession();

  const { booking: selectedBookingId } = await searchParams;
  const [staffBookings, declinedBookings] = await Promise.all([
    getStaffBookingRequests(),
    getDeclinedBookings(),
  ]);
  let selected =
    staffBookings.bookings.find(
      (booking) => getStaffBookingKey(booking) === selectedBookingId,
    ) ??
    declinedBookings.bookings.find(
      (booking) => getStaffBookingKey(booking) === selectedBookingId,
    ) ??
    null;

  if (!selected && selectedBookingId) {
    selected = await getStaffBookingById(selectedBookingId);
  }

  selected ??= staffBookings.bookings[0] ?? declinedBookings.bookings[0] ?? null;

  const canManageSelected =
    Boolean(selected?.databaseId) && selected?.status !== "declined";
  const isClosedConversation = selected?.status === "declined";
  const newRequestCount = staffBookings.bookings.filter(
    (booking) => booking.status === "new",
  ).length;
  const needsReplyCount = staffBookings.bookings.filter(
    (booking) => booking.status === "needs-reply",
  ).length;

  return (
    <main className="staff-shell">
      <StaffSidebar current="requests" />

      <section className="staff-main" aria-labelledby="staff-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-title">Requests</h1>
            <p>
              {staffBookings.bookings.length === 0
                ? "No open requests. Confirmed stays live on the calendar."
                : [
                    `${staffBookings.bookings.length} open`,
                    newRequestCount > 0 ? `${newRequestCount} new` : null,
                    needsReplyCount > 0 ? `${needsReplyCount} need reply` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
              {" · "}
              <Link href="/staff/calendar">Calendar</Link>
            </p>
          </div>
          <Link className="button button--quiet" href="/">
            Guest site
          </Link>
        </div>

        {staffBookings.error ? (
          <p className="form-message form-message--error" role="alert">
            {staffBookings.error}
          </p>
        ) : null}
        {staffBookings.source === "sample" && !staffBookings.error ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables to show real booking requests here.
          </p>
        ) : null}

        <div className="booking-board" id="bookings">
          <section className="booking-list" aria-labelledby="requests-title">
            <div className="booking-list__header">
              <h2 id="requests-title">Open inbox</h2>
              <span>
                {staffBookings.source === "supabase" ? "Live" : "Sample"}
              </span>
            </div>
            {staffBookings.bookings.length > 0 ? (
              <div className="booking-rows">
                {staffBookings.bookings.map((booking) => {
                  const bookingKey = getStaffBookingKey(booking);
                  const bookingHref = `/staff?booking=${encodeURIComponent(bookingKey)}#detail-title`;
                  const isSelected =
                    selected && getStaffBookingKey(selected) === bookingKey;

                  return (
                    <article
                      className={`booking-row${isSelected ? " booking-row--selected" : ""}`}
                      key={bookingKey}
                    >
                      <Link className="booking-row__link" href={bookingHref}>
                        <div>
                          <strong>{booking.guest}</strong>
                          <span>
                            {booking.room} · {booking.dates}
                          </span>
                        </div>
                        <div className={`staff-status staff-status--${booking.status}`}>
                          <span aria-hidden="true" />
                          {statusCopy[booking.status as keyof typeof statusCopy]}
                        </div>
                        <span className="booking-row__action">
                          {nextActions[booking.status as keyof typeof nextActions]}
                        </span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="staff-empty-state">
                <h3>No open requests right now.</h3>
                <p>
                  New guest requests will appear here. Confirmed stays move to
                  the calendar.
                </p>
                <Link className="button button--secondary" href="/staff/calendar">
                  Open calendar
                </Link>
              </div>
            )}
            {declinedBookings.bookings.length > 0 ? (
              <details className="booking-closed">
                <summary>
                  Closed conversations{" "}
                  <span>({declinedBookings.bookings.length})</span>
                </summary>
                <div className="booking-rows">
                  {declinedBookings.bookings.map((booking) => {
                    const bookingKey = getStaffBookingKey(booking);
                    const bookingHref = `/staff?booking=${encodeURIComponent(bookingKey)}#detail-title`;
                    const isSelected =
                      selected && getStaffBookingKey(selected) === bookingKey;

                    return (
                      <article
                        className={`booking-row${isSelected ? " booking-row--selected" : ""}`}
                        key={bookingKey}
                      >
                        <Link className="booking-row__link" href={bookingHref}>
                          <div>
                            <strong>{booking.guest}</strong>
                            <span>
                              {booking.room} · {booking.dates}
                            </span>
                          </div>
                          <div className="staff-status staff-status--declined">
                            <span aria-hidden="true" />
                            {statusCopy.declined}
                          </div>
                          <span className="booking-row__action">View</span>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </section>

          {selected ? (
            <aside
              className="reservation-detail"
              aria-labelledby="detail-title"
              key={getStaffBookingKey(selected)}
            >
              <div className="reservation-detail__top">
                <span>{selected.id}</span>
                <div className={`staff-status staff-status--${selected.status}`}>
                  <span aria-hidden="true" />
                  {statusCopy[selected.status as keyof typeof statusCopy] ??
                    selected.status}
                </div>
              </div>
              <h2 id="detail-title">{selected.guest}</h2>

              <div className="reservation-detail__groups">
                <dl className="detail-list detail-list--group" aria-label="Stay">
                  <div>
                    <dt>Room</dt>
                    <dd>{selected.room}</dd>
                  </div>
                  <div>
                    <dt>Dates</dt>
                    <dd>
                      {selected.dates} · {selected.nights} nights
                    </dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>${selected.estimatedTotal}</dd>
                  </div>
                  <div>
                    <dt>Deposit</dt>
                    <dd>
                      {selected.depositPaid
                        ? `$${selected.depositAmount} paid`
                        : "Not received yet"}
                    </dd>
                  </div>
                </dl>

                <dl className="detail-list detail-list--group" aria-label="Guest">
                  <div>
                    <dt>Email</dt>
                    <dd>{selected.contact}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{selected.phone || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Requested</dt>
                    <dd>{selected.requestedAt}</dd>
                  </div>
                </dl>
              </div>

              <div className="guest-note">
                <span>Guest note</span>
                <p>{selected.note || "No guest note added."}</p>
              </div>

              {!isClosedConversation ? (
                <StaffRequestDecisionPanel
                  bookingId={selected.databaseId ?? ""}
                  canManage={canManageSelected}
                  depositAmount={selected.depositAmount}
                  depositPaid={selected.depositPaid}
                  guestEmail={selected.contact}
                  guestName={selected.guest}
                />
              ) : (
                <p className="detail-help">
                  This request is closed. Conversation history stays available
                  below.
                </p>
              )}

              {selected.databaseId ? (
                <details className="staff-request-chat" open={!isClosedConversation}>
                  <summary>Conversation</summary>
                  <BookingChat
                    bookingId={selected.databaseId}
                    disabled={!canManageSelected}
                    readOnly={isClosedConversation}
                    variant="staff"
                  />
                </details>
              ) : null}
            </aside>
          ) : (
            <aside className="reservation-detail" aria-labelledby="detail-title">
              <h2 id="detail-title">Waiting for the first request.</h2>
              <p>
                Once a guest sends the form, their dates, room, contact, and note
                appear here.
              </p>
            </aside>
          )}
        </div>
      </section>
    </main>
  );
}
