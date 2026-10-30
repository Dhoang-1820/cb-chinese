// Local stand-in for the AI service used by tests/e2e.py: runs the REAL handler (supabase/functions/ai/index.ts)
// with a fake Gemini and an in-memory database. No key and no network are needed. Needs Node 22.18+ (it imports .ts).
// Usage: PORT=9201 ORIGIN=http://localhost:8766 node tests/mockai.mjs
import http from "http";
const PORT = Number(process.env.PORT || 9201);
import * as fn from "../supabase/functions/ai/index.ts";
const env = { SUPABASE_AUTH_URL: "http://auth.mock", SUPABASE_ANON_KEY: "", ADMIN_CODE: "admin-code-12345", GEMINI_API_KEY: "k", AI_DAILY_CAP: process.env.CAP || "50", ALLOWED_ORIGINS: process.env.ORIGIN || "http://localhost:8766" };
let n = 0, mode = "ok";
const good = (c) => {
  const d = JSON.parse(c.contents[0].parts[0].text);
  if (c.generationConfig.responseSchema.properties.verdict) {
    const it = d.item || {}; let val = null;
    if (mode === "skeptic" && !d.discussion) return { verdict: "ok", reasoning: "I believe the key is right.", patch: { set: [] }, confidence: "high" };
    if (typeof it.answer === "string" && Array.isArray(it.words)) val = it.words.find((w) => w !== it.answer);
    else if (typeof it.answer === "number" && Array.isArray(it.options)) val = String((it.answer + 1) % it.options.length);
    else if (typeof it.answer === "string" && it.parts) val = it.answer.split("").reverse().join("");
    return val == null ? { verdict: "ok", reasoning: "Looks fine.", patch: { set: [] }, confidence: "high" } : { verdict: "key_wrong", reasoning: "The marked answer does not fit; " + val + " fits better.", patch: { set: [{ path: "answer", value: String(val) }] }, confidence: "high" };
  }
  if (c.generationConfig.responseSchema.properties.uses_word) {
    const bad = /每天我/.test(d.learner_sentence);
    return { uses_word: d.learner_sentence.includes(d.target_word), grammar: bad ? 1 : 2, natural: bad ? 1 : 2, relevance: 1, corrected: bad ? "我每天坐地铁去公司。" : d.learner_sentence,
      errors: bad ? [{ wrong: "每天我", fix: "我每天", reason: "The time word goes after the subject." }] : [], explanation: "Test explanation.", model: { zh: "他每天坐地铁上班。", pinyin: "tā měitiān zuò dìtiě shàngbān.", meaning: "He takes the subway to work." }, confidence: "high" };
  }
  const props = c.generationConfig.responseSchema.properties;
  if (props.items && d.part) { // new listening questions
    if (d.part === "L1") return { items: [
      { text: "这家公司每年给员工两次培训的机会，大家都可以申请。", statement: "★ 员工每年可以申请培训。", answer: "true", explain: "两次培训的机会 + 可以申请." },
      { text: "王经理下个月去上海出差，这周他还在办公室。", statement: "王经理这周在上海。", answer: "false", explain: "这周他还在办公室." },
      { text: "short", statement: "bad", answer: "maybe", explain: "dropped" }], confidence: "high" };
    const two = [{ sp: "男", zh: "你的工资这个月怎么少了？" }, { sp: "女", zh: "因为我请了两天假，所以扣了一点。" }];
    const dlg = d.part === "L2" ? two : two.concat([{ sp: "男", zh: "请假是按天扣钱吗？" }, { sp: "女", zh: "对，没有提前申请的话，会扣得更多。" }]);
    return { items: [
      { dialogue: dlg, question: "女的工资为什么少了？", options: ["请了假", "迟到了", "换了工作", "加班少"], answer: "0", explain: "因为我请了两天假." },
      { dialogue: [{ sp: "男", zh: "面试是几点？" }, { sp: "男", zh: "same speaker twice" }], question: "几点？", options: ["一", "二", "三", "四"], answer: "1", explain: "dropped" }], confidence: "high" };
  }
  if (props.passage) return { passage: "我们公司每年都会给员工提供培训。新员工进公司以后，先参加一个星期的培训，了解公司的规定和福利。培训结束以后，部门经理会和每个人面试，决定他们的工作。如果你想申请别的部门，也可以在培训以后提出。",
    used_words: ["培训"], questions: [
      { q: "新员工先做什么？", options: ["参加培训", "去出差", "申请加班", "换部门"], answer: 0, explain: "先参加一个星期的培训." },
      { q: "根据这段话，可以知道：", options: ["培训一个月", "经理会面试", "不能换部门", "没有福利"], answer: 1, explain: "部门经理会和每个人面试." }], confidence: "high" };
  if (props.groups) return { groups: [
    { title: "以为 vs 认为", items: [0, 1, 99], explain: "以为 = thought wrongly; 认为 = think, consider.", tip: "If it turned out false, use 以为." },
    { title: "Word order: time after subject", items: [2, 0], explain: "Subject + time + verb.", tip: "Put 每天 after the subject." }], confidence: "high" };
  if (props.text && props.action) return { text: "Chào " + d.learner_name + "! Còn " + d.days_until_exam + " ngày nữa là thi rồi. Hôm nay em làm Reading part 1 trong 10 phút nhé. 加油！", action: d.allowed_actions.length ? d.allowed_actions[0].href : "", confidence: "high" };
  if (props.items && d.kind) { // similar questions
    if (d.kind === "order") return { items: [
      { tokens: ["每天", "他", "坐地铁", "上班"], answer: "他每天坐地铁上班", explain: "Time comes after the subject." },
      { tokens: ["已经", "我们", "完成了", "工作"], answer: "我们已经完成了工作", explain: "已经 goes before the verb." },
      { tokens: ["被", "文件", "经理", "拿走了"], answer: "文件被经理拿走了", explain: "被 + doer + verb." }], confidence: "high" };
    return { items: [
      { sentence: "他每天都____上班，从来不迟到。", options: ["按时", "突然", "随便", "马上"], answer: "0", explain: "按时 = on time." },
      { sentence: "请大家____准备材料。", options: ["按时", "认真", "突然", "曾经"], answer: "1", explain: "认真 + verb." },
      { sentence: "这份工作____有意思。", options: ["很", "把", "被", "了"], answer: "0", explain: "很 + adjective." },
      { sentence: "no gap here", options: ["a"], answer: "9", explain: "dropped" }], confidence: "high" };
  }
  if (props.reply) {
    const msg = d.learner_latest_message || "", n = d.learner_turns || 0;
    const reply = d.wrap_up ? { zh: "好，那我先回去工作了，谢谢你！", pinyin: "Hǎo, nà wǒ xiān huíqu gōngzuò le, xièxie nǐ!", meaning: "OK, I'll get back to work then. Thanks!" } : msg ? { zh: "那为什么周日只按一点五倍算？", pinyin: "Nà wèishénme zhōurì zhǐ àn yī diǎn wǔ bèi suàn?", meaning: "Then why was Sunday paid at only 1.5 times?" }
      : { zh: "你好，我想问问加班费的事。", pinyin: "Nǐ hǎo, wǒ xiǎng wènwen jiābānfèi de shì.", meaning: "Hi, I want to ask about overtime pay." };
    const done = d.wrap_up === true || n >= 20;
    return { reply, words: [{ zh: "加班费", pinyin: "jiābānfèi", meaning: "overtime pay" }],
      feedback: !msg ? { corrected: "", note: "", upgrade: "", upgrade_point: "" } : /我问/.test(msg) ? { corrected: "我想问一下。", note: "Add 想 before 问.", upgrade: "既然你有问题，我就帮你查一下。", upgrade_point: "既然…就" } : { corrected: msg, note: "", upgrade: "", upgrade_point: "" },
      hint: "请稍等。", hint_pinyin: "Qǐng shāo děng.", done, confidence: "high",
      summary: done ? { goal_met: true, score: 8, comment: "You applied the 200% rule correctly.", phrase: { zh: "按照规定", pinyin: "ànzhào guīdìng", meaning: "according to the rules" } } : undefined };
  }
  if (props.answer) return { answer: "Test answer about " + d.subject + " (" + d.preset + ").", example: { zh: "我们公司有五险一金。", pinyin: "wǒmen gōngsī yǒu wǔ xiǎn yī jīn.", meaning: "Our company has social insurance." }, confidence: "high" };
  if (props.corrected_text) {
    const parts = d.learner_text.split(/(?<=[。！？])/).filter(Boolean);
    const bad = /每天我/.test(d.learner_text);
    return { sentences: parts.map((x) => ({ original: x, corrected: bad ? x.replace("每天我", "我每天") : x, note: bad ? "Time word after subject." : "" })), corrected_text: bad ? d.learner_text.replace("每天我", "我每天") : d.learner_text, score: 4, tags: bad ? ["word_order"] : [], summary: "Good effort. Practise word order.", confidence: "high" };
  }
  if (props.actions) return { follow_up: d.last_weeks_advice ? "Done: " + d.last_weeks_advice.filter((a) => a.done).length + " of " + d.last_weeks_advice.length + "." : "", habit: d.study_habit && d.study_habit.most_skipped_weekday ? "You often skip " + d.study_habit.most_skipped_weekday + "." : "", headline: "You studied " + d.active_days_of_7 + " days. Nice.", wins: ["Steady streak"], actions: [{ text: "Do 10 minutes of measure words", minutes: 10, skill: "measure" }, { text: "One picture writing round", minutes: 10, skill: "writing" }, { text: "Review due cards", minutes: 15, skill: "review" }], note: "Keep going.", confidence: "medium" };
  return { why_wrong: "Chose " + d.learner_chose + " which does not fit.", why_correct: d.correct + " fits here.", rule: "虽然…但是… pair.", example: { zh: "虽然很累，但是我很开心。", pinyin: "suīrán hěn lèi, dànshì wǒ hěn kāixīn.", meaning: "Tired but happy." }, tip: "Learn as a pair.", confidence: "medium" };
};
const users = { "tok-aaaaaaaaaaaaaaaaaaaa": "11111111-1111-1111-1111-111111111111", "tok-bbbbbbbbbbbbbbbbbbbb": "22222222-2222-2222-2222-222222222222" };
const fakeFetch = async (url, init) => {
  if (String(url).startsWith("http://auth.mock/auth/v1/settings")) return { ok: true, status: 200, json: async () => ({ external: { google: mode !== "nogoogle" } }) };
  if (String(url).startsWith("http://auth.mock/auth/v1/user")) {
    const t = String((init.headers || {}).authorization || "").replace(/^Bearer /, ""), id = users[t];
    return id ? { ok: true, status: 200, json: async () => ({ id, app_metadata: { provider: "google" } }) } : { ok: false, status: 401, json: async () => ({}) };
  }
  n++;
  if (mode === "429") return { status: 429, json: async () => ({}) };
  if (mode === "403") return { status: 403, json: async () => ({}) };
  const c = JSON.parse(init.body);
  return { status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(good(c)) }] } }] }) };
};
let count = 0;
const rows = []; let nid = 1;
const lrn = [];
const msgs = []; let mid = 1;
const lives = []; // live pings the server sent (topic names), for tests
const bank = { rows: [], nid: 1 }, links = { rows: [], nid: 1 }, tickets = { rows: [], nid: 1 };
/* just enough PostgREST for the bank and the sign-in links: eq / gt / in filters, order, limit, offset, on_conflict=hash */
function table(t, method, path, body) {
  const q = new URLSearchParams(path.split("?")[1] || "");
  const keep = (r) => [...q.entries()].every(([k, v]) => {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(k)) return true;
    const [op, ...rest] = v.split("."), val = rest.join(".");
    if (op === "eq") return String(r[k]) === val;
    if (op === "gt") return +r[k] > +val;
    if (op === "in") return val.replace(/[()]/g, "").split(",").indexOf(String(r[k])) >= 0;
    return true;
  });
  if (method === "POST") {
    (Array.isArray(body) ? body : [body]).forEach((r) => { if (q.get("on_conflict") === "hash" && t.rows.some((x) => x.hash === r.hash)) return; t.rows.push({ id: t.nid++, created_at: new Date().toISOString(), ...r }); });
    return null;
  }
  if (method === "PATCH") { t.rows.filter(keep).forEach((r) => Object.assign(r, body)); return null; }
  if (method === "DELETE") { t.rows.filter(keep).forEach((r) => t.rows.splice(t.rows.indexOf(r), 1)); return null; }
  let out = t.rows.filter(keep);
  if (q.get("order") === "id.desc") out = out.slice().reverse();
  out = out.slice(+(q.get("offset") || 0));
  if (q.get("limit")) out = out.slice(0, +q.get("limit"));
  return JSON.parse(JSON.stringify(out));
}
const db = async (method, path, body) => {
  if (path.startsWith("ai_usage")) return [{ day: new Date().toISOString().slice(0, 10), n: Math.min(count, +env.AI_DAILY_CAP) }, { day: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10), n: 7 }]; // today's counter + one earlier day
  if (path.startsWith("messages")) { // enough PostgREST for the chat: eq / gt / gte / is.null filters, order=id.desc, limit
    const q = new URLSearchParams(path.split("?")[1] || "");
    const keep = (r) => [...q.entries()].every(([k, v]) => {
      if (["select", "order", "limit"].includes(k)) return true;
      const [op, ...rest] = v.split("."), val = rest.join(".");
      if (op === "eq") return String(r[k]) === val;
      const num = /^\d+$/.test(val), a = num ? +r[k] : String(r[k]), b = num ? +val : val;
      if (op === "gt") return a > b;
      if (op === "gte") return a >= b;
      if (op === "lte") return a <= b;
      if (op === "is") return r[k] == null;
      return true;
    });
    if (method === "POST") { (Array.isArray(body) ? body : [body]).forEach((m) => msgs.push({ id: mid++, seen_at: null, action: null, ...m })); return null; }
    if (method === "DELETE") { const del = msgs.filter(keep); del.forEach((m) => msgs.splice(msgs.indexOf(m), 1)); return null; }
    if (method === "PATCH") { msgs.filter(keep).forEach((r) => Object.assign(r, body)); return null; }
    let out = msgs.filter(keep);
    if (q.get("order") === "id.desc") out = out.slice().reverse();
    if (q.get("limit")) out = out.slice(0, +q.get("limit"));
    return JSON.parse(JSON.stringify(out));
  }
  if (path.startsWith("bank_items")) return table(bank, method, path, body);
  if (path.startsWith("auth_links")) return table(links, method, path, body);
  if (path.startsWith("auth_tickets")) return table(tickets, method, path, body);
  if (path.startsWith("learners")) {
    if (method === "GET" && path.indexOf("qlog:data->qlog") >= 0) return lrn.map((r) => ({ id: r.id, qlog: r.data && r.data.qlog ? JSON.parse(JSON.stringify(r.data.qlog)) : null }));
    const m = /id=eq\.([a-f0-9]+)/.exec(path), i = m ? lrn.findIndex((r) => r.id === m[1]) : -1;
    if (method === "POST") { lrn.push({ ...body }); return null; }
    if (method === "PATCH") { if (i >= 0) Object.assign(lrn[i], body); return null; }
    if (method === "DELETE") { if (i >= 0) lrn.splice(i, 1); return null; }
    return JSON.parse(JSON.stringify(m ? (i >= 0 ? [lrn[i]] : []) : lrn)); // copies, like a real database
  }
  if (method === "POST") { rows.push({ id: nid++, created_at: new Date().toISOString(), ...body }); return null; }
  if (method === "PATCH") { const id = +/id=eq\.(\d+)/.exec(path)[1]; Object.assign(rows.find((r) => r.id === id), body); return null; }
  const tk = /verdict-%3E%3Etoken=eq\.([a-f0-9-]+)/.exec(path); if (tk) return rows.filter((r) => r.verdict && r.verdict.token === tk[1]);
  const bid = /[?&]id=eq\.(\d+)/.exec(path); if (bid && method === "GET") return rows.filter((r) => r.id === +bid[1]);
  const st = /status=eq\.(\w+)/.exec(path); if (/quarantine=is\.true/.test(path)) return rows.filter((r) => r.quarantine);
  const stIn = /status=in\.\(([^)]*)\)/.exec(path); if (stIn && !/ref=eq\./.test(path)) return rows.filter((r) => stIn[1].split(",").indexOf(r.status) >= 0); // admin_stats: reports waiting
  return rows.filter((r) => !st || r.status === st[1]).slice().reverse();
};
const deps = { fetch: fakeFetch, bump: async (cap) => (++count > cap ? -1 : count), db, live: async (topic) => { lives.push(topic); } };
http.createServer(async (rq, rs) => {
  if (rq.url === "/__mode") { let b = ""; rq.on("data", (d) => (b += d)); rq.on("end", () => { mode = b.trim() || "ok"; count = mode === "reset" ? 0 : count; if (mode === "reset") mode = "ok"; rs.end("mode=" + mode); }); return; }
  if (rq.url === "/__rows") { rs.end(JSON.stringify(rows)); return; }
  if (rq.url === "/__stale") { lrn.forEach((r) => { r.updated_at = new Date(Date.now() - 5 * 864e5).toISOString(); }); rs.end("stale=" + lrn.length); return; } // every backup now looks 5 days old
  if (rq.url === "/__calls") { rs.end(String(n)); return; }
  if (rq.url === "/__bank") { rs.end(JSON.stringify(bank.rows)); return; }
  if (rq.url === "/__links") { rs.end(JSON.stringify(links.rows)); return; }
  if (rq.url === "/__lives") { rs.end(JSON.stringify(lives)); return; }
  let body = ""; rq.on("data", (d) => (body += d));
  rq.on("end", async () => {
    const req = new Request("http://localhost:" + PORT + "/ai", { method: rq.method, headers: rq.headers, body: rq.method === "POST" ? body : undefined });
    const res = await fn.handle(req, env, deps);
    rs.writeHead(res.status, Object.fromEntries(res.headers)); rs.end(Buffer.from(await res.arrayBuffer()));
  });
}).listen(PORT, () => console.log("mock ai on " + PORT));
