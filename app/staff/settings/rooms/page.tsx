import Link from "next/link";
import { StaffRoomAddForm } from "@/components/staff-room-add-form";
import { StaffRoomEditForm } from "@/components/staff-room-edit-form";
import { StaffSettingsNav } from "@/components/staff-settings-nav";
import { StaffSidebar } from "@/components/staff-sidebar";
import { MAX_ROOM_TYPES } from "@/lib/room-catalog";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRooms } from "@/lib/rooms";
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
  }>;
}) {
  await requireStaffCalendarWrite();

  const { error, removed } = await searchParams;
  const [rooms, settings, supabaseReady] = await Promise.all([
    getStaffRooms(),
    getPropertySettings(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);

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

        <div className="staff-rooms-stack">
          {rooms.map((room) => (
            <StaffRoomEditForm
              currency={settings.currency}
              disabled={!supabaseReady}
              key={room.id}
              room={room}
            />
          ))}
        </div>

        <section className="staff-settings-card staff-room-add-card">
          <StaffRoomAddForm disabled={!supabaseReady} roomCount={rooms.length} />
        </section>
      </section>
    </main>
  );
}
