"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bulkUpdateRoomAvailability } from "@/app/actions";
import { getTodayIso } from "@/lib/calendar";
import type { Room } from "@/lib/content";

type CalendarBulkAvailabilityPanelProps = {
  room: Room;
  monthKey: string;
  canManage: boolean;
  error?: string;
};

function addIsoDays(iso: string, days: number) {
  const next = new Date(`${iso}T00:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function getErrorMessage(error?: string) {
  if (error === "past-date") {
    return "Availability edits can only apply from today onward.";
  }

  if (error === "invalid-dates") {
    return "Choose a valid date range. End date must be on or after the start date.";
  }

  if (error === "save-failed") {
    return "Could not save availability. Try again, or ask whoever set up the site if the problem continues.";
  }

  return null;
}

export function CalendarBulkAvailabilityPanel({
  room,
  monthKey,
  canManage,
  error,
}: CalendarBulkAvailabilityPanelProps) {
  const todayIso = useMemo(() => getTodayIso(), []);
  const defaultEnd = useMemo(() => addIsoDays(todayIso, 6), [todayIso]);
  const closeHref = `/staff/calendar?month=${monthKey}`;
  const errorMessage = getErrorMessage(error);
  const [action, setAction] = useState<"close" | "open">("close");

  return (
    <>
      <p className="calendar-day-panel__intro">
        Set <strong>room status</strong> for <strong>{room.name}</strong> across a
        date range. Closed nights show as red status pills on the calendar.
      </p>
      {errorMessage ? (
        <p className="form-message form-message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <form action={bulkUpdateRoomAvailability} className="calendar-manage-form">
      <StaffFormBusyBridge />
        <input name="month" type="hidden" value={monthKey} />
        <input name="room-id" type="hidden" value={room.id} />
        <input name="availability-action" type="hidden" value={action} />
        <div className="field-pair field-pair--wide">
          <span className="calendar-bulk-availability__label">Status</span>
          <div className="calendar-bulk-availability__actions" role="group" aria-label="Room status">
            <button
              className={`button ${action === "close" ? "button--primary" : "button--secondary"}`}
              disabled={!canManage}
              onClick={() => setAction("close")}
              type="button"
            >
              Close
            </button>
            <button
              className={`button ${action === "open" ? "button--primary" : "button--secondary"}`}
              disabled={!canManage}
              onClick={() => setAction("open")}
              type="button"
            >
              Open
            </button>
          </div>
        </div>
        <div className="field-pair">
          <label htmlFor="bulk-status-start-date">From</label>
          <input
            defaultValue={todayIso}
            disabled={!canManage}
            id="bulk-status-start-date"
            min={todayIso}
            name="start-date"
            required
            type="date"
          />
        </div>
        <div className="field-pair">
          <label htmlFor="bulk-status-end-date">To (inclusive)</label>
          <input
            defaultValue={defaultEnd}
            disabled={!canManage}
            id="bulk-status-end-date"
            min={todayIso}
            name="end-date"
            required
            type="date"
          />
        </div>
        {action === "close" ? (
          <>
            <div className="field-pair">
              <label htmlFor="bulk-status-reason">Reason</label>
              <input
                defaultValue="Closed"
                disabled={!canManage}
                id="bulk-status-reason"
                name="reason"
                placeholder="Maintenance, hold, or private use"
                type="text"
              />
            </div>
            <div className="field-pair field-pair--wide">
              <label htmlFor="bulk-status-staff-note">Staff note</label>
              <textarea
                disabled={!canManage}
                id="bulk-status-staff-note"
                name="staff-note"
                placeholder="Anything the front desk should remember."
                rows={2}
              />
            </div>
          </>
        ) : null}
        <div className="calendar-day-panel__actions">
          <Link className="button button--quiet" href={closeHref}>
            Cancel
          </Link>
          <button className="button button--primary" disabled={!canManage} type="submit">
            {action === "close" ? "Close dates" : "Open dates"}
          </button>
        </div>
      </form>
      {!canManage ? (
        <p className="detail-help">
          Connect the site to save availability changes.
        </p>
      ) : (
        <p className="detail-help">
          {action === "close"
            ? "Closing marks every night in the range as unavailable on the status row."
            : "Opening removes closures for nights in the range. Closures that only partly overlap are trimmed."}
        </p>
      )}
    </>
  );
}
