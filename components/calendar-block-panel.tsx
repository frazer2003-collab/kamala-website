"use client";

import { useMemo } from "react";
import { removeRoomBlock, updateChannelReservation } from "@/app/actions";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import type { Room } from "@/lib/content";

type CalendarBlockPanelProps = {
  block: StaffRoomBlock;
  room: Room | undefined;
  monthKey: string;
  canManage: boolean;
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
        <div>
          <dt>Room</dt>
          <dd>{room?.name ?? block.roomId}</dd>
        </div>
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
                defaultValue={block.startDate}
                disabled={!canManage}
                id={`channel-arrival-${fieldPrefix}`}
                name="arrival"
                required
                type="date"
              />
            </div>
            <div className="field-pair">
              <label htmlFor={`channel-departure-${fieldPrefix}`}>Departure</label>
              <input
                defaultValue={block.endDate}
                disabled={!canManage}
                id={`channel-departure-${fieldPrefix}`}
                name="departure"
                required
                type="date"
              />
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
            <button className="button" disabled={!canManage} type="submit">
              Save reservation
            </button>
          </form>

          <p className="detail-help">
            Guest details and staff notes you add are kept when the calendar
            syncs. Dates come from the channel, so they may update on the next
            sync.
          </p>
        </>
      ) : (
        <>
          <form action={removeAction} className="detail-actions">
            <button
              className="button button--secondary"
              disabled={!canManage}
              type="submit"
            >
              Reopen dates
            </button>
          </form>

          <p className="detail-help">
            Reopening removes this closure. Closed nights stay visible in the room
            status row and shaded columns — not as reservation bars.
          </p>
        </>
      )}
    </>
  );
}
