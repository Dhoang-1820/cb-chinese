  /* ---------- Character card (#/char/X or #/char/X/<word id>) ----------
     One character, the way a teacher would explain it: how it is written (stroke order, parts coloured), what it means,
     its Hán Việt reading, which part gives the meaning and which the sound, how close the sound part still is, where the
     character comes from, and a memory tip the learner can make their own. Data: vendor/chars/chars.v1.js (loaded on the
     first card, kept offline) and the stroke files in vendor/hanzi/. */
  var CHARS_URL = "vendor/chars/chars.v1.js", CHARS_P = null;
  var HAN1 = /^[㐀-鿿]$/;
  function loadChars() {
    if (window.CB_CHARS) return Promise.resolve(window.CB_CHARS);
    return CHARS_P || (CHARS_P = new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = CHARS_URL;
      sc.onload = function () { if (window.CB_CHARS) res(window.CB_CHARS); else { CHARS_P = null; rej(new Error("empty")); } };
      sc.onerror = function () { CHARS_P = null; sc.remove(); rej(new Error("network")); };
      document.head.appendChild(sc);
    }));
  }
  function strokeJSON(ch) {
    return fetch("vendor/hanzi/" + encodeURIComponent(ch) + ".json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function enOnly() { return Store.state.settings.lang === "en"; }

  /* ----- sounds: pinyin and Hán Việt split into initial + rhyme + tone ----- */
  var PY_TONE = { "ā": "a1", "á": "a2", "ǎ": "a3", "à": "a4", "ē": "e1", "é": "e2", "ě": "e3", "è": "e4", "ī": "i1", "í": "i2", "ǐ": "i3", "ì": "i4",
    "ō": "o1", "ó": "o2", "ǒ": "o3", "ò": "o4", "ū": "u1", "ú": "u2", "ǔ": "u3", "ù": "u4", "ǖ": "ü1", "ǘ": "ü2", "ǚ": "ü3", "ǜ": "ü4" };
  var PY_INI = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];
  function pySplit(s) {
    s = String(s || "").toLowerCase().trim();
    var plain = "", tone = 5;
    Array.from(s).forEach(function (c) { var m = PY_TONE[c]; if (m) { plain += m[0]; tone = +m[1]; } else plain += c; });
    var ini = "";
    for (var i = 0; i < PY_INI.length; i++) if (plain.indexOf(PY_INI[i]) === 0 && plain.length > PY_INI[i].length) { ini = PY_INI[i]; break; }
    var fin = plain.slice(ini.length), norm = fin;
    // the sound of the rhyme, so yáng and xiáng (-iang), wèi and guì (-uei) compare as the same rhyme
    if (ini === "y") norm = fin[0] === "u" ? "ü" + fin.slice(1) : fin[0] === "i" ? fin : "i" + fin;
    else if (ini === "w") norm = fin[0] === "u" ? fin : "u" + fin;
    else if (/^[jqx]$/.test(ini) && fin[0] === "u") norm = "ü" + fin.slice(1);
    norm = norm.replace(/^iu$/, "iou").replace(/^ui$/, "uei").replace(/^un$/, "uen").replace(/^([^ü]*)ün$/, "$1ün");
    return { raw: s, plain: plain, ini: ini, fin: fin, norm: norm, tone: tone };
  }
  var VI_TONE = { "̀": "huyền", "́": "sắc", "̉": "hỏi", "̃": "ngã", "̣": "nặng" };
  var VI_INI = ["ngh", "ng", "nh", "ch", "gh", "gi", "kh", "ph", "th", "tr", "qu", "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "x"];
  function viSplit(s) {
    s = String(s || "").split(/[,\s]/)[0].toLowerCase();
    var tone = "ngang", base = "";
    Array.from(s.normalize("NFD")).forEach(function (c) { if (VI_TONE[c]) tone = VI_TONE[c]; else base += c; });
    base = base.normalize("NFC");
    var ini = "";
    for (var i = 0; i < VI_INI.length; i++) if (base.indexOf(VI_INI[i]) === 0 && base.length > VI_INI[i].length) { ini = VI_INI[i]; break; }
    return { raw: s, ini: ini, rhyme: base.slice(ini.length), tone: tone };
  }
  /* small tone pictures: Mandarin tones 1-4 (5 = neutral) and the six Vietnamese tones */
  function toneSVG(kind, t) {
    var P = { m1: "M2 5H22", m2: "M2 15L22 4", m3: "M2 8L10 17L22 6", m4: "M2 4L22 16", m5: "",
      ngang: "M2 9H22", "huyền": "M2 9L22 15", "sắc": "M2 13L22 3", "hỏi": "M2 6L11 14L22 8", "ngã": "M2 11L8 5L14 13L22 3", "nặng": "M2 8L18 16" };
    var d = P[kind === "m" ? "m" + t : t];
    return '<svg class="tone-ic" viewBox="0 0 24 20" width="24" height="20" aria-hidden="true">' + (d ? '<path d="' + d + '"/>' : '<circle cx="12" cy="10" r="2.5"/>') + (t === "nặng" ? '<circle cx="20" cy="18" r="1.6"/>' : "") + "</svg>";
  }
  function toneName(kind, t) { return kind === "m" ? (t === 5 ? tx("neutral tone") : tx("tone {n}", { n: t })) : t; }
  /* "xiáng" with the initial marked when it differs from the other syllable, and the shared rhyme highlighted */
  function sylHTML(raw, ini, sameIni, sameRhyme) {
    var a = Array.from(raw), k = Array.from(ini).length;
    return '<span class="syl">' + (k ? '<span class="' + (sameIni ? "s-same" : "s-diff") + '">' + esc(a.slice(0, k).join("")) + "</span>" : "") +
      '<span class="' + (sameRhyme ? "s-rh" : "") + '">' + esc(a.slice(k).join("")) + "</span></span>";
  }

  /* ----- what a part means, in the learner's language ----- */
  function oneCharWord(ch) {
    var best = null;
    WORDS.forEach(function (w) { if (w.hanzi === ch && (!best || (w.level || 9) < (best.level || 9))) best = w; });
    return best;
  }
  function partMeaning(C, ch) {
    var e = C[ch] || {}, w = oneCharWord(ch);
    if (enOnly()) return (w && w.en) || e.d || "";
    return e.rv || (w && w.vi) || e.d || "";
  }
  function partName(C, ch) { var e = C[ch] || {}; return e.rn || hvFirst(e); }
  function hvFirst(e) { var h = e && e.hv; return String(Array.isArray(h) ? h[0] : h || "").split(",")[0].trim(); }
  function hvAll(e) { var h = e && e.hv; return Array.isArray(h) ? h.join(" / ") : String(h || ""); }
  function wordsWith(ch, max) {
    return WORDS.filter(function (w) { return w.hanzi.indexOf(ch) >= 0 && !/^h5-/.test(w.id); })
      .sort(function (a, b) { return (a.hanzi === ch ? -1 : 0) - (b.hanzi === ch ? -1 : 0) || a.hanzi.length - b.hanzi.length || (a.level || 9) - (b.level || 9); })
      .slice(0, max || 8);
  }

  var LAY = { "⿰": "left – right", "⿱": "top – bottom", "⿲": "left – middle – right", "⿳": "top – middle – bottom", "⿴": "surrounded",
    "⿵": "open at the bottom", "⿶": "open at the top", "⿷": "open on the right", "⿸": "top-left wrap", "⿹": "top-right wrap", "⿺": "bottom-left wrap", "⿻": "overlapping" };
  var TYPE = { p: "meaning + sound", i: "meanings combined", g: "picture" };
  /* parts shown as cards: meaning and sound parts for a meaning + sound character, otherwise the top-level parts */
  function cardParts(e) {
    var k = e.k || [];
    if (e.t === "p" && e.s && e.p) {
      var si = k.indexOf(e.s), pi = k.indexOf(e.p), out = [{ c: e.s, role: "s" }, { c: e.p, role: "p" }];
      return si > pi && pi >= 0 ? out.reverse() : out;
    }
    return k.map(function (c, i) { return { c: c, role: String(i) }; }).filter(function (x) { return x.c; });
  }
  var ROLE_CLS = { s: "r-s", p: "r-p", "0": "r-0", "1": "r-1", "2": "r-2", ".": "r-x" };

  /* ----- the character drawn from its strokes, parts coloured; replay animates the strokes in order ----- */
  function glyphSVG(ch, sd, roles, animate) {
    var paths = sd.strokes || [], meds = sd.medians || [], defs = "", body = "", t = 0, uid = "g" + Math.random().toString(36).slice(2, 7);
    body += '<g transform="translate(0,900) scale(1,-1)">';
    paths.forEach(function (d, i) {
      var cls = ROLE_CLS[(roles || "")[i]] || "r-x";
      if (!animate) { body += '<path class="cc-st ' + cls + '" d="' + d + '"/>'; return; }
      var m = meds[i] || [], len = 0, md = "";
      m.forEach(function (p, j) { md += (j ? "L" : "M") + p[0] + " " + p[1]; if (j) len += Math.hypot(p[0] - m[j - 1][0], p[1] - m[j - 1][1]); });
      len = Math.round(len) + 60;
      var dur = Math.max(0.25, len / 1100);
      defs += '<clipPath id="' + uid + i + '"><path d="' + d + '"/></clipPath>';
      body += '<path class="cc-ghost" d="' + d + '"/><path class="cc-anim ' + cls + '" clip-path="url(#' + uid + i + ')" d="' + md + '" style="stroke-dasharray:' + len + ";stroke-dashoffset:" + len +
        ";animation-duration:" + dur.toFixed(2) + "s;animation-delay:" + t.toFixed(2) + 's"/>';
      t += dur + 0.12;
    });
    body += "</g>";
    return '<svg class="cc-svg" viewBox="0 0 1024 1024" role="img" aria-label="' + esc(tx("{ch}, {n} strokes", { ch: ch, n: paths.length })) + '">' + (defs ? "<defs>" + defs + "</defs>" : "") + body + "</svg>";
  }
  function reducedMotion() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }

  /* ----- memory tip: a draft from the parts (or from AI), which the learner edits and keeps ----- */
  function noteOf(ch) { var n = (Store.state.charNotes || {})[ch]; return n && n.t ? n.t : ""; }
  function saveNote(ch, text) {
    Store.state.charNotes = Store.state.charNotes || {};
    Store.state.charNotes[ch] = { t: String(text || "").trim().slice(0, 300), at: Date.now() };
    Store.save(); if (typeof syncSoon === "function") syncSoon();
  }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function draftTip(C, ch, e, meaning) {
    var en = enOnly(), parts = cardParts(e);
    var mean = String(meaning || "").split(/[;,]/)[0].trim();
    if (e.t === "p" && e.s && e.p) {
      var sm = String(partMeaning(C, e.s)).split(/[;,]/)[0].trim(), ph = en ? ((C[e.p] || {}).py || [""])[0] : hvFirst(C[e.p]), me = en ? (e.py || [""])[0] : hvFirst(e);
      return en ? cap(sm) + " (" + e.s + ") + the sound of " + e.p + " (" + ph + ") → " + ch + " " + me + (mean ? ": " + mean + "." : ".")
        : cap(sm) + " (" + e.s + ") + âm " + ph + " (" + e.p + ") → " + me + (mean ? ": " + mean + "." : ".");
    }
    if (parts.length >= 2) {
      return parts.map(function (x) { return cap(String(partMeaning(C, x.c)).split(/[;,]/)[0].trim()) + " (" + x.c + ")"; }).join(" + ") + " → " + (mean || ch) + ".";
    }
    return "";
  }

  function viewChar(ch, wordId) {
    ch = String(ch || "");
    if (!HAN1.test(ch)) { location.hash = "#/"; return; }
    var w = wordId && WORDMAP[wordId], strip = w ? Array.from(w.hanzi).filter(function (c) { return HAN1.test(c); }) : [];
    var back = '<a class="back" href="#/" id="cc-back">‹ ' + (w ? esc(w.hanzi) : tx("Back")) + "</a>";
    var tabs = strip.length > 1 ? '<div class="cc-tabs" role="tablist">' + strip.map(function (c) {
      return '<a role="tab" class="cc-tab zh' + (c === ch ? " on" : "") + '" aria-selected="' + (c === ch) + '" href="#/char/' + encodeURIComponent(c) + "/" + encodeURIComponent(w.id) + '">' + esc(c) + "</a>";
    }).join("") + "</div>" : "";
    render(back + tabs + '<div id="cc-body"><p class="empty">' + tx("Loading…") + "</p></div>", "char");
    var myHash = location.hash, bk = document.getElementById("cc-back");
    bk.onclick = function (ev) { // back to where the card was opened; opened from a word, that word's sheet comes back too
      if (history.length < 2) return;
      ev.preventDefault();
      history.back();
      if (w) setTimeout(function () { if (!/^#\/char\//.test(location.hash)) openWordSheet(w.id); }, 350);
    };
    [].forEach.call(document.querySelectorAll(".cc-tab"), function (t) { // switching characters of one word keeps one history entry
      t.onclick = function (ev) { ev.preventDefault(); location.replace(t.getAttribute("href")); };
    });
        Promise.all([loadChars().catch(function () { return null; }), strokeJSON(ch)]).then(function (res) {
      var C = res[0], sd = res[1], body = document.getElementById("cc-body");
      if (!body || location.hash !== myHash) return;
      if (!C) { body.innerHTML = '<p class="empty">' + tx("Couldn't load the character data. Check your connection and try again.") + "</p>"; return; }
      drawCard(body, C, ch, C[ch] || {}, sd);
    });
  }

  function drawCard(body, C, ch, e, sd) {
    var en = enOnly(), one = oneCharWord(ch), ws = wordsWith(ch, 8), parts = cardParts(e), roles = e.r || "";
    // its meaning: the one-character word if the course has it, otherwise the meaning of the shortest course word using it
    var via = !one && ws.length && ws[0].hanzi.length <= 3 ? ws[0] : null;
    var meaning = one ? (en ? one.en : one.vi) : via ? (en ? via.en : via.vi) : "";
    var hasSP = e.t === "p" && e.s && e.p;
    var legend = hasSP ? '<span class="cc-key"><i class="k-p"></i>' + tx("Sound part") + ' <b class="zh r-p">' + esc(e.p) + '</b></span><span class="cc-key"><i class="k-s"></i>' + tx("Meaning part") + ' <b class="zh r-s">' + esc(e.s) + "</b></span>"
      : parts.length >= 2 && roles ? parts.map(function (x) { return '<span class="cc-key"><i class="k-' + x.role + '"></i><b class="zh ' + ROLE_CLS[x.role] + '">' + esc(x.c) + "</b></span>"; }).join("") : "";
    var head = '<section class="card cc-head"><div class="cc-box" id="cc-box">' + (sd ? glyphSVG(ch, sd, roles, false) : '<span class="cc-big zh">' + esc(ch) + "</span>") +
      (sd ? '<button type="button" class="cc-replay" id="cc-replay" aria-label="' + tx("Show the stroke order") + '"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg></button>' : "") + "</div>" +
      '<div class="cc-info"><div class="cc-py">' + (e.py || []).map(function (p) { return "<span>" + esc(p) + "</span>"; }).join(" · ") + SAY(ch, null, true) + "</div>" +
      (meaning ? '<p class="cc-mean">' + esc(meaning) + (via ? ' <span class="cc-via">(' + tx("in {w}", { w: '<span class="zh">' + esc(via.hanzi) + "</span>" }) + ")</span>" : "") + "</p>" : "") +
      (e.d && (en || !meaning) ? '<p class="cc-def' + (en ? "" : " dim") + '">' + (en ? "" : '<span class="tag">EN</span> ') + esc(e.d) + "</p>" : "") +
      (!en && hvAll(e) ? '<p class="cc-hv">' + tx("Hán Việt") + " <b>" + esc(hvAll(e)) + "</b></p>" : "") +
      '<div class="cc-chips">' + (e.n ? '<span class="tag">' + tx("{n} strokes", { n: e.n }) + "</span>" : "") + (e.rn && !e.k ? '<span class="tag">' + tx("Radical") + "</span>" : "") + "</div>" +
      (legend ? '<div class="cc-legend">' + legend + "</div>" : "") + "</div></section>";

    // how it is built
    var build = "";
    if (parts.length) {
      build = '<section class="card cc-sec"><h3 class="cc-h">' + tx("How it is built") + ' <small>' + [e.t ? tx(TYPE[e.t]) : "", e.lay ? tx(LAY[e.lay] || "") : ""].filter(Boolean).join(" · ") + "</small></h3>" +
        '<div class="cc-parts">' + parts.map(function (x, i) {
          var p = C[x.c] || {}, label = x.role === "s" ? tx("Meaning part") : x.role === "p" ? tx("Sound part") : tx("Part {n}", { n: i + 1 });
          var nm = partName(C, x.c), py = (p.py || [])[0] || "";
          return (i ? '<span class="cc-plus" aria-hidden="true">+</span>' : "") + '<a class="cc-part" href="#/char/' + encodeURIComponent(x.c) + '"' + (HAN1.test(x.c) && C[x.c] && C[x.c].k ? "" : ' data-nolink="1"') + '>' +
            '<span class="cc-badge ' + ROLE_CLS[x.role] + '">' + label + '</span><span class="cc-pg zh ' + ROLE_CLS[x.role] + '">' + esc(x.c) + "</span>" +
            '<span class="cc-pn">' + esc([py, en ? "" : nm].filter(Boolean).join(" · ")) + '</span><span class="cc-pm">' + esc(partMeaning(C, x.c)) + "</span></a>";
        }).join("") + "</div></section>";
    }

    // sound hint: the sound part then and now
    var sound = "";
    if (hasSP && C[e.p]) {
      var a = pySplit((C[e.p].py || [])[0]), b = pySplit((e.py || [])[0]);
      var sameRh = a.norm && a.norm === b.norm, sameIni = a.ini === b.ini;
      var rows = '<div class="cc-row"><span class="cc-rl">' + tx("Pinyin") + '</span><span class="cc-ss">' + sylHTML(a.raw, a.ini, sameIni, sameRh) + toneSVG("m", a.tone) +
        '<span class="cc-arr" aria-hidden="true">→</span>' + sylHTML(b.raw, b.ini, sameIni, sameRh) + toneSVG("m", b.tone) + '</span><span class="cc-rn">' +
        (a.tone === b.tone ? tx("same tone") : toneName("m", a.tone) + " → " + toneName("m", b.tone)) + "</span></div>";
      var hvA = viSplit(hvFirst(C[e.p])), hvB = viSplit(hvFirst(e)), hvRh = hvA.rhyme && hvA.rhyme === hvB.rhyme;
      if (!en && hvA.raw && hvB.raw) rows += '<div class="cc-row"><span class="cc-rl">' + tx("Hán Việt") + '</span><span class="cc-ss">' + sylHTML(hvA.raw, hvA.ini, hvA.ini === hvB.ini, hvRh) + toneSVG("v", hvA.tone) +
        '<span class="cc-arr" aria-hidden="true">→</span>' + sylHTML(hvB.raw, hvB.ini, hvA.ini === hvB.ini, hvRh) + toneSVG("v", hvB.tone) + '</span><span class="cc-rn">' +
        (hvA.tone === hvB.tone ? tx("same tone") : tx(hvA.tone) + " → " + tx(hvB.tone)) + "</span></div>";
      var verdict = a.plain === b.plain ? (a.tone === b.tone ? tx("Read exactly like its sound part {p}.", { p: e.p }) : tx("Read like its sound part {p}; only the tone changed.", { p: e.p }))
        : sameRh ? tx("Same rhyme -{r} as its sound part: seeing {p} you can guess the sound.", { r: b.norm, p: e.p })
        : !en && hvRh ? tx("The pinyin has drifted, but Hán Việt keeps the rhyme -{r}: remember it through Hán Việt.", { r: hvB.rhyme })
        : tx("The sound has changed a lot over time: the sound part is only a distant hint now.");
      sound = '<section class="card cc-sec"><h3 class="cc-h">' + tx("Sound hint") + ' <small class="zh">' + esc(e.p) + " → " + esc(ch) + "</small></h3>" + rows + '<p class="cc-verdict">' + verdict + "</p></section>";
    }

    // story: origin from the data, memory tip made by the learner
    var originTxt = "";
    if (hasSP) originTxt = tx("Meaning + sound character: {s} ({sm}) gives the meaning, {p} ({pp}) gives the sound.", { s: e.s, sm: partMeaning(C, e.s), p: e.p, pp: ((C[e.p] || {}).py || [""])[0] });
    else if (e.t === "i") originTxt = tx("Meanings combined: the parts together suggest the meaning.");
    else if (e.t === "g") originTxt = tx("Picture character: it began as a drawing of the thing.");
    var hint = e.h && !(hasSP && e.h.length < 20) ? '<p class="cc-hint">“' + esc(e.h) + '”' + (en ? "" : ' <span class="tag">EN</span>') + "</p>" : "";
    var origin = originTxt || hint ? '<div class="cc-story"><h4>📖 ' + tx("Origin") + ' <small>' + tx("from the character data") + "</small></h4><p>" + esc(originTxt) + "</p>" + hint + "</div>" : "";
    var mine = noteOf(ch), draft = mine ? "" : draftTip(C, ch, e, meaning || (e.d || ""));
    var tip = '<div class="cc-story cc-tip" id="cc-tip"><h4>✨ ' + tx("Memory tip") + ' <span class="cc-made">' + tx("made up, not history") + "</span></h4>" +
      '<div id="cc-tip-body"></div></div>';
    var story = '<section class="card cc-sec"><h3 class="cc-h">' + tx("Story") + " <small>" + tx("a draft to start from: edit it until it sticks") + "</small></h3>" +
      '<div class="cc-stories">' + origin + tip + "</div></section>";

    var words = ws.length ? '<section class="card cc-sec"><h3 class="cc-h">' + tx("Words with {ch}", { ch: ch }) + '</h3><div class="cc-words">' + ws.map(function (x) {
      return '<button type="button" class="cc-w" data-cw="' + esc(x.id) + '"><span class="zh">' + esc(x.hanzi) + "</span> " + PY(x.pinyin) + '<span class="dim">' + esc(en ? x.en : x.vi) + "</span></button>";
    }).join("") + "</div></section>" : "";
    var src = '<p class="sub cc-src">' + tx("Character data: Make Me a Hanzi (LGPL), hanviet-pinyin-words (MIT), Unicode Unihan.") + "</p>";

    body.innerHTML = head + build + sound + story + words + src;

    // wiring
    var rp = document.getElementById("cc-replay");
    if (rp && sd) rp.onclick = function () {
      var box = document.getElementById("cc-box"), old = box.querySelector(".cc-svg");
      var tmp = document.createElement("div"); tmp.innerHTML = glyphSVG(ch, sd, roles, !reducedMotion());
      old.replaceWith(tmp.firstChild);
      if (window.Audio2 && Audio2.sfx && Audio2.sfx.tap) Audio2.sfx.tap();
    };
    [].forEach.call(body.querySelectorAll("[data-nolink]"), function (a) { a.removeAttribute("href"); });
    [].forEach.call(body.querySelectorAll(".cc-w"), function (b) { b.onclick = function () { openWordSheet(b.getAttribute("data-cw")); }; });
    drawTip(C, ch, e, draft, meaning);
  }

  function drawTip(C, ch, e, draft, meaning) {
    var host = document.getElementById("cc-tip-body"); if (!host) return;
    var mine = noteOf(ch), aiOK = window.AI && AI.configured();
    if (mine) {
      host.innerHTML = '<p class="cc-mine">' + esc(mine) + '</p><div class="actions"><button type="button" class="btn small" id="cc-edit">✎ ' + tx("Edit") + "</button>" +
        '<button type="button" class="btn small" id="cc-del">🗑 ' + tx("Remove") + "</button></div>";
      document.getElementById("cc-edit").onclick = function () { editTip(C, ch, e, mine, meaning); };
      document.getElementById("cc-del").onclick = function () { saveNote(ch, ""); drawTip(C, ch, e, draftTip(C, ch, e, meaning || e.d || ""), meaning); UI.toast(tx("Tip removed"), "🗑"); };
      return;
    }
    host.innerHTML = (draft ? '<p class="cc-draft">' + esc(draft) + "</p>" : '<p class="sub">' + tx("No draft for this character yet. Write your own.") + "</p>") +
      '<div class="actions">' + (draft ? '<button type="button" class="btn small" id="cc-use">↓ ' + tx("Use this one") + "</button>" : "") +
      '<button type="button" class="btn small" id="cc-write">✎ ' + tx("Write my own") + "</button>" +
      (aiOK ? '<button type="button" class="btn small ai-btn" id="cc-ai">🤖 ' + tx("AI: another idea") + "</button>" : "") + "</div><div id=\"cc-ai-out\"></div>";
    var use = document.getElementById("cc-use"); if (use) use.onclick = function () { editTip(C, ch, e, draft, meaning); };
    document.getElementById("cc-write").onclick = function () { editTip(C, ch, e, "", meaning); };
    var ai = document.getElementById("cc-ai");
    if (ai) ai.onclick = function () {
      var out = document.getElementById("cc-ai-out"); ai.disabled = true; out.innerHTML = '<p class="sub">' + tx("Thinking…") + "</p>";
      var partsTxt = cardParts(e).map(function (x) { return x.c + " (" + (x.role === "s" ? "meaning part" : x.role === "p" ? "sound part" : "part") + ": " + ((C[x.c] || {}).d || "") + (hvFirst(C[x.c]) ? ", Hán Việt " + hvFirst(C[x.c]) : "") + ")"; }).join("; ");
      AI.call("ask", { text: ch, context: ("Pinyin " + (e.py || []).join("/") + "; Hán Việt " + hvAll(e) + "; meaning " + (meaning || e.d || "") + "; parts: " + partsTxt).slice(0, 400), preset: "free",
        question: "Write ONE short, vivid memory story (1-2 sentences) that links the parts of this character to its meaning and sound, for a Vietnamese learner. It is a memory trick, not real history." }).then(function (r) {
        ai.disabled = false;
        if (!document.getElementById("cc-ai-out")) return;
        if (!r.ok || !r.result || !r.result.answer) { out.innerHTML = '<p class="sub bad-t">' + esc(AI.errMsg ? AI.errMsg(r.error) : tx("Something went wrong.")) + "</p>"; return; }
        var t = String(r.result.answer).slice(0, 300);
        out.innerHTML = '<div class="cc-draft ai"><p>' + esc(t) + '</p><div class="actions"><button type="button" class="btn small" id="cc-use-ai">↓ ' + tx("Use this one") + "</button></div></div>";
        document.getElementById("cc-use-ai").onclick = function () { editTip(C, ch, e, t, meaning); };
      });
    };
  }
  function editTip(C, ch, e, text, meaning) {
    var host = document.getElementById("cc-tip-body"); if (!host) return;
    host.innerHTML = '<textarea id="cc-ta" class="cc-ta" rows="3" maxlength="300" aria-label="' + tx("Your memory tip") + '" placeholder="' + tx("Your own story, in your words") + '">' + esc(text) + "</textarea>" +
      '<div class="actions"><button type="button" class="btn small primary" id="cc-save">' + tx("Save") + '</button><button type="button" class="btn small" id="cc-cancel">' + tx("Cancel") + "</button></div>";
    var ta = document.getElementById("cc-ta"); ta.focus();
    document.getElementById("cc-save").onclick = function () {
      var v = ta.value.trim(); if (!v) { UI.toast(tx("Write something first"), "✍️"); return; }
      saveNote(ch, v); UI.toast(tx("Tip saved"), "✨"); drawTip(C, ch, e, "", meaning);
    };
    document.getElementById("cc-cancel").onclick = function () { drawTip(C, ch, e, noteOf(ch) ? "" : draftTip(C, ch, e, meaning || e.d || ""), meaning); };
  }
  /* "详细" -> tappable characters, each opening its card */
  function charLinks(hanzi, wordId) {
    return Array.from(hanzi).map(function (c) {
      return HAN1.test(c) ? '<a class="ch-link zh" href="#/char/' + encodeURIComponent(c) + (wordId ? "/" + encodeURIComponent(wordId) : "") + '" aria-label="' + esc(tx("Character card: {ch}", { ch: c })) + '">' + esc(c) + "</a>" : esc(c);
    }).join("");
  }
