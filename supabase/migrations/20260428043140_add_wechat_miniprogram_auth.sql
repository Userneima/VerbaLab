-- VerbaLab WeChat Mini Program auth schema.
-- These tables are accessed only by Edge Functions with the service role key.

create table if not exists public.wechat_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  openid text not null unique,
  unionid text unique,
  invite_id uuid references public.invites(id) on delete set null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists wechat_identities_user_idx
  on public.wechat_identities (user_id);

create index if not exists wechat_identities_invite_idx
  on public.wechat_identities (invite_id);

alter table public.wechat_identities enable row level security;

create table if not exists public.wechat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists wechat_sessions_user_expires_idx
  on public.wechat_sessions (user_id, expires_at desc);

create index if not exists wechat_sessions_token_hash_idx
  on public.wechat_sessions (token_hash);

alter table public.wechat_sessions enable row level security;

-- No anon/authenticated policies are created on purpose.
-- Edge Functions do all admin/auth checks server-side.
