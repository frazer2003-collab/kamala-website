"use client";

import { useMemo, useState } from "react";
import type { BookingQuoteResult } from "@/app/actions";
import { BookRoomLink } from "@/components/book-room-link";
import { OptimizedImage } from "@/components/optimized-image";
import { RoomDetailDialog } from "@/components/room-detail-dialog";
import type { Room } from "@/lib/content";
import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import { getPropertyTodayIso } from "@/lib/calendar";
import {
  applyPercentOff,
  getActivePromotionForRoom,
  type RoomPromotionRate,
} from "@/lib/pricing";
import {
  formatRoomTypeAvailabilityCount,
  getRoomAvailabilityLabel,
  isRoomBookable,
} from "@/lib/room-availability";
import { formatStayDateRange } from "@/lib/stay-dates";
import { buildRoomsSectionSubhead, buildRoomsSectionHeading } from "@/lib/home-hero-copy";
import { formatRoomEssentials } from "@/lib/room-essentials";

type HomeRoomCatalogProps = {
  rooms: Room[];
  currency: PropertyCurrency;
  availabilityByRoomId: Record<string, number>;
  availabilityVerifyFailed?: boolean;
  promotions: RoomPromotionRate[];
  quotesByRoomId?: Record<string, BookingQuoteResult>;
  stayDates?: { arrival: string; departure: string };
  hasStayDates: boolean;
  addressLine?: string | null;
};

type RoomPriceDisplay = {
  baseRate: number;
  rate: number;
  percentOff: number;
  hasPromotion: boolean;
  stayTotal: number | null;
};

function getRoomPriceDisplay(
  room: Room,
  promotions: RoomPromotionRate[],
  stayDates?: { arrival: string; departure: string },
  quote?: BookingQuoteResult,
): RoomPriceDisplay {
  if (stayDates && quote && quote.nights > 0) {
    const nightly =
      quote.effectiveNightlyRate ?? Math.round(quote.total / quote.nights);
    const percentOff =
      quote.hasPromotion && quote.baseTotal > 0
        ? Math.round(((quote.baseTotal - quote.total) / quote.baseTotal) * 100)
        : 0;

    return {
      baseRate: room.rate,
      rate: nightly,
      percentOff,
      hasPromotion: quote.hasPromotion && percentOff > 0,
      stayTotal: quote.total,
    };
  }

  const promo = getActivePromotionForRoom(room.id, promotions, getPropertyTodayIso());
  if (promo) {
    return {
      baseRate: room.rate,
      rate: applyPercentOff(room.rate, promo.percentOff),
      percentOff: promo.percentOff,
      hasPromotion: true,
      stayTotal: null,
    };
  }

  return {
    baseRate: room.rate,
    rate: room.rate,
    percentOff: 0,
    hasPromotion: false,
    stayTotal: null,
  };
}

function RoomListingCard({
  availabilityByRoomId,
  currency,
  hasStayDates,
  onOpenDetails,
  price,
  room,
  stayDates,
  variant = "standard",
}: {
  availabilityByRoomId: Record<string, number>;
  currency: PropertyCurrency;
  hasStayDates: boolean;
  onOpenDetails: (roomId: string) => void;
  price: RoomPriceDisplay;
  room: Room;
  stayDates?: { arrival: string; departure: string };
  variant?: "feature" | "standard";
}) {
  const availableCount = availabilityByRoomId[room.id] ?? room.availableCount;
  const bookable = isRoomBookable(availableCount);
  const availabilityLabel = hasStayDates
    ? formatRoomTypeAvailabilityCount(availableCount)
    : getRoomAvailabilityLabel(availableCount);
  const imageAlt = `${room.name} — ${room.outlook}`;

  const priceBlock = (
    <div className="listing-card__price">
      {price.hasPromotion ? (
        <>
          <span className="listing-card__price-was">
            {formatMoneySuffix(price.baseRate, currency)}
          </span>
          <strong className="listing-card__price-now">
            {formatMoneySuffix(price.rate, currency)}
          </strong>
          <span className="listing-card__price-off">{price.percentOff}% off</span>
        </>
      ) : (
        <strong>{formatMoneySuffix(price.rate, currency)}</strong>
      )}
      <span>
        {price.stayTotal != null
          ? `${formatMoneySuffix(price.stayTotal, currency)} for the stay`
          : "per night"}
      </span>
    </div>
  );

  const reserveControl = bookable ? (
    <BookRoomLink
      arrival={stayDates?.arrival}
      className="button button--primary listing-card__reserve"
      departure={stayDates?.departure}
      roomId={room.id}
    >
      Reserve
    </BookRoomLink>
  ) : (
    <button
      className="button button--secondary listing-card__reserve"
      onClick={() => onOpenDetails(room.id)}
      type="button"
    >
      View details
    </button>
  );

  if (variant === "standard") {
    return (
      <article className="listing-card listing-card--rail" role="listitem">
        <button
          className="listing-card__rail-main"
          data-room-trigger={room.id}
          onClick={() => onOpenDetails(room.id)}
          type="button"
        >
          {room.imageUrl ? (
            <div className="listing-card__media">
              <OptimizedImage
                alt={imageAlt}
                className="listing-card__image"
                fill
                sizes="(max-width: 919px) 72vw, 5rem"
                src={room.imageUrl}
              />
            </div>
          ) : (
            <div className={`listing-card__media listing-card__media--${room.tone}`}>
              <span>{room.shortName}</span>
            </div>
          )}
          <div className="listing-card__rail-copy">
            <h3>{room.name}</h3>
            <p className="listing-card__essentials">{formatRoomEssentials(room)}</p>
            <div className="listing-card__rail-facts">
              {priceBlock}
              <span
                className={`listing-card__availability ${
                  bookable
                    ? "listing-card__availability--open"
                    : "listing-card__availability--full"
                }`}
              >
                {availabilityLabel}
              </span>
            </div>
          </div>
        </button>
        <div className="listing-card__rail-cta">{reserveControl}</div>
      </article>
    );
  }

  return (
    <article className="listing-card listing-card--feature">
      <button
        className="listing-card__hit"
        data-room-trigger={room.id}
        onClick={() => onOpenDetails(room.id)}
        type="button"
      >
        {room.imageUrl ? (
          <div className="listing-card__media">
            <OptimizedImage
              alt={imageAlt}
              className="listing-card__image"
              fill
              priority
              sizes="(max-width: 920px) 100vw, 55vw"
              src={room.imageUrl}
            />
          </div>
        ) : (
          <div className={`listing-card__media listing-card__media--${room.tone}`}>
            <span>{room.shortName}</span>
          </div>
        )}
        <div className="listing-card__copy">
          <div className="listing-card__meta">
            <h3>{room.name}</h3>
            <p>{room.outlook}</p>
          </div>
          {priceBlock}
          <p className="listing-card__summary">{room.summary}</p>
          <div
            className={`listing-card__badge ${
              bookable ? "listing-card__badge--open" : "listing-card__badge--full"
            }`}
          >
            {availabilityLabel}
          </div>
        </div>
      </button>
      <div className="listing-card__actions">{reserveControl}</div>
    </article>
  );
}

export function HomeRoomCatalog({
  rooms,
  currency,
  availabilityByRoomId,
  availabilityVerifyFailed = false,
  promotions,
  quotesByRoomId = {},
  stayDates,
  hasStayDates,
  addressLine = null,
}: HomeRoomCatalogProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

  const pricesByRoomId = useMemo(() => {
    return Object.fromEntries(
      rooms.map((room) => [
        room.id,
        getRoomPriceDisplay(room, promotions, stayDates, quotesByRoomId[room.id]),
      ]),
    );
  }, [promotions, quotesByRoomId, rooms, stayDates]);

  const featuredRoom =
    rooms.find((room) =>
      isRoomBookable(availabilityByRoomId[room.id] ?? room.availableCount),
    ) ?? rooms[0];
  const otherRooms = rooms.filter((room) => room.id !== featuredRoom?.id);

  if (!featuredRoom) {
    return null;
  }

  return (
    <>
      <section className="section section--listings" id="rooms" aria-labelledby="rooms-title">
        <div className="section__heading section__heading--compact">
          <div className="section__heading-row">
            <h2 id="rooms-title">
              {buildRoomsSectionHeading(
                hasStayDates,
                stayDates ? formatStayDateRange(stayDates.arrival, stayDates.departure) : null,
                addressLine,
              )}
            </h2>
            {hasStayDates ? (
              <a className="section__change-dates" href="#dates">
                Change dates
              </a>
            ) : null}
          </div>
          <p className="section__subhead">
            {availabilityVerifyFailed
              ? "Availability could not be verified — treat open rooms as provisional until you reserve."
              : buildRoomsSectionSubhead(rooms.length, addressLine)}
          </p>
        </div>

        <div className="listing-showcase">
          <RoomListingCard
            availabilityByRoomId={availabilityByRoomId}
            currency={currency}
            hasStayDates={hasStayDates}
            onOpenDetails={setSelectedRoomId}
            price={pricesByRoomId[featuredRoom.id]}
            room={featuredRoom}
            stayDates={stayDates}
            variant="feature"
          />

          {otherRooms.length > 0 ? (
            <div className="listing-rail">
              <p className="listing-rail__label" id="rooms-rail-label">
                {otherRooms.length === 1 ? "Also available" : "More rooms"}
              </p>
              <div
                aria-labelledby="rooms-rail-label"
                className="listing-rail__track"
                role="list"
              >
              {otherRooms.map((room) => (
                <RoomListingCard
                  availabilityByRoomId={availabilityByRoomId}
                  currency={currency}
                  hasStayDates={hasStayDates}
                  key={room.id}
                  onOpenDetails={setSelectedRoomId}
                  price={pricesByRoomId[room.id]}
                  room={room}
                  stayDates={stayDates}
                  variant="standard"
                />
              ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <RoomDetailDialog
        availableCount={
          selectedRoom
            ? (availabilityByRoomId[selectedRoom.id] ?? selectedRoom.availableCount)
            : 0
        }
        currency={currency}
        onClose={() => setSelectedRoomId(null)}
        onSelectRoom={setSelectedRoomId}
        promotions={promotions}
        room={selectedRoom}
        rooms={rooms}
        stayQuote={selectedRoom ? quotesByRoomId[selectedRoom.id] : undefined}
        stayDates={stayDates}
      />
    </>
  );
}
