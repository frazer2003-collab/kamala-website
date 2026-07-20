"use client";

import { useActionState } from "react";
import {
  addRoomIcalFeed,
  removeRoomIcalFeed,
  type StaffRoomState,
} from "@/app/staff/auth-actions";
import { StaffIcalCopyField } from "@/components/staff-ical-copy-field";
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

export type StaffAirbnbCalendarUnit = {
  id: string;
  number: string;
  roomId: string;
  roomName: string;
  exportUrl: string | null;
  feed: RoomIcalFeed | null;
};

export function StaffAirbnbCalendarsPanel({
  units,
  canManage,
}: {
  units: StaffAirbnbCalendarUnit[];
  canManage: boolean;
}) {
  return (
    <div className="staff-room-ical staff-room-ical--page">
      <div className="staff-room-ical__alerts" role="note">
        <p className="staff-room-ical__hint">
          Paste each Airbnb listing’s <strong>export</strong> calendar URL under Import so
          Airbnb reservations appear on the Kamala calendar. Copy Kamala’s{" "}
          <strong>export</strong> URL into Airbnb’s “Connect to another website” so Airbnb
          sees busy nights from this site.
        </p>
        <p className="staff-room-ical__hint staff-room-ical__hint--alert">
          Allotment changes are not instant. Airbnb pulls calendars every few hours — refresh
          the calendar sync inside Airbnb if dates look stale.
        </p>
      </div>

      {units.length === 0 ? (
        <p className="staff-room-ical__empty">
          No room numbers are linked yet. Finish room-number setup under Settings → Rooms.
        </p>
      ) : (
        <ul className="staff-room-ical__units">
          {units.map((unit) => (
            <li className="staff-room-ical__unit" key={unit.id}>
              <strong>
                Room {unit.number}
                <span className="staff-room-ical__unit-type"> · {unit.roomName}</span>
              </strong>

              {unit.exportUrl ? (
                <StaffIcalCopyField
                  id={`export-${unit.id}`}
                  label="Export to Airbnb (Kamala → Airbnb)"
                  value={unit.exportUrl}
                />
              ) : (
                <p className="staff-room-ical__empty">
                  Export URL unavailable. Run supabase/migrate-room-unit-ical.sql so each door
                  has an export token.
                </p>
              )}

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
                    <input name="room-id" type="hidden" value={unit.roomId} />
                    <button
                      className="button button--quiet"
                      disabled={!canManage}
                      type="submit"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              ) : (
                <UnitFeedAddForm
                  disabled={!canManage}
                  roomId={unit.roomId}
                  unitId={unit.id}
                  unitNumber={unit.number}
                />
              )}
            </li>
          ))}
        </ul>
      )}
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
  const [state, formAction, pending] = useActionState(addRoomIcalFeed, initialState);

  return (
    <form action={formAction} className="staff-room-ical__add">
      <input name="room-id" type="hidden" value={roomId} />
      <input name="room-unit-id" type="hidden" value={unitId} />
      <input name="label" type="hidden" value={`Airbnb ${unitNumber}`} />
      <div className="field-pair">
        <label htmlFor={`ical-url-${unitId}`}>Airbnb export calendar URL</label>
        <input
          disabled={disabled || pending}
          id={`ical-url-${unitId}`}
          name="import-url"
          placeholder="https://www.airbnb.com/calendar/ical/…"
          required
          type="url"
        />
      </div>
      {state.error ? (
        <p className="form-message form-message--error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="button button--secondary" disabled={disabled || pending} type="submit">
        {pending ? "Saving…" : "Save import"}
      </button>
    </form>
  );
}
