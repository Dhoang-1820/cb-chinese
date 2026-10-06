-- C&B Chinese AI helper: daily usage counter.
-- Run once in Supabase → SQL Editor → New query → paste → Run.

create table if not exists public.ai_usage (
  day date primary key,
  n   integer not null default 0
);

-- Nobody can read or write the table from the browser: row level security on, no policies.
alter table public.ai_usage enable row level security;

-- Adds one call to today's total and returns the new count; returns -1 (and does not count) when the cap is reached.
create or replace function public.bump_ai_usage(cap integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare c integer;
begin
  insert into public.ai_usage as u (day, n) values (current_date, 1)
  on conflict (day) do update set n = u.n + 1
  returning u.n into c;
  if c > cap then
    update public.ai_usage set n = n - 1 where day = current_date;
    return -1;
  end if;
  return c;
end;
$$;

-- Only the Edge Function (service role) may call it.
revoke all on function public.bump_ai_usage(integer) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(integer) to service_role;
