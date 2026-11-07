"use client";

import { CalendarBookingDialog } from "@/components/calendar-booking-dialog";
import { CalendarDayPanel } from "@/components/calendar-day-panel";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";
import { bookingOccupiesDay } from "@/lib/calendar";
import {
  getStaffBookingKey,
  type StaffBooking,
} from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import type { PropertyCurrency } from "@/lib/currency";
import { getNightlyRateDetails, type RoomPromotionRate } from "@/lib/pricing";
import {
  explainRoomNightSale,
  formatRoomNightSaleReason,
} from "@/lib/room-night-sale";
import {
  getStaffRoomBlockKey,
  isChannelReservation,
  type StaffRoomBlock,
} from "@/lib/room-blocks";
import {
  getRoomUnitById,
  stayNeedsRoomAssignment,
  type RoomUnit,
} from "@/lib/room-units";

type CalendarDayDialogsProps = {
  monthKey: string;
  fromIso: string;
  toIso: string;
  rooms: Room[];
  roomUnits: RoomUnit[];
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  canManage: boolean;
  canManageRates: boolean;
  currency: PropertyCurrency;
  promotions: RoomPromotionRate[];
  inventoryByKey: Record<string, number>;
  rateOverrides: Record<string, number>;
  knownUnitIds: string[];
  formError?: string | null;
  overlap?: string;
};

export function CalendarDayDialogs({
  monthKey,
  fromIso,
  toIso,
  rooms,
  roomUnits,
  bookings,
  blocks,
  canManage,
  canManageRates,
  currency,
  promotions,
  inventoryByKey,
  rateOverrides,
  knownUnitIds,
  formError = null,
  overlap,
}: CalendarDayDialogsProps) {
  const selection = useCalendarStaySelection();
  if (!selection) {
    return null;
  }

  const { dayRoomId, dayDate, dayUnitId, dayMode, close } = selection;
  if (!dayRoomId || !dayDate || dayMode === "bulk-status") {
    return null;
  }

  const room = rooms.find((entry) => entry.id === dayRoomId);
  if (!room) {
    return null;
  }

  const knownUnitIdSet = new Set(knownUnitIds);
  const doorUnit = dayUnitId ? getRoomUnitById(roomUnits, dayUnitId) : null;
  const inventoryLookup = new Map(Object.entries(inventoryByKey));
  const rateLookup = new Map(Object.entries(rateOverrides));
  const channelBlocks = blocks.filter(isChannelReservation);
  const staffClosures = blocks
    .filter((block) => !isChannelReservation(block))
    .map((block) => ({
      roomId: block.roomId,
      startDate: block.startDate,
      endDate: block.endDate,
    }));

  const nightSaleReason = explainRoomNightSale({
    room,
    iso: dayDate,
    bookings,
    channelBlocks,
    staffClosures,
    inventoryLookup,
    units: roomUnits,
  });
  const soldOutForNight = Boolean(
    nightSaleReason && nightSaleReason.kind !== "open",
  );
  const soldOutReason = nightSaleReason
    ? formatRoomNightSaleReason(nightSaleReason)
    : null;

  const dayStays = [
    ...bookings
      .filter(
        (booking) =>
          booking.roomId === room.id && bookingOccupiesDay(booking, dayDate),
      )
      .map((booking) => {
        const hold =
          booking.status === "pending_payment"
            ? "Awaiting payment"
            : booking.bankTransferClaimed && !booking.depositPaid
              ? "Bank transfer hold"
              : null;
        const roomBit = stayNeedsRoomAssignment(booking, knownUnitIdSet)
          ? "Needs room #"
          : booking.roomNumber
            ? `Room ${booking.roomNumber}`
            : "Direct";
        return {
          key: getStaffBookingKey(booking),
          href: `/staff/calendar?month=${monthKey}&from=${fromIso}&to=${toIso}&booking=${encodeURIComponent(getStaffBookingKey(booking))}`,
          label: booking.guest,
          sublabel: hold ? `${roomBit} · ${hold}` : `${roomBit} · direct`,
        };
      }),
    ...channelBlocks
      .filter(
        (block) =>
          block.roomId === room.id &&
          bookingOccupiesDay(
            { arrivalDate: block.startDate, departureDate: block.endDate },
            dayDate,
          ),
      )
      .map((block) => ({
        key: getStaffRoomBlockKey(block),
        href: `/staff/calendar?month=${monthKey}&from=${fromIso}&to=${toIso}&block=${encodeURIComponent(getStaffRoomBlockKey(block))}`,
        label: block.guestName || block.channelLabel || "Channel stay",
        sublabel: stayNeedsRoomAssignment(block, knownUnitIdSet)
          ? `Needs room # · ${block.channelLabel ?? "channel"}`
          : block.roomNumber
            ? `Room ${block.roomNumber} · ${block.channelLabel ?? "channel"}`
            : (block.channelLabel ?? "channel"),
      })),
    ...blocks
      .filter(
        (block) =>
          block.roomId === room.id &&
          !isChannelReservation(block) &&
          bookingOccupiesDay(
            { arrivalDate: block.startDate, departureDate: block.endDate },
            dayDate,
          ),
      )
      .map((block) => ({
        key: `close-${getStaffRoomBlockKey(block)}`,
        href: `/staff/calendar?month=${monthKey}&from=${fromIso}&to=${toIso}&block=${encodeURIComponent(getStaffRoomBlockKey(block))}`,
        label: "Closed",
        sublabel: block.reason || "Not for sale",
      })),
  ];

  const title = doorUnit
    ? `${room.shortName} · #${doorUnit.number} · ${dayDate}`
    : `${room.shortName} · ${dayDate}`;

  return (
    <CalendarBookingDialog onClose={close} open title={title}>
      <CalendarDayPanel
        key={`${room.id}|${dayDate}|${doorUnit?.id ?? ""}|${dayMode}|${formError ?? ""}`}
        canManage={dayMode === "rate" ? canManageRates : canManage}
        currentAllotment={
          inventoryByKey[`${room.id}:${dayDate}`] ?? room.availableCount
        }
        currentRate={
          getNightlyRateDetails(
            room.id,
            dayDate,
            room.rate,
            promotions,
            rateLookup,
          ).rate
        }
        currency={currency}
        date={dayDate}
        dayStays={dayStays}
        error={formError ?? undefined}
        fromIso={fromIso}
        hasAllotmentOverride={Object.hasOwn(
          inventoryByKey,
          `${room.id}:${dayDate}`,
        )}
        hasRateOverride={Object.hasOwn(rateOverrides, `${room.id}:${dayDate}`)}
        mode={dayMode || undefined}
        monthKey={monthKey}
        overlap={overlap}
        promotions={promotions}
        rateOverrides={rateOverrides}
        room={room}
        roomUnitId={doorUnit?.id ?? null}
        roomUnitNumber={doorUnit?.number ?? null}
        soldOutForNight={soldOutForNight}
        soldOutReason={soldOutReason}
        toIso={toIso}
      />
    </CalendarBookingDialog>
  );
}
