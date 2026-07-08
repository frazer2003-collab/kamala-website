import Link from "next/link";
import { CalendarBlockPanel } from "@/components/calendar-block-panel";
import { CalendarBookingDialog } from "@/components/calendar-booking-dialog";
import { CalendarBookingPanel } from "@/components/calendar-booking-panel";
import { CalendarBulkAvailabilityPanel } from "@/components/calendar-bulk-availability-panel";
import { CalendarDayPanel } from "@/components/calendar-day-panel";
import { BookingChat } from "@/components/booking-chat";
import { StaffCalendarToolbar } from "@/components/staff-calendar-toolbar";
import { StaffSidebar } from "@/components/staff-sidebar";
import { StaffTimelineCalendar } from "@/components/staff-timeline-calendar";
import {
  buildCalendarDays,
  formatCalendarMonth,
  formatCalendarMonthLabel,
  isPastCalendarDate,
  parseCalendarMonth,
} from "@/lib/calendar";
import { getCalendarMonthStats } from "@/lib/calendar-timeline";
import {
  getConfirmedBookingById,
  getConfirmedBookings,
  getStaffBookingKey,
} from "@/lib/booking-requests";
import {
  getRoomBlockById,
  getRoomBlocksForMonth,
  isChannelReservation,
} from "@/lib/room-blocks";
import {
  buildInventoryLookup,
  getRoomDayInventoryForMonth,
} from "@/lib/room-day-inventory";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRoomPromotions } from "@/lib/room-promotions";
import { getStaffRooms } from "@/lib/rooms";
import { requireStaffSession } from "@/lib/staff-auth";
import { STAY_STATUS_LABELS } from "@/lib/stay-status";
import {
  formatOverlapErrorMessage,
  parseOverlapDays,
} from "@/lib/stay-overlap";

export const dynamic = "force-dynamic";

function getStayStatusClass(stayStatus: string) {
  if (stayStatus === "checked-in") {
    return "staff-status--confirmed";
  }

  if (stayStatus === "checked-out") {
    return "staff-status--declined";
  }

  return "staff-status--awaiting";
}

export default async function StaffCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    booking?: string;
    block?: string;
    room?: string;
    date?: string;
    mode?: string;
    saved?: string;
    created?: string;
    error?: string;
    overlap?: string;
  }>;
}) {
  await requireStaffSession();

  const {
    month: monthParam,
    booking: selectedBookingId,
    block: selectedBlockId,
    room: selectedRoomId,
    date: selectedDate,
    mode,
    saved,
    created,
    error,
    overlap,
  } = await searchParams;
  const { year, month } = parseCalendarMonth(monthParam);
  const monthKey = formatCalendarMonth(year, month);
  const calendarDays = buildCalendarDays(year, month);
  const [confirmedBookings, roomBlocks, dayInventory, rooms, settings, promotions] =
    await Promise.all([
      getConfirmedBookings({ year, month }),
      getRoomBlocksForMonth({ year, month }),
      getRoomDayInventoryForMonth({ year, month }),
      getStaffRooms(),
      getPropertySettings(),
      getStaffRoomPromotions(),
    ]);
  const inventoryLookup = buildInventoryLookup(dayInventory.entries);
  const channelCount = roomBlocks.blocks.filter(isChannelReservation).length;
  const manualClosureCount = roomBlocks.blocks.length - channelCount;
  const monthStats = getCalendarMonthStats({
    bookings: confirmedBookings.bookings,
    blocks: roomBlocks.blocks,
    calendarDays,
    rooms,
  });
  const selectedFromUrl = selectedBookingId
    ? await getConfirmedBookingById(selectedBookingId)
    : null;
  const selected =
    selectedFromUrl ??
    confirmedBookings.bookings.find(
      (booking) => getStaffBookingKey(booking) === selectedBookingId,
    ) ??
    null;
  const selectedBlock = selectedBlockId ? await getRoomBlockById(selectedBlockId) : null;
  const selectedRoom = selectedRoomId
    ? rooms.find((room) => room.id === selectedRoomId)
    : undefined;
  const canManage =
    confirmedBookings.source === "supabase" &&
    roomBlocks.source === "supabase" &&
    dayInventory.source === "supabase";
  const canManageSelected = Boolean(selected?.databaseId);
  const canManageBlock = Boolean(selectedBlock?.databaseId);
  const selectedKey = selected ? getStaffBookingKey(selected) : "";
  const selectedBlockKey = selectedBlock?.databaseId ?? "";
  const closeHref = `/staff/calendar?month=${monthKey}`;
  const overlapMessage =
    error === "overlap"
      ? formatOverlapErrorMessage(parseOverlapDays(overlap))
      : null;
  const dayDialogOpen = Boolean(
    selectedRoom &&
      selectedDate &&
      !selected &&
      !selectedBlock &&
      mode !== "bulk-status" &&
      !isPastCalendarDate(selectedDate),
  );
  const bulkStatusDialogOpen = Boolean(
    selectedRoom && mode === "bulk-status" && !selected && !selectedBlock,
  );

  return (
    <main className="staff-shell">
      <StaffSidebar current="calendar" />

      <section className="staff-main staff-main--calendar" aria-labelledby="calendar-title">
        <div className="staff-header staff-header--calendar">
          <div>
            <h1 id="calendar-title">Availability & rates</h1>
          </div>
          <Link className="button button--secondary" href="/staff">
            Requests
          </Link>
        </div>

        {confirmedBookings.error ? (
          <p className="form-message form-message--error" role="status">
            {confirmedBookings.error}
          </p>
        ) : null}
        {roomBlocks.error ? (
          <p className="form-message form-message--error" role="status">
            {roomBlocks.error}
          </p>
        ) : null}
        {dayInventory.error ? (
          <p className="form-message form-message--error" role="status">
            {dayInventory.error}
          </p>
        ) : null}
        {confirmedBookings.source === "sample" && !confirmedBookings.error ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables to show live confirmed bookings here.
          </p>
        ) : null}
        {saved === "1" ? (
          <p className="form-message form-message--success" role="status">
            Stay updated.
          </p>
        ) : null}
        {created === "walk-in" ? (
          <p className="form-message form-message--success" role="status">
            Walk-in added to the calendar and marked checked in.
          </p>
        ) : null}
        {created === "block" ? (
          <p className="form-message form-message--success" role="status">
            Room closure saved.
          </p>
        ) : null}
        {saved === "bulk-status" ? (
          <p className="form-message form-message--success" role="status">
            Room availability updated for the selected range.
          </p>
        ) : null}
        {error === "save-failed" ? (
          <p className="form-message form-message--error" role="status">
            Could not save this stay. If notes are not saving, run
            supabase/migrate-stay-status.sql in your Supabase SQL editor.
          </p>
        ) : null}
        {error === "invalid-name" ? (
          <p className="form-message form-message--error" role="status">
            Enter the guest name before saving.
          </p>
        ) : null}
        {error === "invalid-phone" ? (
          <p className="form-message form-message--error" role="status">
            Enter a valid phone number with at least 7 digits.
          </p>
        ) : null}
        {error === "invalid-email" ? (
          <p className="form-message form-message--error" role="status">
            Enter a valid email address, or leave it blank.
          </p>
        ) : null}
        {error === "invalid-dates" ? (
          <p className="form-message form-message--error" role="status">
            Choose a stay between 1 and 21 nights.
          </p>
        ) : null}
        {overlapMessage ? (
          <p className="form-message form-message--error" role="status">
            {overlapMessage}
          </p>
        ) : null}

        <div className="calendar-board calendar-board--timeline">
          <StaffCalendarToolbar
            calendarColors={settings.calendarColors}
            channelCount={channelCount}
            closureCount={manualClosureCount}
            month={month}
            monthKey={monthKey}
            roomCount={rooms.length}
            selectedBlockKey={selectedBlockKey || undefined}
            selectedBookingKey={selectedKey || undefined}
            stats={monthStats}
            stayCount={confirmedBookings.bookings.length}
            year={year}
          />

          <StaffTimelineCalendar
            blocks={roomBlocks.blocks}
            bookings={confirmedBookings.bookings}
            calendarColors={settings.calendarColors}
            calendarDays={calendarDays}
            canManage={canManage}
            inventoryLookup={inventoryLookup}
            monthKey={monthKey}
            monthLabel={formatCalendarMonthLabel(year, month)}
            promotions={promotions}
            rooms={rooms}
            selectedBlockKey={selectedBlockKey}
            selectedBookingKey={selectedKey}
            selectedDate={selectedDate}
            selectedRoomId={selectedRoom?.id}
          />
        </div>

        <CalendarBookingDialog
          closeHref={closeHref}
          open={Boolean(selected)}
          title={selected?.guest ?? "Booking details"}
        >
          {selected ? (
            <>
              <div className="reservation-detail__top">
                <span>{selected.id}</span>
                <div className={`staff-status ${getStayStatusClass(selected.stayStatus)}`}>
                  <span aria-hidden="true" />
                  {STAY_STATUS_LABELS[selected.stayStatus]}
                </div>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Room</dt>
                  <dd>{selected.room}</dd>
                </div>
                <div>
                  <dt>Requested</dt>
                  <dd>{selected.requestedAt}</dd>
                </div>
                <div>
                  <dt>Deposit paid</dt>
                  <dd>
                    {selected.depositPaid
                      ? `$${selected.depositAmount}`
                      : "Not received"}
                  </dd>
                </div>
                <div>
                  <dt>Current total</dt>
                  <dd>
                    ${selected.estimatedTotal} · {selected.nights} nights
                  </dd>
                </div>
              </dl>

              <CalendarBookingPanel
                key={selectedKey}
                arrivalDate={selected.arrivalDate}
                bookingKey={selectedKey}
                canManage={canManageSelected && selected.status === "confirmed"}
                databaseId={selected.databaseId ?? ""}
                departureDate={selected.departureDate}
                guestEmail={selected.contact}
                guestName={selected.guest}
                guestPhone={selected.phone}
                monthKey={monthKey}
                note={selected.note}
                staffNote={selected.staffNote}
                stayStatus={selected.stayStatus}
              />

              {selected.databaseId ? (
                <BookingChat
                  bookingId={selected.databaseId}
                  disabled={!canManageSelected}
                  variant="staff"
                />
              ) : null}

              <p className="detail-help">
                {selected.status === "awaiting" ? (
                  <>
                    This stay is reserved by the guest deposit. Confirm it from
                    the requests page to finalize staff review.
                  </>
                ) : (
                  <>
                    Saving updates the calendar dates and total. Cancelling removes
                    the stay and releases the room if a deposit was paid.
                  </>
                )}
              </p>
            </>
          ) : null}
        </CalendarBookingDialog>

        <CalendarBookingDialog
          closeHref={closeHref}
          open={Boolean(selectedBlock)}
          title={
            selectedBlock?.channelLabel
              ? `${selectedBlock.channelLabel} reservation`
              : (selectedBlock?.reason ?? "Room closure")
          }
        >
          {selectedBlock ? (
            <CalendarBlockPanel
              block={selectedBlock}
              canManage={canManageBlock}
              monthKey={monthKey}
              room={rooms.find((room) => room.id === selectedBlock.roomId)}
            />
          ) : null}
        </CalendarBookingDialog>

        <CalendarBookingDialog
          closeHref={closeHref}
          open={bulkStatusDialogOpen}
          title={
            selectedRoom
              ? `Bulk edit availability · ${selectedRoom.name}`
              : "Bulk edit availability"
          }
        >
          {selectedRoom ? (
            <CalendarBulkAvailabilityPanel
              canManage={canManage}
              error={error}
              monthKey={monthKey}
              room={selectedRoom}
            />
          ) : null}
        </CalendarBookingDialog>

        <CalendarBookingDialog
          closeHref={closeHref}
          open={dayDialogOpen}
          title={
            selectedRoom && selectedDate
              ? `${selectedRoom.shortName} · ${selectedDate}`
              : "Manage date"
          }
        >
          {selectedRoom && selectedDate ? (
            <CalendarDayPanel
              canManage={canManage}
              date={selectedDate}
              error={error}
              mode={mode}
              monthKey={monthKey}
              overlap={overlap}
              room={selectedRoom}
            />
          ) : null}
        </CalendarBookingDialog>
      </section>
    </main>
  );
}
