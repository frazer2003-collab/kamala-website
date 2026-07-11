"use client";

import { useEffect, useId, useMemo, useRef } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  const pricing = useMemo(() => {
    if (!room) {
      return null;
    }

    const stayQuote = stayDates
      ? calculateStayQuote({
          roomId: room.id,
          baseRate: room.rate,
          arrival: stayDates.arrival,
          departure: stayDates.departure,
          promotions,
        })
      : null;

    if (stayDates && stayQuote && stayQuote.nights > 0 && stayQuote.hasPromotion) {
      return {
        baseRate: room.rate,
        rate: Math.round(stayQuote.total / stayQuote.nights),
        percentOff: Math.round(
          ((stayQuote.baseTotal - stayQuote.total) / stayQuote.baseTotal) * 100,
        ),
        hasPromotion: true,
        stayQuote,
      };
    }

    if (stayDates && stayQuote && stayQuote.nights > 0) {
      return {
        baseRate: room.rate,
        rate: room.rate,
        percentOff: 0,
        hasPromotion: false,
        stayQuote,
      };
    }

    const promo = getActivePromotionForRoom(room.id, promotions, getTodayIso());
    if (promo) {
      return {
        baseRate: room.rate,
        rate: applyPercentOff(room.rate, promo.percentOff),
        percentOff: promo.percentOff,
        hasPromotion: true,
        stayQuote: null,
      };
    }

    return {
      baseRate: room.rate,
      rate: room.rate,
      percentOff: 0,
      hasPromotion: false,
      stayQuote: null,
    };
  }, [promotions, room, stayDates]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (room) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [room]);

  if (!room || !pricing) {
    return (
      <dialog
        className="room-detail-dialog"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClose={onClose}
        ref={dialogRef}
      />
    );
  }

  const photos = getRoomPhotos(room);
  const bookable = isRoomBookable(availableCount);
  const photoAlt = `${room.name} — ${room.outlook}`;

  return (
    <dialog
      aria-labelledby={titleId}
      className="room-detail-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="room-detail-dialog__panel">
        <div className="room-detail-dialog__header">
          <h2 id={titleId}>{room.name}</h2>
          <button className="button button--quiet" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <PhotoCarousel
          alt={photoAlt}
          className="room-detail-dialog__carousel"
          photos={photos}
          placeholder={
            <div
              className={`room-figure room-figure--${room.tone} room-detail-dialog__photo room-detail-dialog__photo--placeholder`}
            >
              <span>{room.shortName}</span>
            </div>
          }
        />

        <div className="room-detail-dialog__body">
          <div className="room-detail-dialog__meta">
            {pricing.hasPromotion ? (
              <div className="room-detail-dialog__price room-detail-dialog__price--promo">
                <span className="listing-card__price-was">
                  {formatMoney(pricing.baseRate, currency)}
                </span>
                <strong>{formatMoney(pricing.rate, currency)}</strong>
                <span className="listing-card__price-off">{pricing.percentOff}% off</span>
              </div>
            ) : (
              <strong>{formatMoney(pricing.rate, currency)}</strong>
            )}
            <span className="room-detail-dialog__unit">per night</span>
            <span>{room.sleeps}</span>
          </div>

          {pricing.stayQuote && pricing.stayQuote.nights > 0 ? (
            <p className="room-detail-dialog__stay-total">
              {formatMoney(pricing.stayQuote.total, currency)} total for{" "}
              {pricing.stayQuote.nights}{" "}
              {pricing.stayQuote.nights === 1 ? "night" : "nights"} (
              {formatStayDateRange(stayDates!.arrival, stayDates!.departure)})
            </p>
          ) : null}

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

        {bookable ? (
          <div className="room-detail-dialog__actions">
            <BookRoomLink
              arrival={stayDates?.arrival}
              className="button button--primary"
              departure={stayDates?.departure}
              onNavigate={onClose}
              roomId={room.id}
            >
              Reserve
            </BookRoomLink>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
