"use client";
import { CalendarRangeFields } from "@/components/calendar-range-fields";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { useFormStatus } from "react-dom";
import { assignStayRoomUnit } from "@/app/actions";
import type { RoomUnit, UnitOccupancy } from "@/lib/room-units";
import { getUnitOptionsForStay } from "@/lib/room-units";

type InlineRoomAssignProps = {
  kind: "booking" | "channel";
  stayId: string;
  roomId: string;
  arrivalDate: string;
  departureDate: string;
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  guestLabel: string;
  /** Assign an unassigned stay, or move an already-assigned one. */
  mode?: "assign" | "move";
  currentUnitId?: string | null;
};

function AssignSelect({
  stayId,
  guestLabel,
  available,
  mode,
}: {
  stayId: string;
  guestLabel: string;
  available: { unit: RoomUnit }[];
  mode: "assign" | "move";
}) {
  const { pending } = useFormStatus();
  const controlId = `inline-assign-${mode}-${stayId}`;

  return (
    <>
      <label className="sr-only" htmlFor={controlId}>
        {mode === "move"
          ? `Move ${guestLabel} to another room number`
          : `Assign room number for ${guestLabel}`}
      </label>
      <select
        aria-busy={pending}
        defaultValue=""
        disabled={pending}
        id={controlId}
        name="room-unit-id"
        onChange={(event) => {
          if (!event.currentTarget.value || pending) {
            return;
          }
          event.currentTarget.form?.requestSubmit();
        }}
        required
      >
        <option disabled value="">
          {pending ? "…" : mode === "move" ? "Move to #" : "Room #"}
        </option>
        {available.map(({ unit }) => (
          <option key={unit.id} value={unit.id}>
            #{unit.number}
            {unit.roomIds.length > 1 ? " shared" : ""}
          </option>
        ))}
      </select>
    </>
  );
}

export function InlineRoomAssign({
  kind,
  stayId,
  roomId,
  arrivalDate,
  departureDate,
  monthKey,
  fromIso,
  toIso,
  roomUnits,
  occupancies,
  guestLabel,
  mode = "assign",
  currentUnitId = null,
}: InlineRoomAssignProps) {
  const options = getUnitOptionsForStay({
    units: roomUnits,
    roomId,
    arrivalDate,
    departureDate,
    excludeId: stayId,
    occupancies,
  });
  const available = options.filter(
    (option) => option.available && option.unit.id !== currentUnitId,
  );

  if (available.length === 0) {
    return (
      <span className="extranet-bar__assign-empty" title="No free door numbers for these dates">
        No doors free
      </span>
    );
  }

  return (
    <form
      action={assignStayRoomUnit}
      className={[
        "extranet-bar__assign",
        mode === "move" ? "extranet-bar__assign--move" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <StaffFormBusyBridge />
      <input name="kind" type="hidden" value={kind} />
      <input name="stay-id" type="hidden" value={stayId} />
      <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
      <input name="guest-label" type="hidden" value={guestLabel} />
      <AssignSelect
        available={available}
        guestLabel={guestLabel}
        mode={mode}
        stayId={stayId}
      />
    </form>
  );
}
