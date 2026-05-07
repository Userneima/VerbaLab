-- Increase the first-run free AI generation pool from 30 to 100.
-- Existing accounts that still have less than 100 gifted/free uses receive a one-time top-up.

alter table public.ai_quota_accounts
  alter column gift_remaining set default 100;

insert into public.ai_quota_events (user_id, label, delta, source, metadata)
select
  user_id,
  '免费额度升级到 100 次',
  100 - gift_remaining,
  'system',
  jsonb_build_object('reason', 'increase_free_pool_to_100')
from public.ai_quota_accounts
where gift_remaining < 100;

update public.ai_quota_accounts
set
  gift_remaining = greatest(gift_remaining, 100),
  updated_at = now()
where gift_remaining < 100;
