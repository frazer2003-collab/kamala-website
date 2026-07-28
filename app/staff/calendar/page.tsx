import Link from "next/link";
import { CalendarBulkAvailabilityPanel } from "@/components/calendar-bulk-availability-panel";
import { CalendarDayPanel } from "@/components/calendar-day-panel";
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
  isPastCalendarDate,
  parseStaffTimelineRange,
  dateRangeOverlapsBooking,
  bookingOccupiesDay,
} from "@/lib/calendar";
import { getCalendarMonthStats, countNetBookedForRoomDay } from "@/lib/calendar-timeline";
import {
  getConfirmedBookingById,
  getConfirmedBookings,
  getStaffBookingKey,
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
import { getNightlyRateDetails } from "@/lib/pricing";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRoomPromotions } from "@/lib/room-promotions";
import { getStaffRooms } from "@/lib/rooms";
import {
  attachRoomNumbers,
  getStaffRoomUnits,
  getTypeUnitIdSet,
  occupancyFromBooking,
  occupancyFromChannelBlock,
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
    saved?: string;
    created?: string;
    error?: string;
    overlap?: string;
    detail?: string;
    assignGuest?: string;
    assignUnit?: string;
    "ical-synced"?: string;
    "ical-feeds"?: string;
    "ical-failed"?: string;
    "ical-error"?: string;
    "ical-warning"?: string;
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
    saved,
    created,
    error,
    overlap,
    detail: errorDetail,
    assignGuest,
    assignUnit,
    "ical-synced": icalSynced,
    "ical-feeds": icalFeeds,
    "ical-failed": icalFailed,
    "ical-error": icalError,
    "ical-warning": icalWarning,
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
  const unassignedCount =
    calendarBookings.filter((booking) => !booking.roomUnitId).length +
    calendarBlocks.filter(
      (block) => isChannelReservation(block) && !block.roomUnitId,
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
          : error === "invalid-name"
            ? "Enter the guest name before saving."
            : error === "invalid-phone"
              ? "Enter a valid phone number with at least 7 digits, or leave phone blank."
              : error === "invalid-email"
                ? "Enter a valid email, or leave blank if the guest has no email."
                : error === "invalid-dates"
                  ? `Choose a stay between ${MIN_STAY_NIGHTS} and ${MAX_STAY_NIGHTS} nights.`
                  : error === "invalid-room-type"
                    ? "Choose a valid room type."
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
  const soldOutForSelectedNight =
    selectedRoom && selectedDate
      ? (() => {
          const roomsToSell =
            inventoryLookup.get(`${selectedRoom.id}:${selectedDate}`) ??
            selectedRoom.availableCount;
          const netBooked = countNetBookedForRoomDay({
            roomId: selectedRoom.id,
            iso: selectedDate,
            bookings: calendarBookings,
            channelBlocks: allAssignmentChannels.filter(isChannelReservation),
            typeUnitIds: getTypeUnitIdSet(roomUnits, selectedRoom.id),
          });
          return netBooked >= roomsToSell;
        })()
      : false;
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
              href: `/staff/calendar?month=${monthKey}&from=${fromIso}&to=${toIso}&booking=${encodeURIComponent(getStaffBookingKey(booking))}`,
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
              href: `/staff/calendar?month=${monthKey}&from=${fromIso}&to=${toIso}&block=${encodeURIComponent(block.databaseId ?? block.id)}`,
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
    <StaffShell current="calendar">
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
            New booking added to the calendar and marked checked in.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {confirmEmail === "failed" ? (
          <p className="form-message form-message--error" role="alert">
            Stay confirmed, but the guest confirmation email could not be sent.
            Reply in the conversation so they receive your message with their
            link.{" "}
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
        {dayRates.error ? (
          <p className="form-message form-message--error" role="alert">
            {dayRates.error}{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {icalSynced !== undefined && !icalFailed ? (
          <p className="form-message form-message--success" role="status">
            Channel calendars updated
            {icalFeeds ? ` (${icalFeeds} feed${icalFeeds === "1" ? "" : "s"})` : ""}.{" "}
            {icalSynced} stay{icalSynced === "1" ? "" : "s"} on the board. Check dates and room
            numbers.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {icalFailed ? (
          <p className="form-message form-message--error" role="alert">
            Channel sync partially finished: {icalSynced ?? "0"} stay
            {icalSynced === "1" ? "" : "s"} from {icalFeeds ?? "0"} feed
            {icalFeeds === "1" ? "" : "s"} updated; {icalFailed} feed
            {icalFailed === "1" ? "" : "s"} failed
            {icalError ? ` (${decodeURIComponent(icalError)})` : ""}. Try Sync again, or check
            the feed URLs under Settings → Calendars.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : icalError ? (
          <p className="form-message form-message--error" role="alert">
            Channel sync didn’t finish: {decodeURIComponent(icalError)}. Try Sync again, or check
            the feed URLs under Settings → Calendars.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}
        {icalWarning ? (
          <p className="form-message form-message--setup" role="status">
            Channel sync note: {decodeURIComponent(icalWarning)}. Existing stays were kept.{" "}
            <Link className="form-message__dismiss" href={dismissFlashHref}>
              Dismiss
            </Link>
          </p>
        ) : null}

        <CalendarStaySelectionProvider
          key={`${monthKey}:${fromIso}:${toIso}`}
          initialBlockKey={selectedBlockKey}
          initialBookingKey={selectedKey}
          monthKey={monthKey}
          fromIso={fromIso}
          toIso={toIso}
        >
          <div className="calendar-board calendar-board--timeline">
            <StaffCalendarToolbar
              calendarColors={settings.calendarColors}
              canSyncOta={canManage}
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

        {dayDialogOpen && selectedRoom && selectedDate ? (
          <CalendarBookingDialog
            closeHref={closeHref}
            open
            title={`${selectedRoom.shortName} · ${selectedDate}`}
          >
            <CalendarDayPanel
              canManage={mode === "rate" ? canManageRates : canManage}
              currentAllotment={
                selectedRoom && selectedDate
                  ? (inventoryLookup.get(`${selectedRoom.id}:${selectedDate}`) ??
                    selectedRoom.availableCount)
                  : 0
              }
              currentRate={
                selectedRoom && selectedDate
                  ? getNightlyRateDetails(
                      selectedRoom.id,
                      selectedDate,
                      selectedRoom.rate,
                      promotions,
                      rateLookup,
                    ).rate
                  : 0
              }
              currency={settings.currency}
              date={selectedDate}
              dayStays={dayStays}
              error={error}
              fromIso={fromIso}
              hasAllotmentOverride={Boolean(
                selectedRoom &&
                  selectedDate &&
                  inventoryLookup.has(`${selectedRoom.id}:${selectedDate}`),
              )}
              hasRateOverride={Boolean(
                selectedRoom &&
                  selectedDate &&
                  rateLookup.has(`${selectedRoom.id}:${selectedDate}`),
              )}
              mode={mode}
              monthKey={monthKey}
              toIso={toIso}
              overlap={overlap}
              promotions={promotions}
              rateOverrides={Object.fromEntries(rateLookup)}
              room={selectedRoom}
              soldOutForNight={soldOutForSelectedNight}
            />
          </CalendarBookingDialog>
        ) : null}
      </section>
    </StaffShell>
  );
}
