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
import {
  formatRoomEssentials,
  formatRoomOutlookDetails,
} from "@/lib/room-essentials";
import { BookRoomLink } from "@/components/book-room-link";
import { PhotoCarousel } from "@/components/photo-carousel";
import { RoomAmenitiesList } from "@/components/room-amenities-list";

type RoomDetailDialogProps = {
  room: Room | null;
  rooms?: Room[];
  currency: PropertyCurrency;
  availableCount: number;
  promotions?: RoomPromotionRate[];
  stayDates?: { arrival: string; departure: string };
  onClose: () => void;
  onSelectRoom?: (roomId: string) => void;
};

function getRoomPhotos(room: Room) {
  const photos = [room.imageUrl, ...room.galleryUrls].filter(
    (url): url is string => Boolean(url),
  );

  return [...new Set(photos)];
}

function focusRoomTrigger(roomId: string | null) {
  if (!roomId || typeof document === "undefined") {
    return;
  }

  const trigger = document.querySelector<HTMLElement>(
    `[data-room-trigger="${roomId}"]`,
  );
  trigger?.focus();
}

export function RoomDetailDialog({
  room,
  rooms = [],
  currency,
  availableCount,
  promotions = [],
  stayDates,
  onClose,
  onSelectRoom,
}: RoomDetailDialogProps) {
  const titleId = useId();
  const summaryId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastRoomIdRef = useRef<string | null>(null);

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

  const roomIndex = room ? rooms.findIndex((entry) => entry.id === room.id) : -1;
  const previousRoom = roomIndex > 0 ? rooms[roomIndex - 1] : null;
  const nextRoom =
    roomIndex >= 0 && roomIndex < rooms.length - 1 ? rooms[roomIndex + 1] : null;

  useEffect(() => {
    if (room) {
      lastRoomIdRef.current = room.id;
    }
  }, [room]);

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

  function requestClose() {
    dialogRef.current?.close();
  }

  function handleDialogClose() {
    const closedRoomId = lastRoomIdRef.current;
    onClose();
    requestAnimationFrame(() => {
      focusRoomTrigger(closedRoomId);
    });
  }

  function handleRecoveryNavigate(href: string) {
    requestClose();
    requestAnimationFrame(() => {
      const target = document.querySelector(href);
      if (!target) {
        return;
      }

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  if (!room || !pricing) {
    return (
      <dialog
        className="room-detail-dialog"
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
        onClose={handleDialogClose}
        ref={dialogRef}
      />
    );
  }

  const photos = getRoomPhotos(room);
  const bookable = isRoomBookable(availableCount);
  const photoAlt = `${room.name} — ${room.outlook}`;
  const essentials = formatRoomEssentials(room);
  const outlookDetails = formatRoomOutlookDetails(room);
  const availabilityLabel = stayDates
    ? `${formatRoomTypeAvailabilityCount(availableCount)} for ${formatStayDateRange(stayDates.arrival, stayDates.departure)}`
    : getRoomAvailabilityLabel(availableCount);

  const priceSummary = (
    <div className="room-detail-dialog__price-summary">
      {pricing.hasPromotion ? (
        <div className="room-detail-dialog__price room-detail-dialog__price--promo">
          <span className="room-detail-dialog__price-was">
            {formatMoney(pricing.baseRate, currency)}
          </span>
          <strong>{formatMoney(pricing.rate, currency)}</strong>
          <span className="room-detail-dialog__price-off">
            {pricing.percentOff}% off
          </span>
        </div>
      ) : (
        <strong className="room-detail-dialog__price-now">
          {formatMoney(pricing.rate, currency)}
        </strong>
      )}
      <span className="room-detail-dialog__unit">per night</span>
      {pricing.stayQuote && pricing.stayQuote.nights > 0 ? (
        <span className="room-detail-dialog__stay-total">
          {formatMoney(pricing.stayQuote.total, currency)} total ·{" "}
          {pricing.stayQuote.nights}{" "}
          {pricing.stayQuote.nights === 1 ? "night" : "nights"}
        </span>
      ) : null}
    </div>
  );

  return (
    <dialog
      aria-describedby={summaryId}
      aria-labelledby={titleId}
      className="room-detail-dialog"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={handleDialogClose}
      ref={dialogRef}
    >
      <div className="room-detail-dialog__panel">
        <div className="room-detail-dialog__scroll">
          <div className="room-detail-dialog__header">
            <div className="room-detail-dialog__heading">
              <h2 id={titleId}>{room.name}</h2>
              {rooms.length > 1 && onSelectRoom ? (
                <div className="room-detail-dialog__room-nav" role="navigation" aria-label="Other rooms">
                  <button
                    className="button button--quiet room-detail-dialog__room-nav-btn"
                    disabled={!previousRoom}
                    onClick={() => previousRoom && onSelectRoom(previousRoom.id)}
                    type="button"
                  >
                    Previous room
                  </button>
                  <span className="room-detail-dialog__room-nav-count" aria-live="polite">
                    {roomIndex + 1} of {rooms.length}
                  </span>
                  <button
                    className="button button--quiet room-detail-dialog__room-nav-btn"
                    disabled={!nextRoom}
                    onClick={() => nextRoom && onSelectRoom(nextRoom.id)}
                    type="button"
                  >
                    Next room
                  </button>
                </div>
              ) : null}
            </div>
            <button
              aria-label="Close room details"
              className="button button--quiet"
              onClick={requestClose}
              type="button"
            >
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
            showThumbnails
            sizes="(max-width: 720px) 92vw, 44rem"
          />

          <div className="room-detail-dialog__body">
            <p className="room-detail-dialog__essentials">{essentials}</p>
            {outlookDetails ? (
              <p className="room-detail-dialog__outlook">{outlookDetails}</p>
            ) : null}
            <p id={summaryId}>{room.summary}</p>
            <RoomAmenitiesList amenities={room.amenities} label={`${room.name} amenities`} />

            <div
              className={`room-status ${
                bookable ? "room-status--available" : "room-status--full"
              }`}
            >
              <span aria-hidden="true" />
              {availabilityLabel}
            </div>
          </div>
        </div>

        <div className="room-detail-dialog__footer">
          {bookable ? (
            <>
              {priceSummary}
              <div className="room-detail-dialog__actions">
                <BookRoomLink
                  arrival={stayDates?.arrival}
                  className="button button--primary"
                  departure={stayDates?.departure}
                  onNavigate={requestClose}
                  roomId={room.id}
                >
                  Reserve
                </BookRoomLink>
              </div>
            </>
          ) : (
            <>
              <p className="room-detail-dialog__recovery-lede">
                This room type is full for the dates shown. Try other dates, or look at
                rooms that still have availability.
              </p>
              <div className="room-detail-dialog__actions room-detail-dialog__actions--recovery">
                <button
                  className="button button--primary"
                  onClick={() => handleRecoveryNavigate("#dates")}
                  type="button"
                >
                  Change dates
                </button>
                <button
                  className="button button--secondary"
                  onClick={() => handleRecoveryNavigate("#rooms")}
                  type="button"
                >
                  See available rooms
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
