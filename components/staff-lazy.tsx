import dynamic from "next/dynamic";

function CalendarLoadingFallback() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="staff-calendar-skeleton"
    >
      <p>Loading calendar…</p>
    </div>
  );
}

export const StaffTimelineCalendar = dynamic(
  () =>
    import("@/components/staff-timeline-calendar").then(
      (module) => module.StaffTimelineCalendar,
    ),
  { loading: CalendarLoadingFallback },
);

export const CalendarBookingDialog = dynamic(
  () =>
    import("@/components/calendar-booking-dialog").then(
      (module) => module.CalendarBookingDialog,
    ),
);

export const BookingChat = dynamic(
  () => import("@/components/booking-chat").then((module) => module.BookingChat),
  {
    loading: () => (
      <p className="booking-summary__hint" aria-live="polite">
        Loading messages…
      </p>
    ),
  },
);
