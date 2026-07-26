-- Staff booking source labels for website stays and channel reservations.
-- Channel staff overrides are preserved across iCal sync (like guest fields).

alter table public.booking_requests
  add column if not exists booking_source text
  check (
    booking_source is null
    or booking_source in ('walk-in', 'airbnb', 'expedia', 'booking')
  );

alter table public.room_blocks
  add column if not exists staff_booking_source text
  check (
    staff_booking_source is null
    or staff_booking_source in ('walk-in', 'airbnb', 'expedia', 'booking')
  );

comment on column public.booking_requests.booking_source is
  'Staff label: walk-in, airbnb, expedia, or booking (Booking.com).';

comment on column public.room_blocks.staff_booking_source is
  'Staff override for channel/closure source; preserved across iCal sync.';
