# Deploying the AI fallback and the per-learner limit

Branch `claude/ai-fallback`. Nothing here was deployed or applied: these are the steps for you. Do them in this order;
each step is safe on its own, so the app keeps working if you stop halfway.

## What changes

- **Backup provider.** When both Gemini models fail (timeout, 429, 5xx, or a rejected key), the function now tries
  Groq once (one retry on unusable JSON). It only does this when the secret `GROQ_API_KEY` exists; without it,
  nothing changes.
- **Per-learner daily limit.** Each phone sends an `x-learner` header: its restore code if it has a cloud backup,
  otherwise a random id made on that phone. The function stores only a hash. Default 40 AI calls per learner per day
  (`AI_LEARNER_CAP`), on top of the existing overall cap (`AI_DAILY_CAP`, default 150). A learner over the limit sees
  "You have used your AI questions for today. They come back tomorrow." Older app versions send no id and count only
  against the overall cap.

## Steps

### 1. Merge the PR
Merge `claude/ai-fallback` into `main` as usual. The web app deploys by itself (GitHub Pages); phones start sending
`x-learner`. The current server ignores the header, so nothing breaks before step 4.

### 2. Run the SQL migration (once)
1. Supabase dashboard → project **cb-chinese-2** → **SQL Editor** → **New query**.
2. Paste the whole content of `supabase/migrations/20261107_ai_learner_limit.sql`.
3. **Run**. Expected result: "Success. No rows returned".
4. Check: **Table Editor** shows a new table `ai_usage_learner` (empty).

It is safe to run twice. Until it is run, the function counts each learner in memory (per server instance, reset when
the instance restarts), so the limit is softer but still there.

### 3. Add the Groq key (optional but recommended)
1. Create a key at <https://console.groq.com/keys> (free tier is enough to start).
2. Supabase → **Edge Functions** → **Secrets** → **Add new secret**: name `GROQ_API_KEY`, value = the key.
3. Optional secrets:
   - `GROQ_MODEL` — default `llama-3.3-70b-versatile`. If Groq retires that model, set a current one from
     <https://console.groq.com/docs/models>.
   - `AI_LEARNER_CAP` — calls per learner per day, default `40`.

Never paste the key into the chat or the repo.

### 4. Redeploy the `ai` function
Same way as before (Verify JWT stays **off**):
- If you deploy the stub pinned to a commit: update the stub to the commit you merged in step 1, then deploy.
- Or via the dashboard editor: replace the code with the files in `supabase/functions/ai/` from `main`, then deploy.
- Or from a computer with the Supabase CLI: `npx supabase functions deploy ai --no-verify-jwt`.

### 5. Check it works
1. In the app: **Me → Settings → AI → Test**. It should say "✓ Works. Model gemini-…".
2. Supabase → Edge Functions → `ai` → **Logs**: each AI call logs one line `{"gemini": "<task>", "model": …}`.
   A Groq call shows `"model": "groq:llama-3.3-70b-versatile"`.
3. After a few AI calls: Table Editor → `ai_usage_learner` has one row per phone for today.
4. Optional test of the fallback: temporarily set `GEMINI_MODEL` to a name that does not exist (for example
   `gemini-none`) and `GEMINI_FALLBACK` to another wrong name; the Test button should then answer with
   `groq:…`. Delete both test secrets afterwards.

## Undo
- Remove the secret `GROQ_API_KEY` → Groq is no longer called. Secret changes reach new server instances; redeploy
  the function if you want it to apply at once.
- To drop the per-learner limit only, set `AI_LEARNER_CAP` to a large number (e.g. `100000`).
- The table and function can stay; they are not used by anything else.

## Not covered
- The problem-report check (`verifyReport`) still uses only the two Gemini models, by design: it needs two passes to
  agree, and mixing providers there is a separate decision.
- The admin "AI calls today" number is still the overall total. Per-learner numbers are in the `ai_usage_learner`
  table.
