import type { Deps } from "./util.ts";
import { adminOk, clientIp, noteFail, reply, sha, str, tooManyFails } from "./util.ts";
import type { Clean } from "./validate.ts";

/* ---------------- shared question bank (bank_items) ----------------
   Every usable AI practice question (similar / listen / passage) is kept as "pending". The admin approves the good ones;
   approved questions are served to every learner before the AI is asked again (saves the daily cap), are marked as
   checked, and the deploy build pulls them in so they get recorded neural-voice audio like the rest of the course. */
export const BANK_KINDS = ["fill", "order", "listen", "passage"], BANK_PENDING_MAX = 400;
export function bankRows(c: Clean, result: any): { kind: string; part: string; skill: string; data: unknown }[] {
  if (c.task === "similar") return (result.items || []).map((it: any) => ({ kind: result.kind, part: "", skill: "", data: { ...it, src: str(c.data.example_question, 120) } }));
  if (c.task === "listen") return (result.items || []).map((it: any) => ({ kind: "listen", part: result.part, skill: result.part === "L1" ? "listen-tf" : result.part === "L2" ? "listen-short" : "listen-long", data: it }));
  if (c.task === "passage") return [{ kind: "passage", part: "R3", skill: "passage", data: { passage: result.passage, questions: result.questions, used_words: result.used_words } }];
  return [];
}
export async function bankSave(c: Clean, result: any, deps: Deps): Promise<void> {
  if (!deps.db) return;
  const rows = bankRows(c, result); if (!rows.length) return;
  try {
    const wait = await deps.db("GET", "bank_items?select=id&status=eq.pending&limit=" + BANK_PENDING_MAX);
    if ((wait || []).length >= BANK_PENDING_MAX) return; // the admin has enough to look at
    const out = [];
    for (const r of rows) out.push({ ...r, status: "pending", hash: (await sha("cb-bank:" + r.kind + ":" + JSON.stringify(r.data))).slice(0, 40) });
    await deps.db("POST", "bank_items?on_conflict=hash", out);
  } catch (_e) { /* the bank is a bonus: the learner already has the questions */ }
}
export const BANK_COLS = "select=id,kind,part,skill,data,status,created_at";
/* public: bank_get · admin: bank_list, bank_decide, q_stats */
export async function bankTask(task: string, body: any, req: Request, env: Record<string, string | undefined>, deps: Deps, h: Record<string, string>): Promise<Response | null> {
  if (["bank_get", "bank_list", "bank_decide", "q_stats"].indexOf(task) < 0) return null;
  if (!deps.db) return reply(500, { ok: false, error: "not_configured" }, h);
  const p = body.payload && typeof body.payload === "object" ? body.payload : {};
  try {
    if (task === "bank_get") {
      const since = Math.max(0, parseInt(p.since, 10) || 0);
      const rows = await deps.db("GET", "bank_items?select=id,kind,part,skill,data&status=eq.approved" + (since ? "&id=gt." + since : "") + "&order=id.asc&limit=500");
      return reply(200, { ok: true, task, result: { rows: (rows || []).map((r: any) => ({ id: r.id, kind: r.kind, part: r.part || "", skill: r.skill || "", data: r.data })), full: !since } }, h);
    }
    const ip = clientIp(req);
    if (ip && tooManyFails(ip)) return reply(429, { ok: false, error: "busy" }, h);
    if (!(await adminOk(req, env))) { if (ip) noteFail(ip); return reply(401, { ok: false, error: "bad_admin" }, h); }
    if (task === "bank_list") {
      const st = ["pending", "approved", "rejected"].indexOf(p.status) >= 0 ? p.status : "pending";
      const rows = await deps.db("GET", "bank_items?" + BANK_COLS + "&status=eq." + st + "&order=id.desc&limit=30&offset=" + Math.max(0, Math.min(5000, parseInt(p.offset, 10) || 0)));
      const all = await deps.db("GET", "bank_items?select=status&limit=5000");
      const n: Record<string, number> = { pending: 0, approved: 0, rejected: 0 }; (all || []).forEach((r: any) => { if (n[r.status] != null) n[r.status]++; });
      return reply(200, { ok: true, task, result: { rows: rows || [], counts: n } }, h);
    }
    if (task === "bank_decide") {
      const ids = (Array.isArray(p.ids) ? p.ids : [p.id]).slice(0, 50).map((x: unknown) => parseInt(String(x), 10)).filter((x: number) => x > 0);
      const st = p.decision === "approve" ? "approved" : p.decision === "reject" ? "rejected" : p.decision === "reset" ? "pending" : "";
      if (!ids.length) return reply(400, { ok: false, error: "bad_id" }, h);
      if (!st) return reply(400, { ok: false, error: "bad_decision" }, h);
      await deps.db("PATCH", "bank_items?id=in.(" + ids.join(",") + ")", { status: st, decided_at: new Date().toISOString() });
      return reply(200, { ok: true, task, result: { ids, status: st } }, h);
    }
    // q_stats: right / wrong per question across every learner, from the per-question counts each phone keeps in its backup
    const rows = await deps.db("GET", "learners?select=id,qlog:data->qlog&limit=200"), agg: Record<string, { r: number; w: number; l: number }> = {};
    (rows || []).forEach((r: any) => {
      const q = r && r.qlog && typeof r.qlog === "object" && !Array.isArray(r.qlog) ? r.qlog : null; if (!q) return;
      Object.keys(q).slice(0, 6000).forEach((k) => {
        const v = q[k]; if (!Array.isArray(v) || k.length > 80) return;
        const a = agg[k] || (agg[k] = { r: 0, w: 0, l: 0 }), rr = Math.max(0, Math.min(1e5, Math.round(+v[0]) || 0)), ww = Math.max(0, Math.min(1e5, Math.round(+v[1]) || 0));
        a.r += rr; a.w += ww; if (rr + ww) a.l++;
      });
    });
    const list = Object.keys(agg).map((k) => ({ k, r: agg[k].r, w: agg[k].w, l: agg[k].l })).filter((x) => x.r + x.w >= 2 && x.w > 0)
      .sort((a, b) => b.w / (b.r + b.w) - a.w / (a.r + a.w) || b.w - a.w).slice(0, 60);
    return reply(200, { ok: true, task, result: { rows: list, learners: (rows || []).filter((r: any) => r && r.qlog).length, questions: Object.keys(agg).length } }, h);
  } catch (_e) { return reply(502, { ok: false, error: "db_error" }, h); }
}
