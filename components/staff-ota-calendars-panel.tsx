"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { useActionState, type ReactNode } from "react";
import {
  addRoomIcalFeed,
  removeRoomIcalFeed,
  type StaffRoomState,
} from "@/app/staff/auth-actions";
import {
  otaChannelLabel,
  type OtaIcalChannel,
  type RoomIcalFeed,
} from "@/lib/ota-ical-channel";

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

export type StaffOtaDoorUnit = {
  id: string;
  number: string;
  roomId: string;
  roomName: string;
  feed: RoomIcalFeed | null;
};

export type StaffOtaRoomType = {
  id: string;
  name: string;
  feed: RoomIcalFeed | null;
};

export function StaffOtaCalendarsPanel({
  airbnbUnits,
  bookingTypes,
  expediaTypes,
  canManage,
}: {
  airbnbUnits: StaffOtaDoorUnit[];
  bookingTypes: StaffOtaRoomType[];
  expediaTypes: StaffOtaRoomType[];
  canManage: boolean;
}) {
  return (
    <div className="staff-room-ical staff-room-ical--page">
      <div className="staff-room-ical__alerts" role="note">
        <p className="staff-room-ical__hint">
          Import only — paste each OTA’s <strong>export</strong> calendar URL (or a Nobeds
          bookings iCal for Booking/Expedia) so reservations appear on the Kamala calendar.
          Busy nights are not pushed back to OTAs from this page.
        </p>
        <p className="staff-room-ical__hint staff-room-ical__hint--alert">
          After connecting a feed, use <strong>Sync channel calendars</strong> on the staff calendar.
          Channel calendars are not live; refresh sync if dates look stale.
        </p>
      </div>

      <OtaImportSection
        channel="airbnb"
        description="One calendar per door number. Paste the Airbnb listing export URL."
        title="Airbnb"
      >
        {airbnbUnits.length === 0 ? (
          <p className="staff-room-ical__empty">
            No room numbers are linked yet. Finish room-number setup under Settings → Rooms.
          </p>
        ) : (
          <ul className="staff-room-ical__units">
            {airbnbUnits.map((unit) => (
              <li className="staff-room-ical__unit" key={unit.id}>
                <strong>
                  Room {unit.number}
                  <span className="staff-room-ical__unit-type"> · {unit.roomName}</span>
                </strong>
                <FeedSlot
                  canManage={canManage}
                  channel="airbnb"
                  feed={unit.feed}
                  label={`Airbnb ${unit.number}`}
                  placeholder="https://www.airbnb.com/calendar/ical/…"
                  roomId={unit.roomId}
                  urlFieldId={`ical-airbnb-${unit.id}`}
                  urlLabel="Airbnb export calendar URL"
                  roomUnitId={unit.id}
                />
              </li>
            ))}
          </ul>
        )}
      </OtaImportSection>

      <OtaImportSection
        channel="booking"
        description="One calendar per room type. Paste the Booking.com export URL, or the Nobeds bookings iCal for that type."
        title="Booking.com"
      >
        <RoomTypeFeedList
          canManage={canManage}
          channel="booking"
          placeholder="https://admin.booking.com/…, iCal URL, or https://nobeds.app/ICAL/…"
          types={bookingTypes}
        />
      </OtaImportSection>

      <OtaImportSection
        channel="expedia"
        description="One calendar per room type. Paste the Expedia export URL, or the Nobeds bookings iCal for that type."
        title="Expedia"
      >
        <RoomTypeFeedList
          canManage={canManage}
          channel="expedia"
          placeholder="https://…expedia…/ical… or https://nobeds.app/ICAL/…"
          types={expediaTypes}
        />
      </OtaImportSection>
    </div>
  );
}

function OtaImportSection({
  title,
  description,
  channel,
  children,
}: {
  title: string;
  description: string;
  channel: OtaIcalChannel;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`ota-ical-${channel}-title`}
      className="staff-room-ical__channel"
    >
      <div className="staff-room-ical__channel-header">
        <h2 className="staff-room-ical__channel-title" id={`ota-ical-${channel}-title`}>
          {title}
        </h2>
        <p className="staff-room-ical__hint">{description}</p>
      </div>
      {children}
    </section>
  );
}

function RoomTypeFeedList({
  types,
  channel,
  canManage,
  placeholder,
}: {
  types: StaffOtaRoomType[];
  channel: "booking" | "expedia";
  canManage: boolean;
  placeholder: string;
}) {
  if (types.length === 0) {
    return (
      <p className="staff-room-ical__empty">
        No room types yet. Add rooms under Settings → Rooms.
      </p>
    );
  }

  const channelName = otaChannelLabel(channel);

  return (
    <ul className="staff-room-ical__units">
      {types.map((room) => (
        <li className="staff-room-ical__unit" key={`${channel}-${room.id}`}>
          <strong>{room.name}</strong>
          <FeedSlot
            canManage={canManage}
            channel={channel}
            feed={room.feed}
            label={`${channelName} · ${room.name}`}
            placeholder={placeholder}
            roomId={room.id}
            urlFieldId={`ical-${channel}-${room.id}`}
            urlLabel={`${channelName} export calendar URL`}
          />
        </li>
      ))}
    </ul>
  );
}

function FeedSlot({
  feed,
  canManage,
  channel,
  roomId,
  roomUnitId,
  label,
  urlFieldId,
  urlLabel,
  placeholder,
}: {
  feed: RoomIcalFeed | null;
  canManage: boolean;
  channel: OtaIcalChannel;
  roomId: string;
  roomUnitId?: string;
  label: string;
  urlFieldId: string;
  urlLabel: string;
  placeholder: string;
}) {
  if (feed) {
    return (
      <div className="staff-room-ical__unit-feed">
        <div>
          <span>{formatSyncedAt(feed.lastSyncedAt)}</span>
          {feed.lastSyncError ? (
            <span className="staff-room-ical__error">{feed.lastSyncError}</span>
          ) : null}
        </div>
        <form action={removeRoomIcalFeed}>
      <StaffFormBusyBridge />
          <input name="feed-id" type="hidden" value={feed.id} />
          <input name="room-id" type="hidden" value={roomId} />
          <button className="button button--quiet" disabled={!canManage} type="submit">
            Remove
          </button>
        </form>
      </div>
    );
  }

  return (
    <FeedAddForm
      channel={channel}
      disabled={!canManage}
      label={label}
      placeholder={placeholder}
      roomId={roomId}
      roomUnitId={roomUnitId}
      urlFieldId={urlFieldId}
      urlLabel={urlLabel}
    />
  );
}

function FeedAddForm({
  roomId,
  roomUnitId,
  channel,
  label,
  urlFieldId,
  urlLabel,
  placeholder,
  disabled,
}: {
  roomId: string;
  roomUnitId?: string;
  channel: OtaIcalChannel;
  label: string;
  urlFieldId: string;
  urlLabel: string;
  placeholder: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(addRoomIcalFeed, initialState);

  return (
    <form action={formAction} className="staff-room-ical__add">
      <StaffFormBusyBridge />
      <input name="room-id" type="hidden" value={roomId} />
      {roomUnitId ? <input name="room-unit-id" type="hidden" value={roomUnitId} /> : null}
      <input name="channel" type="hidden" value={channel} />
      <input name="label" type="hidden" value={label} />
      <div className="field-pair">
        <label htmlFor={urlFieldId}>{urlLabel}</label>
        <input
          disabled={disabled || pending}
          id={urlFieldId}
          name="import-url"
          placeholder={placeholder}
          required
          type="url"
        />
      </div>
      {state.error ? (
        <p className="form-message form-message--error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="form-message" role="status">
          {state.success}
        </p>
      ) : null}
      <button className="button button--secondary" disabled={disabled || pending} type="submit">
        {pending ? "Saving…" : "Save import"}
      </button>
    </form>
  );
}
