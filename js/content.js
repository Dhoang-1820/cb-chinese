/* Content feedback loop (client side).
   - locate(): finds which lesson item is on screen (drill, grammar quiz, mock question) so a report can carry the whole item.
   - report(): sends the report to the AI service, which checks it twice and may propose a fix.
   - sync()/apply(): downloads fixes a human has ACCEPTED (and items hidden while a fix is pending) and patches the loaded content in memory.
   Nothing changes in the lessons until a person accepts a fix in Me → Content review. */
(function () {
  "use strict";
  var PK = "cbChinese.patches", AK = "cbChinese.ai.admin";
  var HOUR = 36e5;

  function rd(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  function norm(s) { return String(s == null ? "" : s).replace(/[\s_＿\-—·.,，。！？!?、：:；;“”"'‘’（）()\[\]【】]/g, ""); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  /* ---------- finding items ---------- */
  var idx = null, idxN = -1;
  function count() {
    var n = (window.CB_GRAMMAR || []).length + (window.CB_HSK5_GRAMMAR || []).length + (window.CB_MOCK || []).length;
    [window.CB_DRILLS, window.CB_HSK5_DRILLS, window.CB_DRILLS_EXTRA].forEach(function (D) {
      Object.keys(D || {}).forEach(function (k) { if (Array.isArray(D[k])) n += D[k].length; });
    });
    return n;
  }
  function walkMock(o, out) {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach(function (x) { walkMock(x, out); }); return; }
    if (typeof o.id === "string" && /^[LRW]\d/.test(o.id) && (o.options || o.statement || o.tokens || o.sentence || o.q)) out.push(o);
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === "object") walkMock(o[k], out); });
  }
  function build() {
    if (idx && idxN === count()) return idx;
    idx = { items: {}, needles: [] }; idxN = count();
    function add(ref, obj, all, label) {
      idx.items[ref] = obj;
      all = all.map(norm).filter(function (x) { return x.length >= 1; });
      if (all.length && all.join("").length >= 6) idx.needles.push({ ref: ref, all: all, label: label });
    }
    /* HSK 4 drills and, once its pack is loaded, the HSK 5 drills (ids h5c001.., so the two never collide) */
    [window.CB_DRILLS || {}, window.CB_HSK5_DRILLS || {}].forEach(function (D) {
      (D.confuse || []).forEach(function (it) { add("drill:" + it.id, it, [it.q], it.q); });
      (D.order || []).forEach(function (it) { add("drill:" + it.id, it, [it.parts && it.parts.A, it.parts && it.parts.B, it.parts && it.parts.C], it.zh || (it.parts && it.parts.B) || it.id); });
      (D.measure || []).forEach(function (it) { add("drill:" + it.id, it, [it.q].concat(it.options || []), it.q + " " + (it.options || []).join("/")); });
      (D.picture || []).forEach(function (it) { add("drill:" + it.id, it, [it.word, it.emoji], it.word + " · " + (it.scene && it.scene.en || "")); });
    });
    /* the two extra HSK 4 sets: drill:wo01 (arrange the words) and drill:bk01:1 (one sentence of a word-bank group) */
    var X = window.CB_DRILLS_EXTRA || {};
    (X.wordorder || []).forEach(function (it) { add("drill:" + it.id, it, it.tokens || [], it.answer || it.id); });
    (X.bank || []).forEach(function (g) {
      (g.items || []).forEach(function (it) {
        if (!has(it, "_bank")) Object.defineProperty(it, "_bank", { value: g.bank, enumerable: false }); // the six words of its group: needed to check a patched answer and to show the AI the choices
        add("drill:" + g.id + ":" + it.n, it, [it.q], it.q);
      });
    });
    (window.CB_GRAMMAR || []).concat(window.CB_HSK5_GRAMMAR || []).forEach(function (g) {
      idx.items["grammar:" + g.id] = g;
      (g.quiz || []).forEach(function (q, i) { add("gq:" + g.id + ":" + i, q, [q.q].concat(q.options || []), q.q); });
    });
    (window.CB_MOCK || []).forEach(function (m) {
      var list = []; walkMock([m.listening, m.reading, m.writing], list);
      list.forEach(function (it) {
        var main = it.sentence || it.statement || it.q || it.question;
        if (typeof main === "string") add("mock:" + it.id, it, [main], main);
        else if (Array.isArray(it.tokens)) add("mock:" + it.id, it, it.tokens, it.tokens.join(" "));
        else idx.items["mock:" + it.id] = it;
      });
    });
    return idx;
  }
  function resolve(ref) {
    var m = /^(drill|mock|gq|word|grammar):([^:]+)(?::(\d+))?$/.exec(String(ref || "")); if (!m) return null;
    if (m[1] === "word") return window.App && App.WORDMAP && App.WORDMAP[m[2]] || null;
    var it = build().items[ref]; return it || null;
  }
  function locate(text) {
    var t = norm(text), out = [];
    build().needles.forEach(function (n) { if (n.all.every(function (x) { return t.indexOf(x) >= 0; })) out.push({ ref: n.ref, label: String(n.label).slice(0, 60), at: t.indexOf(n.all[0]) }); });
    out.sort(function (a, b) { return a.at - b.at; });
    return out.slice(0, 20).map(function (c) { return { ref: c.ref, label: c.label }; });
  }
  function snapshot(ref) {
    var o = resolve(ref); if (!o) return null;
    var s = JSON.stringify(o._bank ? Object.assign({ bank: o._bank }, o) : o, function (k, v) { return k && k.charAt(0) === "_" ? undefined : v; });
    if (s.length > 3800) { var c = JSON.parse(s); delete c.explain; delete c.collocations; delete c.examples; s = JSON.stringify(c); }
    return s.length > 3900 ? null : JSON.parse(s);
  }

  /* ---------- patches ---------- */
  var applied = {};
  function answerOk(o, v) {
    if (Array.isArray(o.options)) return typeof v === "number" && v >= 0 && v < o.options.length && v % 1 === 0;
    if (Array.isArray(o._bank)) return typeof v === "number" && v >= 0 && v < o._bank.length && v % 1 === 0;
    if (Array.isArray(o.words)) return typeof v === "string" && o.words.indexOf(v) >= 0;
    if (o.parts) return typeof v === "string" && /^[ABC]{3}$/.test(v) && v.split("").sort().join("") === "ABC";
    if (typeof o.answer === "boolean") return typeof v === "boolean";
    return true;
  }
  /* after a patch the whole item must still be well formed: valid answer, no empty or duplicate options */
  function itemOk(o, before) {
    if (has(o, "answer") && !answerOk(o, o.answer)) return false;
    if (Array.isArray(o.options)) {
      if (o.options.length !== (before.options || []).length) return false;
      var seen = {}, bad = o.options.some(function (x) { var t = String(x).trim(); if (!t || seen[t]) return true; seen[t] = 1; return false; });
      if (bad) return false;
    }
    if (Array.isArray(o.words) && o.words.length !== (before.words || []).length) return false;
    return true;
  }
  function setPath(o, path, value) {
    var p = String(path).split("."), cur = o, i;
    if (p.some(function (k) { return k === "__proto__" || k === "constructor" || k === "prototype" || k === "id" || k === "audio" || k === "length"; })) return false;
    if (/[<>]|&#/.test(String(value))) return false;
    for (i = 0; i < p.length - 1; i++) { if (cur == null || typeof cur !== "object" || !has(cur, p[i])) return false; cur = cur[p[i]]; }
    var key = p[p.length - 1];
    if (cur == null || typeof cur !== "object" || !has(cur, key)) return false;
    var old = cur[key], nv;
    if (typeof old === "number") { nv = Number(value); if (!isFinite(nv)) return false; }
    else if (typeof old === "boolean") { if (value !== "true" && value !== "false") return false; nv = value === "true"; }
    else if (typeof old === "string") nv = String(value);
    else return false;
    if (p.length === 1 && key === "answer" && !answerOk(o, nv)) return false;
    cur[key] = nv; return true;
  }
  function cache() { var c = rd(PK, {}); return { at: +c.at || 0, patches: Array.isArray(c.patches) ? c.patches : [], hidden: Array.isArray(c.hidden) ? c.hidden : [] }; }
  function apply() {
    var c = cache(), n = 0;
    c.patches.forEach(function (p) {
      if (!p || applied[p.id] || !Array.isArray(p.set)) return;
      var o = resolve(p.ref); if (!o) return; // content not loaded yet: try again later
      applied[p.id] = true;
      var backup = JSON.parse(JSON.stringify(o)), k = 0;
      p.set.forEach(function (s) {
        if (!s || typeof s.path !== "string") return;
        /* only fix the item version the AI actually checked */
        if (typeof s.from === "string" && s.from !== "" && String(getPath(o, s.path)) !== s.from) return;
        if (setPath(o, s.path, s.value)) k++;
      });
      if (k && !itemOk(o, backup)) Object.keys(backup).forEach(function (key) { o[key] = backup[key]; }); // a patch must never leave a broken question
      else n += k;
    });
    return n;
  }
  function isHidden(ref) { return cache().hidden.indexOf(ref) >= 0; }

  function sync(force) {
    if (!window.AI || !AI.configured() || navigator.onLine === false) return Promise.resolve(false);
    var c = cache();
    if (!force && Date.now() - c.at < 3 * HOUR) return Promise.resolve(false);
    return AI.call("patches", {}).then(function (r) {
      if (!r.ok || !r.result) return false;
      wr(PK, { at: Date.now(), patches: r.result.patches || [], hidden: r.result.hidden || [] });
      applied = {}; apply(); return true;
    });
  }

  /* ---------- reports and review ---------- */
  function report(ref, note, route) {
    var snap = snapshot(ref);
    if (!snap) return Promise.resolve({ ok: false, error: "bad_snapshot" });
    return AI.call("report", { ref: ref, note: note, route: route || "", snapshot: snap });
  }
  /* the reporter accepts the AI's proposed fix: applied on this phone at once, shared with everyone through the patches list */
  function applyNow(r) {
    if (!r || !Array.isArray(r.set)) return 0;
    var c = cache(); c.patches = c.patches.filter(function (x) { return x && x.id !== r.id; });
    c.patches.push({ id: r.id, ref: r.ref, set: r.set }); wr(PK, { at: c.at, patches: c.patches, hidden: c.hidden });
    delete applied[r.id]; return apply();
  }
  function accept(token) {
    return AI.call("report_accept", { token: token }).then(function (res) { if (res.ok) res.applied = applyNow(res.result); return res; });
  }
  function discuss(token, message) { return AI.call("report_discuss", { token: token, message: message }); }
  function adminCode() { try { return localStorage.getItem(AK) || ""; } catch (e) { return ""; } }
  function setAdminCode(v) { try { if (v) localStorage.setItem(AK, v); else localStorage.removeItem(AK); } catch (e) { /* ignore */ } }
  function admin(task, payload) { return AI.call(task, payload, { "x-admin-code": adminCode() }); }
  function getPath(o, path) { var cur = o; String(path).split(".").forEach(function (k) { cur = cur == null ? undefined : cur[k]; }); return cur; }

  window.Content = { locate: locate, resolve: resolve, snapshot: snapshot, apply: apply, sync: sync, isHidden: isHidden, report: report, accept: accept, discuss: discuss, applyNow: applyNow, adminCode: adminCode, setAdminCode: setAdminCode, admin: admin, getPath: getPath, cache: cache,
    _setPath: setPath, _build: function () { idx = null; return build(); } };
})();
