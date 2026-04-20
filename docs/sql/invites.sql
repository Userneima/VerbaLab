create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  used_at timestamptz null,
  used_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  note text null
);

create or replace function public.normalize_invite_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.code := upper(btrim(new.code));
  return new;
end;
$$;

drop trigger if exists normalize_invite_code_before_write on public.invites;

create trigger normalize_invite_code_before_write
before insert or update on public.invites
for each row
execute function public.normalize_invite_code();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invites_code_not_blank'
      and conrelid = 'public.invites'::regclass
  ) then
    alter table public.invites
      add constraint invites_code_not_blank
      check (char_length(btrim(code)) > 0);
  end if;
end $$;

create unique index if not exists invites_code_key on public.invites (code);

alter table public.invites enable row level security;

revoke all on public.invites from anon, authenticated;
