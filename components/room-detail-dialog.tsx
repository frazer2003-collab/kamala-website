"use client";

import { useId, useMemo } from "react";
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
import { BookRoomLink } from "@/components/book-room-link";
import { PhotoCarousel } from "@/components/photo-carousel";
import { RoomAmenitiesList } from "@/components/room-amenities-list";

type RoomDetailDialogProps = {
  room: Room | null;
  currency: PropertyCurrency;
  availableCount: number;
  promotions?: RoomPromotionRate[];
  stayDates?: { arrival: string; departure: string };
  onClose: () => void;
};

function getRoomPhotos(room: Room) {
  const photos = [room.imageUrl, ...room.galleryUrls].filter(
    (url): url is string => Boolean(url),
  );

  return [...new Set(photos)];
}

export function RoomDetailDialog({
  room,
  currency,
  availableCount,
  promotions = [],
  stayDates,
  onClose,
}: RoomDetailDialogProps) {
  const titleId = useId();

  const price = useMemo(() => {
    if (!room) {
      return null;
    }

    if (stayDates) {
      const quote = calculateStayQuote({
        roomId: room.id,
        baseRate: room.rate,
        arrival: stayDates.arrival,
        departure: stayDates.departure,
        promotions,
      });

      if (quote.nights > 0 && quote.hasPromotion) {
        return {
          baseRate: room.rate,
          rate: Math.round(quote.total / quote.nights),
          percentOff: Math.round(
            ((quote.baseTotal - quote.total) / quote.baseTotal) * 100,
          ),
          hasPromotion: true,
        };
      }
    } else {
      const promo = getActivePromotionForRoom(room.id, promotions, getTodayIso());
      if (promo) {
        return {
          baseRate: room.rate,
          rate: applyPercentOff(room.rate, promo.percentOff),
          percentOff: promo.percentOff,
          hasPromotion: true,
        };
      }
    }

    return {
      baseRate: room.rate,
      rate: room.rate,
      percentOff: 0,
      hasPromotion: false,
    };
  }, [promotions, room, stayDates]);

  if (!room || !price) {
    return null;
  }

  const photos = getRoomPhotos(room);
  const bookable = isRoomBookable(availableCount);

  return (
    <div className="room-detail-dialog">
      <button
        aria-label="Close room details"
        className="room-detail-dialog__backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="room-detail-dialog__panel"
        role="dialog"
      >
        <div className="room-detail-dialog__header">
          <div>
            <p className="section-note">{room.shortName}</p>
            <h2 id={titleId}>{room.name}</h2>
          </div>
          <button className="button button--quiet" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <PhotoCarousel
          className="room-detail-dialog__carousel"
          photos={photos}
          placeholder={
            <div className={`room-figure room-figure--${room.tone} room-detail-dialog__photo room-detail-dialog__photo--placeholder`}>
              <span>{room.shortName}</span>
            </div>
          }
        />

        <div className="room-detail-dialog__body">
          <div className="room-detail-dialog__meta">
            {price.hasPromotion ? (
              <div className="room-detail-dialog__price room-detail-dialog__price--promo">
                <span className="listing-card__price-was">
                  {formatMoney(price.baseRate, currency)}
                </span>
                <strong>{formatMoney(price.rate, currency)}</strong>
                <span className="listing-card__price-off">{price.percentOff}% off</span>
              </div>
            ) : (
              <strong>{formatMoney(price.rate, currency)}</strong>
            )}
            <span>{room.sleeps}</span>
          </div>
          <p className="room-detail-dialog__outlook">{room.outlook}</p>
          <p>{room.summary}</p>
          <RoomAmenitiesList amenities={room.amenities} label={`${room.name} amenities`} />

          <div
            className={`room-status ${
              bookable ? "room-status--available" : "room-status--full"
            }`}
          >
            <span aria-hidden="true" />
            {stayDates
              ? `${formatRoomTypeAvailabilityCount(availableCount)} for ${formatStayDateRange(stayDates.arrival, stayDates.departure)}`
              : getRoomAvailabilityLabel(availableCount)}
          </div>
        </div>

        <div className="room-detail-dialog__actions">
          {bookable ? (
            <BookRoomLink
              arrival={stayDates?.arrival}
              className="button button--primary"
              departure={stayDates?.departure}
              onNavigate={onClose}
              roomId={room.id}
            >
              Reserve
            </BookRoomLink>
          ) : (
            <span
              aria-disabled="true"
              className="button button--primary room-card__book--disabled"
            >
              Unavailable
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
