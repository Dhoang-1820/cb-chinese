import type { Deps } from "./util.ts";
import { clientIp, noteFail, reply, str, tooManyFails } from "./util.ts";
import { syncId } from "./sync.ts";

/* ---------------- Google sign-in (Supabase Auth) ----------------
   Optional, next to the restore code. Built so it works when an iPhone home-screen app comes back from Google in Safari
   instead of in the app (they do not share storage):
     auth_start  {intent: link|get, code?}  → a one-time ticket (15 min). The app keeps it and goes to Google.
     auth_finish {ticket, token}            → wherever the sign-in lands: the server asks Supabase Auth who the token is,
                                              then links that account to the ticket's restore code (link) or looks up the
                                              code already linked (get). The result is kept on the ticket.
     auth_poll   {ticket}                   → the app reads the result when it is opened again (the ticket is the secret).
     auth_replace {ticket}                  → after "this Google account already has another backup": link this one instead.
     auth_status {code} / auth_unlink {code} → is this backup linked? / remove the link (needs the restore code).
   Only the Supabase Auth user id is kept (auth_links); never the email. */
export function anonKey(env: Record<string, string | undefined>): string {
  let key = env.SUPABASE_ANON_KEY || "";
  if (!key) { try { const o = JSON.parse(env.SUPABASE_PUBLISHABLE_KEYS || ""); const v = typeof o === "string" ? o : Array.isArray(o) ? o[0] : Object.values(o)[0]; key = typeof v === "string" ? v : ""; } catch (_e) { key = ""; } }
  return key;
}
/* SUPABASE_AUTH_URL only exists so the tests can point sign-in at a fake; normally it is SUPABASE_URL */
export function authBase(env: Record<string, string | undefined>): string { return env.SUPABASE_AUTH_URL || env.SUPABASE_URL || ""; }
export async function authUser(token: string, env: Record<string, string | undefined>, deps: Deps): Promise<string> {
  const base = authBase(env);
  if (!/^[A-Za-z0-9._-]{20,4000}$/.test(token) || !base) return "";
  try {
    const r = await deps.fetch(base + "/auth/v1/user", { method: "GET", headers: { apikey: anonKey(env), authorization: "Bearer " + token } }, 8000);
    if (!r || !r.ok) return "";
    const u = await r.json();
    return u && /^[a-f0-9-]{36}$/.test(String(u.id)) ? String(u.id) : "";
  } catch (_e) { return ""; }
}
export const TICKET_OK = /^[a-f0-9]{48}$/, TICKET_MS = 15 * 60000;
export function newTicket(): string { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a).map((v) => v.toString(16).padStart(2, "0")).join(""); }
export async function linkCode(deps: Deps, uid: string, code: string, lid: string, had: boolean) {
  if (had) await deps.db!("PATCH", "auth_links?uid=eq." + uid, { code, learner: lid, updated_at: new Date().toISOString() });
  else await deps.db!("POST", "auth_links", { uid, code, learner: lid });
}
export async function authTask(task: string, body: any, req: Request, env: Record<string, string | undefined>, deps: Deps, h: Record<string, string>): Promise<Response | null> {
  if (["auth_cfg", "auth_start", "auth_finish", "auth_poll", "auth_replace", "auth_status", "auth_unlink"].indexOf(task) < 0) return null;
  const p = body.payload && typeof body.payload === "object" ? body.payload : {};
  if (task === "auth_cfg") { // is Google sign-in switched on in Supabase Auth? (the phone hides the button until it is)
    let google = false;
    try { const r = await deps.fetch(authBase(env) + "/auth/v1/settings", { method: "GET", headers: { apikey: anonKey(env) } }, 6000); if (r && r.ok) { const j = await r.json(); google = !!(j && j.external && j.external.google); } } catch (_e) { google = false; }
    return reply(200, { ok: true, task, result: { google, url: google ? authBase(env) + "/auth/v1/authorize?provider=google" : "" } }, h);
  }
  if (!deps.db) return reply(500, { ok: false, error: "not_configured" }, h);
  const ip = clientIp(req);
  if (ip && tooManyFails(ip)) return reply(429, { ok: false, error: "busy" }, h);
  const bad = (e: string, st = 400) => { if (ip) noteFail(ip); return reply(st, { ok: false, error: e }, h); };
  try {
    if (task === "auth_status" || task === "auth_unlink" || task === "auth_start") {
      const code = String(p.code == null ? "" : p.code).toUpperCase().replace(/[^A-Z0-9]/g, ""), lid = code ? await syncId(code) : "";
      if (task !== "auth_start" || p.intent !== "get") {
        if (!lid) return bad("bad_sync");
        if (!((await deps.db("GET", "learners?id=eq." + lid + "&select=id&limit=1")) || [])[0]) return bad("no_backup", 404);
      }
      if (task === "auth_status") return reply(200, { ok: true, task, result: { linked: ((await deps.db("GET", "auth_links?code=eq." + code + "&select=uid&limit=1")) || []).length > 0 } }, h);
      if (task === "auth_unlink") { await deps.db("DELETE", "auth_links?code=eq." + code); return reply(200, { ok: true, task, result: { linked: false } }, h); }
      const recent = await deps.db("GET", "auth_tickets?select=ticket&created_at=gte." + encodeURIComponent(new Date(Date.now() - 864e5).toISOString()) + "&limit=201");
      if ((recent || []).length >= 200) return reply(429, { ok: false, error: "busy" }, h);
      const ticket = newTicket();
      await deps.db("POST", "auth_tickets", { ticket, intent: p.intent === "get" ? "get" : "link", code: p.intent === "get" ? "" : code, result: null });
      return reply(200, { ok: true, task, result: { ticket } }, h);
    }
    const ticket = String(p.ticket || ""); if (!TICKET_OK.test(ticket)) return bad("bad_ticket");
    const t = ((await deps.db("GET", "auth_tickets?ticket=eq." + ticket + "&select=ticket,intent,code,uid,result,created_at&limit=1")) || [])[0];
    if (!t || Date.now() - new Date(t.created_at).getTime() > TICKET_MS) return bad("bad_ticket", 404);
    if (task === "auth_poll") return reply(200, { ok: true, task, result: t.result || { status: "waiting" } }, h);
    if (task === "auth_replace") {
      if (!t.result || t.result.status !== "other" || !t.uid || !t.code) return reply(409, { ok: false, error: "closed" }, h);
      await linkCode(deps, t.uid, t.code, await syncId(t.code), true);
      const res = { status: "linked" }; await deps.db("PATCH", "auth_tickets?ticket=eq." + ticket, { result: res });
      return reply(200, { ok: true, task, result: res }, h);
    }
    // auth_finish
    if (t.result) return reply(200, { ok: true, task, result: t.result }, h); // already done (a reload of the landing page)
    const uid = await authUser(str(p.token, 4000), env, deps); if (!uid) return bad("bad_login", 401);
    const link = ((await deps.db("GET", "auth_links?uid=eq." + uid + "&select=code&limit=1")) || [])[0];
    let res: Record<string, unknown>;
    if (t.intent === "get") res = link ? { status: "code", code: link.code } : { status: "none" };
    else if (link && link.code !== t.code) res = { status: "other", code: link.code };
    else { await linkCode(deps, uid, t.code, await syncId(t.code), !!link); res = { status: "linked" }; }
    await deps.db("PATCH", "auth_tickets?ticket=eq." + ticket, { uid, result: res });
    return reply(200, { ok: true, task, result: res }, h);
  } catch (_e) { return reply(502, { ok: false, error: "db_error" }, h); }
}
