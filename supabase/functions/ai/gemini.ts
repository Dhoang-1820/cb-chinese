import type { Deps } from "./util.ts";
import { DEFAULT_FALLBACK, DEFAULT_MODEL, fails } from "./util.ts";
import type { Clean } from "./validate.ts";
import { buildRequest, validateResult } from "./validate.ts";

/* Calling Gemini: timeouts, fallback model, a small circuit breaker, one retry on unusable JSON. */

/* Per-call waits. The main model gets a shorter one (GEMINI_TIMEOUT_MS) because the fallback usually answers in ~2 s. */
export const MAIN_TIMEOUT_MS = 12000, FALLBACK_TIMEOUT_MS = 15000, MAX_TIMEOUT_MS = 18000;
export function mainTimeoutMs(env: Record<string, string | undefined>): number {
  const n = parseInt(env.GEMINI_TIMEOUT_MS || "", 10);
  return isFinite(n) ? Math.min(MAX_TIMEOUT_MS, Math.max(3000, n)) : MAIN_TIMEOUT_MS;
}

/* Short memory of failure, per server instance: after the main model fails BREAKER_AFTER times in a row (timeout / throw,
   429 or 5xx), it is skipped until `until` and requests go straight to the fallback. One slow answer alone does not open
   it, and a good answer from the main model starts the count again. When the 10 minutes are over the main model is tried
   once: if that fails too, it is skipped for another 10 minutes. A 404 (wrong model name) never counts. */
export const BREAKER_MS = 600000, BREAKER_AFTER = 2;
export const breaker = { model: "", until: 0, fails: 0 };
export let clock: () => number = Date.now;
/** Forgets the remembered failure (tests call this between cases). */
export function resetBreaker(): void { breaker.model = ""; breaker.until = 0; breaker.fails = 0; }
/** Test hook: replaces the breaker's clock; call with no argument to go back to Date.now. */
export function setBreakerClock(fn?: () => number): void { clock = fn || Date.now; }
/** Milliseconds the given model will still be skipped for (0 = it will be tried). */
export function breakerRemaining(model: string): number { return breaker.model === model ? Math.max(0, breaker.until - clock()) : 0; }
export function trip(model: string) {
  if (breaker.model !== model) { breaker.model = model; breaker.until = 0; breaker.fails = 0; }
  if (++breaker.fails >= BREAKER_AFTER) breaker.until = clock() + BREAKER_MS;
}

export async function callGemini(deps: Deps, key: string, model: string, body: unknown, timeoutMs: number) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  const res = await deps.fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) }, timeoutMs);
  const status = res.status as number;
  if (status < 200 || status >= 300) return { status, text: null as string | null };
  const data = await res.json();
  const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  const text = Array.isArray(parts) ? parts.map((p: any) => (p && typeof p.text === "string" ? p.text : "")).join("") : "";
  return { status, text: text || null };
}

/* One line per Gemini call in the function log (Supabase → Edge Functions → Logs): task, model, HTTP status (0 = the call
   threw, e.g. a timeout), how long it took and the error name. Never the key, the question or the answer. */
export function note(task: string, model: string, status: number, t0: number, err: unknown) {
  const D0: any = (globalThis as any).Deno; if (!D0) return; // quiet under Node tests
  const e = err instanceof Error ? err.name + ": " + err.message.slice(0, 120) : String(err || "");
  console.log(JSON.stringify({ gemini: task, model, status, ms: Date.now() - t0, err: e }));
}

export function noteSkip(task: string, model: string) {
  const D0: any = (globalThis as any).Deno; if (!D0) return;
  console.log(JSON.stringify({ gemini: task, model, skipped: true, ms: breakerRemaining(model) }));
}

/* Runs one task end to end: main model (unless it failed recently), optional fallback model, one retry on unusable JSON.
   A model is never called twice after a timeout, a 429 or a 5xx. */
export async function runTask(c: Clean, env: Record<string, string | undefined>, deps: Deps): Promise<{ ok: true; result: Record<string, unknown>; model: string } | { ok: false; error: string; status: number }> {
  const key = env.GEMINI_API_KEY || "";
  const main = env.GEMINI_MODEL || DEFAULT_MODEL;
  let models = [main];
  const fb = env.GEMINI_FALLBACK || DEFAULT_FALLBACK;
  if (fb && models.indexOf(fb) < 0) models.push(fb);
  const guarded = models.length > 1; // with a single model there is nothing to fall back to, so it is never skipped
  if (guarded && breakerRemaining(main) > 0) { noteSkip(c.task, main); models = models.slice(1); }
  const mainMs = mainTimeoutMs(env);
  const req = buildRequest(c);
  let lastStatus = 502, all404 = true;
  for (const model of models) {
    const isMain = model === main;
    for (let attempt = 0; attempt < 2; attempt++) {
      let r; const t0 = Date.now();
      try { r = await callGemini(deps, key, model, req, isMain ? mainMs : FALLBACK_TIMEOUT_MS); } catch (e) { note(c.task, model, 0, t0, e); lastStatus = 0; all404 = false; if (isMain && guarded) trip(main); break; }
      note(c.task, model, r.status, t0, r.text === null ? "no text" : "");
      lastStatus = r.status; if (r.status !== 404) all404 = false;
      if (isMain && guarded) { if (r.status === 429 || r.status >= 500) trip(main); else if (r.status >= 200 && r.status < 300) resetBreaker(); }
      if (r.text === null) { if (r.status === 404 || r.status === 429 || r.status >= 500 || r.status === 200) break; return { ok: false, error: "upstream_" + r.status, status: 502 }; }
      let parsed: any = null;
      try { parsed = JSON.parse(r.text); } catch (_e) { parsed = null; }
      const clean = validateResult(c.task, parsed, c.data);
      if (clean) return { ok: true, result: clean, model };
      // unusable JSON: try the same model once more, then move on
    }
  }
  if (all404) return { ok: false, error: "bad_model", status: 502 };
  return { ok: false, error: lastStatus === 429 ? "busy" : lastStatus === 0 ? "upstream_unreachable" : "bad_output", status: lastStatus === 429 ? 429 : 502 };
}
