import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
} from "@/lib/supabase";

export type RoomUnit = {
  id: string;
  number: string;
  sortOrder: number;
  /** Room type ids that can use this physical unit. */
  roomIds: string[];
  /** Per-listing Airbnb export token (null until migrate-room-unit-ical.sql). */
  icalExportToken: string | null;
};

/** Superior (courtyard) door numbers — Airbnb import slots and assignment. */
export const COURTYARD_UNIT_NUMBERS = ["113", "115", "118", "120"] as const;

/** Door number → room type ids (used to repair missing room_unit_types rows). */
const DEFAULT_UNIT_ROOM_IDS: Record<string, string[]> = {
  "113": ["courtyard"],
  "115": ["courtyard"],
  "118": ["courtyard"],
  "120": ["courtyard"],
  "112": ["garden", "veranda"],
  "114": ["garden", "veranda", "loft"],
  "117": ["garden", "veranda"],
  "119": ["garden", "veranda"],
};

export const SAMPLE_ROOM_UNITS: RoomUnit[] = Object.entries(DEFAULT_UNIT_ROOM_IDS).map(
  ([number, roomIds], index) => ({
    id: `unit-${number}`,
    number,
    sortOrder: (index + 1) * 10,
    roomIds,
    icalExportToken: null,
  }),
);

type UnitQueryResult = {
  units: RoomUnit[];
  source: "sample" | "supabase";
  error: string | null;
};

function staysOverlap(
  a: { arrivalDate: string; departureDate: string },
  b: { arrivalDate: string; departureDate: string },
) {
  return a.arrivalDate < b.departureDate && b.arrivalDate < a.departureDate;
}

export function getUnitsForRoomType(units: RoomUnit[], roomId: string) {
  return units
    .filter((unit) => {
      if (!unit.roomIds.includes(roomId)) {
        return false;
      }
      // Superior is only 113 / 115 / 118 / 120 (ignore stale DB links like 116).
      if (roomId === "courtyard") {
        return (COURTYARD_UNIT_NUMBERS as readonly string[]).includes(unit.number);
      }
      return true;
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.number.localeCompare(right.number));
}

export function getRoomUnitById(units: RoomUnit[], unitId: string | null | undefined) {
  if (!unitId) {
    return null;
  }

  return units.find((unit) => unit.id === unitId) ?? null;
}

export function isUnitEligibleForRoom(unit: RoomUnit, roomId: string) {
  return unit.roomIds.includes(roomId);
}

export type UnitOccupancy = {
  databaseId: string | null;
  roomUnitId: string | null;
  arrivalDate: string;
  departureDate: string;
  guest: string;
};

export function occupancyFromBooking(booking: {
  databaseId: string | null;
  roomUnitId: string | null;
  arrivalDate: string;
  departureDate: string;
  guest: string;
}): UnitOccupancy {
  return {
    databaseId: booking.databaseId,
    roomUnitId: booking.roomUnitId,
    arrivalDate: booking.arrivalDate,
    departureDate: booking.departureDate,
    guest: booking.guest,
  };
}

export function occupancyFromChannelBlock(block: {
  databaseId: string | null;
  roomUnitId: string | null;
  startDate: string;
  endDate: string;
  guestName: string;
  channelLabel: string | null;
}): UnitOccupancy {
  return {
    databaseId: block.databaseId,
    roomUnitId: block.roomUnitId,
    arrivalDate: block.startDate,
    departureDate: block.endDate,
    guest:
      block.guestName.trim() ||
      (block.channelLabel ? `${block.channelLabel} guest` : "Channel guest"),
  };
}

export function findUnitAssignmentConflict({
  units,
  unitId,
  arrivalDate,
  departureDate,
  excludeId,
  occupancies,
}: {
  units: RoomUnit[];
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  /** Booking or channel block database id to ignore (self). */
  excludeId?: string;
  occupancies: UnitOccupancy[];
}) {
  const unit = getRoomUnitById(units, unitId);
  if (!unit) {
    return { error: "That room number is not available." as const };
  }

  const conflict = occupancies.find((item) => {
    if (!item.roomUnitId || item.roomUnitId !== unitId) {
      return false;
    }

    if (excludeId && item.databaseId === excludeId) {
      return false;
    }

    return staysOverlap(
      { arrivalDate, departureDate },
      { arrivalDate: item.arrivalDate, departureDate: item.departureDate },
    );
  });

  if (conflict) {
    return {
      error: `Room ${unit.number} is already assigned to ${conflict.guest} for overlapping dates.` as const,
      conflictGuest: conflict.guest,
      unitNumber: unit.number,
    };
  }

  return null;
}

export function getAssignableUnitsForStay({
  units,
  roomId,
  arrivalDate,
  departureDate,
  excludeId,
  occupancies,
}: {
  units: RoomUnit[];
  roomId: string;
  arrivalDate: string;
  departureDate: string;
  excludeId?: string;
  occupancies: UnitOccupancy[];
}) {
  return getUnitsForRoomType(units, roomId).filter((unit) => {
    const conflict = findUnitAssignmentConflict({
      units,
      unitId: unit.id,
      arrivalDate,
      departureDate,
      excludeId,
      occupancies,
    });
    return !conflict;
  });
}

/** Eligible doors for a type, with conflict info (for selects that show taken rooms). */
export function getUnitOptionsForStay({
  units,
  roomId,
  arrivalDate,
  departureDate,
  excludeId,
  occupancies,
}: {
  units: RoomUnit[];
  roomId: string;
  arrivalDate: string;
  departureDate: string;
  excludeId?: string;
  occupancies: UnitOccupancy[];
}) {
  return getUnitsForRoomType(units, roomId).map((unit) => {
    const conflict = findUnitAssignmentConflict({
      units,
      unitId: unit.id,
      arrivalDate,
      departureDate,
      excludeId,
      occupancies,
    });
    return {
      unit,
      available: !conflict,
      conflictGuest: conflict?.conflictGuest ?? null,
    };
  });
}

export function attachRoomNumbers<T extends { roomUnitId: string | null; roomNumber: string | null }>(
  bookings: T[],
  units: RoomUnit[],
): T[] {
  return bookings.map((booking) => ({
    ...booking,
    roomNumber: getRoomUnitById(units, booking.roomUnitId)?.number ?? null,
  }));
}

function withDefaultRoomIds(units: RoomUnit[]): RoomUnit[] {
  return units.map((unit) => {
    let roomIds = unit.roomIds.length > 0 ? unit.roomIds : (DEFAULT_UNIT_ROOM_IDS[unit.number] ?? []);

    // Never treat 116 (or any non-allowlisted door) as Superior.
    if (unit.number === "116" || !(COURTYARD_UNIT_NUMBERS as readonly string[]).includes(unit.number)) {
      roomIds = roomIds.filter((id) => id !== "courtyard");
    }

    if (unit.roomIds.length > 0 && roomIds === unit.roomIds) {
      return unit;
    }

    return {
      ...unit,
      roomIds,
    };
  });
}

export async function getStaffRoomUnits(): Promise<UnitQueryResult> {
  if (!hasStaffSupabaseConfig()) {
    return { units: SAMPLE_ROOM_UNITS, source: "sample", error: null };
  }

  const supabase = createStaffSupabaseClient();
  let unitRows: Array<{
    id: string;
    number: string;
    sort_order: number;
    ical_export_token?: string | null;
  }> | null = null;

  const withToken = await supabase
    .from("room_units")
    .select("id, number, sort_order, ical_export_token")
    .order("sort_order", { ascending: true });

  if (
    withToken.error &&
    /ical_export_token|column .* does not exist/i.test(withToken.error.message)
  ) {
    const withoutToken = await supabase
      .from("room_units")
      .select("id, number, sort_order")
      .order("sort_order", { ascending: true });
    unitRows = withoutToken.data;
    if (withoutToken.error) {
      if (
        /relation .*room_units.* does not exist|Could not find the table/i.test(
          withoutToken.error.message,
        )
      ) {
        return {
          units: [],
          source: "sample",
          error: "Run supabase/migrate-room-units.sql to enable room numbers.",
        };
      }

      return { units: [], source: "sample", error: withoutToken.error.message };
    }
  } else if (withToken.error) {
    if (/relation .*room_units.* does not exist|Could not find the table/i.test(withToken.error.message)) {
      return {
        units: [],
        source: "sample",
        error: "Run supabase/migrate-room-units.sql to enable room numbers.",
      };
    }

    return { units: [], source: "sample", error: withToken.error.message };
  } else {
    unitRows = withToken.data;
  }

  if (!unitRows?.length) {
    return {
      units: [],
      source: "sample",
      error: "No room numbers found. Re-run supabase/migrate-room-units.sql to seed them.",
    };
  }

  const { data: typeRows, error: typesError } = await supabase
    .from("room_unit_types")
    .select("room_unit_id, room_id");

  if (typesError) {
    // Units exist; repair type links from the known door map so assignment still works.
    const units = withDefaultRoomIds(
      unitRows.map((row) => ({
        id: row.id,
        number: row.number,
        sortOrder: row.sort_order,
        roomIds: [] as string[],
        icalExportToken: row.ical_export_token ?? null,
      })),
    );
    return {
      units,
      source: "supabase",
      error: "Room-type links missing — using built-in door map. Re-run migrate-room-units.sql when you can.",
    };
  }

  const roomIdsByUnit = new Map<string, string[]>();
  for (const row of typeRows ?? []) {
    const list = roomIdsByUnit.get(row.room_unit_id) ?? [];
    list.push(row.room_id);
    roomIdsByUnit.set(row.room_unit_id, list);
  }

  const units = withDefaultRoomIds(
    unitRows.map((row) => ({
      id: row.id,
      number: row.number,
      sortOrder: row.sort_order,
      roomIds: roomIdsByUnit.get(row.id) ?? [],
      icalExportToken: row.ical_export_token ?? null,
    })),
  );

  return { units, source: "supabase", error: null };
}
