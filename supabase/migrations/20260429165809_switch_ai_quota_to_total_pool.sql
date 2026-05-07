-- Switch mini-program AI quota from a tiny daily allowance to a single free pool.
-- Existing daily counters are neutralized; remaining free usage comes from gift/pack/plan pools.

alter table public.ai_quota_accounts
  alter column daily_free_limit set default 0;

update public.ai_quota_accounts
set
  daily_free_limit = 0,
  daily_free_used = 0,
  updated_at = now()
where daily_free_limit <> 0
   or daily_free_used <> 0;
