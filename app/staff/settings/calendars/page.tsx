import Link from "next/link";
import { StaffAirbnbCalendarsPanel } from "@/components/staff-airbnb-calendars-panel";
import { StaffSettingsNav } from "@/components/staff-settings-nav";
import { StaffSidebar } from "@/components/staff-sidebar";
import { getStaffRoomIcalFeeds } from "@/lib/room-ical";
import { getStaffRooms } from "@/lib/rooms";
import {
  COURTYARD_UNIT_NUMBERS,
  GARDEN_UNIT_NUMBERS,
  VERANDA_UNIT_NUMBERS,
  getStaffRoomUnits,
  getUnitsForRoomType,
} from "@/lib/room-units";
import { getRoomUnitIcalExportUrl } from "@/lib/site-url";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DOOR_ORDER = [
  ...COURTYARD_UNIT_NUMBERS,
  ...GARDEN_UNIT_NUMBERS,
  ...VERANDA_UNIT_NUMBERS,
  "114",
] as const;

export default async function StaffSettingsCalendarsPage() {
  await requireStaffCalendarWrite();

  const [rooms, icalFeeds, unitsResult, supabaseReady] = await Promise.all([
    getStaffRooms(),
    getStaffRoomIcalFeeds(),
    getStaffRoomUnits(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);

  const feedByUnitId = new Map(
    icalFeeds
      .filter((feed) => feed.roomUnitId)
      .map((feed) => [feed.roomUnitId as string, feed]),
  );

  const units = [];

  for (const room of rooms) {
    for (const unit of getUnitsForRoomType(unitsResult.units, room.id)) {
      units.push({
        id: unit.id,
        number: unit.number,
        roomId: room.id,
        roomName: room.shortName || room.name,
        exportUrl: unit.icalExportToken
          ? getRoomUnitIcalExportUrl(unit.icalExportToken)
          : null,
        feed: feedByUnitId.get(unit.id) ?? null,
      });
    }
  }

  units.sort((left, right) => {
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
  const uniqueUnits = units.filter((unit) => {
    if (seen.has(unit.id)) {
      return false;
    }
    seen.add(unit.id);
    return true;
  });

  return (
    <main className="staff-shell">
      <StaffSidebar current="settings" />

      <section className="staff-main staff-main--rooms" aria-labelledby="staff-calendars-title">
        <div className="staff-header">
          <div>
            <p className="section-note">Settings · Calendars</p>
            <h1 id="staff-calendars-title">Airbnb calendars</h1>
            <p>
              Link each door number to its Airbnb listing. Room details stay under Settings →
              Rooms.
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
          <StaffAirbnbCalendarsPanel canManage={supabaseReady} units={uniqueUnits} />
        )}
      </section>
    </main>
  );
}
