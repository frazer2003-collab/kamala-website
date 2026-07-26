-- Run in Supabase SQL editor before using bank transfer checkout.

-- property_settings: Thai bank / PromptPay instructions
alter table public.property_settings
  add column if not exists promptpay_id text,
  add column if not exists bank_name text,
  add column if not exists account_name text,
  add column if not exists account_number text;

-- booking_requests: guest claimed bank transfer (not yet staff-verified paid)
alter table public.booking_requests
  add column if not exists bank_transfer_claimed_at timestamptz;
