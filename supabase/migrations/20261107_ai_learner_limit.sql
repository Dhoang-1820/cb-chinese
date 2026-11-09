-- Per-learner daily AI limit (claude/ai-fallback). NOT applied automatically: run it once in Supabase → SQL Editor
-- (see docs/deploy-ai-fallback.md). Safe to run twice. The Edge Function works without it (memory count per instance).

-- One row per learner per day. learner = "l:<hash of restore code>" or "d:<hash of device id>"; never the code itself.
create table if not exists public.ai_usage_learner (
  day date not null default current_date,
  learner text not null check (char_length(learner) between 3 and 80),
  n integer not null default 0,
  primary key (day, learner)
);
alter table public.ai_usage_learner enable row level security; -- no policies: only the service role (the Edge Function)

-- Counts one call for this learner and one in today's total (public.ai_usage, which the admin screen already reads).
-- Returns {"mine": n, "total": t}; mine = -2 when the overall cap is reached, -1 when this learner's cap is reached.
-- Nothing is counted when a cap stops the call. Rows older than 35 days are removed as it goes.
create or replace function public.bump_ai_usage_learner(learner text, cap integer, total_cap integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare t integer; c integer;
begin
  insert into public.ai_usage as u (day, n) values (current_date, 1)
  on conflict (day) do update set n = u.n + 1
  returning u.n into t;
  if t > total_cap then
    update public.ai_usage set n = n - 1 where day = current_date;
    return jsonb_build_object('mine', -2, 'total', t - 1);
  end if;
  insert into public.ai_usage_learner as l (day, learner, n) values (current_date, bump_ai_usage_learner.learner, 1)
  on conflict (day, learner) do update set n = l.n + 1
  returning l.n into c;
  if c > cap then
    update public.ai_usage_learner set n = n - 1 where day = current_date and ai_usage_learner.learner = bump_ai_usage_learner.learner;
    update public.ai_usage set n = n - 1 where day = current_date;
    return jsonb_build_object('mine', -1, 'total', t - 1);
  end if;
  delete from public.ai_usage_learner where day < current_date - 35;
  return jsonb_build_object('mine', c, 'total', t);
end;
$$;

revoke all on function public.bump_ai_usage_learner(text, integer, integer) from public, anon, authenticated;
grant execute on function public.bump_ai_usage_learner(text, integer, integer) to service_role;
