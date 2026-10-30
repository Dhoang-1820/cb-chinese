import type { Deps } from "./util.ts";
import { clientIp, noteFail, reply, sha, tooManyFails } from "./util.ts";
import { chatLearner } from "./chat.ts";

/* ---------------- progress backup (sync_put / sync_get / sync_delete) ----------------
   No accounts. Each phone makes a random 16-character restore code and keeps it; the row id is a hash of that code, so
   the code itself is never stored here and whoever knows it can read or replace that one backup. No AI call is made. */
export const CODE_OK = /^[A-HJ-NP-Z2-9]{16}$/;
export async function syncId(code: unknown): Promise<string> {
  const c = String(code == null ? "" : code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE_OK.test(c) ? await sha("cb-sync:" + c) : "";
}
export function cleanMeta(m: any): Record<string, unknown> {
  const n = (x: unknown) => { const v = Math.round(+(x as number)); return isFinite(v) ? Math.max(0, Math.min(1e7, v)) : 0; };
  m = m && typeof m === "object" ? m : {};
  return { xp: n(m.xp), streak: n(m.streak), words: n(m.words), last: /^\d{4}-\d{2}-\d{2}$/.test(m.last) ? m.last : "" };
}

export async function syncTask(task: string, body: any, req: Request, env: Record<string, string | undefined>, deps: Deps, h: Record<string, string>): Promise<Response | null> {
  if (["sync_put", "sync_get", "sync_delete", "chat_get", "chat_send"].indexOf(task) < 0) return null;
  if (!deps.db) return reply(500, { ok: false, error: "not_configured" }, h);
  const p = body.payload && typeof body.payload === "object" ? body.payload : {};
  const ip = clientIp(req);
  if (ip && tooManyFails(ip)) return reply(429, { ok: false, error: "busy" }, h);
  const id = await syncId(p.code);
  if (!id) { if (ip) noteFail(ip); return reply(400, { ok: false, error: "bad_sync" }, h); }
  const where = "learners?id=eq." + id;
  try {
    if (task === "sync_get") {
      const rows = await deps.db("GET", where + "&select=data,rev,updated_at,meta&limit=1");
      if (!rows || !rows[0]) { if (ip) noteFail(ip); return reply(404, { ok: false, error: "no_backup" }, h); } // wrong guesses are counted per address
      return reply(200, { ok: true, task, result: { data: rows[0].data, rev: rows[0].rev, updated_at: rows[0].updated_at, meta: rows[0].meta || {} } }, h);
    }
    if (task === "sync_delete") { await deps.db("DELETE", where); return reply(200, { ok: true, task, result: { deleted: true } }, h); }
    if (task === "chat_get" || task === "chat_send") return await chatLearner(task, p, id, env, deps, h);
    const d = p.data;
    if (!d || typeof d !== "object" || Array.isArray(d) || !d.srs || typeof d.srs !== "object" || !d.settings || typeof d.settings !== "object") return reply(400, { ok: false, error: "bad_sync" }, h);
    const meta = cleanMeta(p.meta), now = new Date().toISOString();
    let summary: unknown = null; try { const t = JSON.stringify(p.summary ?? null); if (t.length <= 8000 && p.summary && typeof p.summary === "object") summary = JSON.parse(t); } catch (_e) { summary = null; }
    const rows = await deps.db("GET", where + "&select=rev,updated_at,meta&limit=1"), row = rows && rows[0];
    if (row && row.meta && typeof row.meta.label === "string") meta.label = row.meta.label.slice(0, 30); // the name the admin gave this learner survives every save
    if (!row) {
      const max = Math.max(1, parseInt(env.SYNC_MAX_LEARNERS || "20", 10) || 20);
      const all = await deps.db("GET", "learners?select=id&limit=" + (max + 1));
      if ((all || []).length >= max) return reply(429, { ok: false, error: "sync_full" }, h);
      await deps.db("POST", "learners", { id, rev: 1, data: d, meta, summary, updated_at: now });
      return reply(200, { ok: true, task, result: { rev: 1, updated_at: now } }, h);
    }
    // another phone saved since this one last looked: never overwrite silently, let the learner choose
    if (p.force !== true && row.rev !== p.rev) return reply(200, { ok: true, task, result: { conflict: true, rev: row.rev, updated_at: row.updated_at, meta: row.meta || {} } }, h);
    const next = row.rev + 1;
    await deps.db("PATCH", where, { rev: next, data: d, meta, summary, updated_at: now });
    return reply(200, { ok: true, task, result: { rev: next, updated_at: now } }, h);
  } catch (_e) { return reply(502, { ok: false, error: "db_error" }, h); }
}
