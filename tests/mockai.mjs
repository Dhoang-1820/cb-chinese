// Local stand-in for the AI service used by tests/e2e.py: runs the REAL handler (supabase/functions/ai/index.ts)
// with a fake Gemini and an in-memory database. No key and no network are needed. Needs Node 22.18+ (it imports .ts).
// Usage: PORT=9201 ORIGIN=http://localhost:8766 node tests/mockai.mjs
import http from "http";
const PORT = Number(process.env.PORT || 9201);
import * as fn from "../supabase/functions/ai/index.ts";
const env = { ADMIN_CODE: "admin-code-12345", GEMINI_API_KEY: "k", AI_DAILY_CAP: process.env.CAP || "50", ALLOWED_ORIGINS: process.env.ORIGIN || "http://localhost:8766" };
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
  if (props.reply) {
    const msg = d.learner_latest_message || "", n = d.learner_turns || 0;
    const reply = msg ? { zh: "那为什么周日只按一点五倍算？", pinyin: "Nà wèishénme zhōurì zhǐ àn yī diǎn wǔ bèi suàn?", meaning: "Then why was Sunday paid at only 1.5 times?" }
      : { zh: "你好，我想问问加班费的事。", pinyin: "Nǐ hǎo, wǒ xiǎng wènwen jiābānfèi de shì.", meaning: "Hi, I want to ask about overtime pay." };
    const done = n >= 5;
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
const fakeFetch = async (url, init) => {
  n++;
  if (mode === "429") return { status: 429, json: async () => ({}) };
  if (mode === "403") return { status: 403, json: async () => ({}) };
  const c = JSON.parse(init.body);
  return { status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(good(c)) }] } }] }) };
};
let count = 0;
const rows = []; let nid = 1;
const lrn = [];
const db = async (method, path, body) => {
  if (path.startsWith("ai_usage")) return [{ day: new Date().toISOString().slice(0, 10), n: Math.min(count, +env.AI_DAILY_CAP) }, { day: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10), n: 7 }]; // today's counter + one earlier day
  if (path.startsWith("learners")) {
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
const deps = { fetch: fakeFetch, bump: async (cap) => (++count > cap ? -1 : count), db };
http.createServer(async (rq, rs) => {
  if (rq.url === "/__mode") { let b = ""; rq.on("data", (d) => (b += d)); rq.on("end", () => { mode = b.trim() || "ok"; count = mode === "reset" ? 0 : count; if (mode === "reset") mode = "ok"; rs.end("mode=" + mode); }); return; }
  if (rq.url === "/__rows") { rs.end(JSON.stringify(rows)); return; }
  if (rq.url === "/__stale") { lrn.forEach((r) => { r.updated_at = new Date(Date.now() - 5 * 864e5).toISOString(); }); rs.end("stale=" + lrn.length); return; } // every backup now looks 5 days old
  if (rq.url === "/__calls") { rs.end(String(n)); return; }
  let body = ""; rq.on("data", (d) => (body += d));
  rq.on("end", async () => {
    const req = new Request("http://localhost:" + PORT + "/ai", { method: rq.method, headers: rq.headers, body: rq.method === "POST" ? body : undefined });
    const res = await fn.handle(req, env, deps);
    rs.writeHead(res.status, Object.fromEntries(res.headers)); rs.end(Buffer.from(await res.arrayBuffer()));
  });
}).listen(PORT, () => console.log("mock ai on " + PORT));
