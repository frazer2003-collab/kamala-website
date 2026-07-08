"use client";

import { useEffect, useMemo, useState } from "react";
import { BookRoomLink } from "@/components/book-room-link";
import { OptimizedImage } from "@/components/optimized-image";
import { RoomDetailDialog } from "@/components/room-detail-dialog";
import type { Room } from "@/lib/content";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import { getTodayIso } from "@/lib/calendar";
import {
  applyPercentOff,
  calculateStayQuote,
  getActivePromotionForRoom,
  type RoomPromotionRate,
} from "@/lib/pricing";
import {
  formatRoomTypeAvailabilityCount,
  getRoomAvailabilityLabel,
  isRoomBookable,
} from "@/lib/room-availability";
import { formatStayDateRange } from "@/lib/stay-dates";

type HomeRoomCatalogProps = {
  rooms: Room[];
  currency: PropertyCurrency;
  availabilityByRoomId: Record<string, number>;
  promotions: RoomPromotionRate[];
  propertyName: string;
  stayDates?: { arrival: string; departure: string };
  hasStayDates: boolean;
};

function getRoomPriceDisplay(
  room: Room,
  promotions: RoomPromotionRate[],
  stayDates?: { arrival: string; departure: string },
) {
  if (stayDates) {
    const quote = calculateStayQuote({
      roomId: room.id,
      baseRate: room.rate,
      arrival: stayDates.arrival,
      departure: stayDates.departure,
      promotions,
    });

    if (quote.nights > 0 && quote.hasPromotion) {
      const nightly = Math.round(quote.total / quote.nights);
      const percentOff = Math.round(
        ((quote.baseTotal - quote.total) / quote.baseTotal) * 100,
      );
      return {
        baseRate: room.rate,
        rate: nightly,
        percentOff,
        hasPromotion: true,
      };
    }

    return {
      baseRate: room.rate,
      rate: room.rate,
      percentOff: 0,
      hasPromotion: false,
    };
  }

  const promo = getActivePromotionForRoom(room.id, promotions, getTodayIso());
  if (promo) {
    return {
      baseRate: room.rate,
      rate: applyPercentOff(room.rate, promo.percentOff),
      percentOff: promo.percentOff,
      hasPromotion: true,
    };
  }

  return {
    baseRate: room.rate,
    rate: room.rate,
    percentOff: 0,
    hasPromotion: false,
  };
}

export function HomeRoomCatalog({
  rooms,
  currency,
  availabilityByRoomId,
  promotions,
  propertyName,
  stayDates,
  hasStayDates,
}: HomeRoomCatalogProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedRoomId(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedRoomId]);

  const pricesByRoomId = useMemo(() => {
    return Object.fromEntries(
      rooms.map((room) => [room.id, getRoomPriceDisplay(room, promotions, stayDates)]),
    );
  }, [promotions, rooms, stayDates]);

  return (
    <>
      <section className="section section--listings" id="rooms" aria-labelledby="rooms-title">
        <div className="section__heading section__heading--compact">
          <h2 id="rooms-title">
            {hasStayDates && stayDates
              ? `Rooms for ${formatStayDateRange(stayDates.arrival, stayDates.departure)}`
              : `Rooms at ${propertyName}`}
          </h2>
        </div>

        <div className="listing-grid">
          {rooms.map((room) => {
            const availableCount = availabilityByRoomId[room.id] ?? room.availableCount;
            const bookable = isRoomBookable(availableCount);
            const price = pricesByRoomId[room.id];

            return (
              <article className="listing-card" key={room.id}>
                <button
                  className="listing-card__hit"
                  onClick={() => setSelectedRoomId(room.id)}
                  type="button"
                >
                  {room.imageUrl ? (
                    <div className="listing-card__media">
                      <OptimizedImage
                        alt=""
                        className="listing-card__image"
                        fill
                        sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
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
                    <div className="listing-card__price">
                      {price.hasPromotion ? (
                        <>
                          <span className="listing-card__price-was">
                            {formatMoney(price.baseRate, currency)}
                          </span>
                          <strong className="listing-card__price-now">
                            {formatMoney(price.rate, currency)}
                          </strong>
                          <span className="listing-card__price-off">
                            {price.percentOff}% off
                          </span>
                        </>
                      ) : (
                        <strong>{formatMoney(price.rate, currency)}</strong>
                      )}
                      <span>per night</span>
                    </div>
                    <p className="listing-card__summary">{room.summary}</p>
                    <div
                      className={`listing-card__badge ${
                        bookable ? "listing-card__badge--open" : "listing-card__badge--full"
                      }`}
                    >
                      {hasStayDates
                        ? formatRoomTypeAvailabilityCount(availableCount)
                        : getRoomAvailabilityLabel(availableCount)}
                    </div>
                  </div>
                </button>
                <div className="listing-card__actions">
                  {bookable ? (
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
                      onClick={() => setSelectedRoomId(room.id)}
                      type="button"
                    >
                      View details
                    </button>
                  )}
                </div>
              </article>
            );
          })}
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
        promotions={promotions}
        room={selectedRoom}
        stayDates={stayDates}
      />
    </>
  );
}
