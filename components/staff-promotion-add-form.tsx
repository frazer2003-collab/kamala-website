"use client";

import { useActionState } from "react";
import { addRoomPromotion, type StaffPromotionState } from "@/app/staff/auth-actions";
import type { Room } from "@/lib/content";

const initialState: StaffPromotionState = {};

type StaffPromotionAddFormProps = {
  disabled?: boolean;
  rooms: Room[];
};

export function StaffPromotionAddForm({ disabled = false, rooms }: StaffPromotionAddFormProps) {
  const [state, formAction] = useActionState(addRoomPromotion, initialState);

  return (
    <form action={formAction} className="booking-form staff-settings-form">
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

      <div className="field-pair">
        <label htmlFor="promotion-room">Room type</label>
        <select disabled={disabled} id="promotion-room" name="room-id" required>
          <option value="">Choose a room</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} · {room.rate}/night standard
            </option>
          ))}
        </select>
      </div>

      <div className="field-pair">
        <label htmlFor="promotion-start">First night</label>
        <input disabled={disabled} id="promotion-start" name="start-date" required type="date" />
      </div>

      <div className="field-pair">
        <label htmlFor="promotion-end">Last night</label>
        <input disabled={disabled} id="promotion-end" name="end-date" required type="date" />
        <span className="field-help">
          Both dates are included. June 6 to June 7 discounts both nights.
        </span>
      </div>

      <div className="field-pair">
        <label htmlFor="promotion-percent">Discount percent</label>
        <input
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

      <div className="field-pair">
        <label htmlFor="promotion-label">
          Label <span className="field-required">Optional</span>
        </label>
        <input
          disabled={disabled}
          id="promotion-label"
          name="label"
          placeholder="Summer balcony offer"
          type="text"
        />
      </div>

      <button className="button button--primary" disabled={disabled} type="submit">
        Save promotion
      </button>
    </form>
  );
}
