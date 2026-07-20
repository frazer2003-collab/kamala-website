import Link from "next/link";
import { StaffOtaCalendarsPanel } from "@/components/staff-ota-calendars-panel";
import { StaffSettingsNav } from "@/components/staff-settings-nav";
import { StaffShell } from "@/components/staff-shell";
import { feedMatchesOtaChannel, getStaffRoomIcalFeeds } from "@/lib/room-ical";
import { getStaffRooms } from "@/lib/rooms";
import {
  COURTYARD_UNIT_NUMBERS,
  GARDEN_UNIT_NUMBERS,
  GROUND_UNIT_NUMBERS,
  LOFT_UNIT_NUMBERS,
  VERANDA_UNIT_NUMBERS,
  getStaffRoomUnits,
  getUnitsForRoomType,
} from "@/lib/room-units";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DOOR_ORDER = [
  ...COURTYARD_UNIT_NUMBERS,
  ...GARDEN_UNIT_NUMBERS,
  ...VERANDA_UNIT_NUMBERS,
  ...LOFT_UNIT_NUMBERS,
  ...GROUND_UNIT_NUMBERS,
] as const;

export default async function StaffSettingsCalendarsPage() {
  await requireStaffCalendarWrite();

  const [rooms, icalFeeds, unitsResult, supabaseReady] = await Promise.all([
    getStaffRooms(),
    getStaffRoomIcalFeeds(),
    getStaffRoomUnits(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);

  const airbnbFeedByUnitId = new Map(
    icalFeeds
      .filter((feed) => feed.roomUnitId && feedMatchesOtaChannel(feed, "airbnb"))
      .map((feed) => [feed.roomUnitId as string, feed]),
  );

  const bookingFeedByRoomId = new Map(
    icalFeeds
      .filter((feed) => !feed.roomUnitId && feedMatchesOtaChannel(feed, "booking"))
      .map((feed) => [feed.roomId, feed]),
  );

  const expediaFeedByRoomId = new Map(
    icalFeeds
      .filter((feed) => !feed.roomUnitId && feedMatchesOtaChannel(feed, "expedia"))
      .map((feed) => [feed.roomId, feed]),
  );

  const airbnbUnits = [];

  for (const room of rooms) {
    for (const unit of getUnitsForRoomType(unitsResult.units, room.id)) {
      // 112/114 are Deluxe doors for assignment, but Airbnb iCal rows stay under Triple/Family.
      if (room.id === "garden" && (unit.number === "112" || unit.number === "114")) {
        continue;
      }

      airbnbUnits.push({
        id: unit.id,
        number: unit.number,
        roomId: room.id,
        roomName: room.shortName || room.name,
        feed: airbnbFeedByUnitId.get(unit.id) ?? null,
      });
    }
  }

  airbnbUnits.sort((left, right) => {
    const leftIndex = (DOOR_ORDER as readonly string[]).indexOf(left.number);
    const rightIndex = (DOOR_ORDER as readonly string[]).indexOf(right.number);
    const leftRank = leftIndex === -1 ? 999 : leftIndex;
    const rightRank = rightIndex === -1 ? 999 : rightIndex;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.number.localeCompare(right.number);
  });

  const seen = new Set<string>();
  const uniqueAirbnbUnits = airbnbUnits.filter((unit) => {
    if (seen.has(unit.id)) {
      return false;
    }
    seen.add(unit.id);
    return true;
  });

  const bookingTypes = rooms.map((room) => ({
    id: room.id,
    name: room.shortName || room.name,
    feed: bookingFeedByRoomId.get(room.id) ?? null,
  }));

  const expediaTypes = rooms.map((room) => ({
    id: room.id,
    name: room.shortName || room.name,
    feed: expediaFeedByRoomId.get(room.id) ?? null,
  }));

  return (
    <StaffShell current="settings">
      <section className="staff-main staff-main--rooms" aria-labelledby="staff-calendars-title">
        <div className="staff-header">
          <div>
            <p className="section-note">Settings · Calendars</p>
            <h1 id="staff-calendars-title">OTA calendars</h1>
            <p>
              Import Airbnb by door number, and Booking.com or Expedia by room type. Room details
              stay under Settings → Rooms.
            </p>
          </div>
          <Link className="button button--secondary" href="/staff/settings/rooms">
            Room details
          </Link>
        </div>

        <StaffSettingsNav current="calendars" />

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables before linking calendars here.
          </p>
        ) : (
          <StaffOtaCalendarsPanel
            airbnbUnits={uniqueAirbnbUnits}
            bookingTypes={bookingTypes}
            canManage={supabaseReady}
            expediaTypes={expediaTypes}
          />
        )}
      </section>
    </StaffShell>
  );
}
