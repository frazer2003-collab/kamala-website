"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { addRoomPromotion, type StaffPromotionState } from "@/app/staff/auth-actions";
import type { Room } from "@/lib/content";
import { ALL_ROOMS_PROMOTION_ID } from "@/lib/room-promotion-constants";
import type { StaffRoomPromotion } from "@/lib/room-promotions";

const initialState: StaffPromotionState = {};

type StaffPromotionAddFormProps = {
  disabled?: boolean;
  rooms: Room[];
  editing?: StaffRoomPromotion | null;
};

export function StaffPromotionAddForm({
  disabled = false,
  rooms,
  editing = null,
}: StaffPromotionAddFormProps) {
  const [state, formAction] = useActionState(addRoomPromotion, initialState);
  const [showLabel, setShowLabel] = useState(Boolean(editing?.label));
  const isEditing = Boolean(editing);

  return (
    <form action={formAction} className="booking-form staff-settings-form staff-promotion-form">
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

      <fieldset className="staff-form-group" disabled={disabled}>
        <legend>When &amp; where</legend>

        <div className="field-pair">
          <label htmlFor="promotion-room">Room type</label>
          <select
            defaultValue={editing?.roomId ?? ""}
            disabled={disabled || isEditing}
            id="promotion-room"
            name="room-id"
            required
          >
            <option value="">Choose a room</option>
            {!isEditing ? (
              <option value={ALL_ROOMS_PROMOTION_ID}>All room types</option>
            ) : null}
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} · {room.rate}/night standard
              </option>
            ))}
          </select>
          {isEditing ? (
            <input name="room-id" type="hidden" value={editing!.roomId} />
          ) : (
            <span className="field-help">
              All room types saves the same discount for every room on your list.
            </span>
          )}
        </div>

        <div className="field-pair">
          <label htmlFor="promotion-start">First night</label>
          <input
            defaultValue={editing?.startDate}
            disabled={disabled}
            id="promotion-start"
            name="start-date"
            required
            type="date"
          />
        </div>

        <div className="field-pair">
          <label htmlFor="promotion-end">Last night</label>
          <input
            defaultValue={editing?.endDate}
            disabled={disabled}
            id="promotion-end"
            name="end-date"
            required
            type="date"
          />
          <span className="field-help">
            Both dates are included. June 6 to June 7 discounts both nights.
          </span>
        </div>
      </fieldset>

      <fieldset className="staff-form-group" disabled={disabled}>
        <legend>Discount</legend>

        <div className="field-pair">
          <label htmlFor="promotion-percent">Percent off</label>
          <input
            defaultValue={editing?.percentOff ?? ""}
            disabled={disabled}
            id="promotion-percent"
            max="90"
            min="1"
            name="percent-off"
            placeholder="20"
            required
            type="number"
          />
          <span className="field-help">
            Guests pay this percent less than the standard nightly rate (1–90%).
          </span>
        </div>
      </fieldset>

      {showLabel || editing?.label ? (
        <div className="field-pair">
          <label htmlFor="promotion-label">
            Guest-facing label <span className="field-required">Optional</span>
          </label>
          <input
            defaultValue={editing?.label ?? ""}
            disabled={disabled}
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
          disabled={disabled}
          onClick={() => setShowLabel(true)}
          type="button"
        >
          Add guest-facing label
        </button>
      )}

      <div className="staff-promotion-form__actions">
        <button className="button button--primary" disabled={disabled} type="submit">
          {isEditing ? "Update discount" : "Save discount"}
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
