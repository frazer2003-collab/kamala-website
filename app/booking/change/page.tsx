import Link from "next/link";
import { GuestStayChange } from "@/components/guest-stay-change";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { isBankTransferAvailable } from "@/lib/bank-transfer";
import { getGuestChatPath } from "@/lib/booking-chat";
import { getBookingStayTotal, loadStayForChange } from "@/lib/guest-stay-change-server";
import { getPropertySettings } from "@/lib/property-settings";
import { getPublicRooms, getRoomForBooking } from "@/lib/rooms";
import { formatStayDateRange } from "@/lib/stay-dates";
import { getStripePublishableKey, hasStripeClientConfig } from "@/lib/stripe";
import "@/app/guest-stay-change.css";

export const dynamic = "force-dynamic";

export default async function BookingChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; payment_intent?: string }>;
}) {
  const { token, payment_intent: returnedPaymentIntent } = await searchParams;
  const settings = await getPropertySettings();
  const stay = token ? await loadStayForChange(token) : null;

  if (!token || !stay || stay.status !== "ok") {
    return (
      <main className="guest-site site-shell">
        <GuestTopbar settings={settings} />
        <section className="section booking-result">
          <h1>This link is not valid.</h1>
          <p>
            Open the Change your stay link from your confirmation email, or
            contact the guesthouse for help.
          </p>
          <Link className="button button--primary" href="/">
            Back to {settings.propertyName}
          </Link>
        </section>
        <SiteFooter settings={settings} />
      </main>
    );
  }

  const { booking, eligibility, todayIso } = stay;
  const chatPath = getGuestChatPath(token);
  const currentStay = `${booking.room_name} · ${formatStayDateRange(booking.arrival_date, booking.departure_date)}`;

  if (!eligibility.ok && !returnedPaymentIntent) {
    let heading = "This stay can’t be changed online.";
    let body = "Message us and we’ll help.";

    if (eligibility.reason === "not-confirmed") {
      heading = "Your booking isn’t confirmed yet.";
      body = "You can change your stay once we confirm it. Message us if you need something sooner.";
    } else if (eligibility.reason === "stay-started") {
      heading = "Your stay has started.";
      body = "Changes on or after check-in day go through the front desk. Message us and we’ll help.";
    } else if (eligibility.reason === "change-pending") {
      const pendingRoom = booking.pending_room_id
        ? (await getRoomForBooking(booking.pending_room_id))?.name ?? booking.room_name
        : booking.room_name;
      heading = "We’re checking your transfer.";
      body = `Once we see it, your stay moves to ${pendingRoom}, ${formatStayDateRange(
        booking.pending_arrival_date ?? booking.arrival_date,
        booking.pending_departure_date ?? booking.departure_date,
      )}. We’ll email you.`;
    }

    return (
      <main className="guest-site site-shell">
        <GuestTopbar settings={settings} />
        <section className="section booking-result stay-change">
          <h1>{heading}</h1>
          <p className="stay-change__now">{currentStay}</p>
          <p>{body}</p>
          <Link className="button button--primary" href={chatPath}>
            Message us
          </Link>
        </section>
        <SiteFooter settings={settings} />
      </main>
    );
  }

  const rooms = await getPublicRooms();
  const bankTransfer = {
    promptPayId: settings.promptPayId,
    bankName: settings.bankName,
    accountName: settings.accountName,
    accountNumber: settings.accountNumber,
  };

  return (
    <main className="guest-site site-shell">
      <GuestTopbar settings={settings} />
      <section className="section stay-change">
        <GuestStayChange
          bankTransfer={
            isBankTransferAvailable(bankTransfer, settings.currency) ? bankTransfer : null
          }
          chatPath={chatPath}
          currency={settings.currency}
          current={{
            roomId: booking.room_id,
            roomName: booking.room_name,
            arrivalDate: booking.arrival_date,
            departureDate: booking.departure_date,
            nights: booking.nights,
            paidAmount: booking.deposit_paid_at ? getBookingStayTotal(booking) : null,
          }}
          guestName={booking.guest_name}
          publishableKey={hasStripeClientConfig() ? getStripePublishableKey() : null}
          returnedPaymentIntent={returnedPaymentIntent ?? null}
          rooms={rooms.map((room) => ({
            id: room.id,
            name: room.name,
            sleeps: room.sleeps,
          }))}
          todayIso={todayIso}
          token={token}
        />
      </section>
      <SiteFooter settings={settings} />
    </main>
  );
}
