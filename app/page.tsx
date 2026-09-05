import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBookingQuotesForRooms } from "@/lib/booking-quote";
import { GuestTopbar } from "@/components/guest-topbar";
import { HomeBookingSection } from "@/components/home-booking-section";
import { HomeHeroShell } from "@/components/home-hero-shell";
import { HomeDateSearchSection } from "@/components/home-date-search-section";
import { HomeRoomCatalog } from "@/components/home-room-catalog";
import { HomeStayAssurances } from "@/components/home-stay-assurances";
import { HomeStayStory } from "@/components/home-stay-story";
import { HomeStickyReserve } from "@/components/home-sticky-reserve";
import { SiteFooter } from "@/components/site-footer";
import { isLocale } from "@/lib/i18n";
import { HomeStickyDates } from "@/components/home-sticky-dates";
import { HomeHashScroll } from "@/components/home-hash-scroll";
import { HomePageJsonLd } from "@/components/home-page-json-ld";
import { resolveHeroImageUrl } from "@/lib/home-hero-media";
import { buildHomePageJsonLd, buildHomePageMetadata, buildHomePageWebSiteJsonLd } from "@/lib/home-seo";
import { getPropertySettings } from "@/lib/property-settings";
import { hasStripeClientConfig, getStripePublishableKey } from "@/lib/stripe-public";
import { getPublicRooms } from "@/lib/rooms";
import { getPublicRoomPromotions } from "@/lib/room-promotions";
import { getRoomsStayAvailability } from "@/lib/stay-availability";
import {
  buildHomeStaySearchParams,
  refreshStaleStayDates,
  resolveHomeStayDates,
} from "@/lib/stay-dates";
import { getPropertyTodayIso } from "@/lib/calendar";
import {
  getGuestNightAvailability,
  guestNightAvailabilityLatestIso,
  shiftStayDatesIfArrivalFull,
} from "@/lib/guest-night-availability";
import { addIsoDays } from "@/lib/room-day-inventory";

import "./home-landing.css";
import "./home-direct-booking.css";
import "./home-overdrive.css";


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

  const refreshed = refreshStaleStayDates(arrival, departure);
  if (refreshed) {
    redirect(
      `/?${buildHomeStaySearchParams({
        arrival: refreshed.arrival,
        departure: refreshed.departure,
        room: initialRoomId,
        lang,
      })}`,
    );
  }

  const [rooms, promotions, settings] = await Promise.all([
    getPublicRooms(),
    getPublicRoomPromotions(),
    getPropertySettings(),
  ]);
  const {
    stayDates: resolvedStayDates,
    dateError,
  } = resolveHomeStayDates(arrival, departure);

  let stayDates = resolvedStayDates;
  let stayAvailability: Awaited<ReturnType<typeof getRoomsStayAvailability>> | null =
    null;

  if (stayDates) {
    const today = getPropertyTodayIso();
    const latest = guestNightAvailabilityLatestIso(today);
    const searchToCandidate = addIsoDays(stayDates.arrival, 45);
    const searchTo = searchToCandidate < latest ? searchToCandidate : latest;

    if (searchTo >= stayDates.arrival) {
      // Common path: run night + stay checks together; re-fetch stay only if arrival shifts.
      const [nightAvailability, initialStayAvailability] = await Promise.all([
        getGuestNightAvailability(rooms, stayDates.arrival, searchTo),
        getRoomsStayAvailability(rooms, stayDates.arrival, stayDates.departure),
      ]);

      stayAvailability = initialStayAvailability;

      if (nightAvailability.status === "ok") {
        const shifted = shiftStayDatesIfArrivalFull(
          stayDates,
          nightAvailability.nights,
          latest,
        );
        if (
          shifted &&
          (arrival !== shifted.arrival || departure !== shifted.departure)
        ) {
          redirect(
            `/?${buildHomeStaySearchParams({
              arrival: shifted.arrival,
              departure: shifted.departure,
              room: initialRoomId,
              lang,
            })}`,
          );
        }
        if (shifted) {
          stayDates = shifted;
          if (
            shifted.arrival !== resolvedStayDates!.arrival ||
            shifted.departure !== resolvedStayDates!.departure
          ) {
            stayAvailability = await getRoomsStayAvailability(
              rooms,
              shifted.arrival,
              shifted.departure,
            );
          }
        }
      }
    } else {
      stayAvailability = await getRoomsStayAvailability(
        rooms,
        stayDates.arrival,
        stayDates.departure,
      );
    }
  }

  const availabilityVerifyFailed = stayAvailability?.status === "verify-failed";
  const availabilityByRoomId = Object.fromEntries(
    (stayAvailability?.rooms ??
      rooms.map((room) => ({
        roomId: room.id,
        availableCount: room.availableCount,
      }))).map((entry) => [entry.roomId, entry.availableCount]),
  );
  const quotesByRoomId = stayDates
    ? await getBookingQuotesForRooms(rooms, stayDates.arrival, stayDates.departure, promotions)
    : {};
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? null;
  const lodgingJsonLd = buildHomePageJsonLd(
    settings,
    rooms,
    appUrl,
    availabilityByRoomId,
  );
  const websiteJsonLd = buildHomePageWebSiteJsonLd(settings, appUrl);
  const jsonLd = websiteJsonLd ? [lodgingJsonLd, websiteJsonLd] : lodgingJsonLd;

  return (
    <main className="guest-site home-page">
      <HomePageJsonLd data={jsonLd} />
      <GuestTopbar current="home" settings={settings} variant="home" />
      <HomeHeroShell heroImageUrl={resolveHeroImageUrl(settings.heroImageUrl)}>
        <div className="hero hero--atmosphere">
          <HomeDateSearchSection
            addressLine={settings.addressLine}
            arrival={stayDates?.arrival ?? arrival}
            dateError={dateError}
            departure={stayDates?.departure ?? departure}
            propertyName={settings.propertyName}
            propertyTagline={settings.propertyTagline}
          />
        </div>
      </HomeHeroShell>

      <HomeHashScroll />
      <HomeStickyDates
        arrival={stayDates?.arrival}
        departure={stayDates?.departure}
      />

      <div className="site-shell home-body">
        <HomeStayAssurances />

        <div className="home-book-zone">
          <HomeRoomCatalog
            addressLine={settings.addressLine}
            availabilityByRoomId={availabilityByRoomId}
            availabilityVerifyFailed={availabilityVerifyFailed}
            currency={settings.currency}
            hasStayDates={Boolean(stayDates)}
            promotions={promotions}
            quotesByRoomId={quotesByRoomId}
            rooms={rooms}
            stayDates={stayDates ?? undefined}
          />

          <HomeBookingSection
            availabilityByRoomId={availabilityByRoomId}
            bankTransfer={{
              promptPayId: settings.promptPayId,
              bankName: settings.bankName,
              accountName: settings.accountName,
              accountNumber: settings.accountNumber,
            }}
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
        </div>

        <HomeStayStory
          addressLine={settings.addressLine}
          checkInFrom={settings.checkInFrom}
          checkInUntil={settings.checkInUntil}
          houseRules={settings.houseRules}
          propertyName={settings.propertyName}
          propertyTagline={settings.propertyTagline}
        />

        <SiteFooter settings={settings} />
      </div>

      <HomeStickyReserve initialRoomId={initialRoomId} rooms={rooms} />
    </main>
  );
}
