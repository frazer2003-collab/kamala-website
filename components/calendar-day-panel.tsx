"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  bulkUpdateRoomDayAllotment,
  bulkUpdateRoomDayRate,
  createRoomBlock,
  updateRoomDayAllotment,
  updateRoomDayRate,
} from "@/app/actions";
import { CalendarRangeFields } from "@/components/calendar-range-fields";
import { CalendarWalkInForm } from "@/components/calendar-walk-in-form";
import { buildStaffCalendarHref, getPropertyTodayIso } from "@/lib/calendar";
import type { Room } from "@/lib/content";
import type { PropertyCurrency } from "@/lib/currency";
import type { RoomPromotionRate } from "@/lib/pricing";
import {
  formatOverlapErrorMessage,
  parseOverlapDays,
} from "@/lib/stay-overlap";
import { staffCapacityErrorMessage } from "@/lib/booking-overbook";

type DayStayLink = {
  key: string;
  href: string;
  label: string;
  sublabel: string;
};

type CalendarDayPanelProps = {
  room: Room;
  date: string;
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  mode?: string;
  canManage: boolean;
  error?: string;
  overlap?: string;
  currentAllotment: number;
  hasAllotmentOverride: boolean;
  currentRate: number;
  hasRateOverride: boolean;
  currency: PropertyCurrency;
  promotions: RoomPromotionRate[];
  rateOverrides: Record<string, number>;
  dayStays?: DayStayLink[];
  /** True when inventory row shows this night is full for the room type. */
  soldOutForNight?: boolean;
  /** Plain-language reason when the type night is not bookable. */
  soldOutReason?: string | null;
  /** Door clicked on the timeline — assign on Book. */
  roomUnitId?: string | null;
  roomUnitNumber?: string | null;
};

function addIsoDays(iso: string, days: number) {
  const next = new Date(`${iso}T00:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

function getErrorMessage(error?: string, overlap?: string) {
  if (error === "overlap") {
    return formatOverlapErrorMessage(parseOverlapDays(overlap));
  }

  if (error === "past-date") {
    return "Start from today.";
  }

  if (error === "invalid-name") {
    return "Enter guest name.";
  }

  if (error === "invalid-phone") {
    return "Phone needs 7+ digits, or leave blank.";
  }

  if (error === "invalid-email") {
    return "Enter a valid email, or leave blank.";
  }

  if (error === "invalid-dates") {
    return "Pick a valid date range.";
  }

  if (error === "invalid-allotment") {
    return "Rooms to sell must be 0 or more.";
  }

  if (error === "invalid-rate") {
    return "Rate must be 0 or more.";
  }

  if (error === "invalid-custom-total") {
    return "Stay total must be 0 or more, or leave blank.";
  }

  if (
    error === "overbook" ||
    error === "unavailable" ||
    error === "no-assignable-door" ||
    error === "capacity-verify-failed"
  ) {
    return staffCapacityErrorMessage(error);
  }

  if (error === "invalid-room-number") {
    return "That door number is not available for this room type.";
  }

  if (error === "room-number-taken") {
    return "That door is already taken for these dates.";
  }

  if (error === "save-failed") {
    return "Could not save. Try again.";
  }

  return null;
}

function modeHref(dayHref: string, mode: string) {
  return `${dayHref}&mode=${encodeURIComponent(mode)}`;
}

export function CalendarDayPanel({
  room,
  date,
  monthKey,
  fromIso,
  toIso,
  mode,
  canManage,
  error,
  overlap,
  currentAllotment,
  hasAllotmentOverride,
  currentRate,
  hasRateOverride,
  currency,
  promotions,
  rateOverrides,
  dayStays = [],
  soldOutForNight = false,
  soldOutReason = null,
  roomUnitId = null,
  roomUnitNumber = null,
}: CalendarDayPanelProps) {
  const defaultDeparture = useMemo(() => addIsoDays(date, 1), [date]);
  const todayIso = useMemo(() => getPropertyTodayIso(), []);
  const dayHref = buildStaffCalendarHref({
    month: monthKey,
    from: fromIso,
    to: toIso,
    room: room.id,
    date,
    unit: roomUnitId ?? undefined,
  });

  // Steps inside this dialog are local state, not navigation: the staff calendar
  // page loads six months of bookings, blocks, inventory, and rates, so routing
  // between steps would re-fetch all of it before staff can type anything.
  // The page keys this component on the target day, so a new day or a server
  // redirect remounts it and the step resets on its own.
  const [activeMode, setActiveMode] = useState(mode);
  const [showServerError, setShowServerError] = useState(true);

  const goMode = useCallback(
    (next?: string) => {
      setActiveMode(next);
      // A server redirect put the error in the URL for one step; a new step owns
      // its own errors.
      setShowServerError(false);
      window.history.replaceState(
        null,
        "",
        next ? modeHref(dayHref, next) : dayHref,
      );
    },
    [dayHref],
  );

  const errorMessage = showServerError ? getErrorMessage(error, overlap) : null;
  const fullStatus = (
    <p className="detail-help" role="status">
      Full for <strong>{room.name}</strong>.
      {soldOutReason ? (
        <>
          {" "}
          {soldOutReason}
        </>
      ) : null}
    </p>
  );

  const doorBit = roomUnitNumber ? ` · #${roomUnitNumber}` : "";

  if (activeMode === "stays") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          {formatDisplayDate(date)} · <strong>{room.name}</strong>
          {doorBit}
        </p>
        {dayStays.length === 0 ? (
          <p className="detail-help">No stays.</p>
        ) : (
          <div className="calendar-day-panel__choices">
            {dayStays.map((stay) => (
              <Link className="calendar-day-choice" href={stay.href} key={stay.key}>
                <strong>{stay.label}</strong>
                <span>{stay.sublabel}</span>
              </Link>
            ))}
          </div>
        )}
        <div className="calendar-day-panel__choices">
          {soldOutForNight ? (
            fullStatus
          ) : (
            <button
              className="calendar-day-choice"
              onClick={() => goMode("walk-in")}
              type="button"
            >
              <strong>New booking</strong>
              <span>
                {roomUnitNumber
                  ? `Assign to #${roomUnitNumber}`
                  : "Walk-in or OTA stay"}
              </span>
            </button>
          )}
        </div>
        <div className="calendar-day-panel__actions">
          <button
            className="button button--quiet"
            onClick={() => goMode(undefined)}
            type="button"
          >
            Back
          </button>
        </div>
      </>
    );
  }

  if (activeMode === "rate-menu") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Change rate · <strong>{room.name}</strong>
          {doorBit} · {formatDisplayDate(date)}
        </p>
        <div className="calendar-day-panel__choices">
          <button
            className="calendar-day-choice"
            onClick={() => goMode("rate")}
            type="button"
          >
            <strong>{room.name}</strong>
            <span>
              Nightly price for this type
              {hasRateOverride ? ` · now ${currentRate}` : ` · default ${room.rate}`}
            </span>
          </button>
          <button
            className="calendar-day-choice"
            onClick={() => goMode("bulk-rate")}
            type="button"
          >
            <strong>All room types</strong>
            <span>Set one nightly rate across every type for these dates</span>
          </button>
        </div>
        <div className="calendar-day-panel__actions">
          <button
            className="button button--quiet"
            onClick={() => goMode(undefined)}
            type="button"
          >
            Back
          </button>
        </div>
      </>
    );
  }

  if (activeMode === "close-menu") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Close date · <strong>{room.name}</strong>
          {doorBit} · {formatDisplayDate(date)}
        </p>
        <div className="calendar-day-panel__choices">
          <button
            className="calendar-day-choice"
            onClick={() => goMode("block")}
            type="button"
          >
            <strong>Close {room.name}</strong>
            <span>Not for sale for this type</span>
          </button>
          <button
            className="calendar-day-choice"
            onClick={() => goMode("bulk-allotment")}
            type="button"
          >
            <strong>Bulk allotment</strong>
            <span>Rooms to sell for every room type on these dates</span>
          </button>
        </div>
        <div className="calendar-day-panel__actions">
          <button
            className="button button--quiet"
            onClick={() => goMode(undefined)}
            type="button"
          >
            Back
          </button>
        </div>
      </>
    );
  }

  if (activeMode === "allotment" || activeMode === "bulk-allotment") {
    const isBulk = activeMode === "bulk-allotment";
    const backMode = isBulk ? "close-menu" : undefined;
    return (
      <>
        <p className="calendar-day-panel__intro">
          {isBulk ? (
            <>
              Bulk allotment · all room types · {formatDisplayDate(date)}
            </>
          ) : (
            <>
              Allotment · <strong>{room.name}</strong> · default{" "}
              <strong>{room.availableCount}</strong>
            </>
          )}
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form
          action={isBulk ? bulkUpdateRoomDayAllotment : updateRoomDayAllotment}
          className="calendar-manage-form"
        >
          <StaffFormBusyBridge />
          <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
          <input name="room-id" type="hidden" value={room.id} />
          <div className="field-pair">
            <label htmlFor="allotment-start-date">From</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="allotment-start-date"
              min={todayIso}
              name="start-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="allotment-end-date">To</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="allotment-end-date"
              min={todayIso}
              name="end-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="allotment-rooms-to-sell">Rooms to sell</label>
            <input
              defaultValue={isBulk ? 0 : currentAllotment}
              disabled={!canManage}
              id="allotment-rooms-to-sell"
              max={isBulk ? undefined : room.availableCount}
              min={0}
              name="rooms-to-sell"
              type="number"
            />
            <span className="field-help">
              {isBulk
                ? "Applied to every room type, capped at each type’s door count. 0 = stop selling."
                : `Max ${room.availableCount}. 0 = stop selling.${
                    hasAllotmentOverride ? ` Now ${currentAllotment}.` : ""
                  }`}
            </span>
          </div>
          <div className="calendar-day-panel__actions">
            <button
              className="button button--quiet"
              onClick={() => goMode(backMode)}
              type="button"
            >
              Back
            </button>
            <div className="calendar-day-panel__actions-end">
              <button
                className="button button--quiet"
                disabled={!canManage}
                name="allotment-action"
                title={isBulk ? "Reset every type to default" : `Reset to ${room.availableCount}`}
                type="submit"
                value="reset"
              >
                Reset
              </button>
              <button
                className="button button--primary"
                disabled={!canManage}
                name="allotment-action"
                type="submit"
                value="set"
              >
                Save
              </button>
            </div>
          </div>
        </form>
        {!canManage ? (
          <p className="detail-help">Connect the site to edit allotment.</p>
        ) : null}
      </>
    );
  }

  if (activeMode === "rate" || activeMode === "bulk-rate") {
    const isBulk = activeMode === "bulk-rate";
    return (
      <>
        <p className="calendar-day-panel__intro">
          {isBulk ? (
            <>Bulk rate · all room types · {formatDisplayDate(date)}</>
          ) : (
            <>
              Rate · <strong>{room.name}</strong> · default{" "}
              <strong>{room.rate}</strong>
            </>
          )}
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form
          action={isBulk ? bulkUpdateRoomDayRate : updateRoomDayRate}
          className="calendar-manage-form"
        >
          <StaffFormBusyBridge />
          <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
          <input name="room-id" type="hidden" value={room.id} />
          <div className="field-pair">
            <label htmlFor="rate-start-date">From</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="rate-start-date"
              min={todayIso}
              name="start-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="rate-end-date">To</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="rate-end-date"
              min={todayIso}
              name="end-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="rate-nightly-rate">Nightly rate</label>
            <input
              defaultValue={isBulk ? room.rate : currentRate}
              disabled={!canManage}
              id="rate-nightly-rate"
              inputMode="decimal"
              min={0}
              name="nightly-rate"
              required={!isBulk}
              step="any"
              type="number"
            />
            <span className="field-help">
              {isBulk
                ? "Same amount for every room type on these nights."
                : `Default ${room.rate}.${hasRateOverride ? ` Now ${currentRate}.` : ""}`}
            </span>
          </div>
          <div className="calendar-day-panel__actions">
            <button
              className="button button--quiet"
              onClick={() => goMode("rate-menu")}
              type="button"
            >
              Back
            </button>
            <div className="calendar-day-panel__actions-end">
              <button
                className="button button--quiet"
                disabled={!canManage}
                name="rate-action"
                title={isBulk ? "Reset every type to its default" : `Reset to ${room.rate}`}
                type="submit"
                value="reset"
              >
                Reset
              </button>
              <button
                className="button button--primary"
                disabled={!canManage}
                name="rate-action"
                type="submit"
                value="set"
              >
                Save
              </button>
            </div>
          </div>
        </form>
        {!canManage ? (
          <p className="detail-help">Connect the site to edit rates.</p>
        ) : null}
      </>
    );
  }

  if (activeMode === "walk-in") {
    return (
      <CalendarWalkInForm
        canManage={canManage}
        currency={currency}
        date={date}
        errorMessage={errorMessage}
        onBack={() => goMode(undefined)}
        fromIso={fromIso}
        monthKey={monthKey}
        promotions={promotions}
        rateOverrides={rateOverrides}
        roomId={room.id}
        roomName={room.name}
        roomRate={room.rate}
        roomUnitId={roomUnitId}
        roomUnitNumber={roomUnitNumber}
        toIso={toIso}
      />
    );
  }

  if (activeMode === "block") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Close · <strong>{room.name}</strong> · {formatDisplayDate(date)}
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form action={createRoomBlock} className="calendar-manage-form">
          <StaffFormBusyBridge />
          <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
          <input name="room-id" type="hidden" value={room.id} />
          <div className="field-pair">
            <label htmlFor="block-start-date">From</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="block-start-date"
              min={todayIso}
              name="start-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="block-end-date">Open again</label>
            <input
              defaultValue={defaultDeparture}
              disabled={!canManage}
              id="block-end-date"
              min={todayIso}
              name="end-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="block-reason">Reason</label>
            <input
              defaultValue="Closed"
              disabled={!canManage}
              id="block-reason"
              name="reason"
              placeholder="Maintenance, hold…"
              type="text"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor="block-staff-note">Note</label>
            <textarea
              disabled={!canManage}
              id="block-staff-note"
              name="staff-note"
              placeholder="Front desk note"
              rows={3}
            />
          </div>
          <div className="calendar-day-panel__actions">
            <button
              className="button button--quiet"
              onClick={() => goMode("close-menu")}
              type="button"
            >
              Back
            </button>
            <button className="button button--primary" disabled={!canManage} type="submit">
              Close
            </button>
          </div>
        </form>
        {!canManage ? (
          <p className="detail-help">Connect the site to close nights.</p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p className="calendar-day-panel__intro">
        {formatDisplayDate(date)} · <strong>{room.name}</strong>
        {doorBit}
      </p>
      {dayStays.length > 0 ? (
        <>
          <p className="detail-help">
            {dayStays.length === 1 ? "1 stay" : `${dayStays.length} stays`}
          </p>
          <div className="calendar-day-panel__choices">
            {dayStays.map((stay) => (
              <Link className="calendar-day-choice" href={stay.href} key={stay.key}>
                <strong>{stay.label}</strong>
                <span>{stay.sublabel}</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
      <div className="calendar-day-panel__choices">
        {soldOutForNight ? (
          fullStatus
        ) : (
          <button
            className="calendar-day-choice"
            onClick={() => goMode("walk-in")}
            type="button"
          >
            <strong>New booking</strong>
            <span>
              {roomUnitNumber
                ? `Assign to #${roomUnitNumber}`
                : "Walk-in or OTA stay"}
            </span>
          </button>
        )}
        <button
          className="calendar-day-choice"
          onClick={() => goMode("rate-menu")}
          type="button"
        >
          <strong>Change rate</strong>
          <span>
            This type or all types
            {hasRateOverride ? ` · now ${currentRate}` : ""}
          </span>
        </button>
        <button
          className="calendar-day-choice"
          onClick={() => goMode("close-menu")}
          type="button"
        >
          <strong>Close date</strong>
          <span>Close this type or set bulk allotment</span>
        </button>
      </div>
    </>
  );
}
