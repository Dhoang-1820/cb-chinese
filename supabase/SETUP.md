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
| `APP_CODE` | a random access code you invent, at least 6 characters, for example 4 random words (required) |
| `GEMINI_MODEL` | optional, default `gemini-3.8-flash` |
| `GEMINI_FALLBACK` | optional, default `gemini-3.5-flash-lite` |
| `AI_DAILY_CAP` | optional, default `150` calls per day |
| `ALLOWED_ORIGINS` | optional, default `https://dhoang-1820.github.io` |

If the app says the model name was not found, check the current names in AI Studio and set `GEMINI_MODEL` / `GEMINI_FALLBACK`.

## 6. Connect the app
1. Function URL: `https://<your-project-ref>.supabase.co/functions/v1/ai`
2. On the phone: **Me → AI assistant**, paste the URL and your `APP_CODE`, tap **Save**, then **Test**.
   You should see "Works. Model … · 1/150 AI calls used today".
3. The URL and code stay in this browser only (not in exports or the Gist backup). Repeat on each device.

## Troubleshooting
| Test message | Meaning |
|---|---|
| access code was not accepted | `APP_CODE` secret differs from what you typed |
| Google rejected the Gemini key | wrong or missing `GEMINI_API_KEY` (Google may answer 400 for an invalid key) |
| not configured | `APP_CODE` or `GEMINI_API_KEY` secret missing; redeploy after adding |
| AI is busy / daily limit | free quota or your `AI_DAILY_CAP` reached; wait or raise the cap |
| model name was not found | `GEMINI_MODEL` and `GEMINI_FALLBACK` are not valid model names |
| origin error | `ALLOWED_ORIGINS` does not include the site address |
| 401 from Supabase itself | Verify JWT is still ON for the function |

Notes: every request counts toward `AI_DAILY_CAP`, including ones that fail. `APP_CODE` must be at least 6 characters (use 12+ random characters). If you skip step 3, the daily cap still works but only per server instance, so run `setup.sql`.

## Checking accuracy (optional)
`GEMINI_API_KEY=... node tools/ai_golden.js` runs 24 reference cases directly against Gemini and prints the pass rate (needs Node 22.18+). Run it after changing a prompt or model.
