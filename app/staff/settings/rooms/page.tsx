import Link from "next/link";
import { StaffRoomAddForm } from "@/components/staff-room-add-form";
import { StaffRoomEditForm } from "@/components/staff-room-edit-form";
import { StaffSettingsNav } from "@/components/staff-settings-nav";
import { StaffSidebar } from "@/components/staff-sidebar";
import { MAX_ROOM_TYPES } from "@/lib/room-catalog";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRooms } from "@/lib/rooms";
import { getStaffRoomIcalFeeds } from "@/lib/room-ical";
import { getStaffRoomUnits, getUnitsForRoomType } from "@/lib/room-units";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function StaffSettingsRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    removed?: string;
    room?: string;
    "ical-synced"?: string;
    "ical-removed"?: string;
    "ical-error"?: string;
  }>;
}) {
  await requireStaffCalendarWrite();

  const {
    error,
    removed,
    "ical-synced": icalSynced,
    "ical-removed": icalRemoved,
    "ical-error": icalError,
  } = await searchParams;
  const [rooms, settings, supabaseReady, icalFeeds, unitsResult] = await Promise.all([
    getStaffRooms(),
    getPropertySettings(),
    Promise.resolve(hasStaffSupabaseConfig()),
    getStaffRoomIcalFeeds(),
    getStaffRoomUnits(),
  ]);
  const feedsByRoom = new Map<string, typeof icalFeeds>();

  for (const feed of icalFeeds) {
    const current = feedsByRoom.get(feed.roomId) ?? [];
    current.push(feed);
    feedsByRoom.set(feed.roomId, current);
  }

  const feedByUnitId = new Map(
    icalFeeds
      .filter((feed) => feed.roomUnitId)
      .map((feed) => [feed.roomUnitId as string, feed]),
  );

  return (
    <main className="staff-shell">
      <StaffSidebar current="settings" />

      <section className="staff-main staff-main--rooms" aria-labelledby="staff-rooms-title">
        <div className="staff-header">
          <div>
            <p className="section-note">Settings · Rooms</p>
            <h1 id="staff-rooms-title">Room types on your guest site.</h1>
            <p>
              Up to {MAX_ROOM_TYPES} room types. New rooms are added to the bottom.
              Set the default rooms of each type here. The calendar can override
              rooms to sell for specific nights; rooms left still update as
              bookings come in.
            </p>
          </div>
          <Link className="button button--secondary" href="/staff/settings">
            Back to settings
          </Link>
        </div>

        <StaffSettingsNav current="rooms" />

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables before managing rooms here.
          </p>
        ) : null}
        {error === "has-bookings" ? (
          <p className="form-message form-message--error" role="status">
            This room cannot be removed while it has booking history. Archive it by
            setting availability to zero instead.
          </p>
        ) : null}
        {removed === "1" ? (
          <p className="form-message form-message--success" role="status">
            Room removed.
          </p>
        ) : null}
        {icalSynced !== undefined ? (
          <p className="form-message form-message--success" role="status">
            OTA calendars refreshed. {icalSynced} reservation
            {icalSynced === "1" ? "" : "s"} reimported
            {icalRemoved && icalRemoved !== "0"
              ? `, ${icalRemoved} from removed calendars cleared`
              : ""}
            .
          </p>
        ) : null}
        {icalError ? (
          <p className="form-message form-message--error" role="status">
            Calendar sync failed: {decodeURIComponent(icalError)}
            {icalRemoved && icalRemoved !== "0"
              ? ` Cleared ${icalRemoved} reservation${icalRemoved === "1" ? "" : "s"} from removed calendars.`
              : ""}
          </p>
        ) : null}

        <div className="staff-rooms-stack">
          {rooms.map((room) => {
            const roomFeeds = feedsByRoom.get(room.id) ?? [];
            const icalUnits = getUnitsForRoomType(unitsResult.units, room.id).map((unit) => ({
              id: unit.id,
              number: unit.number,
              feed: feedByUnitId.get(unit.id) ?? null,
            }));

            return (
              <StaffRoomEditForm
                currency={settings.currency}
                disabled={!supabaseReady}
                icalFeeds={roomFeeds}
                icalUnits={icalUnits}
                key={room.id}
                room={room}
              />
            );
          })}
        </div>

        <section className="staff-settings-card staff-room-add-card">
          <StaffRoomAddForm disabled={!supabaseReady} roomCount={rooms.length} />
        </section>
      </section>
    </main>
  );
}
