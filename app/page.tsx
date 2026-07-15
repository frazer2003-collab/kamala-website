import type { Metadata } from "next";
import { GuestTopbar } from "@/components/guest-topbar";
import { HomeBookingSection } from "@/components/home-booking-section";
import { HomeHeroShell } from "@/components/home-hero-shell";
import { HomeDateSearchSection } from "@/components/home-date-search-section";
import { HomeRoomCatalog } from "@/components/home-room-catalog";
import { HomeStayStory } from "@/components/home-stay-story";
import { SiteFooter } from "@/components/site-footer";
import { isLocale } from "@/lib/i18n";
import { HomeStickyDates } from "@/components/home-sticky-dates";
import { HomePageJsonLd } from "@/components/home-page-json-ld";
import { resolveHeroImageUrl } from "@/lib/home-hero-media";
import { buildHomePageJsonLd, buildHomePageMetadata } from "@/lib/home-seo";
import { getPropertySettings } from "@/lib/property-settings";
import { hasStripeClientConfig, getStripePublishableKey } from "@/lib/stripe";
import { getPublicRooms } from "@/lib/rooms";
import { getPublicRoomPromotions } from "@/lib/room-promotions";
import { getRoomsStayAvailability } from "@/lib/stay-availability";
import { parseStayDates } from "@/lib/stay-dates";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  return buildHomePageMetadata(settings);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    room?: string;
    lang?: string;
    arrival?: string;
    departure?: string;
  }>;
}) {
  const { room: initialRoomId, lang, arrival, departure } = await searchParams;
  const [rooms, promotions, settings] = await Promise.all([
    getPublicRooms(),
    getPublicRoomPromotions(),
    getPropertySettings(),
  ]);
  const stayDates = parseStayDates(arrival, departure);
  const dateError = Boolean((arrival || departure) && !stayDates);
  const stayAvailability = stayDates
    ? await getRoomsStayAvailability(rooms, stayDates.arrival, stayDates.departure)
    : null;
  const availabilityByRoomId = Object.fromEntries(
    (stayAvailability ?? rooms.map((room) => ({
      roomId: room.id,
      availableCount: room.availableCount,
    }))).map((entry) => [entry.roomId, entry.availableCount]),
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? null;
  const jsonLd = buildHomePageJsonLd(settings, rooms, appUrl);

  return (
    <main className="guest-site">
      <HomePageJsonLd data={jsonLd} />
      <HomeHeroShell heroImageUrl={resolveHeroImageUrl(settings.heroImageUrl)}>
        <GuestTopbar current="home" settings={settings} />

        <div className="hero hero--atmosphere">
          <HomeDateSearchSection
            addressLine={settings.addressLine}
            arrival={arrival}
            dateError={dateError}
            departure={departure}
            propertyName={settings.propertyName}
            propertyTagline={settings.propertyTagline}
          />
        </div>
      </HomeHeroShell>

      <HomeStickyDates
        arrival={stayDates?.arrival}
        departure={stayDates?.departure}
      />

      <div className="site-shell home-body">
        <HomeRoomCatalog
          addressLine={settings.addressLine}
          availabilityByRoomId={availabilityByRoomId}
          currency={settings.currency}
          hasStayDates={Boolean(stayDates)}
          promotions={promotions}
          rooms={rooms}
          stayDates={stayDates ?? undefined}
        />

        <HomeStayStory
          addressLine={settings.addressLine}
          checkInFrom={settings.checkInFrom}
          checkInUntil={settings.checkInUntil}
          houseRules={settings.houseRules}
          propertyName={settings.propertyName}
          propertyTagline={settings.propertyTagline}
        />

        <HomeBookingSection
          allowPayOnArrival={settings.allowPayOnArrival}
          availabilityByRoomId={availabilityByRoomId}
          currency={settings.currency}
          initialArrival={stayDates?.arrival}
          initialDeparture={stayDates?.departure}
          initialLocale={isLocale(lang) ? lang : "en"}
          initialRoomId={initialRoomId}
          promotions={promotions}
          rooms={rooms}
          stripePublishableKey={
            hasStripeClientConfig() ? getStripePublishableKey() : null
          }
        />

        <SiteFooter settings={settings} />
      </div>
    </main>
  );
}
