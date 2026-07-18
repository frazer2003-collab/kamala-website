"use client";

import { useActionState } from "react";
import {
  addRoomIcalFeed,
  syncRoomIcalFeedsAction,
  removeRoomIcalFeed,
  type StaffRoomState,
} from "@/app/staff/auth-actions";
import type { RoomIcalFeed } from "@/lib/room-ical";

const initialState: StaffRoomState = {};

function formatSyncedAt(value: string | null) {
  if (!value) {
    return "Not synced yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Synced recently";
  }

  return `Last synced ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
}

export type StaffRoomIcalUnit = {
  id: string;
  number: string;
  feed: RoomIcalFeed | null;
};

export function StaffRoomIcalFields({
  roomId,
  units,
  typeFeeds,
  disabled,
}: {
  roomId: string;
  units: StaffRoomIcalUnit[];
  typeFeeds: RoomIcalFeed[];
  disabled: boolean;
}) {
  const [typeAddState, typeAddAction, typeAddPending] = useActionState(
    addRoomIcalFeed,
    initialState,
  );
  const allFeeds = [...typeFeeds, ...units.map((unit) => unit.feed).filter(Boolean)] as RoomIcalFeed[];

  return (
    <div className="staff-room-ical field-pair--wide">
      <p className="staff-room-ical__hint">
        Kamala only <strong>reads</strong> OTA calendars. It does not publish a calendar back to
        Airbnb or other channels — manage availability on each OTA separately.
      </p>

      <div className="staff-room-ical__section">
        <div className="staff-room-ical__header">
          <span className="staff-room-ical__heading">Airbnb — import by room number</span>
          {allFeeds.length > 0 ? (
            <form action={syncRoomIcalFeedsAction}>
              <input name="room-id" type="hidden" value={roomId} />
              <button className="button button--quiet" disabled={disabled} type="submit">
                Sync now
              </button>
            </form>
          ) : null}
        </div>
        <p className="staff-room-ical__hint">
          Paste each listing’s Airbnb <em>export</em> calendar URL here so guest reservations
          appear on the staff calendar. One feed per room number.
        </p>

        {units.length === 0 ? (
          <p className="staff-room-ical__empty">
            No room numbers linked to this type. Run migrate-room-units.sql first.
          </p>
        ) : (
          <ul className="staff-room-ical__units">
            {units.map((unit) => (
              <li className="staff-room-ical__unit" key={unit.id}>
                <strong>Room {unit.number}</strong>
                <span className="staff-room-ical__unit-label">Import from Airbnb</span>
                {unit.feed ? (
                  <div className="staff-room-ical__unit-feed">
                    <div>
                      <span>{formatSyncedAt(unit.feed.lastSyncedAt)}</span>
                      {unit.feed.lastSyncError ? (
                        <span className="staff-room-ical__error">{unit.feed.lastSyncError}</span>
                      ) : null}
                    </div>
                    <form action={removeRoomIcalFeed}>
                      <input name="feed-id" type="hidden" value={unit.feed.id} />
                      <input name="room-id" type="hidden" value={roomId} />
                      <button className="button button--quiet" disabled={disabled} type="submit">
                        Remove
                      </button>
                    </form>
                  </div>
                ) : (
                  <UnitFeedAddForm
                    disabled={disabled}
                    roomId={roomId}
                    unitId={unit.id}
                    unitNumber={unit.number}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="staff-room-ical__section">
        <span className="staff-room-ical__heading">Other OTAs — import by room type</span>
        <p className="staff-room-ical__hint">
          For Booking.com, Expedia, or similar. Paste their calendar export URL to pull
          reservations into this room type. Import only — nothing is sent back.
        </p>

        {typeFeeds.length > 0 ? (
          <ul className="staff-room-ical__feeds">
            {typeFeeds.map((feed) => (
              <li key={feed.id}>
                <div>
                  <strong>{feed.label}</strong>
                  <span>{formatSyncedAt(feed.lastSyncedAt)}</span>
                  {feed.lastSyncError ? (
                    <span className="staff-room-ical__error">{feed.lastSyncError}</span>
                  ) : null}
                </div>
                <form action={removeRoomIcalFeed}>
                  <input name="feed-id" type="hidden" value={feed.id} />
                  <input name="room-id" type="hidden" value={roomId} />
                  <button className="button button--quiet" disabled={disabled} type="submit">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="staff-room-ical__empty">No room-type OTA calendars connected.</p>
        )}

        <form action={typeAddAction} className="staff-room-ical__add">
          <input name="room-id" type="hidden" value={roomId} />
          <div className="field-pair">
            <label htmlFor={`${roomId}-ical-label`}>Channel</label>
            <input
              disabled={disabled || typeAddPending}
              id={`${roomId}-ical-label`}
              name="label"
              placeholder="Booking.com"
              required
              type="text"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor={`${roomId}-ical-url`}>Calendar URL</label>
            <input
              disabled={disabled || typeAddPending}
              id={`${roomId}-ical-url`}
              name="import-url"
              placeholder="https://..."
              required
              type="url"
            />
          </div>
          {typeAddState.error ? (
            <p className="form-message form-message--error" role="alert">
              {typeAddState.error}
            </p>
          ) : null}
          {typeAddState.success ? (
            <p className="form-message form-message--success" role="status">
              {typeAddState.success}
            </p>
          ) : null}
          <button
            className="button button--secondary"
            disabled={disabled || typeAddPending}
            type="submit"
          >
            {typeAddPending ? "Connecting..." : "Add import feed"}
          </button>
        </form>
      </div>
    </div>
  );
}

function UnitFeedAddForm({
  roomId,
  unitId,
  unitNumber,
  disabled,
}: {
  roomId: string;
  unitId: string;
  unitNumber: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(addRoomIcalFeed, initialState);

  return (
    <form action={action} className="staff-room-ical__unit-add">
      <input name="room-id" type="hidden" value={roomId} />
      <input name="room-unit-id" type="hidden" value={unitId} />
      <input name="label" type="hidden" value={`Airbnb ${unitNumber}`} />
      <input
        disabled={disabled || pending}
        name="import-url"
        placeholder="Airbnb export calendar URL"
        required
        type="url"
      />
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
      <button className="button button--secondary" disabled={disabled || pending} type="submit">
        {pending ? "Connecting..." : "Connect Airbnb"}
      </button>
    </form>
  );
}
