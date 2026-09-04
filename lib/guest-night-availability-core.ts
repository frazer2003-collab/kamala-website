import type { Room } from "@/lib/content";
import { bookingOccupiesDay } from "@/lib/calendar";
import { countNetBookedForRoomDay } from "@/lib/calendar-timeline";
import {
  addIsoDays,
  eachIsoDayInclusive,
  getRoomsToSellForDay,
} from "@/lib/room-day-inventory";
import type { GuestNightStatus } from "@/lib/guest-night-availability-shared";
import {
  getAssignableUnitsForStay,
  getTypeUnitIdSet,
  getUnitsForRoomType,
  occupancyFromBooking,
  occupancyFromChannelBlock,
  type RoomUnit,
  type UnitOccupancy,
} from "@/lib/room-units";

export type { GuestNightStatus };
export {
  GUEST_NIGHT_AVAILABILITY_MAX_DAYS,
} from "@/lib/guest-night-availability-shared";

export {
  clampGuestNightAvailabilityQuery,
  countInclusiveIsoDays,
  guestNightAvailabilityLatestIso,
} from "@/lib/guest-night-availability-shared";

type StayBookingOccupancy = {
  roomId: string;
  roomUnitId: string | null;
  arrivalDate: string;
  departureDate: string;
  databaseId: string | null;
  guest: string;
};

type StayChannelOccupancy = {
  roomId: string;
  roomUnitId: string | null;
  startDate: string;
  endDate: string;
  databaseId: string | null;
  guestName: string;
  channelLabel: string | null;
};

type StaffClosure = {
  roomId: string;
  startDate: string;
  endDate: string;
};

function isRoomNightOpen({
  room,
  iso,
  bookings,
  channelBlocks,
  staffClosures,
  inventoryLookup,
  units,
  typeUnitIds,
  typeUnits,
  occupancies,
}: {
  room: Room;
  iso: string;
  bookings: StayBookingOccupancy[];
  channelBlocks: StayChannelOccupancy[];
  staffClosures: StaffClosure[];
  inventoryLookup: Map<string, number>;
  units: RoomUnit[];
  typeUnitIds: Set<string>;
  typeUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
}) {
  const closedByStaff = staffClosures.some(
    (block) =>
      block.roomId === room.id &&
      bookingOccupiesDay(
        { arrivalDate: block.startDate, departureDate: block.endDate },
        iso,
      ),
  );
  if (closedByStaff) {
    return false;
  }

  const roomsToSell = getRoomsToSellForDay(room, iso, inventoryLookup);
  if (roomsToSell <= 0) {
    return false;
  }

  const netBooked = countNetBookedForRoomDay({
    roomId: room.id,
    iso,
    bookings,
    channelBlocks,
    typeUnitIds,
  });
  if (netBooked >= roomsToSell) {
    return false;
  }

  if (typeUnits.length === 0) {
    return true;
  }

  const departure = addIsoDays(iso, 1);
  const doorCap = getAssignableUnitsForStay({
    units,
    roomId: room.id,
    arrivalDate: iso,
    departureDate: departure,
    occupancies,
  }).length;

  return doorCap > 0;
}

/**
 * Property-level night map: open if any room type has inventory for that night.
 * Pure — no I/O. Short-circuits per night on the first open room.
 */
export function computeGuestNightAvailability({
  rooms,
  fromIso,
  toIso,
  bookings,
  channelBlocks,
  staffClosures,
  inventoryLookup,
  units,
}: {
  rooms: Room[];
  fromIso: string;
  toIso: string;
  bookings: StayBookingOccupancy[];
  channelBlocks: StayChannelOccupancy[];
  staffClosures: StaffClosure[];
  inventoryLookup: Map<string, number>;
  units: RoomUnit[];
}): Record<string, GuestNightStatus> {
  const nights: Record<string, GuestNightStatus> = {};
  if (rooms.length === 0 || toIso < fromIso) {
    return nights;
  }

  const occupancies: UnitOccupancy[] = [
    ...bookings.map(occupancyFromBooking),
    ...channelBlocks.map(occupancyFromChannelBlock),
  ];

  const roomMeta = rooms.map((room) => ({
    room,
    typeUnitIds: getTypeUnitIdSet(units, room.id),
    typeUnits: getUnitsForRoomType(units, room.id),
  }));

  for (const iso of eachIsoDayInclusive(fromIso, toIso)) {
    let open = false;
    for (const meta of roomMeta) {
      if (
        isRoomNightOpen({
          room: meta.room,
          iso,
          bookings,
          channelBlocks,
          staffClosures,
          inventoryLookup,
          units,
          typeUnitIds: meta.typeUnitIds,
          typeUnits: meta.typeUnits,
          occupancies,
        })
      ) {
        open = true;
        break;
      }
    }
    nights[iso] = open ? "open" : "full";
  }

  return nights;
}
