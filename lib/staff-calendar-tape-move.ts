import {
  findUnitAssignmentConflict,
  isUnitEligibleForRoom,
  type RoomUnit,
  type UnitOccupancy,
} from "@/lib/room-units";

export const STAFF_TAPE_MOVE_MIME = "application/x-kamala-tape-move";

export type StaffTapeMovePayload = {
  kind: "booking" | "channel";
  stayId: string;
  roomId: string;
  arrivalDate: string;
  departureDate: string;
  guestLabel: string;
  currentUnitId: string | null;
};

export function serializeTapeMovePayload(payload: StaffTapeMovePayload) {
  return JSON.stringify(payload);
}

export function parseTapeMovePayload(raw: string | null | undefined): StaffTapeMovePayload | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StaffTapeMovePayload>;
    if (
      (parsed.kind !== "booking" && parsed.kind !== "channel") ||
      typeof parsed.stayId !== "string" ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.arrivalDate !== "string" ||
      typeof parsed.departureDate !== "string" ||
      typeof parsed.guestLabel !== "string"
    ) {
      return null;
    }
    return {
      kind: parsed.kind,
      stayId: parsed.stayId,
      roomId: parsed.roomId,
      arrivalDate: parsed.arrivalDate,
      departureDate: parsed.departureDate,
      guestLabel: parsed.guestLabel,
      currentUnitId:
        typeof parsed.currentUnitId === "string" || parsed.currentUnitId === null
          ? (parsed.currentUnitId ?? null)
          : null,
    };
  } catch {
    return null;
  }
}

export function canDropStayOnUnit({
  payload,
  unit,
  units,
  occupancies,
}: {
  payload: StaffTapeMovePayload;
  unit: RoomUnit;
  units: RoomUnit[];
  occupancies: UnitOccupancy[];
}) {
  if (payload.currentUnitId === unit.id) {
    return { ok: false as const, reason: "same-door" as const };
  }
  if (!isUnitEligibleForRoom(unit, payload.roomId)) {
    return { ok: false as const, reason: "wrong-type" as const };
  }
  const conflict = findUnitAssignmentConflict({
    units,
    unitId: unit.id,
    arrivalDate: payload.arrivalDate,
    departureDate: payload.departureDate,
    excludeId: payload.stayId,
    occupancies,
  });
  if (conflict) {
    return { ok: false as const, reason: "taken" as const, guest: conflict.conflictGuest };
  }
  return { ok: true as const };
}
