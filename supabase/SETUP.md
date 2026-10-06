# AI assistant setup (about 15 minutes, free)

The app never holds your Gemini key. The chain is: **app → Supabase Edge Function `ai` (holds the key) → Gemini**.
Never paste the Gemini key into chat, the repo, or the app. It goes only into Supabase secrets.

## 1. Create the Gemini API key
1. Open https://aistudio.google.com/apikey and sign in with your Google account.
2. **Create API key** (create a new project if asked). Copy it somewhere private for step 4.
3. Check the free-tier limits shown in AI Studio. Free-tier prompts may be used by Google to improve products, so only send learning content (the app sends only a sentence, a word and a quiz question).

## 2. Create the Supabase project
1. Open https://supabase.com, sign in (GitHub is fine), **New project**.
2. Pick a name (for example `cb-chinese`), a database password (save it, not needed by the app), and a region near you (Singapore).
3. Wait until the project is ready. Note the **Project ref**, the short id in the URL / Project Settings → General.
   Free projects may pause after about a week without activity; use **Restore** in the dashboard if that happens.

## 3. Create the usage-limit table
1. Dashboard → **SQL Editor** → New query.
2. Paste the whole content of `supabase/setup.sql` → **Run**. (It creates the daily counter and a function only the server can call.)

## 4. Deploy the function
Dashboard method (no tools needed):
1. **Edge Functions → Deploy a new function → Via Editor**. Name it exactly `ai`.
2. Replace the sample code with the content of `supabase/functions/ai/index.ts`. Deploy.
3. Open the function's settings and turn **Verify JWT OFF** (the app uses its own access code, not a Supabase login).

CLI alternative:
```
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy ai --no-verify-jwt
```

## 5. Set the secrets
Dashboard → Edge Functions → **Secrets** (or `npx supabase secrets set NAME=value`):

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | the key from step 1 (required) |
| `APP_CODE` | **leave unset for the shared/public setup** (everyone using the site gets AI with no setup). Set a code of 12+ random characters only for a private setup, and then each device must enter it |
| `GEMINI_MODEL` | optional, default `gemini-3.8-flash` |
| `GEMINI_FALLBACK` | optional, default `gemini-3.5-flash-lite` |
| `AI_DAILY_CAP` | optional, default `150` calls per day |
| `ADMIN_CODE` | optional, 12+ random characters. Turns on **Me → Content review**, where you can look at accepted fixes and undo a bad one. Readers do not need it |
| `AI_REPORT_CAP` | optional, default `10` problem reports per rolling 24 hours (each costs 2 AI calls) |
| `ALLOWED_ORIGINS` | optional, default `https://dhoang-1820.github.io` |

If the app says the model name was not found, check the current names in AI Studio and set `GEMINI_MODEL` / `GEMINI_FALLBACK`.

## 6. Connect the app
**Shared setup (recommended, no per-user steps):** put the function URL into `BUILT_IN_URL` at the top of `js/ai.js` and push. Every user then gets AI with nothing to enter. The URL is public by design; the Gemini key never leaves Supabase. Without `APP_CODE` the function only accepts browsers from `ALLOWED_ORIGINS`, allows 12 requests a minute per address, and stops at `AI_DAILY_CAP` calls a day for everyone.

**Private setup:** set `APP_CODE`, leave `BUILT_IN_URL` empty, and enter the URL and code on each device as below.

1. Function URL: `https://<your-project-ref>.supabase.co/functions/v1/ai`
2. On the phone: **Me → AI assistant**, paste the URL and your `APP_CODE`, tap **Save**, then **Test**.
   You should see "Works. Model … · 1/150 AI calls used today".
3. The URL and code stay in this browser only (not in exports or the Gist backup). Repeat on each device.

## Troubleshooting
| Test message | Meaning |
|---|---|
| access code was not accepted | `APP_CODE` is set on the server but the app sent none or a different one |
| Google rejected the Gemini key | wrong or missing `GEMINI_API_KEY` (Google may answer 400 for an invalid key) |
| not configured | `GEMINI_API_KEY` missing (or `APP_CODE` shorter than 6); redeploy after adding |
| AI is busy / daily limit | free quota or your `AI_DAILY_CAP` reached; wait or raise the cap |
| model name was not found | `GEMINI_MODEL` and `GEMINI_FALLBACK` are not valid model names |
| origin error | `ALLOWED_ORIGINS` does not include the site address |
| 401 from Supabase itself | Verify JWT is still ON for the function |

Security notes: the function URL is public, so anyone could send reports; the report cap, per-item limit and daily AI cap keep that cheap, and a fix only changes the lessons when the reporter accepts what the AI proposed (never their own text). Wrong reviewer codes are locked out per address after 8 tries in 15 minutes.

Notes: every request counts toward `AI_DAILY_CAP`, including ones that fail. `APP_CODE` must be at least 6 characters (use 12+ random characters). If you skip step 3, the daily cap still works but only per server instance, so run `setup.sql`.

## Content feedback (optional)
With the AI on, the **⚑** button sends a report to the AI, which checks the item twice.
- **The AI finds a mistake and both checks agree:** the reporter sees **Accept this fix**. One tap changes the lesson on that phone at once and for every other phone within a few hours. No admin step.
- **The AI disagrees or the checks differ:** the reporter can **discuss with the AI** (up to 5 replies). The AI re-checks with the conversation and may then propose a fix to accept.
- **Safety:** only a fix the AI itself proposed can be accepted (never text the reader typed); a fix applies only to the item version the AI checked; ids, audio and quiz structure cannot change; items are never hidden automatically; limits per day, per item and per report.
- **Undo:** with `ADMIN_CODE` set, **Me → Content review → Accepted → Undo this fix** removes a bad fix for everyone.
- Accepted fixes live in the database and are applied in memory; the lesson files in the repo are not changed.

## Checking accuracy (optional)
`GEMINI_API_KEY=... node tools/ai_golden.js` runs 30 reference cases directly against Gemini and prints the pass rate (needs Node 22.18+). Run it after changing a prompt or model.
