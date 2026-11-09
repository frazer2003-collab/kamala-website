"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import "@/app/staff-calendar-closed-cells.css";
import { CalendarJumpToToday } from "@/components/calendar-jump-to-today";
import {
  CalendarDoorDndProvider,
  useCalendarDoorDnd,
} from "@/components/calendar-door-dnd";
import { CalendarStayBarLink } from "@/components/calendar-stay-bar-link";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";
import {
  buildRoomTimelineBars,
  buildStaffClosedDayKeys,
  buildUnitTimelineBars,
  formatTimelineDayHeader,
  getTimelineBarHref,
  getTimelineBarPlacementStyle,
  getTimelineLaneCount,
  isUnitDayStaffClosed,
  timelineBarNightColumns,
  type TimelineBar,
} from "@/lib/calendar-timeline";
import type { CalendarColors } from "@/lib/calendar-colors";
import { getCalendarColorStyleProps } from "@/lib/calendar-colors";
import {
  formatCalendarMonthLabelFromIso,
  getPropertyTodayIso,
  pickLeadingVisibleCalendarDayHeadIso,
  type CalendarDay,
} from "@/lib/calendar";
import {
  formatCalendarGuestLabel,
  splitCalendarGuestLabel,
} from "@/lib/bed-setup";
import type { StaffBooking } from "@/lib/booking-requests";
import { getStaffBookingKey } from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import {
  getStaffRoomBlockKey,
  isChannelReservation,
  type StaffRoomBlock,
} from "@/lib/room-blocks";
import {
  getKnownUnitIdSet,
  getPrimaryRoomIdForUnit,
  getTimelineDoorUnits,
  occupancyFromBooking,
  occupancyFromChannelBlock,
  stayNeedsRoomAssignment,
  type RoomUnit,
  type UnitOccupancy,
} from "@/lib/room-units";
import { InlineRoomAssign } from "@/components/inline-room-assign";
import {
  assignGuestBarColors,
  guestBarColorForName,
} from "@/lib/booking-bar-colors";
import { isStaffCalendarManageableStay } from "@/lib/staff-calendar-stay";

type StaffTimelineCalendarProps = {
  rooms: Room[];
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  calendarColors: CalendarColors;
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  monthLabel: string;
  canManage: boolean;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
  selectedRoomId?: string;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  /** `${roomId}:${iso}` keys with a temporary rooms-to-sell override */
  allotmentOverrideKeys?: string[];
  /** `${roomId}:${iso}` keys with a temporary nightly rate override */
  rateOverrideKeys?: string[];
};

function getBarClassName(bar: TimelineBar, isSelected: boolean) {
  return [
    "extranet-bar",
    "extranet-bar--guest-color",
    bar.needsRoom ? "extranet-bar--needs-room" : "",
    bar.continuesLeft ? "extranet-bar--continues-left" : "",
    bar.continuesRight ? "extranet-bar--continues-right" : "",
    bar.compact ? "extranet-bar--compact" : "",
    isSelected ? "extranet-bar--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getBarColorStyle(bar: TimelineBar, guestColors: Map<string, string>) {
  const color = guestBarColorForName(bar.colorKey || bar.label, guestColors);
  return {
    ["--bar-color" as string]: color,
  };
}

function MetricRowLabel({
  children,
  className,
  hint,
}: {
  children: ReactNode;
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
    </div>
  );
}

function overrideCueTitle(hasAllotment: boolean, hasRate: boolean) {
  if (hasAllotment && hasRate) {
    return "Temporary allotment and rate";
  }
  if (hasAllotment) {
    return "Temporary allotment";
  }
  if (hasRate) {
    return "Temporary rate";
  }
  return undefined;
}

function bookingDropStay(booking: StaffBooking) {
  return {
    id: booking.databaseId ?? getStaffBookingKey(booking),
    roomId: booking.roomId,
    roomUnitId: booking.roomUnitId,
    arrivalDate: booking.arrivalDate,
    departureDate: booking.departureDate,
    label: formatCalendarGuestLabel(booking.guest, booking.bedSetup),
  };
}

function DoorReservationRow({
  unit,
  unitBookings,
  unitChannels,
  calendarDays,
  monthKey,
  fromIso,
  toIso,
  guestColors,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
  selectedRoomId,
  todayIso,
  allotmentOverrideKeys,
  rateOverrideKeys,
  closedDayKeys,
  roomTypeLabel,
}: {
  unit: RoomUnit;
  unitBookings: StaffBooking[];
  unitChannels: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  guestColors: Map<string, string>;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
  selectedRoomId?: string;
  todayIso: string;
  allotmentOverrideKeys: Set<string>;
  rateOverrideKeys: Set<string>;
  closedDayKeys: Set<string>;
  roomTypeLabel?: string;
}) {
  const dnd = useCalendarDoorDnd();
  const staySelection = useCalendarStaySelection();
  const dayCount = calendarDays.length;
  const rangeQuery = { fromIso, toIso };
  const primaryRoomId = getPrimaryRoomIdForUnit(unit);
  const unitDropKey = `unit:${unit.id}`;
  const isUnitDropHover = dnd?.dropHoverKey === unitDropKey;
  const activeDayRoomId = staySelection?.dayRoomId || selectedRoomId;
  const activeDayDate = staySelection?.dayDate || selectedDate;
  const bars = useMemo(
    () =>
      buildUnitTimelineBars({
        bookings: unitBookings,
        channelReservations: unitChannels,
        calendarDays,
      }),
    [unitBookings, unitChannels, calendarDays],
  );
  const laneCount = getTimelineLaneCount(bars);
  const occupiedColumns = useMemo(() => {
    const columns = new Set<number>();
    for (const bar of bars) {
      for (const column of timelineBarNightColumns(bar)) {
        columns.add(column);
      }
    }
    return columns;
  }, [bars]);

  return (
    <>
      <MetricRowLabel className="extranet-row__label--door">
        <span className="extranet-unit-number">#{unit.number}</span>
        {roomTypeLabel ? (
          <span className="extranet-unit-type">{roomTypeLabel}</span>
        ) : unit.roomIds.length > 1 ? (
          <span className="extranet-unit-type">Shared</span>
        ) : null}
      </MetricRowLabel>
      <div
        className={[
          "extranet-reservations",
          "extranet-reservations--unit",
          isUnitDropHover ? "extranet-reservations--drop-hover" : "",
          dnd?.dragging ? "extranet-reservations--droppable" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragLeave={(event) => {
          if (!dnd?.isDragging()) {
            return;
          }
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            dnd.setDropHoverKey(null);
          }
        }}
        onDragOver={(event) => {
          // Ref, not state — state lags one frame and the browser cancels the drop.
          if (!dnd?.isDragging()) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          dnd.setDropHoverKey(unitDropKey);
        }}
        onDrop={(event) => {
          if (!dnd?.isDragging()) {
            return;
          }
          event.preventDefault();
          dnd.dropOnUnit(unit.id);
        }}
        style={{
          ["--lane-count" as string]: laneCount,
          gridColumn: `2 / span ${dayCount}`,
        }}
      >
        {calendarDays.map((day, columnIndex) => {
          const weekday = day.date.getDay();
          const isToday = day.iso === todayIso;
          const isWeekend = weekday === 0 || weekday === 6;
          const isSelectedDay =
            Boolean(primaryRoomId) &&
            activeDayRoomId === primaryRoomId &&
            activeDayDate === day.iso;
          const column = columnIndex + 1;
          const isOccupied = occupiedColumns.has(column);
          const canOpenDay = !isOccupied && Boolean(primaryRoomId);
          const overrideKey = primaryRoomId ? `${primaryRoomId}:${day.iso}` : "";
          const hasAllotmentOverride =
            Boolean(overrideKey) && allotmentOverrideKeys.has(overrideKey);
          const hasRateOverride =
            Boolean(overrideKey) && rateOverrideKeys.has(overrideKey);
          const isClosed = isUnitDayStaffClosed(unit, day.iso, closedDayKeys);
          const cueTitle = overrideCueTitle(hasAllotmentOverride, hasRateOverride);
          const dayTitle = [isClosed ? "Closed" : null, cueTitle]
            .filter(Boolean)
            .join(" · ");

          const dayClass = [
            "extranet-reservations__day",
            isToday ? "extranet-cell--today" : "",
            !day.inCurrentMonth ? "extranet-cell--muted" : "",
            isWeekend ? "extranet-cell--weekend" : "",
            isSelectedDay ? "extranet-cell--selected" : "",
            isClosed ? "extranet-cell--closed" : "",
            canOpenDay ? "extranet-reservations__day--action" : "",
            hasAllotmentOverride ? "extranet-cell--allotment-override" : "",
            hasRateOverride ? "extranet-cell--rate-override" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const cues = (
            <>
              {hasRateOverride ? (
                <span
                  aria-hidden="true"
                  className="extranet-day-cue extranet-day-cue--rate"
                >
                  ฿
                </span>
              ) : null}
              {hasAllotmentOverride ? (
                <span
                  aria-hidden="true"
                  className="extranet-day-cue extranet-day-cue--allotment"
                >
                  ★
                </span>
              ) : null}
            </>
          );

          if (canOpenDay && primaryRoomId) {
            const ariaParts = [
              "day actions",
              isClosed ? "closed" : null,
              cueTitle ? cueTitle.toLowerCase() : null,
            ].filter(Boolean);
            const ariaCue = ariaParts.length > 0 ? `, ${ariaParts.join(", ")}` : "";
            return (
              <button
                aria-label={`#${unit.number}, ${day.iso}${ariaCue}`}
                className={dayClass}
                key={`door-${unit.id}-bg-${day.iso}`}
                onClick={() =>
                  staySelection?.selectDay({
                    roomId: primaryRoomId,
                    date: day.iso,
                    unitId: unit.id,
                    mode: "walk-in",
                  })
                }
                style={{ gridColumn: column }}
                title={dayTitle || undefined}
                type="button"
              >
                {cues}
                <span className="sr-only">Day actions</span>
              </button>
            );
          }

          return (
            <div
              aria-hidden="true"
              className={dayClass}
              key={`door-${unit.id}-bg-${day.iso}`}
              style={{ gridColumn: column }}
              title={dayTitle || undefined}
            >
              {cues}
            </div>
          );
        })}

        {bars.map((bar) => {
          const isSelected =
            bar.kind === "booking"
              ? selectedBookingKey === bar.itemKey
              : selectedBlockKey === bar.itemKey;
          const ariaExtra = bar.sublabel ? `, ${bar.sublabel}` : "";
          const sourceBooking =
            bar.kind === "booking"
              ? unitBookings.find(
                  (booking) => getStaffBookingKey(booking) === bar.itemKey,
                ) ?? null
              : null;
          const canDragBooking =
            Boolean(dnd?.canManage) &&
            sourceBooking?.databaseId &&
            isStaffCalendarManageableStay(sourceBooking);
          const dropStay = sourceBooking ? bookingDropStay(sourceBooking) : null;
          const bookingDropKey = dropStay ? `booking:${dropStay.id}` : "";
          const replaceable =
            Boolean(dnd?.isDragging() && dropStay) &&
            dnd!.canReplaceBooking(dropStay!);
          const isBookingDropHover =
            replaceable && dnd?.dropHoverKey === bookingDropKey;

          return (
            <div
              className={[
                "extranet-bar-shell",
                canDragBooking ? "extranet-bar-shell--draggable" : "",
                isBookingDropHover ? "extranet-bar-shell--drop-replace" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={Boolean(canDragBooking)}
              key={bar.key}
              onDragEnd={() => dnd?.endDrag()}
              onDragLeave={(event) => {
                if (!dnd?.isDragging() || !dropStay || !dnd.canReplaceBooking(dropStay)) {
                  return;
                }
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  dnd.setDropHoverKey(null);
                }
              }}
              onDragOver={(event) => {
                if (!dnd?.isDragging() || !dropStay || !dnd.canReplaceBooking(dropStay)) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "move";
                dnd.setDropHoverKey(bookingDropKey);
              }}
              onDragStart={(event: DragEvent) => {
                if (!canDragBooking || !dropStay || !dnd) {
                  return;
                }
                event.stopPropagation();
                dnd.beginDrag(dropStay, event);
              }}
              onDrop={(event) => {
                if (!dnd?.isDragging() || !dropStay || !dnd.canReplaceBooking(dropStay)) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                dnd.dropOnBooking(dropStay);
              }}
              style={{
                ...getTimelineBarPlacementStyle(bar),
                ...getBarColorStyle(bar, guestColors),
              }}
            >
              <CalendarStayBarLink
                ariaLabel={`#${unit.number}: ${bar.label}${ariaExtra}`}
                className={[getBarClassName(bar, isSelected), "extranet-bar__open"].join(
                  " ",
                )}
                href={getTimelineBarHref(bar, monthKey, rangeQuery)}
                itemKey={bar.itemKey}
                kind={bar.kind === "booking" ? "booking" : "block"}
                suppressNativeDrag={Boolean(canDragBooking)}
              >
                {bar.showLabel ? (
                  <>
                    {(() => {
                      const parts = splitCalendarGuestLabel(bar.label);
                      return (
                        <strong className="extranet-bar__guest">
                          {parts.bedCode ? (
                            <span className="extranet-bar__bed">{parts.bedCode}</span>
                          ) : null}
                          <span className="extranet-bar__name">{parts.guestName}</span>
                        </strong>
                      );
                    })()}
                    {bar.compact || !bar.sublabel ? null : <span>{bar.sublabel}</span>}
                  </>
                ) : (
                  <span className="extranet-bar__continued" aria-hidden="true" />
                )}
              </CalendarStayBarLink>
            </div>
          );
        })}
      </div>
    </>
  );
}

function UnassignedReservationRow({
  bookings,
  channelReservations,
  bookingByKey,
  channelByKey,
  calendarDays,
  monthKey,
  fromIso,
  toIso,
  canManage,
  selectedBookingKey,
  selectedBlockKey,
  guestColors,
  roomUnits,
  occupancies,
  roomShortNameById,
  todayIso,
}: {
  bookings: StaffBooking[];
  channelReservations: StaffRoomBlock[];
  bookingByKey: Map<string, StaffBooking>;
  channelByKey: Map<string, StaffRoomBlock>;
  calendarDays: CalendarDay[];
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  canManage: boolean;
  selectedBookingKey: string;
  selectedBlockKey: string;
  guestColors: Map<string, string>;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  roomShortNameById: Map<string, string>;
  todayIso: string;
}) {
  const dayCount = calendarDays.length;
  const rangeQuery = { fromIso, toIso };
  const bars = useMemo(
    () =>
      buildRoomTimelineBars({
        bookings,
        channelReservations,
        calendarDays,
        units: roomUnits,
        unassignedOnly: true,
      }),
    [bookings, channelReservations, calendarDays, roomUnits],
  );
  const laneCount = getTimelineLaneCount(bars);
  const knownUnitIds = useMemo(() => getKnownUnitIdSet(roomUnits), [roomUnits]);
  const unassignedCount =
    bookings.filter((booking) => stayNeedsRoomAssignment(booking, knownUnitIds))
      .length +
    channelReservations.filter((reservation) =>
      stayNeedsRoomAssignment(reservation, knownUnitIds),
    ).length;

  const dnd = useCalendarDoorDnd();
  const unassignDropKey = "unassign";
  const isUnassignDropHover = dnd?.dropHoverKey === unassignDropKey;

  // While a door drag is active, keep No # mounted so staff can clear a door.
  if (unassignedCount === 0 && !dnd?.dragging) {
    return null;
  }

  return (
    <div
      aria-label="Needs room #"
      className={[
        "extranet-doors__unassigned",
        isUnassignDropHover ? "extranet-doors__unassigned--drop-hover" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--timeline-days" as string]: dayCount }}
    >
      <MetricRowLabel className="extranet-row__label--needs-room">
        No #
        <span className="extranet-row__meta">{unassignedCount}</span>
      </MetricRowLabel>
      <div
        className={[
          "extranet-reservations",
          canManage ? "extranet-reservations--assign" : "",
          dnd?.dragging ? "extranet-reservations--droppable" : "",
          isUnassignDropHover ? "extranet-reservations--drop-hover" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragLeave={(event) => {
          if (!dnd?.isDragging()) {
            return;
          }
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            dnd.setDropHoverKey(null);
          }
        }}
        onDragOver={(event) => {
          // Ref check — state lags one frame after drag starts.
          if (!dnd?.isDragging()) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          dnd.setDropHoverKey(unassignDropKey);
        }}
        onDrop={(event) => {
          if (!dnd?.isDragging()) {
            return;
          }
          event.preventDefault();
          dnd.dropOnUnassign();
        }}
        style={{
          ["--lane-count" as string]: laneCount,
          gridColumn: `2 / span ${dayCount}`,
        }}
      >
        {calendarDays.map((day, columnIndex) => {
          const weekday = day.date.getDay();
          return (
            <div
              className={[
                "extranet-reservations__day",
                day.iso === todayIso ? "extranet-cell--today" : "",
                !day.inCurrentMonth ? "extranet-cell--muted" : "",
                weekday === 0 || weekday === 6 ? "extranet-cell--weekend" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={`unassigned-bg-${day.iso}`}
              style={{ gridColumn: columnIndex + 1 }}
            />
          );
        })}

        {bars.map((bar) => {
          const isSelected =
            bar.kind === "booking"
              ? selectedBookingKey === bar.itemKey
              : selectedBlockKey === bar.itemKey;
          const sourceBooking =
            bar.kind === "booking" ? (bookingByKey.get(bar.itemKey) ?? null) : null;
          const sourceChannel =
            bar.kind === "channel" ? (channelByKey.get(bar.itemKey) ?? null) : null;
          const stayId =
            sourceBooking?.databaseId ?? sourceChannel?.databaseId ?? null;
          const stayRoomId = sourceBooking?.roomId ?? sourceChannel?.roomId ?? "";
          const typeLabel =
            roomShortNameById.get(stayRoomId) ??
            sourceBooking?.room ??
            stayRoomId;
          const showInlineAssign =
            canManage && Boolean(stayId) && bar.needsRoom && bar.showLabel;
          const detailHref = getTimelineBarHref(bar, monthKey, rangeQuery);
          const sublabel = typeLabel
            ? `${typeLabel} · No #`
            : bar.sublabel;
          const canDragBooking =
            Boolean(dnd?.canManage) &&
            sourceBooking?.databaseId &&
            isStaffCalendarManageableStay(sourceBooking);
          const dropStay = sourceBooking ? bookingDropStay(sourceBooking) : null;

          return (
            <div
              className={[
                "extranet-bar-shell",
                showInlineAssign ? "extranet-bar-shell--assign" : "",
                canDragBooking ? "extranet-bar-shell--draggable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={Boolean(canDragBooking)}
              key={bar.key}
              onDragEnd={() => dnd?.endDrag()}
              onDragStart={(event: DragEvent) => {
                if (!canDragBooking || !dropStay || !dnd) {
                  return;
                }
                event.stopPropagation();
                dnd.beginDrag(dropStay, event);
              }}
              style={{
                ...getTimelineBarPlacementStyle(bar),
                ...getBarColorStyle(bar, guestColors),
              }}
            >
              <CalendarStayBarLink
                ariaLabel={`${bar.label}, ${sublabel}`}
                className={[getBarClassName(bar, isSelected), "extranet-bar__open"].join(
                  " ",
                )}
                href={detailHref}
                itemKey={bar.itemKey}
                kind={bar.kind === "booking" ? "booking" : "block"}
                suppressNativeDrag={Boolean(canDragBooking)}
              >
                {bar.showLabel ? (
                  <>
                    {(() => {
                      const parts = splitCalendarGuestLabel(bar.label);
                      return (
                        <strong className="extranet-bar__guest">
                          {parts.bedCode ? (
                            <span className="extranet-bar__bed">{parts.bedCode}</span>
                          ) : null}
                          <span className="extranet-bar__name">{parts.guestName}</span>
                        </strong>
                      );
                    })()}
                    {bar.compact ? null : <span>{sublabel}</span>}
                  </>
                ) : (
                  <span className="extranet-bar__continued" aria-hidden="true" />
                )}
              </CalendarStayBarLink>
              {showInlineAssign && stayId ? (
                <InlineRoomAssign
                  arrivalDate={
                    sourceBooking?.arrivalDate ?? sourceChannel?.startDate ?? ""
                  }
                  departureDate={
                    sourceBooking?.departureDate ?? sourceChannel?.endDate ?? ""
                  }
                  fromIso={fromIso}
                  guestLabel={bar.label}
                  kind={bar.kind === "booking" ? "booking" : "channel"}
                  monthKey={monthKey}
                  occupancies={occupancies}
                  roomId={stayRoomId}
                  roomUnits={roomUnits}
                  stayId={stayId}
                  toIso={toIso}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StaffTimelineCalendar({
  rooms,
  bookings,
  blocks,
  calendarDays,
  calendarColors,
  monthKey,
  fromIso,
  toIso,
  monthLabel,
  canManage,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
  selectedRoomId,
  roomUnits,
  occupancies,
  allotmentOverrideKeys = [],
  rateOverrideKeys = [],
}: StaffTimelineCalendarProps) {
  const todayIso = getPropertyTodayIso();
  const dayCount = calendarDays.length;
  const staySelection = useCalendarStaySelection();
  const activeBookingKey = staySelection?.bookingKey || selectedBookingKey;
  const activeBlockKey = staySelection?.blockKey || selectedBlockKey;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleMonthLabel, setVisibleMonthLabel] = useState(monthLabel);
  const allotmentOverrideKeySet = useMemo(
    () => new Set(allotmentOverrideKeys),
    [allotmentOverrideKeys],
  );
  const rateOverrideKeySet = useMemo(
    () => new Set(rateOverrideKeys),
    [rateOverrideKeys],
  );
  const fitMonthDayCount = Math.max(
    28,
    calendarDays.filter((day) => day.iso.startsWith(`${monthKey}-`)).length ||
      new Date(
        Number(monthKey.slice(0, 4)),
        Number(monthKey.slice(5, 7)),
        0,
      ).getDate(),
  );

  const channelReservations = useMemo(
    () => blocks.filter(isChannelReservation),
    [blocks],
  );
  const staffClosures = useMemo(
    () => blocks.filter((block) => !isChannelReservation(block)),
    [blocks],
  );
  const closedDayKeys = useMemo(
    () =>
      buildStaffClosedDayKeys({
        staffClosures,
        calendarDays,
      }),
    [staffClosures, calendarDays],
  );
  const roomShortNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const room of rooms) {
      map.set(room.id, room.shortName);
    }
    return map;
  }, [rooms]);
  const doorUnits = useMemo(
    () => getTimelineDoorUnits(roomUnits, roomShortNameById),
    [roomUnits, roomShortNameById],
  );

  const guestColors = useMemo(() => {
    const names: string[] = [];
    for (const booking of bookings) {
      names.push(booking.guest);
    }
    for (const block of blocks) {
      if (!isChannelReservation(block)) {
        continue;
      }
      names.push(block.guestName.trim() || block.channelLabel || "Channel");
    }
    return assignGuestBarColors(names);
  }, [bookings, blocks]);

  const bookingsByUnitId = useMemo(() => {
    const map = new Map<string, StaffBooking[]>();
    for (const booking of bookings) {
      const unitId = booking.roomUnitId;
      if (!unitId) {
        continue;
      }
      const list = map.get(unitId);
      if (list) {
        list.push(booking);
      } else {
        map.set(unitId, [booking]);
      }
    }
    return map;
  }, [bookings]);

  const channelsByUnitId = useMemo(() => {
    const map = new Map<string, StaffRoomBlock[]>();
    for (const reservation of channelReservations) {
      const unitId = reservation.roomUnitId;
      if (!unitId) {
        continue;
      }
      const list = map.get(unitId);
      if (list) {
        list.push(reservation);
      } else {
        map.set(unitId, [reservation]);
      }
    }
    return map;
  }, [channelReservations]);

  const bookingByKey = useMemo(() => {
    const map = new Map<string, StaffBooking>();
    for (const booking of bookings) {
      map.set(getStaffBookingKey(booking), booking);
    }
    return map;
  }, [bookings]);

  const channelByKey = useMemo(() => {
    const map = new Map<string, StaffRoomBlock>();
    for (const reservation of channelReservations) {
      map.set(getStaffRoomBlockKey(reservation), reservation);
    }
    return map;
  }, [channelReservations]);

  const emptyUnitBookings = useMemo(() => [] as StaffBooking[], []);
  const emptyUnitChannels = useMemo(() => [] as StaffRoomBlock[], []);
  const dropOccupancies = useMemo(() => {
    if (occupancies.length > 0) {
      return occupancies;
    }
    return [
      ...bookings.map(occupancyFromBooking),
      ...channelReservations.map(occupancyFromChannelBlock),
    ];
  }, [occupancies, bookings, channelReservations]);

  useEffect(() => {
    setVisibleMonthLabel(monthLabel);
  }, [monthLabel]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }

    let frame = 0;
    const updateVisibleMonth = () => {
      frame = 0;
      const monthCell = root.querySelector<HTMLElement>(".staff-extranet__month");
      const dayHeads = root.querySelectorAll<HTMLElement>("[data-calendar-day]");
      if (!monthCell || dayHeads.length === 0) {
        return;
      }

      const labelRight = monthCell.getBoundingClientRect().right;
      const leadingIso = pickLeadingVisibleCalendarDayHeadIso(dayHeads, labelRight);
      if (!leadingIso) {
        return;
      }

      const nextLabel = formatCalendarMonthLabelFromIso(leadingIso);
      setVisibleMonthLabel((current) => (current === nextLabel ? current : nextLabel));
    };

    const onScrollOrResize = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(updateVisibleMonth);
    };

    updateVisibleMonth();
    root.addEventListener("scroll", onScrollOrResize, { passive: true });
    const resizeObserver = new ResizeObserver(onScrollOrResize);
    resizeObserver.observe(root);

    return () => {
      root.removeEventListener("scroll", onScrollOrResize);
      resizeObserver.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [calendarDays, monthLabel]);

  return (
    <CalendarDoorDndProvider
      canManage={canManage}
      fromIso={fromIso}
      monthKey={monthKey}
      occupancies={dropOccupancies}
      toIso={toIso}
      units={roomUnits}
    >
      <div
        className="staff-extranet staff-extranet--doors"
        style={{
          ...getCalendarColorStyleProps(calendarColors),
          ["--extranet-fit-month-days" as string]: String(fitMonthDayCount),
        }}
      >
        <CalendarJumpToToday />
        <h2 className="sr-only">Doors by day</h2>
        <p className="sr-only">
          Drag a booking onto another door to reassign it. Drop onto another
          booking to swap or replace when allowed. Drop onto No # to clear the
          door.
        </p>
        <div className="staff-extranet__scroll" id="calendar-today" ref={scrollRef}>
          <div
            className="staff-extranet__dates"
            style={{ ["--timeline-days" as string]: dayCount }}
          >
            <div className="staff-extranet__month" aria-hidden="true">
              {visibleMonthLabel}
            </div>
            {calendarDays.map((day, columnIndex) => {
              const header = formatTimelineDayHeader(day.date, day.iso, todayIso);
              const isMonthStart = header.dayNumber === 1;

              return (
                <div
                  aria-current={header.isToday ? "date" : undefined}
                  className={[
                    "staff-extranet__dayhead",
                    header.isWeekend ? "staff-extranet__dayhead--weekend" : "",
                    header.isToday
                      ? "staff-extranet__dayhead--today extranet-cell--today"
                      : "",
                    isMonthStart ? "staff-extranet__dayhead--month-start" : "",
                    !day.inCurrentMonth ? "staff-extranet__dayhead--muted" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-calendar-day={day.iso}
                  key={day.iso}
                  style={{ gridColumn: columnIndex + 2 }}
                >
                  <span className="staff-extranet__weekday">{header.weekday}</span>
                  <span className="staff-extranet__daynum">{header.dayNumber}</span>
                </div>
              );
            })}
          </div>

          <UnassignedReservationRow
            bookingByKey={bookingByKey}
            bookings={bookings}
            calendarDays={calendarDays}
            canManage={canManage}
            channelByKey={channelByKey}
            channelReservations={channelReservations}
            fromIso={fromIso}
            guestColors={guestColors}
            monthKey={monthKey}
            occupancies={occupancies}
            roomShortNameById={roomShortNameById}
            roomUnits={roomUnits}
            selectedBlockKey={activeBlockKey}
            selectedBookingKey={activeBookingKey}
            toIso={toIso}
            todayIso={todayIso}
          />

          <div
            aria-label="Room numbers"
            className="extranet-doors"
            style={{ ["--timeline-days" as string]: dayCount }}
          >
            {doorUnits.length > 0 ? (
              doorUnits.map((unit) => {
                const primaryRoomId = getPrimaryRoomIdForUnit(unit);
                const roomTypeLabel = primaryRoomId
                  ? roomShortNameById.get(primaryRoomId)
                  : undefined;
                return (
                  <DoorReservationRow
                    allotmentOverrideKeys={allotmentOverrideKeySet}
                    calendarDays={calendarDays}
                    closedDayKeys={closedDayKeys}
                    fromIso={fromIso}
                    guestColors={guestColors}
                    key={unit.id}
                    monthKey={monthKey}
                    rateOverrideKeys={rateOverrideKeySet}
                    roomTypeLabel={roomTypeLabel}
                    selectedBlockKey={activeBlockKey}
                    selectedBookingKey={activeBookingKey}
                    selectedDate={selectedDate}
                    selectedRoomId={selectedRoomId}
                    toIso={toIso}
                    todayIso={todayIso}
                    unit={unit}
                    unitBookings={bookingsByUnitId.get(unit.id) ?? emptyUnitBookings}
                    unitChannels={channelsByUnitId.get(unit.id) ?? emptyUnitChannels}
                  />
                );
              })
            ) : (
              <p className="extranet-doors__empty">
                No doors yet. Add them in Settings → Rooms.
              </p>
            )}
          </div>
        </div>
      </div>
    </CalendarDoorDndProvider>
  );
}
