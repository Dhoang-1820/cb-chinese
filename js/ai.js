/* Optional AI helper: calls your own Supabase Edge Function (see supabase/SETUP.md).
   - The function URL and access code live only in this browser (localStorage key "cbChinese.ai"). They are NOT part of
     the progress export or the Gist backup, and the Gemini key never reaches the phone.
   - Everything here is optional: with no setup (or offline) the app behaves exactly as before.
   - AI answers are advice. Cards say so, show a confidence level, and the 👎 button saves the case under Me → Problem reports. */
(function () {
  "use strict";
  /* The shared AI service every user of this site gets with no setup. It is a public address, not a secret:
     the Gemini key stays in Supabase, and the service limits calls per day and per address. Empty = no built-in AI. */
  var BUILT_IN_URL = "https://ihstekksnivjaywourzt.supabase.co/functions/v1/ai";
  var KEY = "cbChinese.ai", FB = "cbChinese.ai.fb";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function read(k) { try { var v = JSON.parse(localStorage.getItem(k)); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: AI just stays unconfigured */ } }

  function own() { var c = read(KEY); return { url: typeof c.url === "string" ? c.url : "", code: typeof c.code === "string" ? c.code : "" }; }
  function cfg() { var c = own(); return c.url ? c : { url: BUILT_IN_URL, code: "" }; }
  function usingBuiltIn() { return !own().url && !!BUILT_IN_URL; }
  function validUrl(u) { return /^https:\/\/[^\s/]+\/\S+$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/\S*$/.test(u); }
  function save(url, code) { write(KEY, { url: String(url || "").trim(), code: String(code || "").trim() }); }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  function configured() { return validUrl(cfg().url); }
  function available() { return configured() && navigator.onLine !== false; }

  var MSG = {
    not_set: "Set up AI first: Me → AI assistant.",
    offline: "You're offline. AI needs internet; everything else still works.",
    bad_code: "The access code was not accepted. Check it in Me → AI assistant.",
    daily_cap: "Today's AI limit is used up. Try again tomorrow.",
    busy: "The AI is busy right now. Try again in a minute.",
    timeout: "The AI took too long. Try again.",
    network: "Couldn't reach the AI service.",
    origin: "This site is not allowed by the AI service (check ALLOWED_ORIGINS).",
    not_configured: "The AI service is missing its secrets (GEMINI_API_KEY).",
    bad_model: "The Gemini model name was not found. Set GEMINI_MODEL / GEMINI_FALLBACK to a current model from AI Studio.",
    upstream_400: "Google rejected the Gemini key. Check GEMINI_API_KEY in Supabase secrets.",
    upstream_401: "Google rejected the Gemini key. Check GEMINI_API_KEY in Supabase secrets.",
    bad_admin: "That reviewer code was not accepted (or review is not enabled on the server).",
    report_cap: "Too many reports today. Your note is saved on this phone; try again tomorrow.",
    ref_busy: "This item already has several open reports. Try again later.",
    not_found: "That report is no longer on the server.",
    not_proposed: "This fix is no longer available to accept.",
    empty_patch: "There is nothing to change.",
    closed: "This report is already closed.",
    discuss_cap: "The discussion limit for this report is reached. Your note is saved.",
    bad_token: "That report cannot be found.",
    bad_sync: "That restore code is not valid. It has 16 letters and numbers.",
    no_backup: "No backup was found for that code.",
    sync_full: "Cloud backup is full. Tell the app owner.",
    bad_task: "The server does not have cloud backup yet (it needs an update).",
    sync_big: "Your progress is too large for the cloud backup. Use Me → Export to keep a copy.",
    db_error: "The server could not reach its database. Did you run supabase/setup.sql?",
    bad_ref: "This item can't be sent for checking.",
    bad_snapshot: "This item is too large to send.",
    empty_note: "Write a short note first.",
    empty_patch: "Add at least one change before accepting.",
    upstream_403: "Google rejected the Gemini key. Check GEMINI_API_KEY in Supabase secrets.",
    upstream_unreachable: "The AI service couldn't reach Google. Try again.",
    bad_output: "The AI gave an unusable answer. Try again.",
    too_big: "That text is too long for the AI.",
    empty_sentence: "Write a sentence first.",
    bad_word: "This item has no Chinese target word."
  };
  function errMsg(code) { return MSG[code] || (/^upstream_/.test(code || "") ? "Google's AI returned an error (" + code.slice(9) + "). Try again later." : "AI error" + (code ? " (" + code + ")" : "") + "."); }

  /* One request. Always resolves: { ok: true, result, model, used, cap } or { ok: false, error }. */
  function call(task, payload, extra) {
    var c = cfg();
    if (!configured()) return Promise.resolve({ ok: false, error: "not_set" });
    if (navigator.onLine === false) return Promise.resolve({ ok: false, error: "offline" });
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 60000);
    var lang = window.Store && Store.state.settings.lang || "both";
    return fetch(c.url, { method: "POST", cache: "no-store", signal: ctl ? ctl.signal : undefined,
      headers: Object.assign({ "content-type": "application/json" }, c.code ? { "x-app-code": c.code } : {}, extra || {}), body: JSON.stringify({ task: task, lang: lang, payload: payload }) })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          clearTimeout(timer);
          return j && j.ok && j.result ? j : { ok: false, error: j && j.error || "http_" + r.status };
        });
      })
      .catch(function (e) { clearTimeout(timer); return { ok: false, error: e && e.name === "AbortError" ? "timeout" : "network" }; });
  }

  /* Characters the AI used that appear nowhere in the course words or example sentences (a rough "is this at your level" check). */
  var known = null, BASE = "的了是在有和不人我他她它你们这那个一二三四五六七八九十百千万也都就要会能可以很还没么什为因所但如果虽然而且或者吗呢吧啊过着被把对从到给让向跟比更最太再又才只每些已经正好样怎时候地得上下来去出入大小多少好";
  function charset() {
    if (known) return known;
    known = {}; var i;
    for (i = 0; i < BASE.length; i++) known[BASE.charAt(i)] = 1;
    var W = window.App && App.WORDS || [];
    W.forEach(function (w) {
      var t = String(w.hanzi || "") + String(w.example && w.example.zh || "");
      for (var k = 0; k < t.length; k++) known[t.charAt(k)] = 1;
    });
    return known;
  }
  function unknownChars(text) {
    var set = charset(), out = [], seen = {};
    String(text || "").replace(/[㐀-鿿]/g, function (ch) { if (!set[ch] && !seen[ch]) { seen[ch] = 1; out.push(ch); } return ch; });
    return out;
  }

  /* 👍 / 👎: counts live here; a 👎 also saves the case under Me → Problem reports so it can be reviewed. */
  function counts() { var c = read(FB); return { up: +c.up || 0, down: +c.down || 0 }; }
  function vote(up, note, ctx) {
    var c = counts(); if (up) c.up++; else c.down++; write(FB, c);
    if (!up && window.Store) {
      var s = Store.state; s.reports = s.reports || [];
      s.reports.push({ id: Date.now().toString(36), date: Store.today(), route: /^#\/[\w\/-]*$/.test(location.hash) ? location.hash : "#/", text: "AI feedback marked wrong: " + String(note).slice(0, 300), ctx: String(ctx || "").slice(0, 400) });
      if (s.reports.length > 100) s.reports.shift();
      Store.save();
    }
    if (window.UI) UI.toast(up ? "Thanks!" : "Saved under Me → Problem reports", up ? "👍" : "👎");
  }
  function voteRow(note, ctx) {
    return '<div class="ai-vote"><span class="muted">Was this right?</span><button type="button" class="btn small" data-ai-up>👍</button><button type="button" class="btn small" data-ai-down>👎</button></div>' +
      '<p class="sub ai-foot">AI can be wrong. Your lessons and the answer key come first.</p>';
  }
  function wireVote(root, note, ctx) {
    var up = root.querySelector("[data-ai-up]"), down = root.querySelector("[data-ai-down]"), row = root.querySelector(".ai-vote");
    function done(isUp) { vote(isUp, note, ctx); if (row) row.innerHTML = '<span class="muted">' + (isUp ? "👍 Thanks" : "👎 Saved for review") + "</span>"; }
    if (up) up.onclick = function () { done(true); };
    if (down) down.onclick = function () { done(false); };
  }

  function dots(n, of) { var s = ""; for (var i = 0; i < of; i++) s += i < n ? "●" : "○"; return s; }
  function conf(c) { return '<span class="tag ai-conf ai-' + esc(c) + '">' + (c === "high" ? "confident" : c === "low" ? "unsure" : "fairly sure") + "</span>"; }
  function exampleHTML(m) { return '<div class="ai-model"><div class="zh">' + esc(m.zh) + '</div><div class="py">' + esc(m.pinyin) + '</div><div class="tr">' + esc(m.meaning) + "</div>" + oddChars(m.zh) + "</div>"; }
  function oddChars(zh) { var u = unknownChars(zh); return u.length ? '<p class="sub ai-odd">Characters outside your course: <span class="zh">' + esc(u.join(" ")) + "</span></p>" : ""; }

  function gradeCard(res, sentence) {
    var r = res.result;
    return '<div class="ai-card"><div class="ai-head"><b>🤖 AI feedback</b><span class="ai-score">' + dots(r.total, 5) + " " + r.total + "/5</span>" + conf(r.confidence) + "</div>" +
      '<p class="ai-line">' + (r.uses_word ? "✔ Uses the word" : "✘ Doesn't use the word correctly") + " · grammar " + r.grammar + "/2 · natural " + r.natural + "/2</p>" +
      (r.changed ? '<p class="ai-fix">Suggested: <span class="zh">' + esc(r.corrected) + "</span></p>" : '<p class="ai-fix good-t">✓ No changes needed.</p>') +
      (r.errors.length ? '<ul class="ai-errs">' + r.errors.map(function (e) { return "<li><span class=\"zh bad-t\">" + esc(e.wrong) + "</span> → <span class=\"zh good-t\">" + esc(e.fix) + "</span><br><small>" + esc(e.reason) + "</small></li>"; }).join("") + "</ul>" : "") +
      (r.explanation ? '<p class="ai-exp">' + esc(r.explanation) + "</p>" : "") +
      '<p class="sub">A model sentence:</p>' + exampleHTML(r.model) + voteRow() + "</div>";
  }
  function explainCard(res) {
    var r = res.result;
    return '<div class="ai-card"><div class="ai-head"><b>🤖 Explain</b>' + conf(r.confidence) + "</div>" +
      (r.why_wrong ? '<p class="ai-exp"><b>Why not that:</b> ' + esc(r.why_wrong) + "</p>" : "") +
      '<p class="ai-exp"><b>Why this works:</b> ' + esc(r.why_correct) + "</p>" +
      '<p class="ai-exp"><b>Rule:</b> ' + esc(r.rule) + "</p>" + exampleHTML(r.example) +
      (r.tip ? '<p class="ai-exp"><b>Tip:</b> ' + esc(r.tip) + "</p>" : "") + voteRow() + "</div>";
  }

  /* Writing grader: run on a sentence typed for a picture-writing item. host = element that receives the card. */
  function grade(host, item, sentence) {
    host.innerHTML = '<div class="ai-card ai-wait">🤖 Checking your sentence…</div>';
    var scene = item.scene && (item.scene.en || item.scene.vi) || (typeof item.scene === "string" ? item.scene : "");
    return call("grade", { word: item.word, scene: scene, sentence: sentence }).then(function (res) {
      if (!res.ok) { host.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(errMsg(res.error)) + "</div>"; return res; }
      host.innerHTML = gradeCard(res, sentence);
      wireVote(host, sentence + " → " + res.result.corrected + " (" + res.result.total + "/5)", "word " + item.word + " · " + (res.model || ""));
      return res;
    });
  }

  /* "Explain with AI" under a wrong multiple-choice answer. Reads the question, options, your pick and the key from the screen. */
  function ctxFromDom() {
    var card = document.getElementById("qcard"); if (!card) return null;
    function t(sel) { var e = card.querySelector(sel); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; }
    var q = [t(".sub"), t(".abc"), t(".passage-in"), t(".q"), t(".statement")].filter(Boolean).join(" ").slice(0, 400);
    var opts = [].slice.call(card.querySelectorAll(".opts .opt")).map(function (o) { return o.textContent.replace(/\s+/g, " ").trim(); });
    var wrong = card.querySelector(".opt.wrong"), right = card.querySelector(".opt.right");
    if (!q || !right) return null;
    return { question: q, options: opts, chosen: wrong ? wrong.textContent.replace(/\s+/g, " ").trim() : "", correct: right.textContent.replace(/\s+/g, " ").trim(), extra: t(".script") };
  }
  function attachExplain(host) {
    if (!host || !configured() || host.querySelector(".ai-ask")) return;
    var box = document.createElement("div"); box.className = "ai-ask";
    box.innerHTML = '<button type="button" class="btn small ai-btn">🤖 Explain with AI</button><div class="ai-out"></div>';
    host.appendChild(box);
    var btn = box.querySelector(".ai-btn"), out = box.querySelector(".ai-out");
    btn.onclick = function () {
      var ctx = ctxFromDom(); if (!ctx) { out.innerHTML = '<div class="ai-card ai-bad">⚠️ Couldn\'t read this question.</div>'; return; }
      btn.disabled = true; out.innerHTML = '<div class="ai-card ai-wait">🤖 Thinking…</div>';
      call("explain", ctx).then(function (res) {
        btn.disabled = false;
        if (!res.ok) { out.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(errMsg(res.error)) + "</div>"; return; }
        btn.hidden = true; out.innerHTML = explainCard(res);
        wireVote(out, ctx.question + " | chose: " + ctx.chosen + " | key: " + ctx.correct, "explain · " + (res.model || ""));
      });
    };
  }


  /* ---------- recurring mistake types (from the paragraph coach), kept on this phone ---------- */
  var TK = "cbChinese.ai.tags";
  var TAGINFO = { ba_bei: ["把 / 被 sentences", "#/grammar"], le_guo_zhe: ["了 / 过 / 着", "#/grammar"], de_particle: ["的 / 得 / 地", "#/grammar"], measure: ["Measure words", "#/game/measure"],
    word_order: ["Word order", "#/game/order"], question_particle: ["吗 / 呢 / 吧", "#/grammar"], comparison: ["Comparisons (比)", "#/grammar"], conjunction: ["Linking words", "#/game/confuse"],
    time_place: ["Time and place order", "#/game/order"], word_choice: ["Choosing the right word", "#/game/confuse"], character: ["Characters", "#/game/write"], other: ["Other", "#/grammar"] };
  function addTags(list) { try { var t = read(TK), seen = {}; (list || []).forEach(function (k) { if (TAGINFO[k] && !seen[k]) { seen[k] = 1; t[k] = (+t[k] || 0) + 1; } }); write(TK, t); } catch (e) { /* tags are optional */ } }
  function topTags(n) { var t = read(TK); return Object.keys(t).filter(function (k) { return TAGINFO[k] && t[k] > 0; }).sort(function (a, b) { return t[b] - t[a]; }).slice(0, n || 3).map(function (k) { return { tag: k, n: t[k], name: TAGINFO[k][0], link: TAGINFO[k][1] }; }); }

  function waiting(host, txt) { host.innerHTML = '<div class="ai-card ai-wait">🤖 ' + esc(txt) + "</div>"; }
  function failed(host, res) { host.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(errMsg(res.error)) + "</div>"; }

  /* ---------- Ask AI about a word or sentence ---------- */
  var PRESETS = [["why", "Why this word?"], ["example", "Another example"], ["similar", "Similar words"], ["usage", "At work (C&B)"]];
  function askCard(res) {
    var r = res.result;
    return '<div class="ai-card"><div class="ai-head"><b>🤖 Answer</b>' + conf(r.confidence) + '</div><p class="ai-exp">' + esc(r.answer) + "</p>" + (r.example ? exampleHTML(r.example) : "") + voteRow() + "</div>";
  }
  function askBox(host, subject, context) {
    if (!host || !configured()) return;
    host.innerHTML = '<div class="ai-ask-box"><div class="ai-chips">' + PRESETS.map(function (p) { return '<button type="button" class="btn small" data-preset="' + p[0] + '">' + p[1] + "</button>"; }).join("") + "</div>" +
      '<div class="ai-q"><input type="text" maxlength="200" placeholder="Ask your own question (English or Vietnamese)" aria-label="Your question"><button type="button" class="btn small primary" data-send>Ask</button></div><div class="ai-out"></div></div>';
    var out = host.querySelector(".ai-out"), input = host.querySelector("input"), busy = false;
    function run(preset, q) {
      if (busy) return; busy = true; waiting(out, "Thinking…");
      call("ask", { text: subject, context: context || "", preset: preset, question: q || "" }).then(function (res) {
        busy = false;
        if (!res.ok) return failed(out, res);
        out.innerHTML = askCard(res); wireVote(out, subject + " | " + (q || preset) + " | " + res.result.answer.slice(0, 120), "ask · " + (res.model || ""));
      });
    }
    [].forEach.call(host.querySelectorAll("[data-preset]"), function (b) { b.onclick = function () { run(b.getAttribute("data-preset"), ""); }; });
    host.querySelector("[data-send]").onclick = function () { var q = input.value.trim(); if (q) run("free", q); else UI_toast("Type a question first"); };
    input.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); host.querySelector("[data-send]").click(); } };
  }
  function UI_toast(m) { if (window.UI) UI.toast(m, "✍️"); }

  /* ---------- paragraph coach ---------- */
  function coachCard(res) {
    var r = res.result;
    return '<div class="ai-card"><div class="ai-head"><b>🤖 Coach</b><span class="ai-score">' + dots(+r.score || 0, 5) + " " + (+r.score || 0) + "/5</span>" + conf(r.confidence) + "</div>" +
      ((r.missing || []).length ? '<p class="ai-line bad-t">✘ Missing required word' + (r.missing.length > 1 ? "s" : "") + ": <span class=\"zh\">" + esc(r.missing.join("、")) + "</span></p>" : '<p class="ai-line good-t">✔ Used all the required words</p>') +
      '<ol class="ai-sents">' + r.sentences.map(function (x) {
        var same = x.original === x.corrected;
        return "<li>" + (same ? '<span class="zh good-t">' + esc(x.original) + "</span> ✓" : '<span class="zh bad-t">' + esc(x.original) + '</span><br>→ <span class="zh good-t">' + esc(x.corrected) + "</span>") + (x.note ? "<br><small>" + esc(x.note) + "</small>" : "") + "</li>";
      }).join("") + "</ol>" +
      '<p class="sub">Corrected paragraph:</p><p class="zh ai-fix">' + esc(r.corrected_text) + "</p>" + oddChars(r.corrected_text) +
      '<p class="ai-exp">' + esc(r.summary) + "</p>" + voteRow() + "</div>";
  }
  var lastCounted = "";
  function coach(host, prompt, words, text) {
    waiting(host, "Reading your paragraph…");
    return call("coach", { prompt: prompt, words: words, text: text }).then(function (res) {
      if (!res.ok) { failed(host, res); return res; }
      if (lastCounted !== text) { lastCounted = text; addTags(res.result.tags); }
      host.innerHTML = coachCard(res);
      wireVote(host, text.slice(0, 140) + " → " + res.result.corrected_text.slice(0, 140), "coach · " + (res.model || ""));
      return res;
    });
  }

  /* ---------- weekly coach: one summary per week, kept so it is not re-asked ---------- */
  var WK = "cbChinese.ai.weekly";
  var SKILL_NAMES = { confusable: "Confusable words", ordering: "Sentence order", measure: "Measure words", writing: "Picture writing", grammar: "Grammar", typing: "Typing", vocab: "Vocabulary", pinyin: "Pinyin", "listen-word": "Listening (words)", "listen-sentence": "Listening (sentences)", "word-order": "Word order", mock: "Mock exam", review: "Review cards" };
  var SKILL_ROUTE = { confusable: "#/game/confuse", ordering: "#/game/order", measure: "#/game/measure", writing: "#/game/picture", grammar: "#/grammar", typing: "#/game/type", vocab: "#/review", pinyin: "#/game/race", "listen-word": "#/game/listen", "listen-sentence": "#/game/drill", "word-order": "#/game/builder", mock: "#/mock", review: "#/review" };
  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function weeklyCard(res) {
    var r = res.result;
    return '<div class="ai-card"><div class="ai-head"><b>🤖 Your coach</b>' + conf(r.confidence) + '</div><p class="ai-exp"><b>' + esc(r.headline) + "</b></p>" +
      (r.follow_up ? '<p class="ai-exp">↩️ ' + esc(r.follow_up) + "</p>" : "") +
      (r.wins.length ? "<ul>" + r.wins.map(function (w) { return "<li>🌟 " + esc(w) + "</li>"; }).join("") + "</ul>" : "") +
      '<p class="sub">Next week:</p><ol class="ai-acts">' + r.actions.map(function (a) { return "<li>" + esc(a.text) + ' <a class="btn small" href="' + (hasOwn(SKILL_ROUTE, a.skill) ? SKILL_ROUTE[a.skill] : "#/review") + '">' + esc(hasOwn(SKILL_NAMES, a.skill) ? SKILL_NAMES[a.skill] : "Go") + " · " + (+a.minutes || 10) + " min</a></li>"; }).join("") + "</ol>" +
      (r.habit ? '<p class="ai-exp">⏰ ' + esc(r.habit) + "</p>" : "") +
      (r.note ? '<p class="ai-exp">' + esc(r.note) + "</p>" : "") + voteRow() + "</div>";
  }
  function validWeekly(x) { var r = x && x.result; return !!(r && typeof r.headline === "string" && Array.isArray(r.actions) && Array.isArray(r.wins)); }
  function weekly(host, key, report, force) {
    try {
      var saved = read(WK);
      if (!force && saved.key === key && validWeekly(saved.res)) { host.innerHTML = weeklyCard(saved.res); wireVote(host, "weekly coach " + key, "weekly"); return Promise.resolve(saved.res); }
      waiting(host, "Reading your week…");
      return call("weekly", report).then(function (res) {
        if (!res.ok || !validWeekly(res)) { failed(host, res.ok ? { error: "bad_output" } : res); return res; }
        write(WK, { key: key, res: { result: res.result, model: res.model } });
        host.innerHTML = weeklyCard(res); wireVote(host, "weekly coach " + key, "weekly · " + (res.model || ""));
        return res;
      }).catch(function () { failed(host, { error: "bad_output" }); return { ok: false }; });
    } catch (e) { failed(host, { error: "bad_output" }); return Promise.resolve({ ok: false }); }
  }

  window.AI = { cfg: cfg, own: own, usingBuiltIn: usingBuiltIn, hasBuiltIn: function () { return !!BUILT_IN_URL; }, save: save, clear: clear, configured: configured, available: available, validUrl: validUrl, call: call, errMsg: errMsg,
    askBox: askBox, coach: coach, weekly: weekly, topTags: topTags, addTags: addTags, SKILL_NAMES: SKILL_NAMES, SKILL_ROUTE: SKILL_ROUTE,
    grade: grade, attachExplain: attachExplain, unknownChars: unknownChars, counts: counts, _gradeCard: gradeCard, _explainCard: explainCard, _askCard: askCard, _coachCard: coachCard, _weeklyCard: weeklyCard };
})();
