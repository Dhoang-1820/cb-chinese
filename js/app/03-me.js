  /* ---------- me: profile, badges, settings ---------- */
  /* admin tools (content review, learner tracking) show only on the admin's phone: a saved admin code, or 5 taps on the version line */
  var ADMIN_FLAG = "cbChinese.adminMode";
  function isAdmin() { var f = false; try { f = localStorage.getItem(ADMIN_FLAG) === "1"; } catch (e) { /* storage blocked */ } return f || !!(window.Content && Content.adminCode && Content.adminCode()); }
  function backupLine() { var c = syncCfg(); return c.off ? "Off" : c.conflict ? "Paused · choose which copy to keep" : c.err ? "Last try failed" : c.last ? "On · saved " + agoText(new Date(c.last).toISOString()) : c.code ? "On" : "On · saves after you study"; }
  function viewMe(sub) {
    var s = Store.state, set = s.settings, lv = Game.level(s.xp), bc = SRS.boxCounts();
    var inSrs = Object.keys(s.srs).length, done = Object.keys(s.days).filter(function (k) { return s.days[k].completed; }).length;
    var nAudio = Audio2.allFiles().length;
    var admin = isAdmin(), unread = CHAT.unread;
    var html = '<section class="card me-top"><div class="mt-h"><span class="bob">' + UI.mascot("happy", 44) + '</span><span class="mt-t"><b>Level ' + lv.n + ' · <span class="zh">' + lv.zh + "</span></b><small>" + lv.en + " · " + s.xp + " XP</small></span></div>" +
      '<div class="xpbar"><span style="width:' + Math.round(lv.pct * 100) + '%"></span></div>' +
      '<div class="me-stats"><div><b>' + inSrs + '</b><span>words</span></div><div><b>' + done + '</b><span>lessons</span></div><div><b>' + Store.streak() + '</b><span>streak</span></div><div><b>' + Object.keys(s.badges).length + "</b><span>badges</span></div></div></section>" +
      '<section class="card me-rows">' +
      (chatCode() ? '<a class="me-row" href="#/chat"><span class="mr-i" aria-hidden="true">💬</span><span class="mr-t"><b>Messages</b><small>From the C&amp;B team</small></span>' + (unread ? '<span class="mr-badge">' + unread + " new</span>" : "") + '<span class="lc-go" aria-hidden="true">›</span></a>' : "") +
      '<a class="me-row" href="#/exams"><span class="mr-i" aria-hidden="true">🎓</span><span class="mr-t"><b>My exams</b><small>' + esc(examLine()) + '</small></span><span class="lc-go" aria-hidden="true">›</span></a>' +
      '<a class="me-row" href="#/ready"><span class="mr-i" aria-hidden="true">🎯</span><span class="mr-t"><b>Am I ready?</b><small>Readiness, score forecast, official papers</small></span><span class="lc-go" aria-hidden="true">›</span></a>' +
      '<a class="me-row" href="#/progress"><span class="mr-i" aria-hidden="true">📈</span><span class="mr-t"><b>Progress</b><small>Charts, mock scores, study plan</small></span><span class="lc-go" aria-hidden="true">›</span></a>' +
      '<a class="me-row" href="#/me/backup"><span class="mr-i" aria-hidden="true">☁️</span><span class="mr-t"><b>Cloud backup</b><small>' + esc(backupLine()) + '</small></span><span class="lc-go" aria-hidden="true">›</span></a>' +
      '<button type="button" class="me-row" id="s-guide"><span class="mr-i" aria-hidden="true">❓</span><span class="mr-t"><b>App guide</b><small>How the app works, in 1 minute</small></span><span class="lc-go" aria-hidden="true">›</span></button></section>' +
      '<details class="more"><summary><span>Badges · ' + Object.keys(s.badges).length + "/" + Game.BADGES.length + '</span></summary><section class="card"><div class="badge-grid">' +
      Game.BADGES.map(function (b) {
        var got = s.badges[b.id];
        return '<div class="bg-item' + (got ? "" : " locked") + '"><span class="bdg">' + b.icon + '</span><b>' + M({ vi: b.vi, en: b.en }) + "</b><small>" + M({ vi: b.dvi, en: b.den }) + "</small></div>";
      }).join("") + "</div></section></details>" +
      '<section class="card settings"><h2>Settings</h2>' +
      /* the exam (level, date, start time) is edited in one place: My exams */
      row("Exam", '<a class="btn small" id="s-exam-link" href="#/exams">' + esc(examShort()) + " ›</a>") +
      (examWarn(set.examDate) ? '<p class="sub" id="s-exam-note">' + examWarn(set.examDate) + "</p>" : "") +
      row("Meanings", sel("s-lang", [["both", "Việt + English"], ["vi", "Tiếng Việt"], ["en", "English"]], set.lang)) +
      row("Today's session length", sel("s-smode", [["quick", "Quick · ~7 min"], ["std", "Standard · ~15 min"], ["long", "Long · ~30 min"]], set.sessionMode || "std")) +
      row("Theme", sel("s-theme", [["auto", "System"], ["light", "Light"], ["dark", "Dark"]], set.theme)) +
      '<details class="more-set"><summary>More settings</summary>' +
      row("Show pinyin", '<label class="switch"><input type="checkbox" id="s-py"' + (set.showPinyin ? " checked" : "") + "><i></i></label>") +
      row("Sound effects", '<label class="switch"><input type="checkbox" id="s-sfx"' + (set.sfx !== false ? " checked" : "") + "><i></i></label>") +
      row("Voice speed", sel("s-rate", [["0.75", "0.75×"], ["0.9", "0.9×"], ["1", "1×"], ["1.15", "1.15×"]], String(set.audioRate || 1))) +
      row("Background noise in listening", sel("s-noise", [["0", "Off"], ["1", "Light café"], ["2", "Busy room"]], String(set.noise || 0))) +
      row("Mock listening speed", sel("s-mrate", [["0", "Same as voice speed"], ["1", "1× (normal)"], ["1.15", "1.15× faster"], ["1.3", "1.3× fast"]], String(set.mockRate || 0))) +
      row("Text size", sel("s-ts", [["m", "Normal"], ["l", "Large"], ["xl", "Larger"]], set.textSize || "m")) +
      row("Daily goal", sel("s-goal", [["20", "20 XP · chill"], ["30", "30 XP · steady"], ["50", "50 XP · serious"], ["80", "80 XP · intense"]], String(set.dailyGoal || 30))) +
      row("Lessons before the exam", sel("s-core", coreOptions().map(function (n) { return [String(n), n + " lessons"]; }), String(coreCut()))) +
      '<p class="sub">About ' + suggestCore() + " lessons fit before your exam at 5 a week. The rest are planned for after it.</p>" +
      row("Problem reports", '<a class="btn small" href="#/reports">' + (s.reports || []).length + " saved</a>") +
      row("Test voice", '<button class="btn small" id="s-test">🔊 Play</button>') +
      (admin ? '<h3 class="sec">Admin</h3>' + row("Content review", '<a class="btn small" href="#/fixes">Open</a>') + row("Learner tracking", '<a class="btn small" href="#/learners">Open</a>') : "") +
      "</details></section>" +
      '<details class="more"><summary><span>AI, reminder, backup and data</span></summary>' +
      '<section class="card settings"><div class="sec-h"><h2>🤖 AI assistant</h2><span class="tag">optional</span></div><p class="sub">Writing feedback and "Explain with AI", through a shared free AI service, so there is nothing to set up. Only the sentence or question you send is shared. It needs internet. (Advanced: you can point the app at your own server; that setting stays on this phone and is never exported.)</p><div id="ai-box" class="mw-form"></div></section>' +
      '<section class="card settings"><h2>Study reminder</h2><p class="sub">A daily calendar event until your exam, with an alert. Pick a time, then add it to your calendar once.</p>' +
      row("Time", '<input type="time" id="s-rtime" value="' + esc(set.remindTime || "20:00") + '">') +
      row("Days per week", '<select id="s-wdays">' + [2, 3, 4, 5, 6, 7].map(function (n) { return '<option value="' + n + '"' + ((set.weeklyDays || 5) === n ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select>") +
      '<div class="actions"><button class="btn small primary" id="s-ics">📅 iPhone Calendar</button><a class="btn small" id="s-gcal" target="_blank" rel="noopener" href="#">Google Calendar</a></div></section>' +
      '<section class="card settings"><h2>☁️ Cloud backup</h2><div id="sync-box"></div></section>' +
      '<section class="card settings"><div class="sec-h"><h2>GitHub backup</h2><span class="tag">advanced</span></div><div id="gist-box"></div></section>' +
      '<section class="card settings"><h2>Offline & data</h2>' +
      row("Audio recordings", '<span class="muted" id="s-audio-n">' + (nAudio ? nAudio + " files" : "not generated yet") + "</span>") +
      ("caches" in window && location.protocol.indexOf("http") === 0 ? row((nAudio ? "Download audio + stroke data" : "Download stroke data") + " for offline", '<button class="btn small" id="s-dl">⬇ Download</button>') : "") +
      row("Export progress", '<button class="btn small" id="s-exp">Export</button>') +
      row("Import progress", '<label class="btn small">Import<input type="file" id="s-imp" accept=".json,application/json" hidden></label>') +
      row("Reset progress", '<button class="btn small bad" id="s-reset">Reset</button>') + "</section></details>" +
      (isIOS && !standalone ? '<section class="card"><h2>Install on iPhone</h2><p class="sub">In Chrome, tap <b>Share ⬆︎</b> (address bar) → <b>Add to Home Screen</b>. The home-screen app opens full-screen, works offline, and iOS won\'t clear its progress. Export a backup now and then anyway.</p></section>' : "") +
      '<p class="sub center">' + DAYS.length + " days · " + WORDS.length + ' words · <a href="#/search">Search</a></p>' +
      '<p class="sub center" id="s-ver">Version 1.1 · build ' + BUILD + '</p><p class="sub center">Animated emoji: Noto Emoji Animation by Google, CC BY 4.0</p>';
    render(html, "me");
    var vt = 0, ver = document.getElementById("s-ver");
    if (ver) ver.onclick = function () { if (++vt >= 5 && !admin) { try { localStorage.setItem(ADMIN_FLAG, "1"); } catch (e) { /* fine */ } UI.toast("Admin tools shown in More settings", "🔧"); viewMe(); } };
    if (sub === "backup") { var sb = document.getElementById("sync-box"), dd = sb && sb.closest("details"); if (dd) { dd.open = true; setTimeout(function () { try { sb.scrollIntoView({ block: "center" }); } catch (e) { /* ignore */ } }, 80); } }
    function sv(k, v) { set[k] = v; Store.save(); applySettings(); }
    document.getElementById("s-py").onchange = function () { sv("showPinyin", this.checked); };
    document.getElementById("s-lang").onchange = function () { sv("lang", this.value); };
    document.getElementById("s-theme").onchange = function () { sv("theme", this.value); };
    document.getElementById("s-sfx").onchange = function () { sv("sfx", this.checked); if (this.checked) Audio2.sfx.good({ quiet: true }); };
    document.getElementById("s-rate").onchange = function () { sv("audioRate", parseFloat(this.value)); };
    document.getElementById("s-goal").onchange = function () { sv("dailyGoal", parseInt(this.value, 10)); };
    document.getElementById("s-noise").onchange = function () { sv("noise", parseInt(this.value, 10)); Audio2.noise(set.noise); if (set.noise) { UI.toast("Noise plays while a recording plays", "🎧"); Audio2.play("你好，这是薪酬福利中文。", "F"); } else Audio2.stop(); };
    document.getElementById("s-mrate").onchange = function () { sv("mockRate", parseFloat(this.value)); };
    document.getElementById("s-smode").onchange = function () { sv("sessionMode", this.value); };
    document.getElementById("s-ts").onchange = function () { sv("textSize", this.value); };
    document.getElementById("s-wdays").onchange = function () { sv("weeklyDays", parseInt(this.value, 10)); };
    var rt = document.getElementById("s-rtime"), gcal = document.getElementById("s-gcal");
    function syncCal() { gcal.href = googleCalURL(rt.value || "20:00", set.examDate); }
    rt.onchange = function () { sv("remindTime", rt.value || "20:00"); syncCal(); }; syncCal();
    document.getElementById("s-ics").onclick = function () {
      var blob = new Blob([reminderICS(rt.value || "20:00", set.examDate)], { type: "text/calendar" }), url = URL.createObjectURL(blob);
      var a = document.createElement("a"); a.href = url; a.download = "chinese-study-reminder.ics"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
      UI.toast("Opening the calendar file — tap Add to Calendar", "📅");
    };
    wireSync(); wireBackup(); wireAI();
    var sg = document.getElementById("s-guide"); if (sg) sg.onclick = function () { showGuide(); };
    document.getElementById("s-core").onchange = function () { sv("coreTarget", parseInt(this.value, 10)); UI.toast("Plan updated", "📅"); };
    document.getElementById("s-test").onclick = function () { Audio2.noise(0); Audio2.play("你好，这是薪酬福利中文。", "F"); };
    var dl = document.getElementById("s-dl");
    if (dl) dl.onclick = function () { downloadAudio(dl); };
    if (dl) audioStatus(function (st) {
      var n = document.getElementById("s-audio-n"); if (!n) return;
      n.textContent = st.have + " of " + st.total + " saved on this phone";
      if (st.total > st.have) dl.textContent = "⬇ Download missing (" + (st.total - st.have) + ")"; else if (st.total) dl.textContent = "✓ All saved";
    });
    document.getElementById("s-exp").onclick = function () { Store.shareJSON(); };
    document.getElementById("s-imp").onchange = function () {
      var f = this.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { try { Store.importJSON(r.result); buildIndex(); applySettings(); UI.toast("Progress imported", "✅"); route(); } catch (e) { UI.toast("Import failed: " + e.message, "⚠️"); } };
      r.readAsText(f);
    };
    document.getElementById("s-reset").onclick = function () {
      if (confirm("Delete all progress, XP, badges and streak? Export first if you want a backup.")) { Store.reset(); buildIndex(); applySettings(); UI.toast("Progress reset"); route(); }
    };
    function row(label, ctl) { return '<div class="row"><span>' + label + "</span>" + ctl + "</div>"; }
    function sel(id, opts, cur) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>"; }
  }
  /* HSK 3.0 replaces the HSK 2.0 test format from 13 Dec 2026; this app's drills and mock exams follow the 2.0 format. */
  /* a warning for exam dates after 13 Dec 2026 (HSK 3.0), or "" */
  function examWarn(d) { return d && d >= "2026-12-13" ? "⚠ This date is after 13 Dec 2026, when HSK 3.0 starts. The mocks and drills here follow the HSK 2.0 format, so check which format your test centre will use." : ""; }
  /* e.g. "HSK 4 · 23 Nov 2026 · 09:00", or "HSK 4 · no date" */
  function examShort() { var st = Store.state.settings; return "HSK " + exLv() + " · " + (st.examDate ? lrnDate(st.examDate) : "no date") + (st.examTime ? " · " + st.examTime : ""); }
  /* ---------- AI assistant settings (Me) ---------- */
  function wireAI() {
    var box = document.getElementById("ai-box"); if (!box || !window.AI) return;
    function draw(msg) {
      var c = AI.own(), fb = AI.counts(), on = AI.configured(), bi = AI.usingBuiltIn();
      var form = '<label for="ai-url">Function URL</label><input id="ai-url" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://your-project.supabase.co/functions/v1/ai" value="' + esc(c.url) + '">' +
        '<label for="ai-code">Access code (only if your server uses one)</label><input id="ai-code" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="' + (c.code ? "saved · type to replace" : "optional") + '">' +
        '<div class="actions"><button class="btn small primary" id="ai-save">Save</button>' + (c.url ? '<button class="btn small bad" id="ai-off">' + (AI.hasBuiltIn() ? "Use built-in AI" : "Remove") + "</button>" : "") + "</div>";
      var hint = on ? (bi ? "✓ Built-in AI is on. Nothing to set up. " : "✓ Using your own server. ") + "Your feedback so far: 👍 " + fb.up + " · 👎 " + fb.down : "Not set up yet. Everything else works without it.";
      box.innerHTML = (on ? '<div class="actions"><button class="btn small" id="ai-test">Test AI</button></div>' : "") +
        '<p class="sub" id="ai-status">' + esc(msg || hint) + "</p>" +
        (AI.hasBuiltIn() ? '<details' + (c.url ? " open" : "") + '><summary class="sub">Use my own server (advanced)</summary>' + form + "</details>" : form);
      document.getElementById("ai-save").onclick = function () {
        var url = document.getElementById("ai-url").value.trim(), code = document.getElementById("ai-code").value.trim() || c.code;
        if (!AI.validUrl(url)) return draw("The URL should look like https://your-project.supabase.co/functions/v1/ai");
        if (code && code.length < 6) return draw("The access code needs at least 6 characters (or leave it empty).");
        AI.save(url, code); draw("✓ Saved on this phone. Tap Test AI to check it.");
      };
      var t = document.getElementById("ai-test");
      if (t) t.onclick = function () {
        t.disabled = true; document.getElementById("ai-status").textContent = "Testing…";
        AI.call("grade", { word: "地铁", scene: "A man takes the subway to work", sentence: "我每天坐地铁去公司。" }).then(function (r) {
          draw(r.ok ? "✓ Works. Model " + r.model + " · " + r.used + "/" + r.cap + " AI calls used today." : "✗ " + AI.errMsg(r.error));
        });
      };
      var off = document.getElementById("ai-off");
      if (off) off.onclick = function () { if (confirm(AI.hasBuiltIn() ? "Go back to the built-in AI?" : "Remove the AI setup from this phone?")) { AI.clear(); draw(AI.hasBuiltIn() ? "Using the built-in AI again." : "Removed."); } };
    }
    draw();
  }

  /* ---------- report a problem ----------
     The ⚑ button in the top bar saves a note with the screen's route and a snippet of what was on screen,
     so wrong answers, bad audio or typos can be reviewed (Me → Problem reports) and copied out later. */
  function openReport(preset) {
    if (document.querySelector(".modal-wrap.report")) return;
    var ctx = (app.innerText || "").replace(/\s+/g, " ").trim().slice(0, 300), here = location.hash || "#/";
    var cands = [];
    if (preset && typeof preset === "object" && preset.ref) cands = [{ ref: preset.ref, label: preset.label || preset.ref }];
    else if (window.Content) { try { cands = Content.locate(app.innerText || ""); } catch (e) { cands = []; } }
    var canAI = !!(window.AI && AI.configured() && window.Content && cands.length);
    var wrap = document.createElement("div");
    wrap.className = "modal-wrap report";
    var pick = !canAI ? "" : cands.length === 1 ? '<p class="sub rp-item">Item: <b>' + esc(cands[0].label) + "</b></p>" :
      '<label class="sub" for="rp-ref">Which item?</label><select id="rp-ref">' + cands.map(function (c) { return '<option value="' + esc(c.ref) + '">' + esc(c.label) + "</option>"; }).join("") + "</select>";
    wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3>⚑ Report a problem</h3><p class="sub">Saved on this phone with the screen you are on (' + esc(here) + "). If the AI agrees, you can fix the lesson yourself.</p>" + pick +
      '<textarea id="rp-text" rows="4" maxlength="500" placeholder="What is wrong? e.g. wrong answer, bad audio, typo, confusing English"></textarea>' +
      (canAI ? '<label class="rp-ai"><input type="checkbox" id="rp-ask" checked> Ask the AI to check this item</label>' : "") +
      '<div id="rp-out"></div><div class="actions center"><button class="btn primary" id="rp-save">Save</button><button class="btn" data-close>Cancel</button></div></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("show"); });
    function close() { wrap.classList.remove("show"); setTimeout(function () { wrap.remove(); }, 250); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap || e.target.closest("[data-close]")) close(); });
    document.getElementById("rp-save").onclick = function () {
      var text = document.getElementById("rp-text").value.trim();
      if (!text) { UI.toast("Write a short note first", "✍️"); return; }
      var btn = this; btn.onclick = null; btn.disabled = true; // a double tap must not save twice
      var refEl = document.getElementById("rp-ref"), ref = canAI ? (refEl ? refEl.value : cands[0].ref) : "", ask = canAI && document.getElementById("rp-ask").checked;
      var s = Store.state; s.reports = s.reports || [];
      var rec = { id: Date.now().toString(36), date: Store.today(), route: here, text: text.slice(0, 500), ctx: ctx };
      if (ref) rec.ref = ref;
      s.reports.push(rec);
      if (s.reports.length > 100) s.reports.shift();
      Store.save();
      if (!ask) { close(); UI.toast("Saved. See Me → Problem reports", "⚑"); return; }
      var out = document.getElementById("rp-out");
      out.innerHTML = '<div class="ai-card ai-wait">🤖 Checking this item twice… (about 10 seconds)</div>';
      document.querySelector(".modal-wrap.report .actions").innerHTML = '<button class="btn" data-close>Close</button>';
      var LABEL = { ok: "✓ The AI thinks this item is correct", key_wrong: "⚠ The AI thinks the answer is wrong", typo: "⚠ The AI found a typo", translation: "⚠ The AI found a translation problem", ambiguous: "⚠ The AI thinks it is ambiguous", other: "⚠ The AI found a problem" };
      function show(r) {
        rec.verdict = r.verdict || ""; Store.save();
        var note = r.status === "proposed" ? "The AI suggests a fix. Accept it and the lesson changes right away (for everyone). Not convinced? Discuss it with the AI first." :
          r.status === "needs_review" ? "The two AI checks did not agree. Discuss it with the AI to reach a final answer." :
          r.status === "dismissed" ? "The AI would not change this item. If you disagree, tell the AI why and it will check again." : "Saved.";
        out.innerHTML = '<div class="ai-card"><div class="ai-head"><b>🤖 ' + esc(LABEL[r.verdict] || "The AI could not decide") + "</b></div>" + (r.reasoning ? '<p class="ai-exp">' + esc(r.reasoning) + "</p>" : "") +
          '<p class="sub">' + esc(note) + "</p>" +
          (r.status === "proposed" ? '<div class="actions"><button class="btn small primary" id="rp-accept">✓ Accept this fix</button></div>' : "") +
          (r.canDiscuss ? '<textarea id="rp-chat" rows="2" maxlength="500" placeholder="Reply to the AI: your reasoning or evidence"></textarea><div class="actions"><button class="btn small" id="rp-send">💬 Discuss with the AI</button></div>' : (r.token && r.turns >= 5 ? '<p class="sub">Discussion limit reached. Your note is saved.</p>' : "")) + "</div>";
        var acc = document.getElementById("rp-accept"), snd = document.getElementById("rp-send");
        if (acc) acc.onclick = function () {
          acc.disabled = true; acc.textContent = "Applying…";
          Content.accept(r.token).then(function (a) {
            if (!a.ok) { acc.disabled = false; acc.textContent = "✓ Accept this fix"; UI.toast(AI.errMsg(a.error), "⚠️"); return; }
            rec.accepted = true; Store.save();
            out.innerHTML = '<div class="ai-card"><b>✅ Fix accepted</b><p class="sub">' + (a.applied ? "This lesson is updated now. Reload the screen to see it." : "Saved. It will show once the lesson is loaded again.") + "</p></div>";
            try { route(); } catch (e) { /* the screen reloads itself */ }
          });
        };
        if (snd) snd.onclick = function () {
          var m = document.getElementById("rp-chat").value.trim(); if (!m) { UI.toast("Write your reply first", "✍️"); return; }
          snd.disabled = true; out.insertAdjacentHTML("beforeend", '<div class="ai-card ai-wait">🤖 Checking again… (about 10 seconds)</div>');
          Content.discuss(r.token, m).then(function (d) {
            if (!d.ok) { show(r); UI.toast(AI.errMsg(d.error), "⚠️"); return; }
            show(d.result);
          });
        };
      }
      Content.report(ref, text, route).then(function (res) {
        if (!res.ok) { out.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + "<br><small>Your note is saved on this phone.</small></div>"; return; }
        show(res.result);
      });
    };
  }

  /* ---------- content review (Me → Content review): accept or reject proposed fixes ---------- */
  var FIX_TAB = "proposed";
  function viewFixes(msg) {
    var html0 = '<section class="card"><h2>🛠 Content review</h2><p class="sub">Readers accept AI-checked fixes themselves when they report a problem. Use this screen only to look at them and undo a bad one. Reviewer code = the ADMIN_CODE secret on the server.</p>';
    if (!window.AI || !AI.configured()) { render(html0 + '<p class="empty">Turn on the AI assistant first (Me → AI assistant).</p></section>', "me"); return; }
    if (!Content.adminCode()) {
      render(html0 + '<label for="fx-code">Reviewer code</label><input id="fx-code" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="ADMIN_CODE"><div class="actions"><button class="btn small primary" id="fx-save">Save on this phone</button></div><p class="sub bad-t" id="fx-msg">' + esc(msg || "") + '</p></section>', "me");
      document.getElementById("fx-save").onclick = function () { var v = document.getElementById("fx-code").value.trim(); if (v.length < 12) { document.getElementById("fx-msg").textContent = "At least 12 characters."; return; } Content.setAdminCode(v); viewFixes(); };
      return;
    }
    var tabs = [["proposed", "Proposed"], ["needs_review", "Needs a look"], ["dismissed", "AI disagreed"], ["accepted", "Accepted"], ["learners", "👥 Learners"]];
    render(html0 + '<div id="fx-svc"></div><div class="fx-tabs">' + tabs.map(function (t) { return '<button class="btn small' + (t[0] === FIX_TAB ? " primary" : "") + '" data-fxtab="' + t[0] + '">' + t[1] + "</button>"; }).join("") + '</div><div id="fx-list"><p class="empty">Loading…</p></div><div class="actions"><button class="btn small" id="fx-forget">Forget reviewer code</button></div></section>', "me");
    [].forEach.call(document.querySelectorAll("[data-fxtab]"), function (b) { b.onclick = function () { var t = b.getAttribute("data-fxtab"); if (t === "learners") { location.hash = "#/learners"; return; } FIX_TAB = t; viewFixes(); }; });
    document.getElementById("fx-forget").onclick = function () { Content.setAdminCode(""); viewFixes(); };
    var list = document.getElementById("fx-list");
    serviceBlock(document.getElementById("fx-svc"));
    Content.admin("review_list", { status: FIX_TAB }).then(function (r) {
      if (!r.ok) { list.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(r.error)) + "</div>"; if (r.error === "bad_admin") { Content.setAdminCode(""); viewFixes(AI.errMsg("bad_admin")); } return; }
      var rows = r.result.rows || [];
      if (!rows.length) { list.innerHTML = '<p class="empty">Nothing here.</p>'; return; }
      list.innerHTML = rows.map(fixCard).join("");
      rows.forEach(wireFix);
    });
  }
  /* Admin: how the service is doing. Numbers only. An older server has no "admin_stats" task: then there is simply no block. */
  function serviceBlock(host) {
    if (!host) return;
    Content.admin("admin_stats", {}).then(function (r) {
      if (!r.ok || !r.result || typeof r.result !== "object" || !document.body.contains(host)) return;
      var x = r.result, ai = x.ai, bk = x.backups, rp = x.reports, out = "";
      function n(v) { v = Math.round(+v); return isFinite(v) && v > 0 ? v : 0; }
      if (ai && Array.isArray(ai.days)) {
        var days = ai.days.slice(-14).map(function (d) { return { x: String(d.day || "").slice(8, 10), y: n(d.n) }; }), most = days.reduce(function (m, d) { return Math.max(m, d.y); }, 0);
        out += '<p class="sub">AI calls today: <b class="' + (n(ai.today) >= n(ai.cap) * 0.8 ? "bad-t" : "") + '" id="svc-ai">' + n(ai.today) + "/" + n(ai.cap) + "</b>" + (n(ai.today) >= n(ai.cap) ? " · the daily cap is reached" : "") + "</p>" +
          barChart(days, {}) + '<p class="sub lrn-cap">AI calls a day, last 14 days (UTC), today on the right · most in a day: ' + most + '</p><p class="sr">Calls per day, oldest first: ' + days.map(function (d) { return d.y; }).join(", ") + "</p>";
      } else out += '<p class="sub">AI calls: unknown (the usage table could not be read).</p>';
      out += bk ? '<p class="sub">Phones with a backup: <b class="' + (n(bk.n) >= n(bk.max) ? "bad-t" : "") + '" id="svc-bk">' + n(bk.n) + "/" + n(bk.max) + "</b>" + (n(bk.n) >= n(bk.max) ? " · full, a new phone cannot back up" : "") + ' · not saved for 3+ days: <b id="svc-stale">' + n(bk.stale) + "</b></p>" : '<p class="sub">Backups: unknown.</p>';
      out += rp ? '<p class="sub">Content reports waiting: <b id="svc-rep">' + n(rp.waiting) + "</b></p>" : '<p class="sub">Content reports: unknown.</p>';
      host.innerHTML = '<div class="fix svc" id="svc"><div class="sec-h"><b>Service</b><span class="muted">now</span></div>' + out + "</div>";
    });
  }
