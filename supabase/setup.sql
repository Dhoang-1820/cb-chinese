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

-- Teacher chat. Phones reach only their own messages through the function (restore code); the admin reaches all (admin code).
-- learners.last_open / client: when the app was last open and what the phone said about itself (version, backup on/off/paused/err).
alter table public.learners add column if not exists last_open timestamptz;
alter table public.learners add column if not exists client jsonb;
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  learner text not null references public.learners(id) on delete cascade,
  sender text not null check (sender in ('admin', 'learner')),
  body text not null default '' check (char_length(body) <= 1000),
  action jsonb,                             -- optional button: {"label":"Reading part 1, timed","href":"#/parts/R1"}
  created_at timestamptz not null default now(),
  seen_at timestamptz                       -- when the other side read it
);
create index if not exists messages_learner_id on public.messages (learner, id);
alter table public.messages enable row level security;   -- no policies: only the service role (the function) can touch it
revoke all on public.messages from public, anon, authenticated;
grant all on public.messages to service_role;

-- Shared question bank: AI practice questions wait as 'pending' until the admin approves them; approved ones are
-- served to every learner first and get recorded audio in the next deploy.
create table if not exists public.bank_items (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('fill', 'order', 'listen', 'passage')),
  part text not null default '',
  skill text not null default '',
  data jsonb not null,
  hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists bank_items_status_id on public.bank_items (status, id);
alter table public.bank_items enable row level security;   -- no policies: only the service role (the function) can touch it
revoke all on public.bank_items from public, anon, authenticated;
grant all on public.bank_items to service_role;

-- Optional Google sign-in: a Supabase Auth user id linked to a phone's restore code (no email is kept here).
create table if not exists public.auth_links (
  uid uuid primary key,
  code text not null,
  learner text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.auth_links enable row level security;   -- no policies: only the service role (the function) can touch it
revoke all on public.auth_links from public, anon, authenticated;
grant all on public.auth_links to service_role;

-- One-time sign-in tickets (15 minutes): the phone starts sign-in with one, the page Google returns to finishes it.
create table if not exists public.auth_tickets (
  ticket text primary key,
  intent text not null check (intent in ('link', 'get')),
  code text not null default '',
  uid uuid,
  result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists auth_tickets_created on public.auth_tickets (created_at);
alter table public.auth_tickets enable row level security;   -- no policies: only the service role (the function) can touch it
revoke all on public.auth_tickets from public, anon, authenticated;
grant all on public.auth_tickets to service_role;
