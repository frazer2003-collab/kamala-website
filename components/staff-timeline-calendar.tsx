"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarJumpToToday } from "@/components/calendar-jump-to-today";
import {
  buildRoomTimelineBars,
  buildUnitTimelineBars,
  formatTimelineDayHeader,
  getDaySaleStatus,
  getDaySaleStatusLabel,
  getRoomBlockForDay,
  getStatusCellHref,
  getTimelineAllotmentHref,
  getTimelineBarHref,
  getTimelineBulkAvailabilityHref,
  getTimelineDayHref,
  getTimelineLaneCount,
  getTimelineRateHref,
  type DaySaleStatus,
  type TimelineBar,
} from "@/lib/calendar-timeline";
import { getRoomsToSellForDay } from "@/lib/room-day-inventory";
import type { CalendarColors } from "@/lib/calendar-colors";
import { getCalendarColorStyleProps } from "@/lib/calendar-colors";
import { getTodayIso, isPastCalendarDate, type CalendarDay } from "@/lib/calendar";
import type { StaffBooking } from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import { formatMoneyCompactSuffix, type PropertyCurrency } from "@/lib/currency";
import {
  getNightlyRateDetails,
  type RoomPromotionRate,
} from "@/lib/pricing";
import {
  getStaffRoomBlockKey,
  isChannelReservation,
  type StaffRoomBlock,
} from "@/lib/room-blocks";
import {
  getUnitsForRoomType,
  type RoomUnit,
  type UnitOccupancy,
} from "@/lib/room-units";
import { InlineRoomAssign } from "@/components/inline-room-assign";
import { getStaffBookingKey } from "@/lib/booking-requests";

type DayMetrics = {
  iso: string;
  columnIndex: number;
  inCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isWeekend: boolean;
  roomsLeft: number;
  roomsToSell: number;
  hasAllotmentOverride: boolean;
  netBooked: number;
  saleStatus: DaySaleStatus;
  closedColumn: boolean;
  soldOutColumn: boolean;
  statusHref?: string;
  bookedHref?: string;
  allotmentHref?: string;
  rateHref?: string;
  isSelected: boolean;
  rate: number;
  baseRate: number;
  percentOff: number;
  hasRateOverride: boolean;
};

type StaffExtranetRoomSectionProps = {
  room: Room;
  rooms: Room[];
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  inventoryLookup: Map<string, number>;
  rateLookup: Map<string, number>;
  promotions: RoomPromotionRate[];
  monthKey: string;
  canManage: boolean;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
  selectedRoomId?: string;
  currency: PropertyCurrency;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
};

function getBarClassName(bar: TimelineBar, isSelected: boolean) {
  const isChannel = bar.kind === "channel";

  return [
    "extranet-bar",
    isChannel ? "extranet-bar--channel" : "extranet-bar--booking",
    bar.needsRoom ? "extranet-bar--needs-room" : "",
    !isChannel && bar.stayStatus === "checked-in" ? "extranet-bar--checked-in" : "",
    !isChannel && bar.stayStatus === "checked-out" ? "extranet-bar--checked-out" : "",
    bar.continuesLeft ? "extranet-bar--continues-left" : "",
    bar.continuesRight ? "extranet-bar--continues-right" : "",
    bar.compact ? "extranet-bar--compact" : "",
    isSelected ? "extranet-bar--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function MetricRowLabel({
  children,
  action,
  className,
  hint,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div
      className={["extranet-row__label", className].filter(Boolean).join(" ")}
      title={hint}
    >
      <span>
        {children}
        {hint ? <span className="extranet-row__hint">{hint}</span> : null}
      </span>
      {action}
    </div>
  );
}

function DayCell({
  children,
  className,
  columnIndex,
  closedColumn,
  href,
  ariaLabel,
  disabled,
}: {
  children: ReactNode;
  className: string;
  columnIndex: number;
  closedColumn?: boolean;
  href?: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const classes = [
    "extranet-cell",
    className,
    closedColumn ? "extranet-cell--closed-column" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (disabled || !href) {
    return (
      <div
        aria-disabled={disabled ? true : undefined}
        aria-label={
          disabled
            ? `${ariaLabel}. Past dates are locked — only future days can be changed.`
            : ariaLabel
        }
        className={classes}
        style={{ gridColumn: columnIndex + 2 }}
        title={
          disabled
            ? "Past dates are locked — only future days can be changed."
            : undefined
        }
      >
        {children}
      </div>
    );
  }

  return (
    <Link
      aria-label={ariaLabel}
      className={classes}
      href={href}
      style={{ gridColumn: columnIndex + 2 }}
    >
      {children}
    </Link>
  );
}

function StatusPill({ status }: { status: DaySaleStatus }) {
  const label = getDaySaleStatusLabel(status);

  return (
    <span
      className={[
        "extranet-pill",
        status === "closed"
          ? "extranet-pill--closed"
          : status === "sold-out"
            ? "extranet-pill--sold-out"
            : "extranet-pill--bookable",
      ].join(" ")}
      title={label}
    >
      {label}
    </span>
  );
}

function formatRate(amount: number, currency: PropertyCurrency) {
  return formatMoneyCompactSuffix(amount, currency);
}

function UnitReservationRow({
  unit,
  bookings,
  channelReservations,
  calendarDays,
  dayMetrics,
  monthKey,
  selectedBookingKey,
  selectedBlockKey,
  roomShortNameById,
  currentRoomId,
}: {
  unit: RoomUnit;
  bookings: StaffBooking[];
  channelReservations: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  dayMetrics: DayMetrics[];
  monthKey: string;
  selectedBookingKey: string;
  selectedBlockKey: string;
  roomShortNameById: Map<string, string>;
  currentRoomId: string;
}) {
  const dayCount = calendarDays.length;
  // Match by door only — room_id can lag after staff type moves / sync, and a
  // stay pinned to this door must still render on this row.
  const unitBookings = useMemo(
    () => bookings.filter((booking) => booking.roomUnitId === unit.id),
    [bookings, unit.id],
  );
  const unitChannels = useMemo(
    () =>
      channelReservations.filter((reservation) => reservation.roomUnitId === unit.id),
    [channelReservations, unit.id],
  );
  const bars = useMemo(
    () =>
      buildUnitTimelineBars({
        bookings: unitBookings,
        channelReservations: unitChannels,
        calendarDays,
        roomShortNameById,
        currentRoomId,
      }),
    [unitBookings, unitChannels, calendarDays, roomShortNameById, currentRoomId],
  );
  const laneCount = getTimelineLaneCount(bars);

  return (
    <>
      <MetricRowLabel>
        <span className="extranet-unit-number">Room {unit.number}</span>
        {unit.roomIds.length > 1 ? (
          <span className="extranet-row__meta">Shared</span>
        ) : null}
      </MetricRowLabel>
      <div
        className="extranet-reservations extranet-reservations--unit"
        style={{
          ["--lane-count" as string]: laneCount,
          gridColumn: `2 / span ${dayCount}`,
        }}
      >
        {dayMetrics.map((day) => (
          <div
            className={[
              "extranet-reservations__day",
              day.closedColumn ? "extranet-cell--closed-column" : "",
              day.soldOutColumn ? "extranet-cell--sold-out-column" : "",
              day.isToday ? "extranet-cell--today" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={`unit-${unit.id}-bg-${day.iso}`}
            style={{ gridColumn: day.columnIndex + 1 }}
          />
        ))}

        {bars.map((bar) => {
          const isSelected =
            bar.kind === "booking"
              ? selectedBookingKey === bar.itemKey
              : selectedBlockKey === bar.itemKey;

          return (
            <Link
              aria-label={`Room ${unit.number}: ${bar.label}, ${bar.sublabel}`}
              className={getBarClassName(bar, isSelected)}
              data-calendar-focus={bar.itemKey}
              href={getTimelineBarHref(bar, monthKey)}
              key={bar.key}
              style={{
                gridColumn: `${bar.startCol} / span ${bar.span}`,
                ["--lane" as string]: bar.lane,
              }}
            >
              {bar.showLabel ? (
                <>
                  <strong>{bar.label}</strong>
                  {bar.compact ? null : <span>{bar.sublabel}</span>}
                </>
              ) : (
                <span className="extranet-bar__continued" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}

const StaffExtranetRoomSection = memo(function StaffExtranetRoomSection({
  room,
  rooms,
  bookings,
  blocks,
  calendarDays,
  inventoryLookup,
  rateLookup,
  promotions,
  monthKey,
  canManage,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
  selectedRoomId,
  currency,
  roomUnits,
  occupancies,
}: StaffExtranetRoomSectionProps) {
  const todayIso = getTodayIso();
  const dayCount = calendarDays.length;

  const roomBookings = useMemo(
    () => bookings.filter((booking) => booking.roomId === room.id),
    [bookings, room.id],
  );
  const roomBlocks = useMemo(
    () => blocks.filter((block) => block.roomId === room.id),
    [blocks, room.id],
  );
  const channelReservations = useMemo(
    () => roomBlocks.filter(isChannelReservation),
    [roomBlocks],
  );
  /** All channel stays — unit rows match by door even if room_id is stale. */
  const allChannelReservations = useMemo(
    () => blocks.filter(isChannelReservation),
    [blocks],
  );
  const manualClosures = useMemo(
    () => roomBlocks.filter((block) => !isChannelReservation(block)),
    [roomBlocks],
  );
  const typeUnits = useMemo(
    () => getUnitsForRoomType(roomUnits, room.id),
    [roomUnits, room.id],
  );
  const roomShortNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of rooms) {
      map.set(entry.id, entry.shortName);
    }
    return map;
  }, [rooms]);

  const bars = useMemo(
    () =>
      buildRoomTimelineBars({
        bookings: roomBookings,
        channelReservations,
        calendarDays,
        unassignedOnly: true,
      }),
    [roomBookings, channelReservations, calendarDays],
  );
  const laneCount = getTimelineLaneCount(bars);
  const unassignedCount =
    roomBookings.filter((booking) => !booking.roomUnitId).length +
    channelReservations.filter((reservation) => !reservation.roomUnitId).length;

  const dayMetrics = useMemo((): DayMetrics[] => {
    return calendarDays.map((day, columnIndex) => {
      const isPast = isPastCalendarDate(day.iso);
      const capacity = getRoomsToSellForDay(room, day.iso, inventoryLookup);
      const hasAllotmentOverride = inventoryLookup.has(`${room.id}:${day.iso}`);
      const directBooked = roomBookings.filter(
        (booking) =>
          booking.arrivalDate <= day.iso && booking.departureDate > day.iso,
      ).length;
      const channelBooked = channelReservations.filter(
        (reservation) =>
          reservation.startDate <= day.iso && reservation.endDate > day.iso,
      ).length;
      const netBooked = directBooked + channelBooked;
      const roomsLeft = Math.max(0, capacity - netBooked);
      const saleStatus = getDaySaleStatus(room.id, day.iso, manualClosures, roomsLeft);
      const closedColumn = saleStatus === "closed";
      const soldOutColumn = saleStatus === "sold-out";
      const blockForDay = getRoomBlockForDay(room.id, day.iso, manualClosures);
      const isSelected =
        (selectedRoomId === room.id && selectedDate === day.iso) ||
        Boolean(
          blockForDay &&
            selectedBlockKey === (blockForDay.databaseId ?? blockForDay.id),
        );
      const weekday = day.date.getDay();
      const rateDetails = getNightlyRateDetails(
        room.id,
        day.iso,
        room.rate,
        promotions,
        rateLookup,
      );
      const dayHref = getTimelineDayHref(room.id, day.iso, monthKey);

      return {
        iso: day.iso,
        columnIndex,
        inCurrentMonth: day.inCurrentMonth,
        isPast,
        isToday: day.iso === todayIso,
        isWeekend: weekday === 0 || weekday === 6,
        roomsLeft,
        roomsToSell: capacity,
        hasAllotmentOverride,
        netBooked,
        saleStatus,
        closedColumn,
        soldOutColumn,
        statusHref: isPast
          ? undefined
          : saleStatus === "sold-out"
            ? dayHref
            : getStatusCellHref(room.id, day.iso, monthKey, manualClosures),
        // Day actions panel only — never deep-link into a booking/block detail.
        bookedHref: isPast ? undefined : dayHref,
        allotmentHref: isPast
          ? undefined
          : canManage
            ? getTimelineAllotmentHref(room.id, day.iso, monthKey)
            : dayHref,
        rateHref: isPast
          ? undefined
          : canManage
            ? getTimelineRateHref(room.id, day.iso, monthKey)
            : dayHref,
        isSelected,
        rate: rateDetails.rate,
        baseRate: room.rate,
        percentOff: rateDetails.percentOff,
        hasRateOverride: rateDetails.hasRateOverride,
      };
    });
  }, [
    calendarDays,
    canManage,
    channelReservations,
    inventoryLookup,
    rateLookup,
    manualClosures,
    monthKey,
    promotions,
    room,
    roomBookings,
    selectedBlockKey,
    selectedDate,
    selectedRoomId,
    todayIso,
  ]);

  const firstFutureDay = dayMetrics.find((day) => !day.isPast && day.inCurrentMonth)?.iso
    ?? dayMetrics.find((day) => !day.isPast)?.iso;
  const [showInventory, setShowInventory] = useState(true);
  const needsAssignment = unassignedCount > 0;

  return (
    <section aria-label={room.name} className="extranet-room">
      <div
        className="extranet-room__header"
        style={{ ["--timeline-days" as string]: dayCount }}
      >
        <div className="extranet-room__title">
          <h2>{room.shortName}</h2>
          <p>
            <span className="extranet-room__fullname">{room.name}</span>
            <span className="extranet-room__sleeps">{room.sleeps}</span>
          </p>
        </div>
        <div className="extranet-room__actions">
          <button
            aria-controls={`extranet-inventory-${room.id}`}
            aria-expanded={showInventory}
            className={[
              "extranet-room__inventory-toggle",
              needsAssignment ? "extranet-room__inventory-toggle--attention" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setShowInventory((open) => !open)}
            type="button"
          >
            <span className="extranet-room__inventory-toggle-label">
              {showInventory ? "Hide availability" : "Availability"}
            </span>
            {needsAssignment ? (
              <span className="extranet-room__inventory-toggle-badge">
                {unassignedCount} need room #
              </span>
            ) : null}
          </button>
          <Link className="extranet-room__rates" href="/staff/promotions">
            Edit rates
          </Link>
          {firstFutureDay && canManage ? (
            <Link
              className="extranet-room__bulk"
              href={getTimelineBulkAvailabilityHref(room.id, monthKey)}
            >
              Close dates
            </Link>
          ) : null}
        </div>
      </div>

      {showInventory ? (
      <div
        className="extranet-room__grid extranet-room__grid--inventory"
        id={`extranet-inventory-${room.id}`}
        style={{ ["--timeline-days" as string]: dayCount }}
      >
        <MetricRowLabel hint="Click a day to open, close, or mark sold out">
          Room status
        </MetricRowLabel>
        {dayMetrics.map((day) => (
          <DayCell
            ariaLabel={`${room.name} status on ${day.iso}: ${getDaySaleStatusLabel(day.saleStatus)}`}
            className={[
              day.isPast ? "extranet-cell--past" : "",
              day.isSelected ? "extranet-cell--selected" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
              day.soldOutColumn ? "extranet-cell--sold-out-column" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            closedColumn={day.closedColumn}
            columnIndex={day.columnIndex}
            disabled={day.isPast}
            href={day.statusHref}
            key={`status-${day.iso}`}
          >
            <StatusPill status={day.saleStatus} />
          </DayCell>
        ))}

        <MetricRowLabel hint="Click a day to set a temporary allotment">
          Rooms left
          <span className="extranet-row__meta">of {room.availableCount}</span>
        </MetricRowLabel>
        {dayMetrics.map((day) => (
          <DayCell
            ariaLabel={`${day.roomsLeft} of ${day.roomsToSell} rooms left on ${day.iso}${day.hasAllotmentOverride ? ", temporary allotment" : ""}`}
            className={[
              "extranet-cell--metric",
              "extranet-cell--clickable",
              day.hasAllotmentOverride ? "extranet-cell--allotment-override" : "",
              day.isPast ? "extranet-cell--past" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
              day.soldOutColumn ? "extranet-cell--sold-out-column" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            closedColumn={day.closedColumn}
            columnIndex={day.columnIndex}
            disabled={day.isPast}
            href={day.allotmentHref}
            key={`left-${day.iso}`}
          >
            <span className="extranet-metric">
              {day.roomsLeft}
              {day.hasAllotmentOverride ? (
                <span
                  aria-label="Temporary allotment"
                  className="extranet-metric__override"
                  title="Temporary allotment — differs from room default"
                >
                  *
                </span>
              ) : null}
            </span>
          </DayCell>
        ))}

        {unassignedCount > 0 ? (
          <>
            <MetricRowLabel hint="Assign a room number on the stay bar">
              Needs room #
              <span className="extranet-row__meta">{unassignedCount} waiting</span>
            </MetricRowLabel>
            <div
              className={[
                "extranet-reservations",
                canManage ? "extranet-reservations--assign" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                ["--lane-count" as string]: laneCount,
                gridColumn: `2 / span ${dayCount}`,
              }}
            >
              {dayMetrics.map((day) => (
                <div
                  className={[
                    "extranet-reservations__day",
                    day.closedColumn ? "extranet-cell--closed-column" : "",
                    day.soldOutColumn ? "extranet-cell--sold-out-column" : "",
                    day.isToday ? "extranet-cell--today" : "",
                    !day.inCurrentMonth ? "extranet-cell--muted" : "",
                    day.isWeekend ? "extranet-cell--weekend" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={`res-bg-${day.iso}`}
                  style={{ gridColumn: day.columnIndex + 1 }}
                />
              ))}

              {bars.map((bar) => {
                const isSelected =
                  bar.kind === "booking"
                    ? selectedBookingKey === bar.itemKey
                    : selectedBlockKey === bar.itemKey;
                const sublabel = bar.sublabel;
                const sourceBooking =
                  bar.kind === "booking"
                    ? roomBookings.find(
                        (booking) => getStaffBookingKey(booking) === bar.itemKey,
                      )
                    : null;
                const sourceChannel =
                  bar.kind === "channel"
                    ? channelReservations.find(
                        (reservation) =>
                          getStaffRoomBlockKey(reservation) === bar.itemKey,
                      )
                    : null;
                const stayId =
                  sourceBooking?.databaseId ?? sourceChannel?.databaseId ?? null;
                const showInlineAssign =
                  canManage && Boolean(stayId) && bar.needsRoom && bar.showLabel;
                const detailHref = getTimelineBarHref(bar, monthKey);

                return (
                  <div
                    className={[
                      "extranet-bar-shell",
                      showInlineAssign ? "extranet-bar-shell--assign" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={bar.key}
                    style={{
                      gridColumn: `${bar.startCol} / span ${bar.span}`,
                      ["--lane" as string]: bar.lane,
                    }}
                  >
                    <Link
                      aria-label={`${bar.label}, ${sublabel}`}
                      className={[getBarClassName(bar, isSelected), "extranet-bar__open"].join(" ")}
                      data-calendar-focus={bar.itemKey}
                      href={detailHref}
                    >
                      {bar.showLabel ? (
                        <>
                          <strong>{bar.label}</strong>
                          {bar.compact ? null : <span>{sublabel}</span>}
                        </>
                      ) : (
                        <span className="extranet-bar__continued" aria-hidden="true" />
                      )}
                    </Link>
                    {showInlineAssign && stayId && sourceBooking ? (
                      <InlineRoomAssign
                        arrivalDate={sourceBooking.arrivalDate}
                        departureDate={sourceBooking.departureDate}
                        guestLabel={sourceBooking.guest}
                        kind="booking"
                        monthKey={monthKey}
                        occupancies={occupancies}
                        roomId={sourceBooking.roomId}
                        roomUnits={roomUnits}
                        stayId={stayId}
                      />
                    ) : null}
                    {showInlineAssign && stayId && sourceChannel ? (
                      <InlineRoomAssign
                        arrivalDate={sourceChannel.startDate}
                        departureDate={sourceChannel.endDate}
                        guestLabel={
                          sourceChannel.guestName || sourceChannel.channelLabel || "Guest"
                        }
                        kind="channel"
                        monthKey={monthKey}
                        occupancies={occupancies}
                        roomId={sourceChannel.roomId}
                        roomUnits={roomUnits}
                        stayId={stayId}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        <MetricRowLabel className="extranet-row--inventory">Net booked</MetricRowLabel>
        {dayMetrics.map((day) => (
          <DayCell
            ariaLabel={
              day.netBooked > 0
                ? `${day.netBooked} booked on ${day.iso}. Open day actions for stays or walk-in.`
                : `No bookings on ${day.iso}. Open day actions.`
            }
            className={[
              "extranet-cell--metric",
              "extranet-cell--clickable",
              "extranet-row--inventory",
              day.isPast ? "extranet-cell--past" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
              day.soldOutColumn ? "extranet-cell--sold-out-column" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            closedColumn={day.closedColumn}
            columnIndex={day.columnIndex}
            disabled={day.isPast && day.netBooked === 0}
            href={day.bookedHref}
            key={`booked-${day.iso}`}
          >
            {day.netBooked > 0 ? (
              <span className="extranet-pill extranet-pill--booked">{day.netBooked}</span>
            ) : null}
          </DayCell>
        ))}

        <MetricRowLabel
          action={
            <Link className="extranet-row__action extranet-row__action--desktop" href="/staff/promotions">
              Edit rates
            </Link>
          }
          className="extranet-row--inventory"
          hint="Click a day to set a temporary rate"
        >
          Standard rate
          <span className="extranet-row__meta">Sleeps {room.sleeps.replace(/^Sleeps\s+/i, "")}</span>
        </MetricRowLabel>
        {dayMetrics.map((day) => (
          <DayCell
            ariaLabel={
              day.hasRateOverride
                ? `Temporary rate on ${day.iso}: ${formatRate(day.rate, currency)}`
                : day.percentOff > 0
                  ? `Promo rate on ${day.iso}: ${formatRate(day.rate, currency)}, ${day.percentOff}% off`
                  : `Rate on ${day.iso}: ${formatRate(day.rate, currency)}`
            }
            className={[
              "extranet-cell--rate",
              "extranet-cell--clickable",
              "extranet-row--inventory",
              day.hasRateOverride ? "extranet-cell--rate-override" : "",
              day.percentOff > 0 ? "extranet-cell--promo" : "",
              day.isPast ? "extranet-cell--past" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
              day.soldOutColumn ? "extranet-cell--sold-out-column" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            closedColumn={day.closedColumn}
            columnIndex={day.columnIndex}
            disabled={day.isPast}
            href={day.rateHref}
            key={`rate-${day.iso}`}
          >
            {day.hasRateOverride ? (
              <span className="extranet-rate extranet-rate--override">
                <strong>{formatRate(day.rate, currency)}</strong>
                <span
                  aria-label="Temporary rate"
                  className="extranet-metric__override"
                  title="Temporary rate — differs from room default"
                >
                  *
                </span>
              </span>
            ) : day.percentOff > 0 ? (
              <span className="extranet-rate extranet-rate--promo">
                <span className="extranet-rate__was">{formatRate(day.baseRate, currency)}</span>
                <strong>{formatRate(day.rate, currency)}</strong>
                <span className="extranet-rate__off">-{day.percentOff}%</span>
              </span>
            ) : (
              <span className="extranet-rate">{formatRate(day.rate, currency)}</span>
            )}
          </DayCell>
        ))}
      </div>
      ) : null}

      {typeUnits.length > 0 ? (
        <div
          className="extranet-room__grid extranet-room__grid--units"
          style={{ ["--timeline-days" as string]: dayCount }}
        >
          <div className="extranet-units-heading" style={{ gridColumn: "1 / -1" }}>
            Room numbers
          </div>
          {typeUnits.map((unit) => (
            <UnitReservationRow
              bookings={bookings}
              calendarDays={calendarDays}
              channelReservations={allChannelReservations}
              currentRoomId={room.id}
              dayMetrics={dayMetrics}
              key={unit.id}
              monthKey={monthKey}
              roomShortNameById={roomShortNameById}
              selectedBlockKey={selectedBlockKey}
              selectedBookingKey={selectedBookingKey}
              unit={unit}
            />
          ))}
        </div>
      ) : (
        <p className="extranet-room__no-units">No room numbers set up for this type yet.</p>
      )}
    </section>
  );
});

type StaffTimelineCalendarProps = {
  rooms: Room[];
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  calendarColors: CalendarColors;
  inventoryLookup: Map<string, number>;
  rateLookup: Map<string, number>;
  promotions: RoomPromotionRate[];
  monthKey: string;
  monthLabel: string;
  canManage: boolean;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
  selectedRoomId?: string;
  currency: PropertyCurrency;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
};

export function StaffTimelineCalendar({
  rooms,
  bookings,
  blocks,
  calendarDays,
  calendarColors,
  inventoryLookup,
  rateLookup,
  promotions,
  monthKey,
  monthLabel,
  canManage,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
  selectedRoomId,
  currency,
  roomUnits,
  occupancies,
}: StaffTimelineCalendarProps) {
  const todayIso = getTodayIso();
  const dayCount = calendarDays.length;

  return (
    <div
      className="staff-extranet staff-extranet--full"
      style={getCalendarColorStyleProps(calendarColors)}
    >
      <CalendarJumpToToday />
      <h2 className="sr-only">Room availability by day</h2>
      <div className="staff-extranet__scroll" id="calendar-today">
        <div
          className="staff-extranet__dates"
          style={{ ["--timeline-days" as string]: dayCount }}
        >
          <div className="staff-extranet__month">{monthLabel}</div>
          {calendarDays.map((day, columnIndex) => {
            const header = formatTimelineDayHeader(day.date, day.iso, todayIso);

            return (
              <div
                className={[
                  "staff-extranet__dayhead",
                  header.isWeekend ? "staff-extranet__dayhead--weekend" : "",
                  header.isToday ? "staff-extranet__dayhead--today extranet-cell--today" : "",
                  !day.inCurrentMonth ? "staff-extranet__dayhead--muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={day.iso}
                style={{ gridColumn: columnIndex + 2 }}
              >
                <span className="staff-extranet__weekday">{header.weekday}</span>
                <span className="staff-extranet__daynum">{header.dayNumber}</span>
              </div>
            );
          })}
        </div>

        {rooms.map((room) => (
          <StaffExtranetRoomSection
            blocks={blocks}
            bookings={bookings}
            calendarDays={calendarDays}
            canManage={canManage}
            inventoryLookup={inventoryLookup}
            key={room.id}
            monthKey={monthKey}
            promotions={promotions}
            rateLookup={rateLookup}
            room={room}
            roomUnits={roomUnits}
            rooms={rooms}
            occupancies={occupancies}
            selectedBlockKey={selectedBlockKey}
            selectedBookingKey={selectedBookingKey}
            selectedDate={selectedDate}
            selectedRoomId={selectedRoomId}
            currency={currency}
          />
        ))}
      </div>
    </div>
  );
}
