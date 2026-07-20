"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { useState } from "react";
import { updateInboxBookingRoomType } from "@/app/actions";
import type { Room } from "@/lib/content";

type StaffInboxRoomTypeFormProps = {
  bookingId: string;
  roomId: string;
  rooms: Array<Pick<Room, "id" | "name">>;
  canManage: boolean;
  formError?: string | null;
};

export function StaffInboxRoomTypeForm({
  bookingId,
  roomId,
  rooms,
  canManage,
  formError,
}: StaffInboxRoomTypeFormProps) {
  const [selectedRoomId, setSelectedRoomId] = useState(roomId);

  return (
    <form action={updateInboxBookingRoomType} className="calendar-manage-form">
      <StaffFormBusyBridge />
      <input name="booking-id" type="hidden" value={bookingId} />
      {formError ? (
        <p className="form-message form-message--error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="field-pair">
        <label htmlFor={`inbox-room-type-${bookingId}`}>Room type</label>
        <select
          disabled={!canManage}
          id={`inbox-room-type-${bookingId}`}
          name="room-id"
          onChange={(event) => setSelectedRoomId(event.target.value)}
          value={selectedRoomId}
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
        <p className="detail-help">
          Changing room type keeps the booked price. Room number is cleared.
        </p>
      </div>
      <button className="button button--secondary" disabled={!canManage} type="submit">
        Update room type
      </button>
    </form>
  );
}
