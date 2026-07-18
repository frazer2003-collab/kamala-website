import Link from "next/link";
import { CalendarBlockPanel } from "@/components/calendar-block-panel";
import { CalendarBookingPanel } from "@/components/calendar-booking-panel";
import { CalendarBulkAvailabilityPanel } from "@/components/calendar-bulk-availability-panel";
import { CalendarDayPanel } from "@/components/calendar-day-panel";
import {
  BookingChat,
  CalendarBookingDialog,
  StaffTimelineCalendar,
} from "@/components/staff-lazy";
import { CalendarGridGuide } from "@/components/calendar-grid-guide";
import { StaffCalendarToolbar } from "@/components/staff-calendar-toolbar";
import { StaffSidebar } from "@/components/staff-sidebar";
import {
  buildCalendarDays,
  formatCalendarMonth,
  formatCalendarMonthLabel,
  isPastCalendarDate,
  monthOverlapsBooking,
  parseCalendarMonth,
  bookingOccupiesDay,
} from "@/lib/calendar";
import { getCalendarMonthStats } from "@/lib/calendar-timeline";
import {
  getConfirmedBookingById,
  getConfirmedBookings,
  getStaffBookingKey,
} from "@/lib/booking-requests";
import {
  getRoomBlockById,
  getStaffCalendarBlocks,
  isChannelReservation,
} from "@/lib/room-blocks";
import {
  buildInventoryLookup,
  getRoomDayInventoryForMonth,
} from "@/lib/room-day-inventory";
import { formatMoneySuffix } from "@/lib/currency";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRoomPromotions } from "@/lib/room-promotions";
import { getStaffRooms } from "@/lib/rooms";
import {
  attachRoomNumbers,
  getStaffRoomUnits,
  occupancyFromBooking,
  occupancyFromChannelBlock,
} from "@/lib/room-units";
import {
  requireStaffSessionDetails,
  staffCanWriteCalendar,
} from "@/lib/staff-auth";
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
    detail?: string;
    assignGuest?: string;
    assignUnit?: string;
    "ical-synced"?: string;
    "ical-feeds"?: string;
    "ical-error"?: string;
  }>;
}) {
  const staffSession = await requireStaffSessionDetails();

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
    detail: errorDetail,
    assignGuest,
    assignUnit,
    "ical-synced": icalSynced,
    "ical-feeds": icalFeeds,
    "ical-error": icalError,
  } = await searchParams;
  const { year, month } = parseCalendarMonth(monthParam);
  const monthKey = formatCalendarMonth(year, month);
  const calendarDays = buildCalendarDays(year, month);
  const [confirmedBookings, calendarBlockData, dayInventory, rooms, settings, promotions, roomUnitsResult] =
    await Promise.all([
      getConfirmedBookings({ year, month }),
      getStaffCalendarBlocks({ year, month }),
      getRoomDayInventoryForMonth({ year, month }),
      getStaffRooms(),
      getPropertySettings(),
      getStaffRoomPromotions(),
      getStaffRoomUnits(),
    ]);
  const roomUnits = roomUnitsResult.units;
  const allAssignmentBookings = attachRoomNumbers(confirmedBookings.bookings, roomUnits);
  const calendarBookings = allAssignmentBookings.filter((booking) =>
    monthOverlapsBooking(booking, year, month),
  );
  const calendarBlocks = attachRoomNumbers(calendarBlockData.monthBlocks, roomUnits);
  const allAssignmentChannels = attachRoomNumbers(calendarBlockData.channelBlocks, roomUnits);
  const unitOccupancies = [
    ...allAssignmentBookings.map(occupancyFromBooking),
    ...allAssignmentChannels.map(occupancyFromChannelBlock),
  ];
  const inventoryLookup = buildInventoryLookup(dayInventory.entries);
  const unassignedCount =
    calendarBookings.filter((booking) => !booking.roomUnitId).length +
    calendarBlocks.filter(
      (block) => isChannelReservation(block) && !block.roomUnitId,
    ).length;
  const monthStats = getCalendarMonthStats({
    bookings: calendarBookings,
    blocks: calendarBlocks,
    calendarDays,
    rooms,
  });
  const selectedFromUrl = selectedBookingId
    ? await getConfirmedBookingById(selectedBookingId)
    : null;
  const selectedRaw =
    selectedFromUrl ??
    calendarBookings.find(
      (booking) => getStaffBookingKey(booking) === selectedBookingId,
    ) ??
    null;
  const selected = selectedRaw
    ? attachRoomNumbers([selectedRaw], roomUnits)[0]
    : null;
  const selectedBlockRaw = selectedBlockId ? await getRoomBlockById(selectedBlockId) : null;
  const selectedBlock = selectedBlockRaw
    ? attachRoomNumbers([selectedBlockRaw], roomUnits)[0]
    : null;
  const selectedRoom = selectedRoomId
    ? rooms.find((room) => room.id === selectedRoomId)
    : undefined;
  const canWriteCalendar = staffCanWriteCalendar(staffSession);
  const canManage =
    canWriteCalendar &&
    confirmedBookings.source === "supabase" &&
    calendarBlockData.source === "supabase" &&
    dayInventory.source === "supabase";
  const canManageSelected = canManage && Boolean(selected?.databaseId);
  const canManageBlock = canManage && Boolean(selectedBlock?.databaseId);
  const selectedKey = selected ? getStaffBookingKey(selected) : "";
  const selectedBlockKey = selectedBlock?.databaseId ?? "";
  const flashParams = new URLSearchParams({ month: monthKey });
  if (error) {
    flashParams.set("error", error);
  }
  if (errorDetail) {
    flashParams.set("detail", errorDetail);
  }
  if (overlap) {
    flashParams.set("overlap", overlap);
  }
  if (saved) {
    flashParams.set("saved", saved);
  }
  if (created) {
    flashParams.set("created", created);
  }
  if (assignGuest) {
    flashParams.set("assignGuest", assignGuest);
  }
  if (assignUnit) {
    flashParams.set("assignUnit", assignUnit);
  }
  // Keep flash messages when closing the dialog; drop booking/block/room/date so the panel closes.
  const closeHref = `/staff/calendar?${flashParams.toString()}`;
  const dismissFlashHref = `/staff/calendar?month=${monthKey}`;
  const overlapMessage =
    error === "overlap"
      ? formatOverlapErrorMessage(parseOverlapDays(overlap))
      : null;
  const formErrorMessage = (() => {
    const base =
      error === "calendar-read-only"
        ? "Your account can view the calendar but not make changes."
        : error === "invalid-allotment"
          ? "Enter how many rooms to sell (0 or more)."
          : error === "invalid-name"
            ? "Enter the guest name before saving."
            : error === "invalid-phone"
              ? "Enter a valid phone number with at least 7 digits."
              : error === "invalid-email"
                ? "Enter a valid email address, or leave it blank."
                : error === "invalid-dates"
                  ? "Choose a stay between 1 and 21 nights."
                  : error === "invalid-room-number"
                    ? "That room number cannot be used for this room type."
                    : error === "room-number-taken"
                      ? "That room number is already assigned for overlapping dates."
                      : error === "room-unit-cache"
                        ? "Room assignment isn’t available right now. Ask whoever set up the site to refresh the connection."
                        : error === "room-unit-rpc"
                          ? "Room assignment isn’t set up yet. Ask whoever set up the site to finish the room-number setup."
                          : error === "room-unit-setup"
                            ? "Room numbers aren’t ready on this site yet. Ask whoever set up the site to finish setup."
                            : error === "save-failed"
                              ? "Could not save this reservation."
                              : overlapMessage;

    if (!base) {
      return null;
    }

    if (errorDetail && error !== "room-unit-rpc" && error !== "room-unit-cache" && error !== "room-unit-setup") {
      return `${base} ${errorDetail}`;
    }

    return base;
  })();
  const dayDialogOpen = Boolean(
    selectedRoom &&
      selectedDate &&
      !selected &&
      !selectedBlock &&
      mode !== "bulk-status" &&
      !isPastCalendarDate(selectedDate),
  );
  const dayStays =
    selectedRoom && selectedDate
      ? [
          ...calendarBookings
            .filter(
              (booking) =>
                booking.roomId === selectedRoom.id &&
                bookingOccupiesDay(booking, selectedDate),
            )
            .map((booking) => ({
              key: getStaffBookingKey(booking),
              href: `/staff/calendar?month=${monthKey}&booking=${encodeURIComponent(getStaffBookingKey(booking))}`,
              label: booking.guest,
              sublabel: booking.roomNumber
                ? `Room ${booking.roomNumber} · direct`
                : "Needs room # · direct",
            })),
          ...calendarBlocks
            .filter(
              (block) =>
                block.roomId === selectedRoom.id &&
                isChannelReservation(block) &&
                bookingOccupiesDay(
                  { arrivalDate: block.startDate, departureDate: block.endDate },
                  selectedDate,
                ),
            )
            .map((block) => ({
              key: block.databaseId ?? block.id,
              href: `/staff/calendar?month=${monthKey}&block=${encodeURIComponent(block.databaseId ?? block.id)}`,
              label: block.guestName || block.channelLabel || "Channel stay",
              sublabel: block.roomNumber
                ? `Room ${block.roomNumber} · ${block.channelLabel ?? "channel"}`
                : `Needs room # · ${block.channelLabel ?? "channel"}`,
            })),
        ]
      : [];
  const bulkStatusDialogOpen = Boolean(
    selectedRoom && mode === "bulk-status" && !selected && !selectedBlock,
  );
  const dialogOpen = Boolean(
    selected || selectedBlock || dayDialogOpen || bulkStatusDialogOpen,
  );
  // One live region only: page flash when no dialog; panel alert when a dialog is open.
  const pageFormError = dialogOpen ? null : formErrorMessage;
  const panelFormError = dialogOpen ? formErrorMessage : null;

  return (
    <main className="staff-shell">
      <StaffSidebar current="calendar" />

      <section className="staff-main staff-main--calendar" aria-labelledby="calendar-title">
        <div className="staff-header staff-header--calendar">
          <div>
            <h1 id="calendar-title">Calendar</h1>
          </div>
          <Link className="staff-header__quiet-link" href="/staff">
            Requests
          </Link>
        </div>

        {!canWriteCalendar ? (
          <p className="form-message form-message--setup" role="status">
            Viewing only — your staff email has read-only calendar access.
          </p>
        ) : null}
        {confirmedBookings.error ? (
          <p className="form-message form-message--error" role="alert">
            {confirmedBookings.error}
          </p>
        ) : null}
        {calendarBlockData.error ? (
          <p className="form-message form-message--error" role="alert">
            {calendarBlockData.error}
          </p>
        ) : null}
        {dayInventory.error ? (
          <p className="form-message form-message--error" role="alert">
            {dayInventory.error}
          </p>
        ) : null}
        {roomUnitsResult.error ? (
          <p className="form-message form-message--setup" role="status">
            {roomUnitsResult.error}
          </p>
        ) : null}
        {confirmedBookings.source === "sample" && !confirmedBookings.error ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables to show live confirmed bookings here.
          </p>
        ) : null}
        {pageFormError ? (
          <p className="form-message form-message--error" role="alert">
            {pageFormError}{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "1" ? (
          <p className="form-message form-message--success" role="status">
            Stay updated.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "room-assigned" ? (
          <p className="form-message form-message--success" role="status">
            {assignUnit
              ? `Assigned #${assignUnit}${assignGuest ? ` to ${assignGuest}` : ""}.`
              : "Room number assigned."}{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {created === "walk-in" ? (
          <p className="form-message form-message--success" role="status">
            Walk-in added to the calendar and marked checked in.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {created === "block" ? (
          <p className="form-message form-message--success" role="status">
            Room closure saved.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "bulk-status" ? (
          <p className="form-message form-message--success" role="status">
            Room availability updated for the selected range.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "allotment" ? (
          <p className="form-message form-message--success" role="status">
            Temporary allotment saved. Room settings default is unchanged.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "allotment-reset" ? (
          <p className="form-message form-message--success" role="status">
            Selected dates reset to the room default.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {icalSynced !== undefined ? (
          <p className="form-message form-message--success" role="status">
            OTA calendars refreshed
            {icalFeeds ? ` (${icalFeeds} feed${icalFeeds === "1" ? "" : "s"})` : ""}.{" "}
            {icalSynced} reservation{icalSynced === "1" ? "" : "s"} imported.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {icalError ? (
          <p className="form-message form-message--error" role="alert">
            OTA sync failed: {decodeURIComponent(icalError)}{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}

        <div className="calendar-board calendar-board--timeline">
          <StaffCalendarToolbar
            calendarColors={settings.calendarColors}
            canSyncOta={canManage}
            monthKey={monthKey}
            selectedBlockKey={selectedBlockKey || undefined}
            selectedBookingKey={selectedKey || undefined}
            stats={monthStats}
            unassignedCount={unassignedCount}
          />

          <CalendarGridGuide />

          <StaffTimelineCalendar
            blocks={calendarBlocks}
            bookings={calendarBookings}
            calendarColors={settings.calendarColors}
            calendarDays={calendarDays}
            canManage={canManage}
            currency={settings.currency}
            inventoryLookup={inventoryLookup}
            monthKey={monthKey}
            monthLabel={formatCalendarMonthLabel(year, month)}
            occupancies={unitOccupancies}
            promotions={promotions}
            roomUnits={roomUnits}
            rooms={rooms}
            selectedBlockKey={selectedBlockKey}
            selectedBookingKey={selectedKey}
            selectedDate={selectedDate}
            selectedRoomId={selectedRoom?.id}
          />
        </div>

        {selected ? (
          <CalendarBookingDialog
            closeHref={closeHref}
            focusReturnKey={selectedKey || undefined}
            open
            title={selected.guest}
          >
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
                  <dd>
                    {selected.room}
                    {selected.roomNumber ? ` · #${selected.roomNumber}` : " · Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt>Requested</dt>
                  <dd>{selected.requestedAt}</dd>
                </div>
                <div>
                  <dt>Paid in full</dt>
                  <dd>
                    {selected.depositPaid
                      ? formatMoneySuffix(selected.depositAmount, settings.currency)
                      : "Not received"}
                  </dd>
                </div>
                <div>
                  <dt>Current total</dt>
                  <dd>
                    {formatMoneySuffix(selected.estimatedTotal, settings.currency)} ·{" "}
                    {selected.nights} nights
                  </dd>
                </div>
              </dl>

              <CalendarBookingPanel
                key={selectedKey}
                arrivalDate={selected.arrivalDate}
                bookingKey={selectedKey}
                canCancelStay={selected.status === "confirmed"}
                canManage={
                  canManageSelected &&
                  (selected.status === "confirmed" ||
                    (selected.status === "awaiting" && selected.depositPaid))
                }
                databaseId={selected.databaseId ?? ""}
                departureDate={selected.departureDate}
                guestEmail={selected.contact}
                guestName={selected.guest}
                guestPhone={selected.phone}
                monthKey={monthKey}
                note={selected.note}
                occupancies={unitOccupancies}
                roomId={selected.roomId}
                roomUnitId={selected.roomUnitId}
                roomUnits={roomUnits}
                depositPaid={selected.depositPaid}
                formError={panelFormError}
                staffNote={selected.staffNote}
                stayStatus={selected.stayStatus}
              />

              <p className="detail-help">
                {selected.status === "awaiting" ? (
                  <>
                    This stay is reserved by payment. You can still assign a room
                    number here (including for past dates). Confirm the request
                    from the inbox when ready.
                  </>
                ) : (
                  <>
                    Assign a room number so the stay appears on the room-number
                    rows — this still works after the stay dates have passed.
                    Saving updates dates, total, and assignment. To remove the
                    stay, use Cancel stay — you will be asked to confirm.
                  </>
                )}
              </p>

              {selected.databaseId ? (
                <details className="staff-request-chat staff-request-chat--collapsible">
                  <summary className="staff-request-chat__title">Conversation</summary>
                  <BookingChat
                    bookingId={selected.databaseId}
                    disabled={!canManageSelected}
                    guestLabel={selected.guest}
                    readOnly={selected.status === "declined"}
                    showHeading={false}
                    variant="staff"
                  />
                </details>
              ) : null}
          </CalendarBookingDialog>
        ) : null}

        {selectedBlock ? (
          <CalendarBookingDialog
            closeHref={closeHref}
            focusReturnKey={selectedBlockKey || undefined}
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
              formError={panelFormError}
              monthKey={monthKey}
              occupancies={unitOccupancies}
              room={rooms.find((room) => room.id === selectedBlock.roomId)}
              roomUnits={roomUnits}
            />
          </CalendarBookingDialog>
        ) : null}

        {bulkStatusDialogOpen && selectedRoom ? (
          <CalendarBookingDialog
            closeHref={closeHref}
            open
            title={`Bulk edit availability · ${selectedRoom.name}`}
          >
            <CalendarBulkAvailabilityPanel
              canManage={canManage}
              error={error}
              monthKey={monthKey}
              room={selectedRoom}
            />
          </CalendarBookingDialog>
        ) : null}

        {dayDialogOpen && selectedRoom && selectedDate ? (
          <CalendarBookingDialog
            closeHref={closeHref}
            open
            title={`${selectedRoom.shortName} · ${selectedDate}`}
          >
            <CalendarDayPanel
              canManage={canManage}
              currentAllotment={
                selectedRoom && selectedDate
                  ? (inventoryLookup.get(`${selectedRoom.id}:${selectedDate}`) ??
                    selectedRoom.availableCount)
                  : 0
              }
              date={selectedDate}
              dayStays={dayStays}
              error={error}
              hasAllotmentOverride={Boolean(
                selectedRoom &&
                  selectedDate &&
                  inventoryLookup.has(`${selectedRoom.id}:${selectedDate}`),
              )}
              mode={mode}
              monthKey={monthKey}
              overlap={overlap}
              room={selectedRoom}
            />
          </CalendarBookingDialog>
        ) : null}
      </section>
    </main>
  );
}
