"use client";

import { useActionState } from "react";
import { removeRoom, updateRoomDetails, type StaffRoomState } from "@/app/staff/auth-actions";
import { StaffRoomPhotoFields } from "@/components/staff-room-photo-fields";
import { StaffRoomIcalFields } from "@/components/staff-room-ical-fields";
import type { Room } from "@/lib/content";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import type { RoomIcalFeed } from "@/lib/room-ical";
import { getRoomIcalExportUrl } from "@/lib/site-url";

const initialState: StaffRoomState = {};

export function StaffRoomEditForm({
  room,
  currency,
  disabled,
  icalFeeds,
}: {
  room: Room;
  currency: PropertyCurrency;
  disabled: boolean;
  icalFeeds: RoomIcalFeed[];
}) {
  const [state, formAction, pending] = useActionState(updateRoomDetails, initialState);
  const coverPreview = room.imageUrl;

  return (
    <article className="staff-room-row">
      <div className="staff-room-row__media">
        {coverPreview ? (
          <img alt="" className="staff-room-row__photo" src={coverPreview} />
        ) : (
          <div className={`room-figure room-figure--${room.tone} staff-room-row__photo`}>
            <span>{room.shortName}</span>
          </div>
        )}
      </div>

      <form action={formAction} className="staff-room-form staff-room-form--compact">
        <input name="room-id" type="hidden" value={room.id} />
        <div className="staff-room-form__header">
          <h2>{room.shortName}</h2>
          <span>{formatMoney(room.rate, currency)}/night</span>
        </div>
        <div className="staff-room-form__grid">
          <div className="field-pair">
            <label htmlFor={`${room.id}-name`}>Room name</label>
            <input
              defaultValue={room.name}
              disabled={disabled}
              id={`${room.id}-name`}
              name="name"
              required
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor={`${room.id}-short-name`}>Short label</label>
            <input
              defaultValue={room.shortName}
              disabled={disabled}
              id={`${room.id}-short-name`}
              name="short-name"
              required
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor={`${room.id}-rate`}>Rate ({currency.toUpperCase()})</label>
            <input
              defaultValue={room.rate}
              disabled={disabled}
              id={`${room.id}-rate`}
              min={0}
              name="rate"
              required
              type="number"
            />
          </div>
          <div className="field-pair">
            <label htmlFor={`${room.id}-sleeps`}>Sleeps</label>
            <input
              defaultValue={room.sleeps}
              disabled={disabled}
              id={`${room.id}-sleeps`}
              name="sleeps"
              required
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor={`${room.id}-available-count`}>Available rooms</label>
            <input
              defaultValue={room.availableCount}
              disabled={disabled}
              id={`${room.id}-available-count`}
              min={0}
              name="available-count"
              required
              type="number"
            />
            <span className="field-help">
              How many rooms of this type you have. Availability updates
              automatically as bookings come in. Set to 0 to hide the room.
            </span>
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor={`${room.id}-outlook`}>Outlook</label>
            <input
              defaultValue={room.outlook}
              disabled={disabled}
              id={`${room.id}-outlook`}
              name="outlook"
              required
              type="text"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor={`${room.id}-summary`}>Summary</label>
            <textarea
              defaultValue={room.summary}
              disabled={disabled}
              id={`${room.id}-summary`}
              name="summary"
              required
              rows={2}
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor={`${room.id}-amenities`}>Amenities</label>
            <input
              defaultValue={room.amenities.join(", ")}
              disabled={disabled}
              id={`${room.id}-amenities`}
              name="amenities"
              type="text"
            />
          </div>
          <StaffRoomPhotoFields disabled={disabled} room={room} />
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
        <div className="staff-room-form__actions">
          <button className="button button--primary" disabled={disabled || pending} type="submit">
            {pending ? "Saving..." : "Save"}
          </button>
          <button
            className="button button--quiet"
            disabled={disabled}
            formAction={removeRoom}
            type="submit"
          >
            Remove
          </button>
        </div>
      </form>

      <StaffRoomIcalFields
        disabled={disabled}
        exportUrl={room.icalExportToken ? getRoomIcalExportUrl(room.icalExportToken) : null}
        feeds={icalFeeds}
        roomId={room.id}
      />
    </article>
  );
}
