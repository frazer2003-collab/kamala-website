import Link from "next/link";
import {
  confirmBookingRequest,
  declineBookingRequest,
} from "@/app/actions";
import { BookingChat } from "@/components/booking-chat";
import { StaffSidebar } from "@/components/staff-sidebar";
import {
  getStaffBookingKey,
  getDeclinedBookings,
  getStaffBookingById,
  getStaffBookingRequests,
} from "@/lib/booking-requests";
import { requireStaffSession } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

const statusCopy = {
  new: "New request",
  awaiting: "Deposit paid",
  "needs-reply": "Needs staff reply",
  declined: "Closed",
};

const nextActions = {
  new: "Review request",
  awaiting: "Review request",
  "needs-reply": "Review request",
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

  return (
    <main className="staff-shell">
      <StaffSidebar current="requests" />

      <section className="staff-main" aria-labelledby="staff-title">
        <div className="staff-header">
          <div>
            <p className="section-note">Staff bookings</p>
            <h1 id="staff-title">Requests that need a clear next step.</h1>
            <p>
              Review new guest requests here. Confirming moves a stay to the
              calendar; declining removes it from the record. Set rooms to sell
              and closures from the calendar.
            </p>
          </div>
          <Link className="button button--secondary" href="/">
            View guest site
          </Link>
        </div>

        <div className="staff-stats" aria-label="Booking summary">
          <div>
            <span>Open requests</span>
            <strong>{staffBookings.bookings.length}</strong>
          </div>
          <div>
            <span>New today</span>
            <strong>{newRequestCount}</strong>
          </div>
          <div>
            <span>Confirmed stays</span>
            <strong>
              <Link href="/staff/calendar">View calendar</Link>
            </strong>
          </div>
        </div>

        {staffBookings.error ? (
          <p className="form-message form-message--error" role="status">
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
              <h2 id="requests-title">Booking requests</h2>
              <span>
                {staffBookings.source === "supabase"
                  ? "Live from Supabase"
                  : "Sample data"}
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
                        <span className="button button--quiet">
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
              <>
                <div className="booking-list__header booking-list__header--sub">
                  <h2 id="closed-title">Closed conversations</h2>
                  <span>History kept on record</span>
                </div>
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
                          <span className="button button--quiet">View history</span>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </>
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
              <dl className="detail-list">
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
                  <dt>Deposit paid</dt>
                  <dd>
                    {selected.depositPaid
                      ? `$${selected.depositAmount}`
                      : "Not received yet"}
                  </dd>
                </div>
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
              <div className="guest-note">
                <span>Guest note</span>
                <p>{selected.note || "No guest note added."}</p>
              </div>
              {selected.databaseId ? (
                <BookingChat
                  bookingId={selected.databaseId}
                  disabled={!canManageSelected}
                  readOnly={isClosedConversation}
                  variant="staff"
                />
              ) : null}
              {!isClosedConversation ? (
                <div className="detail-actions">
                  <form action={confirmBookingRequest}>
                    <input
                      name="booking-id"
                      type="hidden"
                      value={selected.databaseId ?? ""}
                    />
                    <input
                      name="staff-message"
                      type="hidden"
                      value="Good news — your room is confirmed. We will follow up with arrival details and the remaining balance shortly."
                    />
                    <button
                      className="button button--primary"
                      disabled={!canManageSelected}
                      type="submit"
                    >
                      Confirm and email
                    </button>
                  </form>
                  <form action={declineBookingRequest}>
                    <input
                      name="booking-id"
                      type="hidden"
                      value={selected.databaseId ?? ""}
                    />
                    <input
                      name="staff-message"
                      type="hidden"
                      value="Thank you for your request. We are sorry, but this room is not available for those dates. Reply with flexible dates and we can help find another option."
                    />
                    <button
                      className="button button--secondary"
                      disabled={!canManageSelected}
                      type="submit"
                    >
                      Decline and email
                    </button>
                  </form>
                </div>
              ) : (
                <p className="detail-help">
                  This request is closed. The conversation history remains available
                  above.
                </p>
              )}
              {!isClosedConversation ? (
                <p className="detail-help">
                  Confirming sends the guest an email and moves the stay to the
                  calendar. The room is already reserved by their deposit.
                  Declining refunds the deposit and releases the room.
                </p>
              ) : null}
            </aside>
          ) : (
            <aside className="reservation-detail" aria-labelledby="detail-title">
              <h2 id="detail-title">Waiting for the first request.</h2>
              <p>
                Once a guest sends the form, staff will see their dates, room,
                contact email, and note here.
              </p>
            </aside>
          )}
        </div>
      </section>
    </main>
  );
}
