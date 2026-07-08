import Link from "next/link";
import { BookingChat } from "@/components/booking-chat";
import { getBookingByConversationToken, isChatReadOnly } from "@/lib/booking-chat";

export const dynamic = "force-dynamic";

export default async function BookingMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const booking = token ? await getBookingByConversationToken(token) : null;

  if (!token || !booking) {
    return (
      <main className="site-shell">
        <section className="section booking-result">
          <p className="section-note">Booking conversation</p>
          <h1>This link is not valid.</h1>
          <p>
            Use the conversation link from your booking confirmation email. If you
            need help, contact the guesthouse directly.
          </p>
          <Link className="button button--primary" href="/">
            Back to Kamala
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="site-shell">
      <section className="section booking-chat-page">
        <p className="section-note">Booking conversation</p>
        <h1>Hello, {booking.guest_name}.</h1>
        <p>
          Messages here stay with your reservation for {booking.room_name} (
          {booking.arrival_date} to {booking.departure_date}). Use this private
          page to read and send messages about your stay.
        </p>
        <BookingChat
          readOnly={isChatReadOnly(booking.status)}
          token={token}
          variant="guest"
        />
        <Link className="button button--secondary booking-chat-page__back" href="/">
          Back to Kamala
        </Link>
      </section>
    </main>
  );
}
