"use client";

import { CalendarBlockPanel } from "@/components/calendar-block-panel";
import { CalendarBookingDialog } from "@/components/calendar-booking-dialog";
import { CalendarBookingPanel } from "@/components/calendar-booking-panel";
import { BookingChat } from "@/components/staff-lazy";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";
import { formatBedSetup } from "@/lib/bed-setup";
import { formatBookingSource } from "@/lib/booking-source";
import type { StaffBooking } from "@/lib/booking-requests";
import { getStaffBookingKey } from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import type { PropertyCurrency } from "@/lib/currency";
import { formatMoneySuffix } from "@/lib/currency";
import type { RoomPromotionRate } from "@/lib/pricing";
import {
  getStaffRoomBlockKey,
  type StaffRoomBlock,
} from "@/lib/room-blocks";
import type { RoomUnit, UnitOccupancy } from "@/lib/room-units";

type CalendarStayDialogsProps = {
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  /** Deep-linked stay that may sit outside the loaded month set. */
  seedBooking?: StaffBooking | null;
  seedBlock?: StaffRoomBlock | null;
  rooms: Room[];
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  canManage: boolean;
  currency: PropertyCurrency;
  promotions: RoomPromotionRate[];
  rateOverrides: Record<string, number>;
  formError?: string | null;
};

export function CalendarStayDialogs({
  monthKey,
  fromIso,
  toIso,
  bookings,
  blocks,
  seedBooking = null,
  seedBlock = null,
  rooms,
  roomUnits,
  occupancies,
  canManage,
  currency,
  promotions,
  rateOverrides,
  formError = null,
}: CalendarStayDialogsProps) {
  const staySelection = useCalendarStaySelection();

  if (!staySelection) {
    return null;
  }

  const selectedBooking = staySelection.bookingKey
    ? (bookings.find(
        (booking) => getStaffBookingKey(booking) === staySelection.bookingKey,
      ) ??
      (seedBooking && getStaffBookingKey(seedBooking) === staySelection.bookingKey
        ? seedBooking
        : null))
    : null;

  const selectedBlock = staySelection.blockKey
    ? (blocks.find(
        (block) => getStaffRoomBlockKey(block) === staySelection.blockKey,
      ) ??
      (seedBlock && getStaffRoomBlockKey(seedBlock) === staySelection.blockKey
        ? seedBlock
        : null))
    : null;

  const selectedKey = selectedBooking ? getStaffBookingKey(selectedBooking) : "";
  const selectedBlockKey = selectedBlock ? getStaffRoomBlockKey(selectedBlock) : "";
  const canManageSelected = canManage && Boolean(selectedBooking?.databaseId);
  const canManageBlock = canManage && Boolean(selectedBlock?.databaseId);

  return (
    <>
      {selectedBooking ? (
        <CalendarBookingDialog
          focusReturnKey={selectedKey || undefined}
          onClose={staySelection.close}
          open
          title={selectedBooking.guest}
        >
          <div className="reservation-detail__top">
            <span>{selectedBooking.id}</span>
            <div
              className={`staff-status ${
                selectedBooking.depositPaid
                  ? "staff-status--confirmed"
                  : "staff-status--awaiting"
              }`}
            >
              <span aria-hidden="true" />
              {selectedBooking.depositPaid ? "Paid" : "Unpaid"}
            </div>
          </div>
          <dl className="detail-list detail-list--stay-meta">
            <div>
              <dt>Room</dt>
              <dd>
                {selectedBooking.room}
                {selectedBooking.roomNumber
                  ? ` · #${selectedBooking.roomNumber}`
                  : " · Unassigned"}
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                {formatBookingSource(selectedBooking.bookingSource ?? "walk-in")}
              </dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>
                {selectedBooking.depositPaid
                  ? formatMoneySuffix(selectedBooking.depositAmount, currency)
                  : "Not received"}
              </dd>
            </div>
            <div>
              <dt>Stay total</dt>
              <dd>
                {formatMoneySuffix(selectedBooking.estimatedTotal, currency)} ·{" "}
                {selectedBooking.nights} nights
              </dd>
            </div>
            {selectedBooking.bedSetup ? (
              <div>
                <dt>Bed setup</dt>
                <dd>{formatBedSetup(selectedBooking.bedSetup)} requested</dd>
              </div>
            ) : null}
          </dl>

          <CalendarBookingPanel
            key={selectedKey}
            arrivalDate={selectedBooking.arrivalDate}
            bookingKey={selectedKey}
            bookingSource={selectedBooking.bookingSource}
            canCancelStay={selectedBooking.status === "confirmed"}
            canManage={
              canManageSelected &&
              (selectedBooking.status === "confirmed" ||
                (selectedBooking.status === "awaiting" && selectedBooking.depositPaid))
            }
            currency={currency}
            databaseId={selectedBooking.databaseId ?? ""}
            departureDate={selectedBooking.departureDate}
            depositPaid={selectedBooking.depositPaid}
            estimatedTotal={selectedBooking.estimatedTotal}
            formError={formError}
            guestEmail={selectedBooking.contact}
            guestName={selectedBooking.guest}
            guestPhone={selectedBooking.phone}
            fromIso={fromIso}
            monthKey={monthKey}
            toIso={toIso}
            note={selectedBooking.note}
            occupancies={occupancies}
            promotions={promotions}
            rateOverrides={rateOverrides}
            roomId={selectedBooking.roomId}
            roomUnitId={selectedBooking.roomUnitId}
            roomUnits={roomUnits}
            rooms={rooms.map((room) => ({
              id: room.id,
              name: room.name,
              rate: room.rate,
            }))}
            staffNote={selectedBooking.staffNote}
            stayStatus={selectedBooking.stayStatus}
          />

          <p className="detail-help">
            {selectedBooking.status === "awaiting" ? (
              <>
                This stay is reserved by payment. You can still assign a room number
                here (including for past dates). Confirm the request from the inbox
                when ready.
              </>
            ) : (
              <>
                Assign a room number so the stay appears on the room-number rows —
                this still works after the stay dates have passed. Saving updates
                guest details, dates, source, payment, assignment, and stay total.
                Changing dates does not change the stay total unless you edit it or
                leave it blank to use the usual rate for the new dates. To remove the
                stay, use Cancel stay — you will be asked to confirm.
              </>
            )}
          </p>

          {selectedBooking.databaseId ? (
            <details className="staff-request-chat staff-request-chat--collapsible">
              <summary className="staff-request-chat__title">Conversation</summary>
              <BookingChat
                bookingId={selectedBooking.databaseId}
                disabled={!canManageSelected}
                guestLabel={selectedBooking.guest}
                readOnly={selectedBooking.status === "declined"}
                showHeading={false}
                variant="staff"
              />
            </details>
          ) : null}
        </CalendarBookingDialog>
      ) : null}

      {selectedBlock ? (
        <CalendarBookingDialog
          focusReturnKey={selectedBlockKey || undefined}
          onClose={staySelection.close}
          open
          title={
            selectedBlock.channelLabel
              ? `${selectedBlock.channelLabel} reservation`
              : (selectedBlock.reason ?? "Room closure")
          }
        >
          <CalendarBlockPanel
            block={selectedBlock}
            canManage={canManageBlock}
            formError={formError}
            fromIso={fromIso}
            monthKey={monthKey}
            toIso={toIso}
            occupancies={occupancies}
            room={rooms.find((room) => room.id === selectedBlock.roomId)}
            roomUnits={roomUnits}
            rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
          />
        </CalendarBookingDialog>
      ) : null}
    </>
  );
}
