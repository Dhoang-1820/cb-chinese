/* Shared helpers: limits, text cleaning, replies, hashing, admin check, rate limits. */

export const DEFAULT_MODEL = "gemini-3.8-flash";
export const DEFAULT_FALLBACK = "gemini-3.5-flash-lite";
export const DEFAULT_ORIGINS = "https://dhoang-1820.github.io";
export const MAX_BODY = 8000;
export const MAX_SYNC = 400000; // a progress backup is far larger than an AI question

export const HAN = /[㐀-鿿]/;
export const HREF_RE = /^#\/[a-z0-9][a-z0-9\/_-]{0,60}$/i;
export function str(x: unknown, max: number): string { return typeof x === "string" ? x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : ""; }


export type Deps = {
  /** timeoutMs = how long this one call may take (the Deno glue turns it into an abort signal; tests may ignore it) */
  fetch: (url: string, init: any, timeoutMs?: number) => Promise<any>;
  /** adds one call to today's total and returns the new count, or -1 when over the cap */
  bump: (cap: number) => Promise<number>;
  /** talks to the content_reports and learners tables (PostgREST path after /rest/v1/); absent in tests that don't need it */
  db?: (method: string, path: string, body?: unknown) => Promise<any>;
  /** tells phones listening on a live channel that something changed (no content is sent); absent in tests */
  live?: (topic: string, event: string) => Promise<void>;
};

export function parseOrigins(env: Record<string, string | undefined>): string[] {
  return (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map((s) => s.trim()).filter(Boolean);
}
export function cors(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = { "Vary": "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, x-app-code, x-admin-code, authorization, apikey, x-client-info", "Access-Control-Max-Age": "86400" };
  if (origin && allowed.indexOf(origin) >= 0) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
export function reply(status: number, body: unknown, h: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...h, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
export async function sha(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function sameSecret(a: string, b: string): Promise<boolean> {
  const x = await sha(a), y = await sha(b); let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

export async function adminOk(req: Request, env: Record<string, string | undefined>): Promise<boolean> {
  const code = req.headers.get("x-admin-code") || "";
  return !!env.ADMIN_CODE && env.ADMIN_CODE.length >= 12 && !!code && await sameSecret(code, env.ADMIN_CODE);
}

export function clientIp(req: Request): string { return (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").trim(); }

export const fails = new Map<string, number[]>();
export function noteFail(ip: string) { const now = Date.now(), l = (fails.get(ip) || []).filter((t) => now - t < 9e5); l.push(now); fails.set(ip, l); if (fails.size > 500) fails.clear(); }
export function tooManyFails(ip: string): boolean { const now = Date.now(); return (fails.get(ip) || []).filter((t) => now - t < 9e5).length >= 8; }
export const hits = new Map<string, number[]>();
/** at most 30 requests per minute per address (per server instance) */
export function tooFast(ip: string): boolean {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 500) for (const k of hits.keys()) { const l = hits.get(k)!; if (!l.length || now - l[l.length - 1] > 60000) hits.delete(k); }
  return list.length > 30; // two phones on one Wi-Fi share an address; chat polls and backups count too
}
