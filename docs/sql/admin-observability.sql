-- VerbaLab admin observability schema.
-- Run this in the Supabase SQL Editor for project ztlrrovudbkmqqjaqhfu.
-- These tables are intentionally service-role accessed through Edge Functions.

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  invite_id uuid references public.invites(id) on delete set null,
  invite_code text,
  feature text not null,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  latency_ms integer,
  success boolean not null default true,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

create index if not exists ai_usage_events_feature_created_idx
  on public.ai_usage_events (feature, created_at desc);

create index if not exists ai_usage_events_invite_idx
  on public.ai_usage_events (invite_id);

alter table public.ai_usage_events enable row level security;

create table if not exists public.ai_usage_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_until timestamptz not null,
  reason text not null,
  trigger_event_id uuid references public.ai_usage_events(id) on delete set null,
  created_at timestamptz not null default now(),
  cleared_at timestamptz
);

create index if not exists ai_usage_blocks_user_active_idx
  on public.ai_usage_blocks (user_id, blocked_until desc)
  where cleared_at is null;

alter table public.ai_usage_blocks enable row level security;

create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'warning',
  type text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists admin_alerts_status_created_idx
  on public.admin_alerts (status, created_at desc);

create index if not exists admin_alerts_user_created_idx
  on public.admin_alerts (user_id, created_at desc);

alter table public.admin_alerts enable row level security;

create table if not exists public.product_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  surface text,
  object_type text,
  object_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_usage_events_user_created_idx
  on public.product_usage_events (user_id, created_at desc);

create index if not exists product_usage_events_name_created_idx
  on public.product_usage_events (event_name, created_at desc);

alter table public.product_usage_events enable row level security;

-- No anon/authenticated policies are created on purpose.
-- Edge Functions use the service role key after server-side admin/auth checks.
