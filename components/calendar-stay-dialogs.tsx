"use client";

import { CalendarBlockPanel } from "@/components/calendar-block-panel";
import { CalendarBookingDialog } from "@/components/calendar-booking-dialog";
import { CalendarBookingPanel } from "@/components/calendar-booking-panel";
import { StayOpenConversation } from "@/components/stay-open-conversation";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";
import { formatBedSetup } from "@/lib/bed-setup";
import { formatBookingSource } from "@/lib/booking-source";
import { guestHasConversationLink } from "@/lib/booking-chat";
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
import { isStaffCalendarManageableStay } from "@/lib/staff-calendar-stay";
import { STAY_STATUS_LABELS } from "@/lib/stay-status";

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
  const hasGuestEmail = Boolean(
    selectedBooking && guestHasConversationLink(selectedBooking.contact),
  );

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
              <dt>Room type</dt>
              <dd>
                {selectedBooking.room}
                {selectedBooking.roomNumber
                  ? ` · #${selectedBooking.roomNumber}`
                  : " · No #"}
              </dd>
            </div>
            <div>
              <dt>Stay status</dt>
              <dd>{STAY_STATUS_LABELS[selectedBooking.stayStatus]}</dd>
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

          {selectedBooking.databaseId ? (
            <StayOpenConversation
              bookingId={selectedBooking.databaseId}
              canManage={canManageSelected}
              guestLabel={selectedBooking.guest}
              hasGuestEmail={hasGuestEmail}
              key={selectedKey}
              priority={selectedBooking.status === "needs-reply"}
              readOnly={selectedBooking.status === "declined"}
            />
          ) : (
            <p className="form-message form-message--setup" role="status">
              Conversation is unavailable for this stay — the booking record is
              missing a database id. Reopen the stay from the calendar tape, or
              check Supabase is connected.
            </p>
          )}

          <CalendarBookingPanel
            key={selectedKey}
            arrivalDate={selectedBooking.arrivalDate}
            bookingKey={selectedKey}
            bookingSource={selectedBooking.bookingSource}
            canCancelStay={
              canManageSelected &&
              isStaffCalendarManageableStay(selectedBooking)
            }
            canManage={
              canManageSelected &&
              isStaffCalendarManageableStay(selectedBooking)
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
          />

          <p className="detail-help">
            {selectedBooking.status === "awaiting" && selectedBooking.depositPaid ? (
              <>
                This stay is reserved by payment and already on the calendar. You
                can assign a room number and edit details here. Confirm from the
                inbox only if the request is still open there (bank or legacy
                card holds).
              </>
            ) : selectedBooking.status === "needs-reply" ? (
              <>
                Guest is waiting on a reply. Open conversation above when you
                are ready — you can still assign a door number and edit dates
                here.
              </>
            ) : selectedBooking.status === "awaiting" ? (
              <>
                This stay is waiting on payment or staff confirmation. Assign a
                room number if needed, then Confirm from the inbox when ready.
              </>
            ) : (
              <>
                Assign a room number so the stay appears on the room-number rows —
                this still works after the stay dates have passed. Saving updates
                guest details, dates, source, payment, assignment, and stay total.
                Check-in status updates automatically from the stay dates.
                Changing dates does not change the stay total unless you edit it or
                leave it blank to use the usual rate for the new dates. To remove the
                stay, use Cancel stay — you will be asked to confirm.
              </>
            )}
          </p>
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
          {selectedBlock.channelLabel ? (
            <div className="staff-request-chat" id="booking-chat" tabIndex={-1}>
              <h3 className="staff-request-chat__title">Conversation</h3>
              <p className="detail-help staff-request-chat__hint">
                In-app chat is for website bookings only. Channel stays keep
                guest email for your records — message them in{" "}
                {selectedBlock.channelLabel}, not here.
              </p>
            </div>
          ) : null}
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
