/* C&B Chinese — AI helper (Supabase Edge Function).
   One endpoint, six tasks (ask, coach, weekly and roleplay are below):
     grade   — mark ONE sentence written for HSK 4 writing part 2 (look at a picture, use the word)
     explain — explain a multiple-choice mistake, treating the app's answer key as the truth
     ask     — answer one question about a word or sentence
     coach   — give feedback on a short paragraph (2-5 sentences) written with required words
     weekly  — turn the weekly report numbers into 3 concrete actions
     roleplay — one turn of a short HR role-play in Chinese, with a correction of the learner's last message

   The Gemini API key lives only in the function's secrets. The phone sends an access code (APP_CODE) in the
   `x-app-code` header; a daily cap (AI_DAILY_CAP) limits the damage if the code ever leaks.

   The file is plain, erasable TypeScript with no top-level Deno calls other than a guarded serve(), so tools/ai_golden.js
   can import the same prompts and validators under Node 22.18+ to run the golden test set.

   Secrets (Edge Functions → Secrets):
     GEMINI_API_KEY      required
     APP_CODE            required — the access code you type into the app
     GEMINI_MODEL        optional, default gemini-3.8-flash
     GEMINI_FALLBACK     optional, default gemini-3.5-flash-lite (used on 404/429/5xx or a timeout from the main model;
                         after two such failures in a row (timeout/429/5xx) the main model is skipped for 10 minutes
                         on that server instance)
     GEMINI_TIMEOUT_MS   optional, default 12000 — how long to wait for the main model, 3000..18000 (the fallback gets 15000)
     AI_DAILY_CAP        optional, default 150 calls a day in total
     ALLOWED_ORIGINS     optional, comma-separated, default https://dhoang-1820.github.io
     ADMIN_CODE          optional — turns on the content review screen (accept / reject / hide). 12+ random characters.
                         Admin-only tasks: review_list, review_decide, learners_list, learner_label and admin_stats
                         (AI calls today against the cap and for the last 14 days, backups against the limit, reports waiting)
     AI_REPORT_CAP       optional, default 10 problem reports per rolling 24 hours (each one costs two AI calls)
     SYNC_MAX_LEARNERS   optional, default 20 — how many phones may keep a progress backup (see sync_put below)

   More AI tasks: similar, listen (new listening questions), passage (a reading passage from weak words), patterns (groups
   of mistakes that share one cause) and draft (admin only: a chat message for one learner). Without AI: bank_get / bank_list /
   bank_decide (the shared question bank), q_stats (admin: hardest questions) and auth_cfg / auth_start / auth_finish / auth_poll / auth_replace / auth_status / auth_unlink
   (optional Google sign-in through Supabase Auth, linked to the restore code; see auth_* below).
*/

import type { Deps } from "./util.ts";
import { MAX_BODY, MAX_SYNC, adminOk, clientIp, cors, noteFail, parseOrigins, reply, sameSecret, tooFast, tooManyFails } from "./util.ts";
import { cleanInput } from "./validate.ts";
import { MAX_TIMEOUT_MS, runTask } from "./gemini.ts";
import { syncTask } from "./sync.ts";
import { contentTask } from "./content.ts";
import { bankSave, bankTask } from "./bank.ts";
import { authTask } from "./auth.ts";

/* everything the tests and tools import stays available from index.ts */
export * from "./util.ts";
export * from "./prompts.ts";
export * from "./validate.ts";
export * from "./gemini.ts";
export * from "./chat.ts";
export * from "./sync.ts";
export * from "./content.ts";
export * from "./bank.ts";
export * from "./auth.ts";

export async function handle(req: Request, env: Record<string, string | undefined>, deps: Deps): Promise<Response> {
  const allowed = parseOrigins(env), origin = req.headers.get("origin"), h = cors(origin, allowed);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return reply(405, { ok: false, error: "method" }, h);
  if (origin && allowed.indexOf(origin) < 0) return reply(403, { ok: false, error: "origin" }, h);
  if (!env.GEMINI_API_KEY || (env.APP_CODE && env.APP_CODE.length < 6)) return reply(500, { ok: false, error: "not_configured" }, h);
  if (env.APP_CODE) {
    const code = req.headers.get("x-app-code") || "";
    if (!code || !(await sameSecret(code, env.APP_CODE))) return reply(401, { ok: false, error: "bad_code" }, h);
  } else {
    // Public mode (no APP_CODE): only browsers on an allowed origin are accepted, and each address is rate limited.
    if (!origin) return reply(403, { ok: false, error: "origin" }, h);
    const ip = clientIp(req);
    if (ip && tooFast(ip)) return reply(429, { ok: false, error: "busy" }, h);
  }
  let text = "";
  try { text = await req.text(); } catch (_e) { return reply(400, { ok: false, error: "bad_request" }, h); }
  if (text.length > MAX_SYNC) return reply(413, { ok: false, error: "too_big" }, h);
  let body: any; try { body = JSON.parse(text); } catch (_e) { return reply(400, { ok: false, error: "bad_json" }, h); }
  if (text.length > MAX_BODY && !(body && body.task === "sync_put")) return reply(413, { ok: false, error: "too_big" }, h);
  const sy = await syncTask(body && body.task, body || {}, req, env, deps, h);
  if (sy) return sy;
  const bk = await bankTask(body && body.task, body || {}, req, env, deps, h);
  if (bk) return bk;
  const au = await authTask(body && body.task, body || {}, req, env, deps, h);
  if (au) return au;
  if (body && body.task === "draft") { // an AI draft of a chat message is an admin tool
    const ip = clientIp(req);
    if (ip && tooManyFails(ip)) return reply(429, { ok: false, error: "busy" }, h);
    if (!(await adminOk(req, env))) { if (ip) noteFail(ip); return reply(401, { ok: false, error: "bad_admin" }, h); }
  }
  const ct = await contentTask(body && body.task, body || {}, req, env, deps, h);
  if (ct) return ct;
  const c = cleanInput(body);
  if (typeof c === "string") return reply(400, { ok: false, error: c }, h);
  const cap = Math.max(1, parseInt(env.AI_DAILY_CAP || "150", 10) || 150);
  let used = 0;
  try { used = await deps.bump(cap); } catch (_e) { used = 0; }
  if (used === -1) return reply(429, { ok: false, error: "daily_cap", cap }, h);
  const out = await runTask(c, env, deps);
  if (!out.ok) return reply(out.status, { ok: false, error: out.error }, h);
  await bankSave(c, out.result, deps);
  return reply(200, { ok: true, task: c.task, result: out.result, model: out.model, used, cap }, h);
}

/* ---------------- Deno / Supabase glue (skipped under Node) ---------------- */

const D: any = (globalThis as any).Deno;
if (D && typeof D.serve === "function") {
  const mem = { day: "", n: 0 }; // fallback counter if the database is unreachable (per instance)
  const env = new Proxy({}, { get: (_t, k) => (typeof k === "string" ? D.env.get(k) : undefined) }) as Record<string, string | undefined>;
  const serviceKey = (): string => {
    const legacy = D.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (legacy) return legacy;
    const raw = D.env.get("SUPABASE_SECRET_KEYS") || "";
    try { const o = JSON.parse(raw); const v = typeof o === "string" ? o : Array.isArray(o) ? o[0] : Object.values(o)[0]; return typeof v === "string" ? v : ""; } catch (_e) { return raw; }
  };
  const deps: Deps = {
    fetch: (url, init, timeoutMs) => fetch(url, { ...init, signal: AbortSignal.timeout(Math.min(MAX_TIMEOUT_MS, Math.max(1000, timeoutMs || MAX_TIMEOUT_MS))) }),
    db: async (method, path, body) => {
      const base = D.env.get("SUPABASE_URL"), key = serviceKey();
      if (!base || !key) throw new Error("no db");
      const headers: Record<string, string> = { "content-type": "application/json", apikey: key, prefer: method === "GET" ? "" : path.indexOf("on_conflict=") >= 0 ? "resolution=ignore-duplicates,return=minimal" : "return=minimal" };
      if (key.startsWith("eyJ")) headers.authorization = "Bearer " + key;
      const r = await fetch(base + "/rest/v1/" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error("db " + r.status);
      return method === "GET" ? await r.json() : null;
    },
    live: async (topic, event) => {
      const base = D.env.get("SUPABASE_URL"), key = serviceKey();
      if (!base || !key) return;
      const headers: Record<string, string> = { "content-type": "application/json", apikey: key };
      if (key.startsWith("eyJ")) headers.authorization = "Bearer " + key;
      await fetch(base + "/realtime/v1/api/broadcast", { method: "POST", headers, body: JSON.stringify({ messages: [{ topic, event, payload: {}, private: false }] }), signal: AbortSignal.timeout(4000) });
    },
    bump: async (cap) => {
      const base = D.env.get("SUPABASE_URL"), key = serviceKey();
      if (base && key) {
        try {
          const headers: Record<string, string> = { "content-type": "application/json", apikey: key };
          if (key.startsWith("eyJ")) headers.authorization = "Bearer " + key; // legacy JWT keys also go in Authorization
          const r = await fetch(base + "/rest/v1/rpc/bump_ai_usage", { method: "POST", headers, body: JSON.stringify({ cap }) });
          if (r.ok) { const n = await r.json(); if (typeof n === "number") return n; }
        } catch (_e) { /* fall through to the in-memory counter */ }
      }
      const day = new Date().toISOString().slice(0, 10);
      if (mem.day !== day) { mem.day = day; mem.n = 0; }
      if (mem.n >= cap) return -1;
      return ++mem.n;
    }
  };
  D.serve((req: Request) => handle(req, env, deps));
}
