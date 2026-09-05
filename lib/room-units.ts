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
};

/** Superior (courtyard) door numbers — assignment / sellable inventory. */
export const COURTYARD_UNIT_NUMBERS = ["113", "115", "118", "120"] as const;

/** Deluxe (garden) door numbers — assignment / sellable inventory. */
export const GARDEN_UNIT_NUMBERS = ["112", "117", "119"] as const;

/** Family (loft) door number. */
export const LOFT_UNIT_NUMBERS = ["114"] as const;

/** Family Ground Floor door number. */
export const GROUND_UNIT_NUMBERS = ["116"] as const;

/**
 * Staff door-chart row order (property walk order).
 * Unknown doors sort after these, by type then number.
 */
export const TIMELINE_DOOR_CHART_ORDER = [
  "116",
  "113",
  "120",
  "115",
  "118",
  "112",
  "117",
  "119",
  "114",
] as const;

/** Door number → room type ids (used to repair missing room_unit_types rows). */
const DEFAULT_UNIT_ROOM_IDS: Record<string, string[]> = {
  "113": ["courtyard"],
  "115": ["courtyard"],
  "118": ["courtyard"],
  "120": ["courtyard"],
  "112": ["garden"],
  "114": ["loft"],
  "116": ["ground"],
  "117": ["garden"],
  "119": ["garden"],
};

export const SAMPLE_ROOM_UNITS: RoomUnit[] = Object.entries(DEFAULT_UNIT_ROOM_IDS).map(
  ([number, roomIds]) => {
    const chartIndex = (TIMELINE_DOOR_CHART_ORDER as readonly string[]).indexOf(number);
    return {
      id: `unit-${number}`,
      number,
      sortOrder: chartIndex >= 0 ? (chartIndex + 1) * 10 : 1000,
      roomIds,
    };
  },
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

export function getTypeUnitIdSet(units: RoomUnit[], roomId: string) {
  return new Set(getUnitsForRoomType(units, roomId).map((unit) => unit.id));
}

/** True when a stay has no door, or points at a deleted/unknown unit id. */
export function stayNeedsRoomAssignment(
  stay: { roomUnitId?: string | null },
  knownUnitIds: ReadonlySet<string>,
) {
  return !stay.roomUnitId || !knownUnitIds.has(stay.roomUnitId);
}

export function getKnownUnitIdSet(units: RoomUnit[]) {
  return new Set(units.map((unit) => unit.id));
}

export function getUnitsForRoomType(units: RoomUnit[], roomId: string) {
  return units
    .filter((unit) => {
      if (!unit.roomIds.includes(roomId)) {
        return false;
      }
      // Ignore stale DB links that no longer match Airbnb unit pools.
      if (roomId === "courtyard") {
        return (COURTYARD_UNIT_NUMBERS as readonly string[]).includes(unit.number);
      }
      if (roomId === "garden") {
        return (GARDEN_UNIT_NUMBERS as readonly string[]).includes(unit.number);
      }
      if (roomId === "loft") {
        return (LOFT_UNIT_NUMBERS as readonly string[]).includes(unit.number);
      }
      if (roomId === "ground") {
        return (GROUND_UNIT_NUMBERS as readonly string[]).includes(unit.number);
      }
      return true;
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.number.localeCompare(right.number));
}

/** Units shown on the staff timeline for a room type. */
export function getTimelineUnitsForRoomType(units: RoomUnit[], roomId: string) {
  return getUnitsForRoomType(units, roomId);
}

/**
 * Flat door list for the distilled tape chart — every physical room number.
 * Prefer property walk order; unknown doors fall back to type then number.
 */
export function getTimelineDoorUnits(
  units: RoomUnit[],
  roomShortNameById?: ReadonlyMap<string, string>,
) {
  const seen = new Set<string>();
  const doors: RoomUnit[] = [];

  for (const unit of units) {
    if (seen.has(unit.id)) {
      continue;
    }
    seen.add(unit.id);
    doors.push(unit);
  }

  return doors.sort((left, right) => {
    const chartDelta =
      getTimelineDoorChartSortKey(left.number) - getTimelineDoorChartSortKey(right.number);
    if (chartDelta !== 0) {
      return chartDelta;
    }
    const typeDelta =
      getTimelineDoorTypeSortKey(left, roomShortNameById) -
      getTimelineDoorTypeSortKey(right, roomShortNameById);
    if (typeDelta !== 0) {
      return typeDelta;
    }
    return (
      left.number.localeCompare(right.number, undefined, { numeric: true }) ||
      left.sortOrder - right.sortOrder
    );
  });
}

/** Index in the property door chart; unknown doors sort after known ones. */
export function getTimelineDoorChartSortKey(unitNumber: string) {
  const index = (TIMELINE_DOOR_CHART_ORDER as readonly string[]).indexOf(unitNumber);
  return index >= 0 ? index : TIMELINE_DOOR_CHART_ORDER.length;
}

/**
 * Fallback door order for doors not in TIMELINE_DOOR_CHART_ORDER:
 * Twin → Double → Deluxe → Family.
 * Superior (double-or-twin) sorts with Twin; Family GF after Family balcony.
 */
export function getTimelineDoorTypeSortKey(
  unit: RoomUnit,
  roomShortNameById?: ReadonlyMap<string, string>,
) {
  const roomId = (getPrimaryRoomIdForUnit(unit) ?? "").toLowerCase();
  const short = (
    roomShortNameById?.get(roomId) ??
    roomShortNameById?.get(getPrimaryRoomIdForUnit(unit) ?? "") ??
    roomId
  )
    .toLowerCase()
    .trim();

  const label = `${short} ${roomId}`;

  if (/\bgf\b/.test(label) || roomId === "ground" || short === "family gf") {
    return 40;
  }
  if (roomId === "loft" || short === "family" || short.startsWith("family")) {
    return 30;
  }
  if (roomId === "garden" || short.startsWith("deluxe")) {
    return 20;
  }
  if (short.startsWith("double") || roomId === "double") {
    return 10;
  }
  if (
    short.startsWith("twin") ||
    roomId === "twin" ||
    roomId === "courtyard" ||
    short.startsWith("superior")
  ) {
    return 0;
  }

  return 100;
}

/** Primary room type for day-panel links from a door row. */
export function getPrimaryRoomIdForUnit(unit: RoomUnit) {
  return unit.roomIds[0] ?? null;
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

/** False when every door for this type already has an overlapping stay or channel block. */
export function hasAssignableUnitForStay({
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
  return (
    getAssignableUnitsForStay({
      units,
      roomId,
      arrivalDate,
      departureDate,
      excludeId,
      occupancies,
    }).length > 0
  );
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

/** Repair stale DB type links using the built-in door map. */
export function applyDefaultRoomIds(units: RoomUnit[]): RoomUnit[] {
  return withDefaultRoomIds(units);
}

function withDefaultRoomIds(units: RoomUnit[]): RoomUnit[] {
  return units.map((unit) => {
    let roomIds = unit.roomIds.length > 0 ? unit.roomIds : (DEFAULT_UNIT_ROOM_IDS[unit.number] ?? []);

    // Strip type links that no longer match the Airbnb door pools.
    if (unit.number === "116" || !(COURTYARD_UNIT_NUMBERS as readonly string[]).includes(unit.number)) {
      roomIds = roomIds.filter((id) => id !== "courtyard");
    }
    if (!(GARDEN_UNIT_NUMBERS as readonly string[]).includes(unit.number)) {
      roomIds = roomIds.filter((id) => id !== "garden");
    }
    // Triple (veranda) was removed — drop any leftover type links.
    roomIds = roomIds.filter((id) => id !== "veranda");
    if (!(LOFT_UNIT_NUMBERS as readonly string[]).includes(unit.number)) {
      roomIds = roomIds.filter((id) => id !== "loft");
    }
    if (!(GROUND_UNIT_NUMBERS as readonly string[]).includes(unit.number)) {
      roomIds = roomIds.filter((id) => id !== "ground");
    }

    if (roomIds.length === 0) {
      roomIds = [...(DEFAULT_UNIT_ROOM_IDS[unit.number] ?? [])];
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
  const unitsResult = await supabase
    .from("room_units")
    .select("id, number, sort_order")
    .order("sort_order", { ascending: true });

  if (unitsResult.error) {
    if (
      /relation .*room_units.* does not exist|Could not find the table/i.test(
        unitsResult.error.message,
      )
    ) {
      return {
        units: [],
        source: "sample",
        error: "Run supabase/schema.sql to enable room numbers.",
      };
    }

    return { units: [], source: "sample", error: unitsResult.error.message };
  }

  const unitRows = unitsResult.data;

  if (!unitRows?.length) {
    return {
      units: [],
      source: "sample",
      error: "No room numbers found. Re-run supabase/schema.sql to seed them.",
    };
  }

  const { data: typeRows, error: typesError } = await supabase
    .from("room_unit_types")
    .select("room_unit_id, room_id");

  if (typesError) {
    // Units exist; repair type links from the known door map so assignment still works.
    const units = applyDefaultRoomIds(
      unitRows.map((row) => ({
        id: row.id,
        number: row.number,
        sortOrder: row.sort_order,
        roomIds: [] as string[],
      })),
    );
    return {
      units,
      source: "supabase",
      error: "Room-type links missing — using built-in door map. Re-run supabase/schema.sql when you can.",
    };
  }

  const roomIdsByUnit = new Map<string, string[]>();
  for (const row of typeRows ?? []) {
    const list = roomIdsByUnit.get(row.room_unit_id) ?? [];
    list.push(row.room_id);
    roomIdsByUnit.set(row.room_unit_id, list);
  }

  const units = applyDefaultRoomIds(
    unitRows.map((row) => ({
      id: row.id,
      number: row.number,
      sortOrder: row.sort_order,
      roomIds: roomIdsByUnit.get(row.id) ?? [],
    })),
  );

  return { units, source: "supabase", error: null };
}
