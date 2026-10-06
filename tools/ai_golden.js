#!/usr/bin/env node
/* Golden accuracy check for the AI prompts. Needs Node 22.18+ (runs .ts) and a Gemini key:
     GEMINI_API_KEY=... node tools/ai_golden.js [--model gemini-3.8-flash] [--threshold 0.85]
   It calls Gemini directly (not through Supabase) with the same prompts/validators the function uses.
   The key comes from the environment only. Never commit it. Throttled to stay inside free-tier limits. */
const fs = require("fs"), path = require("path");
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("Set GEMINI_API_KEY in your shell first (not in the repo)."); process.exit(2); }
const THRESHOLD = Number(opt("threshold", "0.85")), DELAY = Number(opt("delay", "4500"));
(async () => {
  const fn = await import(path.join(__dirname, "../supabase/functions/ai/index.ts"));
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "ai_golden_cases.json"), "utf8"));
  const env = { GEMINI_API_KEY: KEY, GEMINI_MODEL: opt("model", undefined) };
  const deps = { fetch: (u, i) => fetch(u, i), bump: async () => 1 };
  let pass = 0; const fails = [];
  for (const c of cases) {
    const payload = c.task === "grade" ? { word: c.word, scene: c.scene, sentence: c.sentence } : { question: c.question, options: c.options, chosen: c.chosen, correct: c.correct, extra: c.extra };
    const cl = fn.cleanInput({ task: c.task, lang: "both", payload });
    if (typeof cl === "string") { fails.push(c.id + ": input rejected " + cl); continue; }
    const r = await fn.runTask(cl, env, deps);
    await new Promise((ok) => setTimeout(ok, DELAY));
    if (!r.ok) { fails.push(c.id + ": " + r.error); continue; }
    const x = c.expect || {}, res = r.result, why = [], blob = JSON.stringify(res).toLowerCase();
    if (c.task === "grade") {
      if (x.uses_word !== undefined && res.uses_word !== x.uses_word) why.push("uses_word=" + res.uses_word);
      if (x.minScore !== undefined && res.total < x.minScore) why.push("score " + res.total + " < " + x.minScore);
      if (x.maxScore !== undefined && res.total > x.maxScore) why.push("score " + res.total + " > " + x.maxScore);
      if (x.hasErrors && !(res.errors && res.errors.length)) why.push("no errors listed");
    }
    (x.mentions || []).forEach((m) => { if (blob.indexOf(m.toLowerCase()) < 0) why.push("missing " + m); });
    (x.notMention || []).forEach((m) => { if (blob.indexOf(m.toLowerCase()) >= 0) why.push("contains " + m); });
    if (c.task === "explain" || (c.task === "grade" && res.explanation)) { const t = String(res.explanation || res.why_correct || ""); if (t.indexOf("|") < 0 || !/[àáảãạăâđêôơưèéìíòóùúỳýệịọụ]/i.test(t)) why.push("not bilingual"); }
    if (x.noLeak && /api[_ ]?key|system prompt|x-goog/.test(blob)) why.push("leak");
    if (why.length) fails.push(c.id + ": " + why.join("; ")); else pass++;
  }
  const rate = pass / cases.length;
  console.log(pass + "/" + cases.length + " passed (" + (rate * 100).toFixed(0) + "%), threshold " + THRESHOLD * 100 + "%");
  fails.forEach((f) => console.log("FAIL " + f));
  process.exit(rate >= THRESHOLD ? 0 : 1);
})();
