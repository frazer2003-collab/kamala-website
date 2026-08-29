-- Guest cancellation policy: full refund more than 3 days before check-in;
-- first night non-refundable otherwise.

alter table public.property_settings
  alter column cancellation_policy set default
  'Cancel more than 3 days before check-in for a 100% refund. Otherwise, the first night is non-refundable.';

update public.property_settings
set
  cancellation_policy =
    'Cancel more than 3 days before check-in for a 100% refund. Otherwise, the first night is non-refundable.',
  updated_at = now()
where id = 'default';
