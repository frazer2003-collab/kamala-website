-- Guest cancellation policy: full payment refund (>3 days); first night otherwise;
-- bank/card fees deducted from refunds.

alter table public.property_settings
  alter column cancellation_policy set default
  'Cancel more than 3 days before check-in for a full refund of your payment (not a partial deposit). Bank and card processing fees are deducted from the refunded amount. Within 3 days of check-in, the first night is non-refundable.';

update public.property_settings
set
  cancellation_policy =
    'Cancel more than 3 days before check-in for a full refund of your payment (not a partial deposit). Bank and card processing fees are deducted from the refunded amount. Within 3 days of check-in, the first night is non-refundable.',
  updated_at = now()
where id = 'default';
