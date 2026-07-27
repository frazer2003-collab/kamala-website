import type { Viewport } from "next";
import Link from "next/link";
import { BookingChat } from "@/components/booking-chat";
import { CopyConversationLink } from "@/components/copy-conversation-link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import {
  getBookingByConversationToken,
  getGuestChatUrl,
  isChatReadOnly,
} from "@/lib/booking-chat";
import { getPropertySettings } from "@/lib/property-settings";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export default async function BookingMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const settings = await getPropertySettings();
  const booking = token ? await getBookingByConversationToken(token) : null;

  if (!token || !booking) {
    return (
      <main className="guest-site site-shell">
        <GuestTopbar settings={settings} />
        <section className="section booking-result">
          <h1>This link is not valid.</h1>
          <p>
            Open the private conversation link from your booking email, or
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

  return (
    <main className="guest-site site-shell guest-site--conversation">
      <GuestTopbar settings={settings} />
      <section className="section booking-chat-page booking-chat-page--conversation">
        <header className="booking-chat-page__intro-block">
          <h1>Hello, {booking.guest_name}.</h1>
          <p className="booking-chat-page__stay">
            {booking.room_name} · {booking.arrival_date} to {booking.departure_date}
          </p>
          <p className="booking-chat-page__intro">
            Private messages about your stay. Kamala emails you when they reply.
          </p>
          <CopyConversationLink url={getGuestChatUrl(token)} />
        </header>
        <div className="booking-chat-page__chat">
          <BookingChat
            readOnly={isChatReadOnly(booking.status)}
            token={token}
            variant="guest"
          />
        </div>
        <Link className="button button--secondary booking-chat-page__back" href="/">
          Back to {settings.propertyName}
        </Link>
      </section>
      <SiteFooter settings={settings} />
    </main>
  );
}
