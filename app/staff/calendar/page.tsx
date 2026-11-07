import Link from "next/link";
import { CalendarBulkAvailabilityPanel } from "@/components/calendar-bulk-availability-panel";
import { CalendarDayDialogs } from "@/components/calendar-day-dialogs";
import { CalendarBookingDialog, StaffTimelineCalendar } from "@/components/staff-lazy";
import { CalendarDateStrip } from "@/components/calendar-date-strip";
import { CalendarStayDialogs } from "@/components/calendar-stay-dialogs";
import { CalendarStaySelectionProvider } from "@/components/calendar-stay-selection";
import { StaffCalendarToolbar } from "@/components/staff-calendar-toolbar";
import { StaffShell } from "@/components/staff-shell";
import {
  buildCalendarDays,
  buildStaffTimelineDays,
  formatCalendarMonthLabel,
  parseStaffTimelineRange,
  dateRangeOverlapsBooking,
} from "@/lib/calendar";
import { getCalendarMonthStats } from "@/lib/calendar-timeline";
import {
  getConfirmedBookingById,
  getConfirmedBookings,
  getStaffBookingKey,
  getStaffBookingRequests,
  isInventoryHoldBooking,
  openRequestsHref,
  openRequestsWarningCopy,
  summarizeOpenRequests,
} from "@/lib/booking-requests";
import { MAX_STAY_NIGHTS, MIN_STAY_NIGHTS } from "@/lib/stay-dates";
import {
  getRoomBlockById,
  getStaffCalendarBlocks,
  getStaffRoomBlockKey,
  isChannelReservation,
} from "@/lib/room-blocks";
import {
  buildInventoryLookup,
  getRoomDayInventoryForMonth,
} from "@/lib/room-day-inventory";
import {
  buildRateLookup,
  getRoomDayRatesForMonth,
} from "@/lib/room-day-rates";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRoomPromotions } from "@/lib/room-promotions";
import { getStaffRooms } from "@/lib/rooms";
import {
  attachRoomNumbers,
  getKnownUnitIdSet,
  getRoomUnitById,
  getStaffRoomUnits,
  occupancyFromBooking,
  occupancyFromChannelBlock,
  stayNeedsRoomAssignment,
} from "@/lib/room-units";
import {
  requireStaffSessionDetails,
  staffCanWriteCalendar,
} from "@/lib/staff-auth";
import {
  formatOverlapErrorMessage,
  parseOverlapDays,
} from "@/lib/stay-overlap";

export const dynamic = "force-dynamic";

export default async function StaffCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    through?: string;
    from?: string;
    to?: string;
    booking?: string;
    block?: string;
    room?: string;
    date?: string;
    mode?: string;
    unit?: string;
    saved?: string;
    created?: string;
    error?: string;
    overlap?: string;
    detail?: string;
    assignGuest?: string;
    assignUnit?: string;
    refund?: string;
    removed?: string;
    conversation?: string;
    "confirm-email"?: string;
  }>;
}) {
  const staffSession = await requireStaffSessionDetails();

  const {
    month: monthParam,
    through: throughParam,
    from: fromParam,
    to: toParam,
    booking: selectedBookingId,
    block: selectedBlockId,
    room: selectedRoomId,
    date: selectedDate,
    mode,
    unit: selectedUnitId,
    saved,
    created,
    error,
    overlap,
    detail: errorDetail,
    assignGuest,
    assignUnit,
    refund,
    removed,
    conversation,
    "confirm-email": confirmEmail,
  } = await searchParams;
  const timelineRange = parseStaffTimelineRange({
    month: monthParam,
    through: throughParam,
    from: fromParam,
    to: toParam,
  });
  const { year, month } = timelineRange.start;
  const monthKey = timelineRange.monthKey;
  const fromIso = timelineRange.fromIso;
  const toIso = timelineRange.toIso;
  const boardFromIso = timelineRange.boardFromIso;
  const boardToIso = timelineRange.boardToIso;
  const statsCalendarDays = buildCalendarDays(year, month);
  const calendarDays = buildStaffTimelineDays(boardFromIso, boardToIso);
  const [
    confirmedBookingsParts,
    calendarBlockParts,
    dayInventoryParts,
    dayRatesParts,
    rooms,
    settings,
    promotions,
    roomUnitsResult,
    openRequests,
  ] = await Promise.all([
    Promise.all(
      timelineRange.months.map((entry) =>
        getConfirmedBookings({ year: entry.year, month: entry.month }),
      ),
    ),
    Promise.all(
      timelineRange.months.map((entry) =>
        getStaffCalendarBlocks({ year: entry.year, month: entry.month }),
      ),
    ),
    Promise.all(
      timelineRange.months.map((entry) =>
        getRoomDayInventoryForMonth({ year: entry.year, month: entry.month }),
      ),
    ),
    Promise.all(
      timelineRange.months.map((entry) =>
        getRoomDayRatesForMonth({ year: entry.year, month: entry.month }),
      ),
    ),
    getStaffRooms(),
    getPropertySettings(),
    getStaffRoomPromotions(),
    getStaffRoomUnits(),
    getStaffBookingRequests(),
  ]);

  const allPartsSupabase = <T extends { source: string }>(parts: T[]) =>
    parts.length > 0 && parts.every((part) => part.source === "supabase");

  const confirmedBookings = {
    bookings: Array.from(
      new Map(
        confirmedBookingsParts
          .flatMap((part) => part.bookings)
          .map((booking) => [getStaffBookingKey(booking), booking] as const),
      ).values(),
    ),
    source: allPartsSupabase(confirmedBookingsParts)
      ? ("supabase" as const)
      : ("sample" as const),
    error: confirmedBookingsParts.find((part) => part.error)?.error ?? null,
  };
  const calendarBlockData = {
    monthBlocks: Array.from(
      new Map(
        calendarBlockParts
          .flatMap((part) => part.monthBlocks)
          .map((block) => [getStaffRoomBlockKey(block), block] as const),
      ).values(),
    ),
    channelBlocks: Array.from(
      new Map(
        calendarBlockParts
          .flatMap((part) => part.channelBlocks)
          .map((block) => [getStaffRoomBlockKey(block), block] as const),
      ).values(),
    ),
    source: allPartsSupabase(calendarBlockParts)
      ? ("supabase" as const)
      : ("sample" as const),
    error: calendarBlockParts.find((part) => part.error)?.error ?? null,
  };
  const dayInventory = {
    entries: dayInventoryParts.flatMap((part) => part.entries),
    source: allPartsSupabase(dayInventoryParts)
      ? ("supabase" as const)
      : ("sample" as const),
    error: dayInventoryParts.find((part) => part.error)?.error ?? null,
  };
  const dayRates = {
    entries: dayRatesParts.flatMap((part) => part.entries),
    source: allPartsSupabase(dayRatesParts)
      ? ("supabase" as const)
      : ("sample" as const),
    error: dayRatesParts.find((part) => part.error)?.error ?? null,
  };

  const roomUnits = roomUnitsResult.units;
  const selectedDoorUnit = getRoomUnitById(roomUnits, selectedUnitId);
  const allAssignmentBookings = attachRoomNumbers(confirmedBookings.bookings, roomUnits);
  const calendarBookings = allAssignmentBookings.filter((booking) =>
    dateRangeOverlapsBooking(booking, boardFromIso, boardToIso),
  );
  const calendarBlocks = attachRoomNumbers(calendarBlockData.monthBlocks, roomUnits);
  const allAssignmentChannels = attachRoomNumbers(calendarBlockData.channelBlocks, roomUnits);
  const unitOccupancies = [
    ...allAssignmentBookings.map(occupancyFromBooking),
    ...allAssignmentChannels.map(occupancyFromChannelBlock),
  ];
  const inventoryLookup = buildInventoryLookup(dayInventory.entries);
  const rateLookup = buildRateLookup(dayRates.entries);
  const knownUnitIds = getKnownUnitIdSet(roomUnits);
  const unassignedCount =
    calendarBookings.filter((booking) =>
      stayNeedsRoomAssignment(booking, knownUnitIds),
    ).length +
    calendarBlocks.filter(
      (block) =>
        isChannelReservation(block) &&
        stayNeedsRoomAssignment(block, knownUnitIds),
    ).length;
  const monthStats = getCalendarMonthStats({
    bookings: calendarBookings,
    blocks: calendarBlocks,
    calendarDays: statsCalendarDays,
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
  const canManageRates = canManage && dayRates.source === "supabase";
  const selectedKey = selected ? getStaffBookingKey(selected) : "";
  const selectedBlockKey = selectedBlock ? getStaffRoomBlockKey(selectedBlock) : "";
  const flashParams = new URLSearchParams({
    month: monthKey,
    from: fromIso,
    to: toIso,
  });
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
  if (refund) {
    flashParams.set("refund", refund);
  }
  if (removed) {
    flashParams.set("removed", removed);
  }
  // Keep flash messages when closing the dialog; drop booking/block/room/date so the panel closes.
  const closeHref = `/staff/calendar?${flashParams.toString()}`;
  const dismissFlashHref = `/staff/calendar?month=${monthKey}&from=${fromIso}&to=${toIso}`;
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
          : error === "invalid-rate"
            ? "Enter a valid nightly rate (0 or more)."
          : error === "invalid-custom-total"
            ? "Enter a stay total of 0 or more, or leave blank to use the usual rate for these dates."
          : error === "invalid-source"
            ? "Choose a booking source."
          : error === "payment-method"
            ? "Choose Cash or Thai bank when marking Paid (not needed for Airbnb, Booking.com, or Expedia)."
          : error === "cancel-reason"
            ? "Choose whether this is a cancellation or a no-show before removing the stay."
          : error === "refund-failed"
            ? "The card refund did not go through, so the stay is still on the calendar. Check the payment in Stripe, then try again."
          : error === "invalid-name"
            ? "Enter the guest name before saving."
            : error === "invalid-phone"
              ? "Enter a valid phone number with at least 7 digits, or leave phone blank."
              : error === "invalid-email"
                ? "Enter a valid email, or leave blank if the guest has no email."
                : error === "conversation-token"
                  ? "Guest email was saved, but the conversation link could not be created. Try saving again."
                : error === "invalid-dates"
                  ? `Choose a stay between ${MIN_STAY_NIGHTS} and ${MAX_STAY_NIGHTS} nights.`
                  : error === "invalid-room-type"
                    ? "Choose a valid room type."
                    : error === "invalid-room-number"
                      ? "That room number cannot be used for this room type."
                      : error === "room-number-taken"
                        ? "That room number is already assigned for overlapping dates."
                        : error === "invalid-stay"
                          ? "Confirm this bank transfer in Transfers before assigning a room."
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
      mode !== "bulk-status",
  );
  const bulkStatusDialogOpen = Boolean(
    selectedRoom && mode === "bulk-status" && !selected && !selectedBlock,
  );
  const dialogOpen = Boolean(
    selected || selectedBlock || dayDialogOpen || bulkStatusDialogOpen,
  );
  // One live region only: page flash when no dialog; panel alert when a dialog is open.
  const pageFormError = dialogOpen ? null : formErrorMessage;
  const panelFormError = dialogOpen ? formErrorMessage : null;
  const openRequestsSummary = summarizeOpenRequests(openRequests.bookings);
  const openRequestsWarning = openRequestsWarningCopy(openRequestsSummary);
  const openRequestsLink = openRequestsHref(openRequestsSummary);

  return (
    <StaffShell current="calendar">
      <section className="staff-main staff-main--calendar" aria-labelledby="calendar-title">
        <div className="staff-header staff-header--calendar">
          <div>
            <h1 id="calendar-title">Calendar</h1>
          </div>
          <Link className="staff-header__quiet-link" href="/staff/home">
            Home
          </Link>
        </div>

        {openRequestsWarning ? (
          <p className="form-message form-message--warning" role="status">
            {openRequestsWarning}{" "}
            <Link className="staff-header__quiet-link" href={openRequestsLink}>
              Open Transfers
            </Link>
          </p>
        ) : null}

        {!canWriteCalendar ? (
          <p className="form-message form-message--setup" role="status">
            Viewing only — read-only access.
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
            Add Supabase env vars for live bookings.
          </p>
        ) : null}
        {refund === "card" ? (
          <p className="form-message form-message--success" role="status">
            Card refund started for the stay. The 6% bank charge stays with the
            guesthouse. The guest usually sees the refund in 5 to 10 business
            days. Staff have been emailed.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {refund === "card-already" ? (
          <p className="form-message form-message--success" role="status">
            This card payment was already refunded. The guest usually sees it in
            5 to 10 business days. The stay is now off the calendar.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {refund === "bank" ? (
          <p className="form-message form-message--success" role="status">
            Stay cancelled. Staff have been emailed to send the bank transfer.
            Once it is sent, it usually arrives the same day, or the next
            business day if it goes out after bank hours.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {removed === "1" ? (
          <p className="form-message form-message--success" role="status">
            Unpaid stay deleted. It is gone from the calendar and from history —
            you can create the booking again.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
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
            Stay saved.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "room-assigned" ? (
          <p className="form-message form-message--success" role="status">
            {assignUnit
              ? `Assigned #${assignUnit}${assignGuest ? ` to ${assignGuest}` : ""}.`
              : "Assigned."}{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "door-drop" ? (
          <p className="form-message form-message--success" role="status">
            Door updated.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {created === "walk-in" ? (
          <p className="form-message form-message--success" role="status">
            Booking added.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {confirmEmail === "failed" ? (
          <p className="form-message form-message--error" role="alert">
            Stay confirmed; email failed. Reply in chat.{" "}
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
        {saved === "rate" ? (
          <p className="form-message form-message--success" role="status">
            Temporary rate saved. Room settings default is unchanged.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "rate-reset" ? (
          <p className="form-message form-message--success" role="status">
            Selected dates reset to the default or promo rate.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "bulk-rate" ? (
          <p className="form-message form-message--success" role="status">
            Temporary rate saved for every room type. Defaults are unchanged.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "bulk-rate-reset" ? (
          <p className="form-message form-message--success" role="status">
            Rates for every room type reset to default or promo.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "bulk-allotment" ? (
          <p className="form-message form-message--success" role="status">
            Temporary allotment saved for every room type. Defaults are
            unchanged.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {saved === "bulk-allotment-reset" ? (
          <p className="form-message form-message--success" role="status">
            Allotment for every room type reset to each type’s default.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {dayRates.error ? (
          <p className="form-message form-message--error" role="alert">
            {dayRates.error}{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}

        <CalendarStaySelectionProvider
          key={`${monthKey}:${fromIso}:${toIso}`}
          initialBlockKey={selectedBlockKey}
          initialBookingKey={selectedKey}
          initialDayDate={dayDialogOpen ? (selectedDate ?? "") : ""}
          initialDayMode={dayDialogOpen ? (mode ?? "") : ""}
          initialDayRoomId={dayDialogOpen ? (selectedRoom?.id ?? "") : ""}
          initialDayUnitId={
            dayDialogOpen ? (selectedDoorUnit?.id ?? selectedUnitId ?? "") : ""
          }
          monthKey={monthKey}
          fromIso={fromIso}
          toIso={toIso}
        >
          <div className="calendar-board calendar-board--timeline">
            <StaffCalendarToolbar
              calendarColors={settings.calendarColors}
              fromIso={fromIso}
              monthKey={monthKey}
              selectedBlockKey={selectedBlockKey || undefined}
              selectedBookingKey={selectedKey || undefined}
              stats={monthStats}
              toIso={toIso}
              unassignedCount={unassignedCount}
            />

            <CalendarDateStrip
              fromIso={fromIso}
              selectedBlockKey={selectedBlockKey || undefined}
              selectedBookingKey={selectedKey || undefined}
              toIso={toIso}
            />

            <StaffTimelineCalendar
              allotmentOverrideKeys={Array.from(inventoryLookup.keys())}
              blocks={calendarBlocks}
              bookings={calendarBookings}
              calendarColors={settings.calendarColors}
              calendarDays={calendarDays}
              canManage={canManage}
              monthKey={monthKey}
              fromIso={fromIso}
              toIso={toIso}
              monthLabel={formatCalendarMonthLabel(year, month)}
              occupancies={unitOccupancies}
              rateOverrideKeys={Array.from(rateLookup.keys())}
              roomUnits={roomUnits}
              rooms={rooms}
              selectedBlockKey={selectedBlockKey}
              selectedBookingKey={selectedKey}
              selectedDate={selectedDate}
              selectedRoomId={selectedRoom?.id}
            />
          </div>

          <CalendarStayDialogs
            autoOpenConversation={conversation === "1"}
            blocks={calendarBlocks}
            bookings={calendarBookings}
            canManage={canManage}
            currency={settings.currency}
            formError={panelFormError}
            fromIso={fromIso}
            monthKey={monthKey}
            toIso={toIso}
            occupancies={unitOccupancies}
            promotions={promotions}
            rateOverrides={Object.fromEntries(rateLookup)}
            roomUnits={roomUnits}
            rooms={rooms}
            seedBlock={selectedBlock}
            seedBooking={selected}
          />

          <CalendarDayDialogs
            blocks={calendarBlocks}
            bookings={calendarBookings}
            canManage={canManage}
            canManageRates={canManageRates}
            currency={settings.currency}
            formError={panelFormError}
            fromIso={fromIso}
            inventoryByKey={Object.fromEntries(inventoryLookup)}
            knownUnitIds={Array.from(knownUnitIds)}
            monthKey={monthKey}
            overlap={overlap}
            promotions={promotions}
            rateOverrides={Object.fromEntries(rateLookup)}
            roomUnits={roomUnits}
            rooms={rooms}
            toIso={toIso}
          />
        </CalendarStaySelectionProvider>

        {bulkStatusDialogOpen && selectedRoom ? (
          <CalendarBookingDialog
            closeHref={closeHref}
            open
            title={`Bulk edit availability · ${selectedRoom.name}`}
          >
            <CalendarBulkAvailabilityPanel
              canManage={canManage}
              error={error}
              fromIso={fromIso}
              monthKey={monthKey}
              room={selectedRoom}
              toIso={toIso}
            />
          </CalendarBookingDialog>
        ) : null}
      </section>
    </StaffShell>
  );
}
