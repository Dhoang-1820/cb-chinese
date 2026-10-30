import type { Deps } from "./util.ts";
import { reply, sha, str } from "./util.ts";

/* ---------------- teacher chat (messages table) ----------------
   A learner reaches only her own messages, with her restore code (row id = hash of it); the admin reaches all with the
   admin code. Live updates: the server pings a channel whose name is derived from the row id (or the admin code);
   the ping carries no text, the phone then fetches with its code. Phones also poll, so chat works without the live part. */
export const CHAT_MAX = 1000, CHAT_DAY = 60;
export const HREF_OK = /^#\/[a-z0-9][a-z0-9\/_-]{0,60}$/i;
export function cleanAction(a: any): { label: string; href: string } | null {
  if (!a || typeof a !== "object") return null;
  const label = str(a.label, 40), href = String(a.href || "");
  return label && HREF_OK.test(href) ? { label, href } : null;
}
export async function liveTopic(seed: string): Promise<string> { return "cb-" + (await sha("cb-chat:" + seed)).slice(0, 40); }
export function liveCfg(env: Record<string, string | undefined>, topic: string): Record<string, string> | null {
  let key = env.SUPABASE_ANON_KEY || "";
  if (!key) { try { const o = JSON.parse(env.SUPABASE_PUBLISHABLE_KEYS || ""); const v = typeof o === "string" ? o : Array.isArray(o) ? o[0] : Object.values(o)[0]; key = typeof v === "string" ? v : ""; } catch (_e) { key = ""; } }
  const url = env.SUPABASE_URL || "";
  return url && key ? { url: url.replace(/^http/, "ws") + "/realtime/v1/websocket", key, topic } : null;
}
export async function ping(deps: Deps, topic: string): Promise<void> { try { if (deps.live) await deps.live(topic, "chat"); } catch (_e) { /* live is a bonus; polling still delivers */ } }
export const MSG_COLS = "select=id,sender,body,action,created_at,seen_at";
/* upTo: the learner only sees messages whose time has come (a scheduled message is stored with its delivery time) */
export async function chatList(deps: Deps, lid: string, since: number, upTo?: string): Promise<any[]> {
  const rows = await deps.db!("GET", "messages?learner=eq." + lid + (since > 0 ? "&id=gt." + since : "") + (upTo ? "&created_at=lte." + upTo : "") + "&" + MSG_COLS + "&order=id.desc&limit=60");
  return (rows || []).reverse();
}
/* a delivery time from the admin: a future time within 30 days, else null (= now) */
export function sendAt(x: unknown, now: Date): string | null {
  const t = Date.parse(String(x || ""));
  return isFinite(t) && t > now.getTime() + 60000 && t < now.getTime() + 30 * 864e5 ? new Date(t).toISOString() : null;
}
export async function chatLearner(task: string, p: any, lid: string, env: Record<string, string | undefined>, deps: Deps, h: Record<string, string>): Promise<Response> {
  const row = (await deps.db!("GET", "learners?id=eq." + lid + "&select=id&limit=1") || [])[0];
  if (!row) return reply(404, { ok: false, error: "no_backup" }, h);
  const now = new Date().toISOString();
  if (task === "chat_send") {
    const body = str(p.body, CHAT_MAX).trim();
    if (!body) return reply(400, { ok: false, error: "empty_message" }, h);
    const today = await deps.db!("GET", "messages?learner=eq." + lid + "&sender=eq.learner&created_at=gte." + now.slice(0, 10) + "T00:00:00Z&select=id");
    if ((today || []).length >= CHAT_DAY) return reply(429, { ok: false, error: "chat_full" }, h);
    await deps.db!("POST", "messages", { learner: lid, sender: "learner", body, created_at: now });
    if (env.ADMIN_CODE) await ping(deps, await liveTopic("admin:" + env.ADMIN_CODE));
    return reply(200, { ok: true, task, result: { msgs: await chatList(deps, lid, Math.max(0, parseInt(p.since, 10) || 0), now) } }, h);
  }
  // chat_get: also says "this phone is open" (last_open) and how its backup is doing (client), for the teacher's view
  const c = p.client && typeof p.client === "object" ? p.client : {};
  const client = { v: str(c.v, 20), b: ["on", "off", "paused", "err"].indexOf(c.b) >= 0 ? c.b : "", e: str(c.e, 30), at: now };
  await deps.db!("PATCH", "learners?id=eq." + lid, { last_open: now, client });
  if (p.read === true) await deps.db!("PATCH", "messages?learner=eq." + lid + "&sender=eq.admin&seen_at=is.null&created_at=lte." + now, { seen_at: now });
  const msgs = await chatList(deps, lid, Math.max(0, parseInt(p.since, 10) || 0), now);
  const unread = p.read === true ? 0 : ((await deps.db!("GET", "messages?learner=eq." + lid + "&sender=eq.admin&seen_at=is.null&created_at=lte." + now + "&select=id")) || []).length;
  return reply(200, { ok: true, task, result: { msgs, unread, live: liveCfg(env, await liveTopic(lid)) } }, h);
}
export async function chatAdmin(task: string, p: any, env: Record<string, string | undefined>, deps: Deps, h: Record<string, string>): Promise<Response> {
  const nowD = new Date(), now = nowD.toISOString();
  if (task === "admin_broadcast") { // one message to many learners, now or at a set time
    const body = str(p.body, CHAT_MAX).trim(), action = cleanAction(p.action), at = sendAt(p.at, nowD);
    if (!body && !action) return reply(400, { ok: false, error: "empty_message" }, h);
    const want = (Array.isArray(p.ids) ? p.ids : []).slice(0, 50).map((x: unknown) => String(x)).filter((x: string) => /^[a-f0-9]{64}$/.test(x));
    const have: Record<string, boolean> = {}; ((await deps.db!("GET", "learners?select=id")) || []).forEach((r: any) => { have[r.id] = true; });
    const ids = want.filter((x: string, i: number) => have[x] && want.indexOf(x) === i);
    if (!ids.length) return reply(400, { ok: false, error: "no_learners" }, h);
    await deps.db!("POST", "messages", ids.map((x: string) => ({ learner: x, sender: "admin", body, action, created_at: at || now })));
    if (!at) for (const x of ids) await ping(deps, await liveTopic(x));
    return reply(200, { ok: true, task, result: { sent: ids.length, at: at || now } }, h);
  }
  const lid = str(p.id, 64); if (!/^[a-f0-9]{64}$/.test(lid)) return reply(400, { ok: false, error: "bad_id" }, h);
  if (task === "admin_chat_send") {
    const body = str(p.body, CHAT_MAX).trim(), action = cleanAction(p.action), at = sendAt(p.at, nowD);
    if (!body && !action) return reply(400, { ok: false, error: "empty_message" }, h);
    const row = (await deps.db!("GET", "learners?id=eq." + lid + "&select=id&limit=1") || [])[0];
    if (!row) return reply(404, { ok: false, error: "no_backup" }, h);
    await deps.db!("POST", "messages", { learner: lid, sender: "admin", body, action, created_at: at || now });
    if (!at) await ping(deps, await liveTopic(lid));
  } else if (task === "admin_chat_delete") { // only a scheduled message that has not been delivered yet
    const mid = parseInt(p.mid, 10); if (!(mid > 0)) return reply(400, { ok: false, error: "bad_id" }, h);
    await deps.db!("DELETE", "messages?id=eq." + mid + "&learner=eq." + lid + "&sender=eq.admin&created_at=gt." + now);
  } else if (p.read === true) await deps.db!("PATCH", "messages?learner=eq." + lid + "&sender=eq.learner&seen_at=is.null", { seen_at: now });
  const lr = (await deps.db!("GET", "learners?id=eq." + lid + "&select=last_open,client&limit=1") || [])[0] || {};
  return reply(200, { ok: true, task, result: { msgs: await chatList(deps, lid, Math.max(0, parseInt(p.since, 10) || 0)), last_open: lr.last_open || null, client: lr.client || null,
    live: liveCfg(env, await liveTopic("admin:" + (env.ADMIN_CODE || ""))) } }, h);
}
