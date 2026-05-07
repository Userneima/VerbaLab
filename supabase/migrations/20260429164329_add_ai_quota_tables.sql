-- VerbaLab AI quota ledger for mini-program commercialization.
-- Frontend clients must not read/write these tables directly; all access goes through Edge Functions.

create table if not exists public.ai_quota_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_date date not null default current_date,
  daily_free_limit integer not null default 3 check (daily_free_limit >= 0),
  daily_free_used integer not null default 0 check (daily_free_used >= 0),
  gift_remaining integer not null default 30 check (gift_remaining >= 0),
  pack_remaining integer not null default 0 check (pack_remaining >= 0),
  plan_type text not null default 'free' check (plan_type in ('free', 'monthly', 'yearly')),
  plan_monthly_limit integer not null default 0 check (plan_monthly_limit >= 0),
  plan_monthly_used integer not null default 0 check (plan_monthly_used >= 0),
  plan_period text not null default to_char(now(), 'YYYY-MM'),
  plan_expires_at timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_quota_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text null,
  label text not null,
  delta integer not null,
  source text not null default 'system',
  created_by uuid null references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_quota_events_user_created_idx
  on public.ai_quota_events (user_id, created_at desc);

alter table public.ai_quota_accounts enable row level security;
alter table public.ai_quota_events enable row level security;

-- Intentionally no anon/authenticated policies.
-- Service-role Edge Functions are the only intended access path.
