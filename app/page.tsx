import dynamic from "next/dynamic";
import { GuestTopbar } from "@/components/guest-topbar";
import { HomeHeroShell } from "@/components/home-hero-shell";
import { HomeDateSearchSection } from "@/components/home-date-search-section";
import { HomeRoomCatalog } from "@/components/home-room-catalog";
import { SiteFooter } from "@/components/site-footer";
import { isLocale } from "@/lib/i18n";
import { getPropertySettings } from "@/lib/property-settings";
import { hasStripeClientConfig, getStripePublishableKey } from "@/lib/stripe";
import { formatRoomTypeAvailabilityCount } from "@/lib/room-availability";
import { getPublicRooms } from "@/lib/rooms";
import { getPublicRoomPromotions } from "@/lib/room-promotions";
import { getRoomsStayAvailability } from "@/lib/stay-availability";
import { formatStayDateRange, parseStayDates } from "@/lib/stay-dates";

const BookingRequest = dynamic(
  () =>
    import("@/components/booking-request-lazy").then((module) => module.BookingRequestLazy),
  {
    loading: () => (
      <div className="booking-panel booking-panel--loading" id="booking" aria-busy="true">
        <p className="section-note">Request a stay</p>
        <p>Loading booking form…</p>
      </div>
    ),
  },
);

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

  return (
    <main>
      <HomeHeroShell heroImageUrl={settings.heroImageUrl}>
        <GuestTopbar current="home" settings={settings} />

        <section className="hero hero--airbnb" aria-label="Plan your stay">
          <HomeDateSearchSection
            addressLine={settings.addressLine}
            arrival={arrival}
            contactPhone={settings.contactPhone}
            dateError={dateError}
            departure={departure}
            propertyName={settings.propertyName}
            showLocationMap={!settings.heroImageUrl}
          />

          <aside className="trip-card" aria-label="Room availability">
            <div className="trip-card__header">
              <span className="status-dot" aria-hidden="true" />
              <span>
                {stayDates
                  ? `Availability for ${formatStayDateRange(stayDates.arrival, stayDates.departure)}`
                  : "Start with your dates"}
              </span>
            </div>

            <div className="trip-card__availability">
              <h2 className="trip-card__section-title">
                {stayDates ? "Rooms free for your dates" : "Room availability"}
              </h2>
              {stayDates ? (
                <dl>
                  {rooms.map((room) => {
                    const availableCount = availabilityByRoomId[room.id] ?? 0;

                    return (
                      <div key={room.id}>
                        <dt>{room.shortName}</dt>
                        <dd
                          className={
                            availableCount <= 0 ? "trip-card__count--full" : undefined
                          }
                        >
                          {formatRoomTypeAvailabilityCount(availableCount)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="trip-card__prompt">
                  Enter arrival and departure above to see which room types are
                  still available for your stay.
                </p>
              )}
            </div>
          </aside>
        </section>
      </HomeHeroShell>

      <div className="site-shell">
      <HomeRoomCatalog
        availabilityByRoomId={availabilityByRoomId}
        currency={settings.currency}
        hasStayDates={Boolean(stayDates)}
        promotions={promotions}
        propertyName={settings.propertyName}
        rooms={rooms}
        stayDates={stayDates ?? undefined}
      />

      <BookingRequest
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

      <section className="section section--rules" aria-labelledby="rules-title">
        <div className="section__heading">
          <p className="section-note">Before you request</p>
          <h2 id="rules-title">House rules</h2>
        </div>
        <ul className="rules-list">
          {settings.houseRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <SiteFooter settings={settings} />
      </div>
    </main>
  );
}
