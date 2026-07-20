"use client";
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
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  guestLabel: string;
};

function AssignSelect({
  stayId,
  guestLabel,
  available,
}: {
  stayId: string;
  guestLabel: string;
  available: { unit: RoomUnit }[];
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <label className="sr-only" htmlFor={`inline-assign-${stayId}`}>
        Assign room number for {guestLabel}
      </label>
      <select
        aria-busy={pending}
        defaultValue=""
        disabled={pending}
        id={`inline-assign-${stayId}`}
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
          {pending ? "…" : "Room #"}
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
  roomUnits,
  occupancies,
  guestLabel,
}: InlineRoomAssignProps) {
  const options = getUnitOptionsForStay({
    units: roomUnits,
    roomId,
    arrivalDate,
    departureDate,
    excludeId: stayId,
    occupancies,
  });
  const available = options.filter((option) => option.available);

  if (available.length === 0) {
    return (
      <span className="extranet-bar__assign-empty" title="No free door numbers for these dates">
        No doors free
      </span>
    );
  }

  return (
    <form action={assignStayRoomUnit} className="extranet-bar__assign">
      <StaffFormBusyBridge />
      <input name="kind" type="hidden" value={kind} />
      <input name="stay-id" type="hidden" value={stayId} />
      <input name="month" type="hidden" value={monthKey} />
      <input name="guest-label" type="hidden" value={guestLabel} />
      <AssignSelect available={available} guestLabel={guestLabel} stayId={stayId} />
    </form>
  );
}
