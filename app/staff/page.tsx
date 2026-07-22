import Link from "next/link";
import nextDynamic from "next/dynamic";
import { StaffInboxRoomTypeForm } from "@/components/staff-inbox-room-type-form";
import { StaffRequestDecisionPanel } from "@/components/staff-request-decision-panel";
import { StaffShell } from "@/components/staff-shell";
import {
  getStaffBookingKey,
  getDeclinedBookings,
  getStaffBookingById,
  getStaffBookingRequests,
  type StaffBooking,
} from "@/lib/booking-requests";
import { formatMoneySuffix } from "@/lib/currency";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRooms } from "@/lib/rooms";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  formatOverlapErrorMessage,
  parseOverlapDays,
} from "@/lib/stay-overlap";
import { isPaidOverbookNote } from "@/lib/booking-overbook";
import type { BookingStatus } from "@/lib/content";

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

type InboxFilter = "all" | "new" | "awaiting" | "needs-reply";

const statusCopy: Record<BookingStatus, string> = {
  new: "New request",
  pending_payment: "Awaiting payment",
  awaiting: "Payment received",
  "needs-reply": "Needs staff reply",
  confirmed: "Confirmed",
  declined: "Closed",
};

function getBookingStatusCopy(booking: StaffBooking) {
  if (
    booking.status === "awaiting" &&
    booking.bankTransferClaimed &&
    !booking.depositPaid
  ) {
    return "Transfer to verify";
  }

  if (booking.status === "awaiting" && isPaidOverbookNote(booking.staffNote)) {
    return "Paid — needs dates";
  }

  return statusCopy[booking.status];
}

const STATUS_SORT: Partial<Record<BookingStatus, number>> = {
  "needs-reply": 0,
  new: 1,
  awaiting: 2,
};

function parseInboxFilter(value: string | undefined): InboxFilter {
  if (value === "new" || value === "awaiting" || value === "needs-reply") {
    return value;
  }

  return "all";
}

function buildStaffHref(options: {
  booking?: string | null;
  filter?: InboxFilter;
  view?: "inbox" | null;
}) {
  const params = new URLSearchParams();

  if (options.booking) {
    params.set("booking", options.booking);
  }

  if (options.filter && options.filter !== "all") {
    params.set("filter", options.filter);
  }

  if (options.view === "inbox") {
    params.set("view", "inbox");
  }

  const query = params.toString();
  return query ? `/staff?${query}` : "/staff";
}

function sortInboxBookings(bookings: StaffBooking[]) {
  return [...bookings].sort((left, right) => {
    const leftRank = STATUS_SORT[left.status] ?? 9;
    const rightRank = STATUS_SORT[right.status] ?? 9;
    return leftRank - rightRank;
  });
}

export default async function StaffBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    booking?: string;
    filter?: string;
    view?: string;
    error?: string;
    detail?: string;
    overlap?: string;
  }>;
}) {
  await requireStaffSession();

  const {
    booking: selectedBookingId,
    filter: filterParam,
    view: viewParam,
    error,
    detail: errorDetail,
    overlap,
  } = await searchParams;
  const inboxFilter = parseInboxFilter(filterParam);
  const preferInboxView = viewParam === "inbox";

  const [staffBookings, declinedBookings, settings, rooms] = await Promise.all([
    getStaffBookingRequests(),
    getDeclinedBookings(),
    getPropertySettings(),
    getStaffRooms(),
  ]);

  const sortedOpen = sortInboxBookings(staffBookings.bookings);
  const visibleOpen =
    inboxFilter === "all"
      ? sortedOpen
      : sortedOpen.filter((booking) => booking.status === inboxFilter);

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

  if (!preferInboxView) {
    selected ??=
      visibleOpen[0] ??
      staffBookings.bookings[0] ??
      declinedBookings.bookings[0] ??
      null;
  }

  const isPracticeMode =
    staffBookings.source === "sample" &&
    Boolean(selected) &&
    !selected?.databaseId;
  const canManageSelected =
    Boolean(selected?.databaseId) && selected?.status !== "declined";
  const isClosedConversation = selected?.status === "declined";
  const newRequestCount = staffBookings.bookings.filter(
    (booking) => booking.status === "new",
  ).length;
  const needsReplyCount = staffBookings.bookings.filter(
    (booking) => booking.status === "needs-reply",
  ).length;
  const awaitingCount = staffBookings.bookings.filter(
    (booking) => booking.status === "awaiting",
  ).length;
  const focusDetailOnMobile = Boolean(selected) && !preferInboxView;
  const selectedKey = selected ? getStaffBookingKey(selected) : null;
  const inboxRoomTypeError =
    error === "invalid-room-type"
      ? "That room type is not available."
      : error === "overlap"
        ? formatOverlapErrorMessage(parseOverlapDays(overlap))
        : error === "save-failed"
          ? `Could not update the room type.${errorDetail ? ` ${errorDetail}` : ""}`
          : null;

  const filterTabs: { id: InboxFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: staffBookings.bookings.length },
    { id: "needs-reply", label: "Need reply", count: needsReplyCount },
    { id: "new", label: "New", count: newRequestCount },
    { id: "awaiting", label: "Payment", count: awaitingCount },
  ];

  return (
    <StaffShell current="requests">
      <section className="staff-main" aria-labelledby="staff-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-title">Requests</h1>
            <p>
              {staffBookings.bookings.length === 0 ? (
                "No open requests. Confirmed stays live on the calendar."
              ) : (
                <>
                  <Link
                    href={buildStaffHref({ filter: "all", view: "inbox" })}
                  >
                    {staffBookings.bookings.length} open
                  </Link>
                  {newRequestCount > 0 ? (
                    <>
                      {" · "}
                      <Link
                        href={buildStaffHref({
                          filter: "new",
                          view: "inbox",
                        })}
                      >
                        {newRequestCount} new
                      </Link>
                    </>
                  ) : null}
                  {needsReplyCount > 0 ? (
                    <>
                      {" · "}
                      <Link
                        href={buildStaffHref({
                          filter: "needs-reply",
                          view: "inbox",
                        })}
                      >
                        {needsReplyCount} need reply
                      </Link>
                    </>
                  ) : null}
                  {awaitingCount > 0 ? (
                    <>
                      {" · "}
                      <Link
                        href={buildStaffHref({
                          filter: "awaiting",
                          view: "inbox",
                        })}
                      >
                        {awaitingCount} payment review
                      </Link>
                    </>
                  ) : null}
                </>
              )}
              {" · "}
              <Link href="/staff/calendar">Calendar</Link>
            </p>
          </div>
          <Link className="button button--quiet" href="/">
            Guest site
          </Link>
        </div>

        {error === "refund-failed" ? (
          <p className="form-message form-message--error" role="alert">
            The Stripe refund did not go through, so this request is still open
            and the guest may still be charged. Check the payment in Stripe,
            then try Decline again — or settle the refund with the guest first.
          </p>
        ) : null}
        {staffBookings.error ? (
          <p className="form-message form-message--error" role="alert">
            {staffBookings.error}
          </p>
        ) : null}
        {staffBookings.source === "sample" && !staffBookings.error ? (
          <p className="form-message form-message--setup" role="status">
            Practice mode — confirm and decline work here without emailing
            guests. Add Supabase environment variables for live requests.
          </p>
        ) : null}

        <div
          className={`booking-board${
            focusDetailOnMobile ? " booking-board--has-selection" : ""
          }`}
          id="bookings"
        >
          <section className="booking-list" aria-labelledby="requests-title">
            <div className="booking-list__header">
              <h2 id="requests-title">Open inbox</h2>
              <span
                className={`booking-list__source booking-list__source--${staffBookings.source}`}
              >
                {staffBookings.source === "supabase" ? "Live" : "Sample"}
              </span>
            </div>

            {staffBookings.bookings.length > 0 ? (
              <nav className="booking-list__filters" aria-label="Filter requests">
                {filterTabs.map((tab) => {
                  if (tab.id !== "all" && tab.count === 0) {
                    return null;
                  }

                  const isActive = inboxFilter === tab.id;

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`booking-list__filter${
                        isActive ? " booking-list__filter--active" : ""
                      }`}
                      href={buildStaffHref({
                        filter: tab.id,
                        view: "inbox",
                      })}
                      key={tab.id}
                    >
                      {tab.label}
                      <span>{tab.count}</span>
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            {visibleOpen.length > 0 ? (
              <div className="booking-rows">
                {visibleOpen.map((booking) => {
                  const bookingKey = getStaffBookingKey(booking);
                  const bookingHref = `${buildStaffHref({
                    booking: bookingKey,
                    filter: inboxFilter,
                  })}#detail-title`;
                  const isSelected = selectedKey === bookingKey;

                  return (
                    <article
                      className={`booking-row${
                        isSelected ? " booking-row--selected" : ""
                      }${
                        booking.status === "needs-reply"
                          ? " booking-row--urgent"
                          : ""
                      }`}
                      key={bookingKey}
                    >
                      <Link className="booking-row__link" href={bookingHref}>
                        <div>
                          <strong>{booking.guest}</strong>
                          <span>
                            {booking.room} · {booking.dates}
                          </span>
                        </div>
                        <div
                          className={`staff-status staff-status--${booking.status}`}
                        >
                          <span aria-hidden="true" />
                          {getBookingStatusCopy(booking)}
                        </div>
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : staffBookings.bookings.length > 0 ? (
              <div className="staff-empty-state">
                <h3>No requests in this filter.</h3>
                <p>Try another filter, or show the full open inbox.</p>
                <Link
                  className="button button--secondary"
                  href={buildStaffHref({ filter: "all", view: "inbox" })}
                >
                  Show all open
                </Link>
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
                    const bookingHref = `${buildStaffHref({
                      booking: bookingKey,
                      filter: inboxFilter,
                    })}#detail-title`;
                    const isSelected = selectedKey === bookingKey;

                    return (
                      <article
                        className={`booking-row${
                          isSelected ? " booking-row--selected" : ""
                        }`}
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
              key={selectedKey}
            >
              <Link
                className="reservation-detail__back"
                href={buildStaffHref({
                  filter: inboxFilter,
                  view: "inbox",
                })}
              >
                ← Inbox
              </Link>
              <div className="reservation-detail__top">
                <span>{selected.id}</span>
                <div className={`staff-status staff-status--${selected.status}`}>
                  <span aria-hidden="true" />
                  {getBookingStatusCopy(selected)}
                </div>
              </div>
              <h2 id="detail-title">{selected.guest}</h2>

              {isPaidOverbookNote(selected.staffNote) ? (
                <p className="form-message form-message--warning" role="status">
                  This guest paid, but these dates look full. Email or call them
                  to offer other dates or a room, then confirm only after that is
                  settled.
                </p>
              ) : null}

              {selected.note ? (
                <div className="guest-note guest-note--priority">
                  <span>Guest note</span>
                  <p>{selected.note}</p>
                </div>
              ) : (
                <div className="guest-note">
                  <span>Guest note</span>
                  <p>No guest note added.</p>
                </div>
              )}

              {selected.databaseId ? (
                <div className="staff-request-chat">
                  <h3 className="staff-request-chat__title">Conversation</h3>
                  <BookingChat
                    bookingId={selected.databaseId}
                    disabled={!canManageSelected}
                    guestLabel={selected.guest}
                    readOnly={isClosedConversation}
                    showHeading={false}
                    variant="staff"
                  />
                </div>
              ) : isPracticeMode ? (
                <p className="detail-help">
                  Conversation appears on live requests once Supabase is
                  connected.
                </p>
              ) : null}

              <div className="reservation-detail__groups">
                {selected.databaseId && !isClosedConversation ? (
                  <StaffInboxRoomTypeForm
                    bookingId={selected.databaseId}
                    canManage={canManageSelected}
                    formError={inboxRoomTypeError}
                    roomId={selected.roomId}
                    rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
                  />
                ) : null}
                <dl className="detail-list detail-list--group" aria-label="Stay">
                  {!selected.databaseId || isClosedConversation ? (
                    <div>
                      <dt>Room</dt>
                      <dd>{selected.room}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Dates</dt>
                    <dd>
                      {selected.dates} · {selected.nights} nights
                    </dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>
                      {formatMoneySuffix(
                        selected.estimatedTotal,
                        settings.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Payment</dt>
                    <dd>
                      {selected.depositPaid
                        ? `${formatMoneySuffix(selected.depositAmount, settings.currency)} paid`
                        : selected.bankTransferClaimed
                          ? "Bank transfer reported — verify in bank app"
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

              {!isClosedConversation ? (
                <StaffRequestDecisionPanel
                  bookingId={selected.databaseId ?? ""}
                  canManage={canManageSelected}
                  currency={settings.currency}
                  depositAmount={selected.depositAmount}
                  depositPaid={selected.depositPaid}
                  bankTransferClaimed={selected.bankTransferClaimed}
                  guestEmail={selected.contact}
                  guestName={selected.guest}
                  paidOverbooked={isPaidOverbookNote(selected.staffNote)}
                  practiceMode={isPracticeMode}
                />
              ) : (
                <p className="detail-help">
                  This request is closed. Conversation history stays available
                  above.
                </p>
              )}
            </aside>
          ) : (
            <aside className="reservation-detail" aria-labelledby="detail-title">
              <h2 id="detail-title">
                {preferInboxView
                  ? "Select a request"
                  : "Waiting for the first request."}
              </h2>
              <p>
                {preferInboxView
                  ? "Choose a guest from the inbox to review stay details and decide."
                  : "Once a guest sends the form, their dates, room, contact, and note appear here."}
              </p>
            </aside>
          )}
        </div>
      </section>
    </StaffShell>
  );
}
