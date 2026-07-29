"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { formatRoomEssentials, formatRoomOutlookDetails } from "@/lib/room-essentials";

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
  const essentials = formatRoomEssentials(room);
  const outlookDetails = formatRoomOutlookDetails(room);
  const imageAlt = [room.name, essentials, outlookDetails].filter(Boolean).join(" — ");
  const openDetailsLabel = [
    `View details for ${room.name}`,
    essentials,
    outlookDetails,
  ]
    .filter(Boolean)
    .join(". ");

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

  const statusClass = bookable
    ? "listing-card__status listing-card__status--open"
    : "listing-card__status listing-card__status--full";

  const statusBlock = (
    <span className={statusClass}>
      <span className="listing-card__status-mark" aria-hidden="true">
        {bookable ? "○" : "×"}
      </span>
      <span className="listing-card__status-text">{availabilityLabel}</span>
    </span>
  );

  let reserveControl: ReactNode;
  if (hasStayDates && bookable) {
    reserveControl = (
      <BookRoomLink
        arrival={stayDates?.arrival}
        className="button button--primary listing-card__reserve"
        departure={stayDates?.departure}
        roomId={room.id}
      >
        Reserve
      </BookRoomLink>
    );
  } else if (hasStayDates && !bookable) {
    reserveControl = (
      <a className="button button--secondary listing-card__reserve" href="#dates">
        Change dates
      </a>
    );
  } else if (bookable) {
    reserveControl = (
      <a className="button button--secondary listing-card__reserve" href="#dates">
        Check dates
      </a>
    );
  } else {
    reserveControl = (
      <button
        className="button button--secondary listing-card__reserve"
        onClick={() => onOpenDetails(room.id)}
        type="button"
      >
        View details
      </button>
    );
  }

  const media = room.imageUrl ? (
    <div className="listing-card__media">
      <OptimizedImage
        alt={imageAlt}
        className="listing-card__image"
        fill
        priority={variant === "feature"}
        sizes={
          variant === "feature"
            ? "(max-width: 920px) 100vw, 55vw"
            : "(max-width: 919px) 100vw, 5rem"
        }
        src={room.imageUrl}
      />
    </div>
  ) : (
    <div
      aria-hidden="true"
      className={`listing-card__media listing-card__media--${room.tone}`}
    >
      <span>{room.shortName}</span>
    </div>
  );

  if (variant === "standard") {
    return (
      <article className="listing-card listing-card--rail" role="listitem">
        <button
          aria-label={openDetailsLabel}
          className="listing-card__rail-main"
          data-room-trigger={room.id}
          onClick={() => onOpenDetails(room.id)}
          type="button"
        >
          {media}
          <div className="listing-card__rail-copy">
            <h3>{room.name}</h3>
            <p className="listing-card__essentials">{essentials}</p>
            {outlookDetails ? (
              <p className="listing-card__outlook">{outlookDetails}</p>
            ) : null}
            <div className="listing-card__rail-facts">
              {priceBlock}
              {statusBlock}
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
        aria-label={openDetailsLabel}
        className="listing-card__hit"
        data-room-trigger={room.id}
        onClick={() => onOpenDetails(room.id)}
        type="button"
      >
        {media}
        <div className="listing-card__copy">
          <div className="listing-card__meta">
            <h3>{room.name}</h3>
            <p className="listing-card__essentials">{essentials}</p>
            {outlookDetails ? (
              <p className="listing-card__outlook">{outlookDetails}</p>
            ) : null}
          </div>
          {priceBlock}
          {room.summary.trim() ? (
            <p className="listing-card__summary">{room.summary}</p>
          ) : null}
          {statusBlock}
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
            {buildRoomsSectionSubhead(rooms.length, addressLine)}
          </p>
          {availabilityVerifyFailed ? (
            <p className="section__verify-note" role="status">
              Live availability couldn’t be confirmed — rooms marked open may
              already be full when you reserve.
            </p>
          ) : null}
          {!hasStayDates ? (
            <p className="section__dates-prompt">
              <a className="section__dates-prompt-link" href="#dates">
                Check your dates
              </a>{" "}
              to see which rooms are free for your stay.
            </p>
          ) : null}
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
                {otherRooms.length === 1
                  ? "1 more room type"
                  : `${otherRooms.length} more room types`}
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
