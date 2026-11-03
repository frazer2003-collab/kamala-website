-- AI search visibility: assistant visits, weekly question tests, and guest "found us via".

create table if not exists public.ai_visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('answer', 'index', 'training', 'referral')),
  source text not null,
  agent text,
  path text not null,
  query text,
  referrer_host text,
  country text,
  user_agent text
);

create index if not exists ai_visits_created_at_idx on public.ai_visits (created_at desc);

alter table public.ai_visits enable row level security;

create table if not exists public.ai_visibility_checks (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  prompt text not null,
  locale text not null default 'en',
  model text not null,
  mentioned boolean not null default false,
  cited boolean not null default false,
  cited_domains text[] not null default '{}',
  answer_excerpt text,
  error text
);

create index if not exists ai_visibility_checks_prompt_idx
  on public.ai_visibility_checks (prompt, checked_at desc);

alter table public.ai_visibility_checks enable row level security;

alter table public.booking_requests
  add column if not exists found_via text,
  add column if not exists found_via_detail text;
