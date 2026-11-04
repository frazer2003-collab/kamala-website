import {
  findUnitAssignmentConflict,
  getRoomUnitById,
  isUnitEligibleForRoom,
  type RoomUnit,
  type UnitOccupancy,
} from "@/lib/room-units";

export type DoorDropStay = {
  id: string;
  roomId: string;
  roomUnitId: string | null;
  arrivalDate: string;
  departureDate: string;
};

export type DoorDropTarget =
  | { type: "unit"; unitId: string }
  | { type: "booking"; stay: DoorDropStay }
  | { type: "unassign" };

export type DoorDropPlan =
  | { action: "noop" }
  | { action: "assign"; bookingId: string; unitId: string }
  | { action: "unassign"; bookingId: string }
  | {
      action: "swap";
      sourceId: string;
      sourceUnitId: string;
      targetId: string;
      targetUnitId: string;
    }
  | {
      action: "replace";
      sourceId: string;
      unitId: string;
      displacedId: string;
    }
  | { action: "reject"; reason: "ineligible" | "conflict" | "unavailable" };

function canOccupyUnit(
  stay: DoorDropStay,
  unitId: string,
  units: RoomUnit[],
  occupancies: UnitOccupancy[],
  excludeIds: string[],
) {
  const unit = getRoomUnitById(units, unitId);
  if (!unit || !isUnitEligibleForRoom(unit, stay.roomId)) {
    return false;
  }
  return (
    findUnitAssignmentConflict({
      units,
      unitId,
      arrivalDate: stay.arrivalDate,
      departureDate: stay.departureDate,
      excludeIds,
      occupancies,
    }) === null
  );
}

/**
 * Pure planner for calendar door drag-drop.
 * Prefer swap when both doors are mutually free; otherwise replace (take door,
 * displace the other stay to No #) when the target is replaceable.
 */
export function resolveCalendarDoorDrop({
  source,
  target,
  units,
  occupancies,
}: {
  source: DoorDropStay;
  target: DoorDropTarget;
  units: RoomUnit[];
  occupancies: UnitOccupancy[];
}): DoorDropPlan {
  if (target.type === "unassign") {
    if (!source.roomUnitId) {
      return { action: "noop" };
    }
    return { action: "unassign", bookingId: source.id };
  }

  if (target.type === "unit") {
    if (source.roomUnitId === target.unitId) {
      return { action: "noop" };
    }
    if (!getRoomUnitById(units, target.unitId)) {
      return { action: "reject", reason: "unavailable" };
    }
    if (
      !canOccupyUnit(source, target.unitId, units, occupancies, [source.id])
    ) {
      const unit = getRoomUnitById(units, target.unitId);
      if (!unit || !isUnitEligibleForRoom(unit, source.roomId)) {
        return { action: "reject", reason: "ineligible" };
      }
      return { action: "reject", reason: "conflict" };
    }
    return {
      action: "assign",
      bookingId: source.id,
      unitId: target.unitId,
    };
  }

  const other = target.stay;
  if (other.id === source.id) {
    return { action: "noop" };
  }
  if (!other.roomUnitId) {
    return { action: "reject", reason: "unavailable" };
  }
  if (source.roomUnitId === other.roomUnitId) {
    return { action: "noop" };
  }

  const bothIds = [source.id, other.id];
  const sourceCanTakeTarget = canOccupyUnit(
    source,
    other.roomUnitId,
    units,
    occupancies,
    bothIds,
  );

  if (
    source.roomUnitId &&
    sourceCanTakeTarget &&
    canOccupyUnit(other, source.roomUnitId, units, occupancies, bothIds)
  ) {
    return {
      action: "swap",
      sourceId: source.id,
      sourceUnitId: source.roomUnitId,
      targetId: other.id,
      targetUnitId: other.roomUnitId,
    };
  }

  // Replaceable: source can take the other stay's door; other goes to No #.
  if (sourceCanTakeTarget) {
    return {
      action: "replace",
      sourceId: source.id,
      unitId: other.roomUnitId,
      displacedId: other.id,
    };
  }

  const unit = getRoomUnitById(units, other.roomUnitId);
  if (!unit || !isUnitEligibleForRoom(unit, source.roomId)) {
    return { action: "reject", reason: "ineligible" };
  }
  return { action: "reject", reason: "conflict" };
}

/** True when dropping source onto this booking would swap or replace. */
export function isCalendarDoorDropReplaceable({
  source,
  target,
  units,
  occupancies,
}: {
  source: DoorDropStay;
  target: DoorDropStay;
  units: RoomUnit[];
  occupancies: UnitOccupancy[];
}) {
  const plan = resolveCalendarDoorDrop({
    source,
    target: { type: "booking", stay: target },
    units,
    occupancies,
  });
  return plan.action === "swap" || plan.action === "replace";
}
