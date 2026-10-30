import { HAN, HREF_RE, reply, str } from "./util.ts";
import type { Lang, Task } from "./prompts.ts";
import { MOODS, ROLEPLAY_SCENES, SCHEMAS, SKILLS, TAGS, systemPrompt } from "./prompts.ts";

/* Checks what the phone sends (cleanInput), builds the Gemini request and checks what comes back (validateResult). */

/* ---------------- input checking ---------------- */


export type Clean = { task: Task; lang: Lang; data: Record<string, unknown> };
export function cleanInput(body: any): Clean | string {
  if (!body || typeof body !== "object") return "bad_request";
  const task = body.task as Task;
  if (["grade", "explain", "ask", "coach", "weekly", "roleplay", "similar", "listen", "passage", "patterns", "draft"].indexOf(task) < 0) return "bad_task";
  const lang: Lang = body.lang === "vi" || body.lang === "en" ? body.lang : "both";
  const p = body.payload && typeof body.payload === "object" ? body.payload : {};
  if (task === "grade") {
    const sentence = str(p.sentence, 150), word = str(p.word, 12);
    if (!sentence) return "empty_sentence";
    if (!word || !HAN.test(word)) return "bad_word";
    return { task, lang, data: { target_word: word, target_word_pinyin: str(p.wordPinyin, 40), target_word_meaning: str(p.wordMeaning, 80), picture_description: str(p.scene, 200), learner_sentence: sentence } };
  }
  if (task === "ask") {
    const text = str(p.text, 80), q = str(p.question, 200), preset = ["why", "example", "similar", "usage"].indexOf(p.preset) >= 0 ? p.preset : (q ? "free" : "why");
    if (!text || !HAN.test(text)) return "bad_word";
    return { task, lang, data: { subject: text, context_sentence: str(p.context, 300), preset, learner_question: q } };
  }
  if (task === "coach") {
    const text = str(p.text, 400), prompt = str(p.prompt, 200);
    const words = (Array.isArray(p.words) ? p.words : []).slice(0, 4).map((w: unknown) => str(w, 12)).filter((w: string) => w && HAN.test(w));
    if (!text || !HAN.test(text)) return "empty_sentence";
    if (!prompt) return "empty_question";
    return { task, lang, data: { writing_prompt: prompt, required_words: words, learner_text: text } };
  }
  if (task === "roleplay") {
    const scene = ROLEPLAY_SCENES[str(p.scene, 20)] ? str(p.scene, 20) : "";
    if (!scene) return "bad_scene";
    const sc = ROLEPLAY_SCENES[scene];
    const hist = (Array.isArray(p.history) ? p.history : []).slice(-10).map((h: any) => ({ speaker: h && h.role === "me" ? "learner" : "character", zh: str(h && h.zh, 160) })).filter((h: any) => h.zh);
    const start = p.start === true && !hist.some((h: any) => h.speaker === "learner");
    const wrap = !start && p.wrap === true && hist.some((h: any) => h.speaker === "learner");
    const text = start ? "" : str(p.text, 120);
    if (!start && !(wrap && !text) && (!text || !HAN.test(text))) return "empty_sentence";
    const pick = (x: unknown, n: number) => { const v = typeof x === "number" && isFinite(x) ? Math.abs(Math.round(x)) : 0; return v % n; };
    // the history sent is only the last 10 lines, so the app also sends how many replies the learner has made in total
    const told = typeof p.turns === "number" && isFinite(p.turns) ? Math.max(0, Math.min(50, Math.round(p.turns))) : 0;
    const learnerTurns = Math.max(told, hist.filter((h: any) => h.speaker === "learner").length + (text ? 1 : 0));
    return { task, lang, data: { character: sc.role, situation: sc.situation, company_rules: sc.rules, hidden_detail: sc.twists[pick(p.variant, sc.twists.length)],
      mood: MOODS[pick(p.mood, MOODS.length)], level: p.level === "hsk5" ? "hsk5" : "hsk4", related_topics: sc.topics, wrap_up: wrap, history: hist, learner_latest_message: text, learner_turns: Math.min(30, learnerTurns) } };
  }
  if (task === "weekly") {
    const n = (x: unknown, hi: number) => { const v = typeof x === "number" && isFinite(x) ? Math.round(x) : 0; return Math.max(0, Math.min(hi, v)); };
    const skills = (Array.isArray(p.skills) ? p.skills : []).slice(0, 8).map((k: any) => ({ skill: str(k && k.skill, 40), accuracy_percent: n(k && k.acc, 100), answered: n(k && k.n, 9999) })).filter((k: any) => k.skill);
    const tags = (Array.isArray(p.tags) ? p.tags : []).slice(0, 5).map((k: any) => ({ mistake_type: TAGS.indexOf(k && k.tag) >= 0 ? k.tag : "other", count: n(k && k.n, 999) }));
    const data: Record<string, unknown> = { days_until_exam: typeof p.daysLeft === "number" ? Math.round(p.daysLeft) : null, active_days_of_7: n(p.active, 7), xp: n(p.xp, 99999), new_words: n(p.words, 9999), cards_reviewed: n(p.cards, 99999), mock_tests: n(p.mocks, 99), predicted_score_of_300: typeof p.forecast === "number" ? n(p.forecast, 300) : null, skills, recurring_mistakes: tags };
    // Optional extras from newer app versions: the habit summary, the accuracy trend, rule-based patterns and what happened to last week's advice.
    const hr = (x: unknown) => (typeof x === "number" && isFinite(x) && x >= 0 && x <= 23 ? Math.round(x) : null);
    const hb = p.habit && typeof p.habit === "object" ? p.habit : null;
    if (hb) data.study_habit = { days_looked_at: n(hb.span, 28), study_days_in_that_time: n(hb.active28, 28), longest_gap_days: n(hb.longestGap, 28), most_skipped_weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(hb.skipDay) >= 0 ? hb.skipDay : null,
      usual_start_hour_0_23: hr(hb.usualHour), planned_hour_0_23: hr(hb.planHour), minutes_per_study_day: typeof hb.minutes === "number" ? n(hb.minutes, 600) : null, goal_days_per_week: n(hb.goalDays, 7) };
    if (Array.isArray(p.trend) && p.trend.length) data.accuracy_trend = p.trend.slice(0, 8).map((k: any) => ({ skill: str(k && k.skill, 40), percent_last_14_days: n(k && k.acc, 100), percent_14_days_before: typeof (k && k.before) === "number" ? n(k.before, 100) : null, answered: n(k && k.n, 9999) })).filter((k: any) => k.skill);
    if (Array.isArray(p.patterns) && p.patterns.length) data.repeated_mistake_patterns = p.patterns.slice(0, 3).map((k: any) => ({ kind: k && k.kind === "skill" ? "many wrong answers in one skill this week" : "the same items missed again and again", skill: str(k && k.skill, 40), wrong_answers: n(k && k.n, 999) }));
    if (Array.isArray(p.lastAdvice) && p.lastAdvice.length) {
      data.last_weeks_advice = p.lastAdvice.slice(0, 3).map((a: any) => ({ action: str(a && a.text, 300), skill: SKILLS.indexOf(a && a.skill) >= 0 ? a.skill : "review", minutes: n(a && a.minutes, 30), done: !!(a && a.done === true), answers_since: n(a && a.n, 9999) })).filter((a: any) => a.action);
      data.last_advice_days_ago = n(p.lastAdviceDays, 60);
    }
    return { task, lang, data };
  }
  if (task === "similar") { // three new practice questions like one the learner missed
    const kind = p.kind === "order" ? "order" : p.kind === "fill" ? "fill" : "";
    if (!kind) return "bad_kind";
    const sentence = str(p.sentence, 200), answer = str(p.answer, 120);
    const options = Array.isArray(p.options) ? p.options.slice(0, 6).map((o: unknown) => str(o, 30)).filter(Boolean) : [];
    if (!HAN.test(sentence + answer) || !answer) return "empty_question";
    return { task, lang, data: { kind, example_question: sentence, example_options: options, example_answer: answer } };
  }
  if (task === "listen" || task === "passage") { // new practice built around the words the learner keeps missing
    const words = (Array.isArray(p.words) ? p.words : []).slice(0, 8).map((w: unknown) => str(w, 8)).filter((w: string) => HAN.test(w));
    if (task === "passage") return { task, lang, data: { target_words: words } };
    const part = ["L1", "L2", "L3"].indexOf(p.part) >= 0 ? p.part : "";
    if (!part) return "bad_kind";
    return { task, lang, data: { part, target_words: words } };
  }
  if (task === "patterns") {
    const ms = (Array.isArray(p.mistakes) ? p.mistakes : []).slice(0, 25).map((m: any, i: number) => ({ i, skill: str(m && m.skill, 30), question: str(m && m.q, 160), learner_chose: str(m && m.chose, 60), correct: str(m && m.correct, 80) }))
      .filter((m: any) => m.question && m.correct);
    if (ms.length < 3) return "few_mistakes";
    return { task, lang, data: { mistakes: ms } };
  }
  if (task === "draft") {
    const n = (x: unknown, hi: number) => (typeof x === "number" && isFinite(x) ? Math.max(-1, Math.min(hi, Math.round(x))) : null);
    const acts = (Array.isArray(p.actions) ? p.actions : []).slice(0, 20).map((a: any) => ({ href: String(a && a.href || ""), label: str(a && a.label, 40) })).filter((a: any) => HREF_RE.test(a.href) && a.label);
    const last = (Array.isArray(p.last) ? p.last : []).slice(-6).map((m: any) => ({ from: m && m.from === "learner" ? "learner" : "team", text: str(m && m.text, 200), days_ago: n(m && m.ago, 60) })).filter((m: any) => m.text);
    return { task, lang: "vi", data: { learner_name: str(p.name, 30) || "em", days_until_exam: n(p.daysLeft, 400), days_since_last_study: n(p.idle, 400), streak_days: n(p.streak, 999), study_days_last_7: n(p.active7, 7),
      readiness_of_300: n(p.ready, 300), weakest_part: str(p.weak, 40), weakest_accuracy_percent: n(p.weakAcc, 100), last_mock_of_300: n(p.lastMock, 300), words_due: n(p.due, 9999), open_mistakes: n(p.mistakes, 9999),
      recent_messages: last, admin_note: str(p.note, 200), allowed_actions: acts } };
  }
  const question = str(p.question, 400);
  if (!question) return "empty_question";
  const options = Array.isArray(p.options) ? p.options.slice(0, 6).map((o: unknown) => str(o, 90)).filter(Boolean) : [];
  const correct = str(p.correct, 120);
  if (!correct) return "missing_correct";
  return { task, lang, data: { skill: str(p.skill, 40), question, options, learner_chose: str(p.chosen, 120), correct, extra_context: str(p.extra, 300) } };
}

/* ---------------- Gemini request / response ---------------- */

export function buildRequest(c: Clean) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt(c.task, c.lang) }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(c.data) }] }],
    generationConfig: { temperature: c.task === "roleplay" ? 0.9 : ["similar", "listen", "passage"].indexOf(c.task) >= 0 ? 0.7 : c.task === "draft" ? 0.6 : 0.2, maxOutputTokens: 2048, responseMimeType: "application/json", responseSchema: SCHEMAS[c.task] }
  };
}

export function int(x: unknown, lo: number, hi: number): number | null {
  const n = typeof x === "number" ? x : NaN;
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : null;
}
export function ex(o: any) {
  if (!o || typeof o !== "object") return null;
  const zh = str(o.zh, 120), pinyin = str(o.pinyin, 240), meaning = str(o.meaning, 600);
  return HAN.test(zh) && pinyin && meaning ? { zh, pinyin, meaning } : null;
}
export const CONF = ["high", "medium", "low"];

/* Returns a cleaned result, or null when the model's JSON is not usable (the caller retries once). */
export function validateResult(task: Task, raw: any, input?: Record<string, unknown>): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const confidence = CONF.indexOf(raw.confidence) >= 0 ? raw.confidence : "medium";
  if (task === "similar") {
    const kind = input && input.kind === "order" ? "order" : "fill", seen: Record<string, boolean> = {};
    const items = (Array.isArray(raw.items) ? raw.items : []).map((it: any) => {
      if (!it || typeof it !== "object") return null;
      const explain = str(it.explain, 400);
      if (kind === "fill") {
        const sentence = str(it.sentence, 120), options = (Array.isArray(it.options) ? it.options : []).map((o: unknown) => str(o, 12)).filter((o: string) => HAN.test(o));
        const a = parseInt(String(it.answer), 10), uniq = options.filter((o: string, i: number) => options.indexOf(o) === i);
        // one gap, four different options, a valid key, and the gap not already giving the answer away
        if ((sentence.match(/_{2,}/g) || []).length !== 1 || options.length !== 4 || uniq.length !== 4 || !(a >= 0 && a <= 3) || !HAN.test(sentence)) return null;
        if (seen[sentence]) return null; seen[sentence] = true;
        return { sentence, options, answer: a, explain };
      }
      const tokens = (Array.isArray(it.tokens) ? it.tokens : []).map((t: unknown) => str(t, 20)).filter((t: string) => HAN.test(t));
      const answer = str(it.answer, 80).replace(/[。！？.!?\s]+$/, "");
      // the answer must be exactly the tokens in some order
      if (tokens.length < 3 || tokens.length > 7 || !answer || tokens.join("").split("").sort().join("") !== answer.split("").sort().join("")) return null;
      if (seen[answer]) return null; seen[answer] = true;
      return { tokens, answer, explain };
    }).filter(Boolean).slice(0, 3);
    return items.length ? { kind, items, confidence } : null;
  }
  const mc = (opts: unknown, ans: unknown, max: number) => { // four different options and a valid key, or null
    const o = (Array.isArray(opts) ? opts : []).map((x: unknown) => str(x, max)).filter(Boolean), a = parseInt(String(ans), 10);
    return o.length === 4 && o.filter((x: string, i: number) => o.indexOf(x) === i).length === 4 && a >= 0 && a <= 3 ? { options: o, answer: a } : null;
  };
  if (task === "listen") {
    const part = input && (input.part === "L1" || input.part === "L3") ? input.part : "L2", seen: Record<string, boolean> = {};
    const items = (Array.isArray(raw.items) ? raw.items : []).map((it: any) => {
      if (!it || typeof it !== "object") return null;
      const explain = str(it.explain, 400);
      if (part === "L1") {
        const text = str(it.text, 160), statement = str(it.statement, 60).replace(/^★\s*/, ""), a = String(it.answer).toLowerCase();
        if (!HAN.test(text) || text.length < 12 || !HAN.test(statement) || (a !== "true" && a !== "false") || seen[text]) return null;
        seen[text] = true; return { text, statement, answer: a === "true", explain };
      }
      const lines = (Array.isArray(it.dialogue) ? it.dialogue : []).map((l: any) => ({ sp: l && l.sp === "男" ? "男" : "女", zh: str(l && l.zh, 120) })).filter((l: any) => HAN.test(l.zh));
      const want = part === "L2" ? lines.length === 2 : lines.length >= 4 && lines.length <= 6;
      const m = mc(it.options, it.answer, 20), question = str(it.question, 60);
      if (!want || !m || !HAN.test(question) || lines.some((l: any, i: number) => i > 0 && l.sp === lines[i - 1].sp)) return null;
      const key = lines.map((l: any) => l.zh).join("|"); if (seen[key]) return null; seen[key] = true;
      return { dialogue: lines, question, options: m.options, answer: m.answer, explain };
    }).filter(Boolean).slice(0, 3);
    return items.length ? { part, items, confidence } : null;
  }
  if (task === "passage") {
    const passage = str(raw.passage, 320);
    if (!HAN.test(passage) || passage.length < 50) return null;
    const qs = (Array.isArray(raw.questions) ? raw.questions : []).map((q: any) => {
      const m = q && mc(q.options, q.answer, 30), t = q && str(q.q, 80);
      return m && t && HAN.test(t) ? { q: t, options: m.options, answer: m.answer, explain: str(q.explain, 300) } : null;
    }).filter(Boolean).slice(0, 3);
    if (!qs.length) return null;
    const want = Array.isArray(input && input.target_words) ? input!.target_words as string[] : [];
    return { passage, questions: qs, used_words: want.filter((w) => passage.indexOf(w) >= 0), confidence };
  }
  if (task === "patterns") {
    const n = Array.isArray(input && input.mistakes) ? (input!.mistakes as unknown[]).length : 0, used: Record<number, boolean> = {};
    const groups = (Array.isArray(raw.groups) ? raw.groups : []).map((g: any) => {
      if (!g || typeof g !== "object") return null;
      const title = str(g.title, 60), items = (Array.isArray(g.items) ? g.items : []).map((x: unknown) => parseInt(String(x), 10)).filter((x: number) => x >= 0 && x < n && !used[x] && (used[x] = true));
      return title && items.length ? { title, items, explain: str(g.explain, 400), tip: str(g.tip, 200) } : null;
    }).filter(Boolean).slice(0, 4);
    return groups.length ? { groups, confidence } : null;
  }
  if (task === "draft") {
    const text = str(raw.text, 600), hrefs = Array.isArray(input && input.allowed_actions) ? (input!.allowed_actions as any[]).map((a) => a.href) : [];
    if (text.length < 10 || /zalo|messenger|facebook|telegram|https?:/i.test(text)) return null;
    return { text, action: hrefs.indexOf(raw.action) >= 0 ? raw.action : "", confidence };
  }
  if (task === "grade") {
    const g = int(raw.grammar, 0, 2), n = int(raw.natural, 0, 2), r = int(raw.relevance, 0, 1);
    const corrected = str(raw.corrected, 200), model = ex(raw.model);
    if (typeof raw.uses_word !== "boolean" || g === null || n === null || r === null || !HAN.test(corrected) || !model) return null;
    const errors = (Array.isArray(raw.errors) ? raw.errors : []).slice(0, 3).map((e: any) => ({ wrong: str(e && e.wrong, 80), fix: str(e && e.fix, 80), reason: str(e && e.reason, 480) })).filter((e: any) => e.reason);
    const sentence = input ? String(input.learner_sentence || "") : "";
    const hasWord = !input || sentence.indexOf(String(input.target_word || "")) >= 0;
    const same = !!sentence && corrected === sentence;
    // A sentence the examiner left unchanged cannot lose points for "errors"; one with errors cannot score full marks.
    const gg = same ? Math.max(g, 2) : g, nn = same ? Math.max(n, 2) : n;
    // Score out of 5: 1 for using the word, up to 2 for grammar, up to 2 for naturalness; a sentence that ignores the picture is capped at 3.
    const used = raw.uses_word === true && hasWord;
    let total = (used ? 1 : 0) + gg + nn;
    if (!used) total = Math.min(total, 3);
    if (r === 0) total = Math.min(total, 3);
    return { uses_word: used, grammar: gg, natural: nn, relevance: r, total: Math.max(0, Math.min(5, total)), corrected, changed: !same, errors: same ? [] : errors, explanation: str(raw.explanation, 800), model, confidence };
  }
  if (task === "ask") {
    const answer = str(raw.answer, 1800); if (!answer) return null;
    return { answer, example: ex(raw.example), confidence };
  }
  if (task === "coach") {
    const text = input ? String(input.learner_text || "") : "", req = input && Array.isArray(input.required_words) ? input.required_words as string[] : [];
    const sentences = (Array.isArray(raw.sentences) ? raw.sentences : []).slice(0, 6).map((x: any) => ({ original: str(x && x.original, 200), corrected: str(x && x.corrected, 200), note: str(x && x.note, 600) })).filter((x: any) => x.original && x.corrected);
    const corrected = str(raw.corrected_text, 500), sc = int(raw.score, 0, 5), summary = str(raw.summary, 1000);
    if (!sentences.length || !HAN.test(corrected) || sc === null || !summary) return null;
    const missing = req.filter((w) => text.indexOf(w) < 0);
    let score = sc; if (missing.length) score = Math.min(score, 3);
    const tags = (Array.isArray(raw.tags) ? raw.tags : []).filter((t: unknown, i: number, a: unknown[]) => TAGS.indexOf(t as string) >= 0 && a.indexOf(t) === i).slice(0, 4);
    return { sentences, corrected_text: corrected, score, missing, tags, summary, confidence };
  }
  if (task === "roleplay") {
    const reply = ex(raw.reply); if (!reply || !HAN.test(reply.zh || "")) return null;
    const fb = raw.feedback && typeof raw.feedback === "object" ? raw.feedback : {};
    const sent = input ? String(input.learner_latest_message || "") : "";
    const turns = input ? Number(input.learner_turns || 0) : 0;
    const words = (Array.isArray(raw.words) ? raw.words : []).map(ex).filter((w: any) => w && w.zh.length <= 12).slice(0, 2);
    const base = { reply, words, hint: str(raw.hint, 80), hint_pinyin: str(raw.hint_pinyin, 120), confidence };
    const wrap = !!(input && input.wrap_up === true);
    const empty = { corrected: "", changed: false, note: "", upgrade: "", upgrade_point: "" };
    if (!sent && !wrap) return { ...base, feedback: empty, done: false, summary: null }; // opening line
    const corrected = str(fb.corrected, 200) || sent, same = corrected === sent;
    let upgrade = str(fb.upgrade, 200); if (!HAN.test(upgrade) || upgrade === corrected || upgrade === sent) upgrade = "";
    const done = wrap || (raw.done === true && turns >= 20);
    let summary = null;
    if (done) {
      const sm = raw.summary && typeof raw.summary === "object" ? raw.summary : {};
      summary = { goal_met: sm.goal_met === true, score: int(sm.score, 0, 10) ?? 5, comment: str(sm.comment, 600), phrase: ex(sm.phrase) };
    }
    if (!sent) return { ...base, feedback: empty, done, summary }; // wrap-up without a new message
    return { ...base, feedback: { corrected, changed: !same, note: same ? "" : str(fb.note, 400), upgrade, upgrade_point: upgrade ? str(fb.upgrade_point, 40) : "" }, done, summary };
  }
  if (task === "weekly") {
    const headline = str(raw.headline, 600), note = str(raw.note, 600);
    const wins = (Array.isArray(raw.wins) ? raw.wins : []).slice(0, 2).map((w: unknown) => str(w, 600)).filter(Boolean);
    const actions = (Array.isArray(raw.actions) ? raw.actions : []).slice(0, 3).map((a: any) => ({ text: str(a && a.text, 600), minutes: int(a && a.minutes, 5, 30) || 10, skill: SKILLS.indexOf(a && a.skill) >= 0 ? a.skill : "review" })).filter((a: any) => a.text);
    if (!headline || actions.length < 1) return null;
    return { headline, wins, actions, follow_up: str(raw.follow_up, 600), habit: str(raw.habit, 600), note, confidence };
  }
  const why_wrong = str(raw.why_wrong, 800), why_correct = str(raw.why_correct, 800), rule = str(raw.rule, 600), tip = str(raw.tip, 400), example = ex(raw.example);
  if (!why_correct || !rule || !example) return null;
  return { why_wrong, why_correct, rule, example, tip, confidence };
}
