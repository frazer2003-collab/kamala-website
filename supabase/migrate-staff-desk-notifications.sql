-- Staff desk notification feed (booking lifecycle + desk events).

create table if not exists public.staff_desk_notifications (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'kamala' check (length(trim(property_id)) > 0),
  kind text not null check (
    kind in (
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'booking_moved',
      'transfer_verify',
      'reply_needed',
      'refund_due',
      'checkout_hold',
      'trip_sold',
      'other'
    )
  ),
  title text not null check (length(trim(title)) > 0),
  body text not null default '',
  booking_id uuid,
  trip_sale_id uuid,
  stay_arrival date,
  stay_departure date,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_desk_notifications_property_created_idx
  on public.staff_desk_notifications (property_id, created_at desc);

create index if not exists staff_desk_notifications_unread_idx
  on public.staff_desk_notifications (property_id, created_at desc)
  where read_at is null;

alter table public.staff_desk_notifications enable row level security;

revoke all on table public.staff_desk_notifications from anon, authenticated;
grant all on table public.staff_desk_notifications to service_role;

comment on table public.staff_desk_notifications is
  'Staff notification feed for booking and desk events.';
