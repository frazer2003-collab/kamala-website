-- Upgrade existing Kamala databases from status labels to room counts.

alter table public.rooms add column if not exists available_count integer;

update public.rooms
set available_count = case status
  when 'available' then 2
  when 'limited' then 1
  when 'requested' then 0
  else 1
end
where available_count is null;

alter table public.rooms alter column available_count set default 1;
alter table public.rooms alter column available_count set not null;
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms drop column if exists status;
alter table public.rooms drop constraint if exists rooms_available_count_check;
alter table public.rooms add constraint rooms_available_count_check check (available_count >= 0);
