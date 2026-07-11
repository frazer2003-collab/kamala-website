"use client";

import { useActionState, useState } from "react";
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

export function StaffRoomIcalFields({
  roomId,
  exportUrl,
  feeds,
  disabled,
}: {
  roomId: string;
  exportUrl: string | null;
  feeds: RoomIcalFeed[];
  disabled: boolean;
}) {
  const [addState, addAction, addPending] = useActionState(addRoomIcalFeed, initialState);
  const [copied, setCopied] = useState(false);

  async function copyExportUrl() {
    if (!exportUrl) {
      return;
    }

    await navigator.clipboard.writeText(exportUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="staff-room-ical field-pair--wide">
      <div className="staff-room-ical__section">
        <span className="staff-room-ical__heading">Export calendar</span>
        <p className="staff-room-ical__hint">
          Paste this URL into Airbnb, Booking.com, or Expedia as an imported calendar.
          It includes direct website bookings and manual closures for this room type.
        </p>
        {exportUrl ? (
          <div className="staff-room-ical__export">
            <input readOnly type="text" value={exportUrl} />
            <button
              className="button button--quiet"
              disabled={disabled}
              onClick={copyExportUrl}
              type="button"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <p className="staff-room-ical__hint">
            Run supabase/migrate-room-ical.sql to generate an export link for this room.
          </p>
        )}
      </div>

      <div className="staff-room-ical__section">
        <div className="staff-room-ical__header">
          <span className="staff-room-ical__heading">Import calendars</span>
          {feeds.length > 0 ? (
            <form action={syncRoomIcalFeedsAction}>
              <input name="room-id" type="hidden" value={roomId} />
              <button className="button button--quiet" disabled={disabled} type="submit">
                Sync now
              </button>
            </form>
          ) : null}
        </div>
        <p className="staff-room-ical__hint">
          Add the export URL from each OTA. Reservations sync in as blocked nights and
          reduce rooms left automatically.
        </p>

        {feeds.length > 0 ? (
          <ul className="staff-room-ical__feeds">
            {feeds.map((feed) => (
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
          <p className="staff-room-ical__empty">No OTA calendars connected yet.</p>
        )}

        <form action={addAction} className="staff-room-ical__add">
          <input name="room-id" type="hidden" value={roomId} />
          <div className="field-pair">
            <label htmlFor={`${roomId}-ical-label`}>Channel</label>
            <input
              disabled={disabled || addPending}
              id={`${roomId}-ical-label`}
              name="label"
              placeholder="Airbnb"
              required
              type="text"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor={`${roomId}-ical-url`}>Calendar URL</label>
            <input
              disabled={disabled || addPending}
              id={`${roomId}-ical-url`}
              name="import-url"
              placeholder="https://..."
              required
              type="url"
            />
          </div>
          {addState.error ? (
            <p className="form-message form-message--error" role="alert">
              {addState.error}
            </p>
          ) : null}
          {addState.success ? (
            <p className="form-message form-message--success" role="status">
              {addState.success}
            </p>
          ) : null}
          <button
            className="button button--secondary"
            disabled={disabled || addPending}
            type="submit"
          >
            {addPending ? "Connecting..." : "Add calendar feed"}
          </button>
        </form>
      </div>
    </div>
  );
}
