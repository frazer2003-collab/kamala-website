"use client";

import { useEffect, useMemo, useState } from "react";
import { removeRoomBlock, updateChannelReservation } from "@/app/actions";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import type { Room } from "@/lib/content";
import type { RoomUnit, UnitOccupancy } from "@/lib/room-units";
import { getRoomUnitById, getUnitOptionsForStay } from "@/lib/room-units";

type CalendarBlockPanelProps = {
  block: StaffRoomBlock;
  room: Room | undefined;
  monthKey: string;
  canManage: boolean;
  rooms: Array<{ id: string; name: string }>;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  formError?: string | null;
};

function formatDateRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });
  const start = formatter.format(new Date(`${startDate}T00:00:00`));
  const end = formatter.format(new Date(`${endDate}T00:00:00`));

  return `${start} – ${end}`;
}

export function CalendarBlockPanel({
  block,
  room,
  monthKey,
  canManage,
  rooms,
  roomUnits,
  occupancies,
  formError,
}: CalendarBlockPanelProps) {
  const removeAction = useMemo(
    () => removeRoomBlock.bind(null, block.databaseId ?? "", monthKey),
    [block.databaseId, monthKey],
  );
  const saveChannelAction = useMemo(
    () => updateChannelReservation.bind(null, block.databaseId ?? "", monthKey),
    [block.databaseId, monthKey],
  );
  const isChannel = block.channelLabel !== null;
  const fieldPrefix = block.databaseId ?? block.id;
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [fields, setFields] = useState({
    arrivalDate: block.startDate,
    departureDate: block.endDate,
    roomId: block.roomId || room?.id || "",
    roomUnitId: block.roomUnitId ?? "",
  });

  useEffect(() => {
    setConfirmReopen(false);
    setFields({
      arrivalDate: block.startDate,
      departureDate: block.endDate,
      roomId: block.roomId || room?.id || "",
      roomUnitId: block.roomUnitId ?? "",
    });
  }, [
    block.databaseId,
    block.startDate,
    block.endDate,
    block.roomId,
    block.roomUnitId,
    room?.id,
  ]);

  const unitOptions = useMemo(() => {
    if (!fields.roomId) {
      return [];
    }

    return getUnitOptionsForStay({
      units: roomUnits,
      roomId: fields.roomId,
      arrivalDate: fields.arrivalDate,
      departureDate: fields.departureDate,
      excludeId: block.databaseId || undefined,
      occupancies,
    });
  }, [
    block.databaseId,
    fields.arrivalDate,
    fields.departureDate,
    fields.roomId,
    occupancies,
    roomUnits,
  ]);

  const currentUnit = getRoomUnitById(roomUnits, fields.roomUnitId);
  const selectedRoom = rooms.find((option) => option.id === fields.roomId);

  return (
    <>
      <div className="reservation-detail__top">
        <span>{block.id}</span>
        <div
          className={`staff-status ${isChannel ? "staff-status--channel" : "staff-status--declined"}`}
        >
          <span aria-hidden="true" />
          {isChannel ? block.channelLabel : "Closed"}
        </div>
      </div>
      <dl className="detail-list">
        {!isChannel ? (
          <div>
            <dt>Room</dt>
            <dd>{room?.name ?? block.roomId}</dd>
          </div>
        ) : null}
        {isChannel ? (
          <div>
            <dt>Channel</dt>
            <dd>{block.channelLabel}</dd>
          </div>
        ) : (
          <>
            <div>
              <dt>Dates</dt>
              <dd>{formatDateRange(block.startDate, block.endDate)}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{block.reason}</dd>
            </div>
            {block.staffNote ? (
              <div>
                <dt>Staff note</dt>
                <dd>{block.staffNote}</dd>
              </div>
            ) : null}
          </>
        )}
      </dl>

      {isChannel ? (
        <>
          {formError ? (
            <p className="form-message form-message--error" role="alert">
              {formError}
            </p>
          ) : null}
          <form action={saveChannelAction} className="calendar-manage-form">
            <div className="field-pair field-pair--wide">
              <label htmlFor={`channel-guest-name-${fieldPrefix}`}>Guest name</label>
              <input
                defaultValue={block.guestName}
                disabled={!canManage}
                id={`channel-guest-name-${fieldPrefix}`}
                name="guest-name"
                placeholder="Optional — add who is staying"
                type="text"
              />
            </div>
            <div className="field-pair">
              <label htmlFor={`channel-guest-phone-${fieldPrefix}`}>Phone number</label>
              <input
                defaultValue={block.guestPhone}
                disabled={!canManage}
                id={`channel-guest-phone-${fieldPrefix}`}
                name="guest-phone"
                placeholder="Optional"
                type="tel"
              />
            </div>
            <div className="field-pair">
              <label htmlFor={`channel-guest-email-${fieldPrefix}`}>Email</label>
              <input
                defaultValue={block.guestEmail}
                disabled={!canManage}
                id={`channel-guest-email-${fieldPrefix}`}
                name="guest-email"
                placeholder="Optional"
                type="email"
              />
            </div>
            <div className="field-pair">
              <label htmlFor={`channel-arrival-${fieldPrefix}`}>Arrival</label>
              <input
                disabled={!canManage}
                id={`channel-arrival-${fieldPrefix}`}
                name="arrival"
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    arrivalDate: event.target.value,
                  }))
                }
                required
                type="date"
                value={fields.arrivalDate}
              />
            </div>
            <div className="field-pair">
              <label htmlFor={`channel-departure-${fieldPrefix}`}>Departure</label>
              <input
                disabled={!canManage}
                id={`channel-departure-${fieldPrefix}`}
                name="departure"
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    departureDate: event.target.value,
                  }))
                }
                required
                type="date"
                value={fields.departureDate}
              />
            </div>
            <div className="field-pair">
              <label htmlFor={`channel-room-type-${fieldPrefix}`}>Room type</label>
              <select
                disabled={!canManage}
                id={`channel-room-type-${fieldPrefix}`}
                name="room-id"
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    roomId: event.target.value,
                    roomUnitId: "",
                  }))
                }
                value={fields.roomId}
              >
                {rooms.map((roomOption) => (
                  <option key={roomOption.id} value={roomOption.id}>
                    {roomOption.name}
                  </option>
                ))}
              </select>
              <p className="detail-help">
                Changing room type keeps the booked price. Room number is
                cleared.
              </p>
            </div>
            <div className="field-pair">
              <label htmlFor={`channel-room-unit-${fieldPrefix}`}>Room number</label>
              <select
                disabled={!canManage || (unitOptions.length === 0 && !currentUnit)}
                id={`channel-room-unit-${fieldPrefix}`}
                name="room-unit-id"
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    roomUnitId: event.target.value,
                  }))
                }
                value={fields.roomUnitId}
              >
                <option value="">Not assigned yet</option>
                {currentUnit &&
                !unitOptions.some((option) => option.unit.id === currentUnit.id) ? (
                  <option value={currentUnit.id}>
                    {currentUnit.number}
                    {currentUnit.roomIds.length > 1 ? " (shared)" : ""}
                  </option>
                ) : null}
                {unitOptions.map(({ unit, available, conflictGuest }) => (
                  <option
                    disabled={!available && unit.id !== fields.roomUnitId}
                    key={unit.id}
                    value={unit.id}
                  >
                    {unit.number}
                    {unit.roomIds.length > 1 ? " (shared)" : ""}
                    {!available && conflictGuest ? ` — taken (${conflictGuest})` : ""}
                  </option>
                ))}
              </select>
              {unitOptions.length === 0 ? (
                <p className="field-hint">
                  {!selectedRoom
                    ? "This channel stay is not linked to a room type, so a door number cannot be assigned."
                    : roomUnits.length === 0
                      ? "Room numbers aren’t set up yet. Ask whoever set up the site to finish room-number setup."
                      : `No door numbers are linked to ${selectedRoom.name}. Ask whoever set up the site to link doors to this room type.`}
                </p>
              ) : null}
            </div>
            <div className="field-pair field-pair--wide">
              <label htmlFor={`channel-note-${fieldPrefix}`}>Staff note</label>
              <textarea
                defaultValue={block.staffNote}
                disabled={!canManage}
                id={`channel-note-${fieldPrefix}`}
                name="staff-note"
                rows={2}
              />
            </div>
            <button className="button button--primary" disabled={!canManage} type="submit">
              Save reservation
            </button>
          </form>

          <p className="detail-help">
            Assign a room number so this OTA stay appears on the room-number
            rows. Guest details and assignment are kept when the calendar syncs;
            dates may still update from the channel.
          </p>
        </>
      ) : (
        <>
          {confirmReopen ? (
            <div className="calendar-cancel-confirm">
              <p className="calendar-cancel-confirm__summary">
                Reopen these closed dates for{" "}
                <strong>{room?.name ?? "this room"}</strong>? Guests will be able
                to book them again.
              </p>
              <div className="calendar-cancel-confirm__actions">
                <form action={removeAction}>
                  <button
                    className="button button--primary"
                    disabled={!canManage}
                    type="submit"
                  >
                    Yes, reopen dates
                  </button>
                </form>
                <button
                  className="button button--secondary"
                  disabled={!canManage}
                  onClick={() => setConfirmReopen(false)}
                  type="button"
                >
                  Keep closed
                </button>
              </div>
            </div>
          ) : (
            <div className="detail-actions">
              <button
                className="button button--secondary"
                disabled={!canManage}
                onClick={() => setConfirmReopen(true)}
                type="button"
              >
                Reopen dates
              </button>
            </div>
          )}

          <p className="detail-help">
            Reopening removes this closure. Closed nights stay visible in the room
            status row and shaded columns — not as reservation bars.
          </p>
        </>
      )}
    </>
  );
}
