"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addRoomPromotion, type StaffPromotionState } from "@/app/staff/auth-actions";
import type { Room } from "@/lib/content";
import type { PropertyCurrency } from "@/lib/currency";
import { formatMoneySuffix } from "@/lib/currency";
import { applyPercentOff, promotionCoversNight } from "@/lib/pricing";
import { ALL_ROOMS_PROMOTION_ID } from "@/lib/room-promotion-constants";
import type { StaffRoomPromotion } from "@/lib/room-promotions";

const initialState: StaffPromotionState = {};

type StaffPromotionAddFormProps = {
  disabled?: boolean;
  rooms: Room[];
  editing?: StaffRoomPromotion | null;
  currency: PropertyCurrency;
  existingPromotions: StaffRoomPromotion[];
};

function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && startB <= endA;
}

function parsePercent(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export function StaffPromotionAddForm({
  disabled = false,
  rooms,
  editing = null,
  currency,
  existingPromotions,
}: StaffPromotionAddFormProps) {
  const [state, formAction, pending] = useActionState(addRoomPromotion, initialState);
  const [showLabel, setShowLabel] = useState(Boolean(editing?.label));
  const [roomId, setRoomId] = useState(editing?.roomId ?? "");
  const [startDate, setStartDate] = useState(editing?.startDate ?? "");
  const [endDate, setEndDate] = useState(editing?.endDate ?? "");
  const [percentOff, setPercentOff] = useState(
    editing?.percentOff != null ? String(editing.percentOff) : "",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const previewId = useId();
  const isEditing = Boolean(editing);
  const percentValue = parsePercent(percentOff);

  useEffect(() => {
    if (!editing) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    formRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    document.getElementById("promotion-percent")?.focus({ preventScroll: true });
  }, [editing]);

  const selectedRooms = useMemo(() => {
    if (roomId === ALL_ROOMS_PROMOTION_ID) {
      return rooms;
    }
    const match = rooms.find((room) => room.id === roomId);
    return match ? [match] : [];
  }, [roomId, rooms]);

  const overlapping = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate || selectedRooms.length === 0) {
      return [];
    }

    const roomIds = new Set(selectedRooms.map((room) => room.id));

    return existingPromotions.filter((promotion) => {
      if (editing && promotion.id === editing.id) {
        return false;
      }
      if (!roomIds.has(promotion.roomId)) {
        return false;
      }
      return rangesOverlap(startDate, endDate, promotion.startDate, promotion.endDate);
    });
  }, [editing, endDate, existingPromotions, selectedRooms, startDate]);

  const overlapBestPercent = useMemo(() => {
    if (overlapping.length === 0 || percentValue == null || percentValue < 1) {
      return null;
    }

    const sampleRoomId = selectedRooms[0]?.id;
    if (!sampleRoomId || !startDate) {
      return Math.max(percentValue, ...overlapping.map((item) => item.percentOff));
    }

    const night = startDate;
    const otherBest = Math.max(
      0,
      ...overlapping
        .filter(
          (promotion) =>
            promotion.roomId === sampleRoomId && promotionCoversNight(promotion, night),
        )
        .map((promotion) => promotion.percentOff),
    );

    return Math.max(percentValue, otherBest);
  }, [overlapping, percentValue, selectedRooms, startDate]);

  return (
    <form
      action={formAction}
      className="booking-form staff-settings-form staff-promotion-form"
      id="staff-promotion-form"
      ref={formRef}
    >
      {editing ? <input name="promotion-id" type="hidden" value={editing.id} /> : null}

      {state.error ? (
        <p className="form-message form-message--error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="form-message form-message--success" role="status">
          {state.success}
        </p>
      ) : null}

      <fieldset className="staff-form-group" disabled={disabled || pending}>
        <legend>When &amp; where</legend>

        <div className="field-pair">
          <label htmlFor="promotion-room">Room type</label>
          <select
            disabled={disabled || isEditing || pending}
            id="promotion-room"
            name="room-id"
            onChange={(event) => setRoomId(event.target.value)}
            required
            value={roomId}
          >
            <option value="">Choose a room</option>
            {!isEditing ? (
              <option value={ALL_ROOMS_PROMOTION_ID}>All room types</option>
            ) : null}
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} · {formatMoneySuffix(room.rate, currency)}/night standard
              </option>
            ))}
          </select>
          {isEditing ? (
            <input name="room-id" type="hidden" value={editing!.roomId} />
          ) : (
            <span className="field-help">
              All room types creates one discount row per room — same dates and percent for each.
            </span>
          )}
        </div>

        <div className="field-pair">
          <label htmlFor="promotion-start">First night</label>
          <input
            disabled={disabled || pending}
            id="promotion-start"
            name="start-date"
            onChange={(event) => setStartDate(event.target.value)}
            required
            type="date"
            value={startDate}
          />
        </div>

        <div className="field-pair">
          <label htmlFor="promotion-end">Last night</label>
          <input
            disabled={disabled || pending}
            id="promotion-end"
            name="end-date"
            onChange={(event) => setEndDate(event.target.value)}
            required
            type="date"
            value={endDate}
          />
          <span className="field-help">
            Both dates are included. June 6 to June 7 discounts both nights.
          </span>
        </div>
      </fieldset>

      <fieldset className="staff-form-group" disabled={disabled || pending}>
        <legend>Discount</legend>

        <div className="field-pair">
          <label htmlFor="promotion-percent">Percent off</label>
          <input
            disabled={disabled || pending}
            id="promotion-percent"
            max="90"
            min="1"
            name="percent-off"
            onChange={(event) => setPercentOff(event.target.value)}
            placeholder="20"
            required
            type="number"
            value={percentOff}
          />
          <span className="field-help">
            Guests pay this percent less than the standard nightly rate (1–90%).
          </span>
        </div>
      </fieldset>

      {selectedRooms.length > 0 && percentValue != null && percentValue >= 1 && percentValue <= 90 ? (
        <div
          aria-live="polite"
          className="staff-promotion-preview"
          id={previewId}
        >
          <p className="staff-promotion-preview__eyebrow">Guest nightly price</p>
          {selectedRooms.length === 1 ? (
            <p className="staff-promotion-preview__line">
              <span className="staff-promotion-preview__was">
                {formatMoneySuffix(selectedRooms[0].rate, currency)}
              </span>
              <span aria-hidden="true" className="staff-promotion-preview__arrow">
                →
              </span>
              <strong>
                {formatMoneySuffix(applyPercentOff(selectedRooms[0].rate, percentValue), currency)}
              </strong>
              <span className="staff-promotion-preview__unit">/night</span>
            </p>
          ) : (
            <ul className="staff-promotion-preview__list">
              {selectedRooms.slice(0, 4).map((room) => (
                <li key={room.id}>
                  <span>{room.shortName}</span>
                  <span>
                    <span className="staff-promotion-preview__was">
                      {formatMoneySuffix(room.rate, currency)}
                    </span>
                    {" → "}
                    <strong>
                      {formatMoneySuffix(applyPercentOff(room.rate, percentValue), currency)}
                    </strong>
                    /night
                  </span>
                </li>
              ))}
            </ul>
          )}
          {selectedRooms.length > 4 ? (
            <p className="staff-promotion-preview__more">
              +{selectedRooms.length - 4} more room types at {percentValue}% off
            </p>
          ) : (
            <p className="staff-promotion-preview__note">
              {percentValue}% off the standard rate on booking.
            </p>
          )}
        </div>
      ) : (
        <p className="staff-promotion-preview staff-promotion-preview--empty" aria-live="polite">
          Choose a room and percent to preview the guest nightly price.
        </p>
      )}

      {overlapping.length > 0 ? (
        <p className="form-message form-message--warning" role="status">
          Overlaps {overlapping.length} existing discount
          {overlapping.length === 1 ? "" : "s"}
          {overlapBestPercent != null
            ? `. On overlapping nights guests get the best offer (${overlapBestPercent}% off).`
            : ". On overlapping nights guests get the best percent off."}
        </p>
      ) : null}

      {showLabel || editing?.label ? (
        <div className="field-pair">
          <label htmlFor="promotion-label">
            Guest-facing label <span className="field-required">Optional</span>
          </label>
          <input
            defaultValue={editing?.label ?? ""}
            disabled={disabled || pending}
            id="promotion-label"
            name="label"
            placeholder="Summer balcony offer"
            type="text"
          />
          {!isEditing ? (
            <button
              className="button button--quiet staff-promotion-form__label-toggle"
              onClick={() => setShowLabel(false)}
              type="button"
            >
              Hide label
            </button>
          ) : null}
        </div>
      ) : (
        <button
          className="button button--quiet staff-promotion-form__label-toggle"
          disabled={disabled || pending}
          onClick={() => setShowLabel(true)}
          type="button"
        >
          Add guest-facing label
        </button>
      )}

      <div className="staff-promotion-form__actions">
        <button className="button button--primary" disabled={disabled || pending} type="submit">
          {pending
            ? isEditing
              ? "Updating…"
              : "Saving…"
            : isEditing
              ? "Update discount"
              : "Save discount"}
        </button>
        {isEditing ? (
          <Link className="button button--quiet" href="/staff/promotions">
            Cancel edit
          </Link>
        ) : null}
      </div>
    </form>
  );
}
