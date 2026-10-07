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

-- Content feedback: learner reports, the AI check, and fixes waiting for a human decision.
create table if not exists public.content_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ref text not null,                       -- e.g. drill:c01, mock:R1-1, gq:g01:2, word:d01-01
  route text,
  note text,
  snapshot jsonb,                          -- the item as the app had it
  status text not null default 'new',      -- proposed | needs_review | dismissed | accepted | rejected | revoked
  verdict jsonb,                           -- the AI check(s)
  patch jsonb,                             -- {"set":[{"path":"answer","value":"认为"}]}
  quarantine boolean not null default false,
  decided_at timestamptz,
  decision_note text
);
alter table public.content_reports enable row level security;   -- no policies: only the service role (the function) can touch it
revoke all on public.content_reports from public, anon, authenticated;
grant all on public.content_reports to service_role;
create index if not exists content_reports_status_idx on public.content_reports (status, id desc);

-- Progress backup: one row per phone. The id is a hash of the phone's restore code (the code itself is never stored).
create table if not exists public.learners (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rev integer not null default 1,           -- goes up by one on every save; used to notice a second phone
  data jsonb not null,                      -- the progress, exactly as the app exports it
  meta jsonb,                               -- {"xp":0,"streak":0,"words":0,"last":"2026-10-07"}
  summary jsonb,                            -- reserved: study summary for the weekly coach
  advice jsonb                              -- reserved: the last weekly advice
);
alter table public.learners enable row level security;   -- no policies: only the service role (the function) can touch it
revoke all on public.learners from public, anon, authenticated;
grant all on public.learners to service_role;
