"use client";

import { useActionState } from "react";
import { addRoom, type StaffRoomState } from "@/app/staff/auth-actions";
import { MAX_ROOM_TYPES, ROOM_TONES } from "@/lib/room-catalog";

const initialState: StaffRoomState = {};

export function StaffRoomAddForm({
  disabled,
  roomCount,
}: {
  disabled: boolean;
  roomCount: number;
}) {
  const [state, formAction, pending] = useActionState(addRoom, initialState);
  const atLimit = roomCount >= MAX_ROOM_TYPES;

  if (atLimit) {
    return (
      <p className="staff-room-add__limit">
        You have reached the maximum of {MAX_ROOM_TYPES} room types. Remove a
        room without bookings to add another.
      </p>
    );
  }

  return (
    <form action={formAction} className="staff-room-add">
      <h2>Add room type</h2>
      <p className="staff-room-add__hint">
        New rooms appear at the bottom of the list ({roomCount}/{MAX_ROOM_TYPES}).
      </p>
      <div className="staff-room-add__fields">
        <div className="field-pair">
          <label htmlFor="add-room-short-name">Short label</label>
          <input
            disabled={disabled || pending}
            id="add-room-short-name"
            name="short-name"
            placeholder="Deluxe"
            required
            type="text"
          />
        </div>
        <div className="field-pair">
          <label htmlFor="add-room-name">Room name</label>
          <input
            disabled={disabled || pending}
            id="add-room-name"
            name="name"
            placeholder="Deluxe double room"
            required
            type="text"
          />
        </div>
        <div className="field-pair">
          <label htmlFor="add-room-rate">Nightly rate</label>
          <input
            disabled={disabled || pending}
            id="add-room-rate"
            min={0}
            name="rate"
            required
            type="number"
          />
        </div>
        <div className="field-pair">
          <label htmlFor="add-room-available-count">Available rooms</label>
          <input
            defaultValue={1}
            disabled={disabled || pending}
            id="add-room-available-count"
            min={0}
            name="available-count"
            required
            type="number"
          />
        </div>
        <div className="field-pair">
          <label htmlFor="add-room-tone">Card color</label>
          <select disabled={disabled || pending} id="add-room-tone" name="tone">
            {ROOM_TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.error ? (
        <p className="form-message form-message--error" role="status">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="form-message form-message--success" role="status">
          {state.success}
        </p>
      ) : null}
      <button className="button button--secondary" disabled={disabled || pending} type="submit">
        {pending ? "Adding..." : "Add room type"}
      </button>
    </form>
  );
}
