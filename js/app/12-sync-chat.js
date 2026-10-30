  /* ---------- cloud backup (private GitHub Gist) ----------
     The token stays on this device only (separate key, never exported with progress). */
  var GIST_KEY = "cbChinese.gist", GIST_FILE = "cb-chinese-progress.json", GIST_DESC = "C&B Chinese progress backup";
  function gistCfg() { try { return JSON.parse(localStorage.getItem(GIST_KEY)) || {}; } catch (e) { return {}; } }
  function gistSave(c) { try { localStorage.setItem(GIST_KEY, JSON.stringify(c)); } catch (e) {} }
  function gh(path, opts, token) {
    opts = opts || {}; opts.headers = { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json" };
    if (opts.body) opts.headers["Content-Type"] = "application/json";
    return fetch("https://api.github.com" + path, opts).then(function (r) {
      if (r.status === 401) throw new Error("GitHub didn't accept the token. Check it has the gist permission.");
      if (!r.ok) throw new Error("GitHub error " + r.status + ". Try again later.");
      return r.json();
    });
  }
  function gistFind(token) {
    return gh("/gists?per_page=100", {}, token).then(function (list) {
      var g = (list || []).filter(function (x) { return x.description === GIST_DESC && x.files && x.files[GIST_FILE]; })[0];
      return g ? g.id : null;
    });
  }
  function gistBackup(silent) {
    var c = gistCfg(); if (!c.token) return Promise.reject(new Error("Connect a GitHub token first."));
    var body = { description: GIST_DESC, files: {} }; body.files[GIST_FILE] = { content: Store.serialize(false) };
    var p = c.id ? gh("/gists/" + c.id, { method: "PATCH", body: JSON.stringify(body) }, c.token)
      : gh("/gists", { method: "POST", body: JSON.stringify(Object.assign({ public: false }, body)) }, c.token);
    return p.then(function (g) { c.id = g.id; c.last = Date.now(); c.needsRestore = false; gistSave(c); if (!silent) UI.toast("Backed up to GitHub", "☁️"); return g; });
  }
  function gistRestore() {
    var c = gistCfg(); if (!c.token || !c.id) return Promise.reject(new Error("No backup found yet."));
    return gh("/gists/" + c.id, {}, c.token).then(function (g) {
      var f = g.files && g.files[GIST_FILE]; if (!f) throw new Error("The backup file is missing from the gist.");
      if (f.truncated && f.raw_url) return fetch(f.raw_url).then(function (r) { return r.text(); });
      return f.content;
    });
  }
  // back up quietly when the app goes to the background, at most every 6 hours
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) return;
    var c = gistCfg();
    // never auto-overwrite a backup this phone hasn't restored or explicitly backed up to yet, or when local progress failed to load
    if (c.token && c.id && !c.needsRestore && Store.available && navigator.onLine !== false && (!c.last || Date.now() - c.last > 6 * 3600 * 1000)) gistBackup(true).catch(function () {});
  });
  function wireBackup() {
    var c = gistCfg(), box = document.getElementById("gist-box"); if (!box) return;
    function draw() {
      c = gistCfg();
      box.innerHTML = c.token
        ? (c.needsRestore ? '<p class="warn">A backup already exists in your GitHub. Tap <b>Restore</b> to load it on this phone (or <b>Back up now</b> to replace it with this phone\'s progress). Automatic backup is paused until you choose.</p>' :
          '<p class="sub">Connected. ' + (c.last ? "Last backup: " + esc(new Date(c.last).toLocaleString()) + "." : "No backup yet.") + ' The app backs up by itself when you leave it (at most every 6 hours).</p>') +
          '<div class="actions"><button class="btn primary small" id="g-up">☁️ Back up now</button><button class="btn small" id="g-down">⬇ Restore</button><button class="btn small" id="g-off">Disconnect</button></div>'
        : '<p class="sub">Free, private backup of your progress in your GitHub account. Create a token at <b>github.com → Settings → Developer settings → Personal access tokens → Fine-grained</b>, with <b>Gists: read and write</b> only, then paste it here. The token stays on this phone.</p>' +
          '<label for="g-token" class="sr">GitHub token</label><input id="g-token" type="password" autocomplete="off" placeholder="github_pat_…"><div class="actions"><button class="btn primary small" id="g-connect">Connect</button></div>';
      var bConnect = document.getElementById("g-connect"), bUp = document.getElementById("g-up"), bDown = document.getElementById("g-down"), bOff = document.getElementById("g-off");
      if (bConnect) bConnect.onclick = function () {
        var tok = document.getElementById("g-token").value.trim(); if (!tok) return;
        bConnect.disabled = true; bConnect.textContent = "Connecting…";
        gistFind(tok).then(function (id) {
          gistSave({ token: tok, id: id || null, last: null, needsRestore: !!id });
          UI.toast(id ? "Connected · found your backup" : "Connected", "☁️"); draw();
          if (!id) gistBackup(false).then(draw).catch(function (e) { UI.toast(e.message, "⚠️"); });
        }).catch(function (e) { bConnect.disabled = false; bConnect.textContent = "Connect"; UI.toast(e.message, "⚠️"); });
      };
      if (bUp) bUp.onclick = function () {
        if (gistCfg().needsRestore && !window.confirm("Replace the backup in GitHub with this phone's progress?")) return;
        bUp.disabled = true; gistBackup(false).then(draw).catch(function (e) { bUp.disabled = false; UI.toast(e.message, "⚠️"); }); };
      if (bDown) bDown.onclick = function () {
        gistRestore().then(function (text) {
          var obj = JSON.parse(text), when = obj.exported ? new Date(obj.exported).toLocaleString() : "unknown time";
          if (!window.confirm("Replace the progress on this phone with the backup from " + when + "?")) return;
          Store.importJSON(text); var cc = gistCfg(); cc.needsRestore = false; cc.last = Date.now(); gistSave(cc);
          buildIndex(); applySettings(); UI.toast("Progress restored", "✅"); route();
        }).catch(function (e) { UI.toast(e.message, "⚠️"); });
      };
      if (bOff) bOff.onclick = function () {
        if (!window.confirm("Disconnect cloud backup on this phone? Your backup stays in GitHub.")) return;
        try { localStorage.removeItem(GIST_KEY); } catch (e) {} draw();
      };
    }
    draw();
  }

  /* ---------- cloud backup (the app's own server) ----------
     On by default and silent: a copy of the progress is saved after study, and the phone stays the main copy (the app
     works the same offline). No account: this phone makes a random restore code, and typing that code on another phone
     loads the backup there. The code lives in localStorage "cbChinese.sync" and is never part of an export. */
  var SYNC_KEY = "cbChinese.sync", SYNC_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", syncTimer = null, syncBusy = null;
  function syncCfg() { try { var c = JSON.parse(localStorage.getItem(SYNC_KEY)); return c && typeof c === "object" ? c : {}; } catch (e) { return {}; } }
  function syncSave(c) { try { localStorage.setItem(SYNC_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ } }
  var SYNC_LIMIT = 400000; // characters per backup the server accepts (MAX_SYNC in supabase/functions/ai/index.ts)
  function syncNewCode() {
    var a = new Uint8Array(16), out = ""; (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < 16; i++) out += SYNC_ABC.charAt(a[i] % 32);
    return out;
  }
  function syncShow(code) { return String(code || "").replace(/(.{4})(?=.)/g, "$1-"); }
  function syncMeta() { var st = Store.state; return { xp: st.xp, streak: Store.streak(), words: Object.keys(st.srs).length, last: st.streak.last || "" }; }
  function syncMark() { var st = Store.state; return st.xp + ":" + Object.keys(st.srs).length + ":" + (st.streak.last || ""); }
  /* Saves now. Resolves with "saved", "conflict", "same", "off" or an error code; never rejects. */
  function syncNow(force) {
    var c = syncCfg();
    if (c.off || !Store.available || !Store.state.settings.onboarded || !AI.available()) return Promise.resolve("off");
    if (c.conflict && !force) { if (syncBehind(c.conflict.meta)) force = true; else return Promise.resolve("conflict"); } // paused earlier by a copy that isn't ahead: heal
    if (!c.code && !Store.state.xp) return Promise.resolve("off"); // nothing worth keeping yet
    if (syncBusy) return syncBusy;
    var mark = syncMark(); if (!force && c.code && c.mark === mark) return Promise.resolve("same");
    var first = !c.code; if (first) { c.code = syncNewCode(); c.rev = 0; syncSave(c); }
    var data = Store.backup(), size = 0; // as saved on the phone; only a very large deck goes in its compact form (see js/storage.js), and restoring reads both
    try { size = JSON.stringify(data).length; } catch (e) { size = 0; }
    syncBusy = AI.call("sync_put", { code: c.code, rev: c.rev || 0, force: !!force, data: data, meta: syncMeta(), summary: studySummary() }).then(function (r) {
      syncBusy = null; var n = syncCfg();
      /* "too_big" from a server that knows backups means this backup is over its limit; from an older server it means "no backup task" */
      if (!r.ok) { n.err = r.error === "too_big" && size > SYNC_LIMIT - 20000 ? "sync_big" : r.error === "too_big" || r.error === "bad_task" ? "bad_task" : r.error; syncSave(n); return r.error; }
      delete n.err;
      if (r.result.conflict) {
        /* Usually not another phone: iOS suspended the app while a save was on its way, the server kept it, the reply was lost,
           so this phone still has the old number. When the server's copy is not ahead of this phone in anything, keep this phone. */
        if (!force && syncBehind(r.result.meta)) { n.rev = r.result.rev; syncSave(n); return syncNow(true); }
        n.conflict = { at: r.result.updated_at, meta: r.result.meta || {} }; syncSave(n); return "conflict";
      }
      n.rev = r.result.rev; n.last = Date.now(); n.mark = mark; delete n.conflict; syncSave(n);
      if (first) UI.toast("Your progress is now backed up online (Me → Cloud backup)", "☁️");
      return "saved";
    });
    return syncBusy;
  }
  /* the server copy has no more XP, words or study days than this phone, so keeping this phone loses nothing */
  function syncBehind(m) {
    m = m || {}; var st = Store.state;
    return num(m.xp) <= num(st.xp) && num(m.words) <= Object.keys(st.srs).length && String(m.last || "") <= String(st.streak.last || "");
  }
  function syncPausedCard() {
    var c = syncCfg(); if (!c.code || c.off) return "";
    var stale = c.last && Date.now() - c.last > 2 * 864e5;
    if (!c.conflict && !(c.err && stale)) return "";
    return '<a class="card warn-card sync-paused" href="#/me"><b>☁️ Backup ' + (c.conflict ? "paused" : "failing") + "</b><small>" +
      (c.conflict ? "Another copy of your progress was saved. Choose which one to keep in Me → Cloud backup. Until then the C&amp;B team sees old numbers." : "Your progress hasn't been saved online for " + Math.floor((Date.now() - c.last) / 864e5) + " days. Tap to check.") + "</small></a>";
  }
  /* ---------- Teacher chat (learner side) ----------
     Messages live on the server (see chat_get / chat_send in supabase/functions/ai/index.ts) and are reached with this
     phone's restore code. New messages arrive by a live connection while the app is open; polling is the fallback.
     Each check also tells the teacher that the app is open and how the backup is doing (version + on/off/paused/error). */
  var CHAT = { msgs: [], unread: 0, last: 0, sock: null, topic: "", timer: null };
  function chatCode() { return syncCfg().code || ""; }
  function chatClient() { var c = syncCfg(); return { v: BUILD, b: c.off ? "off" : c.conflict ? "paused" : c.err ? "err" : "on", e: c.err || "" }; }
  function chatMerge(list, full) {
    if (full) CHAT.msgs = [];
    (list || []).forEach(function (m) { var i = -1; CHAT.msgs.forEach(function (x, k) { if (x.id === m.id) i = k; }); if (i >= 0) CHAT.msgs[i] = m; else CHAT.msgs.push(m); });
    CHAT.msgs.sort(chatOrder);
    CHAT.msgs.forEach(function (m) { if (m.id > CHAT.last) CHAT.last = m.id; });
  }
  /* read: the chat screen is open, so the teacher's messages count as seen */
  function chatPoll(read) {
    var code = chatCode();
    if (!code || !window.AI || !AI.available()) return Promise.resolve(null);
    var before = CHAT.unread;
    return AI.call("chat_get", { code: code, since: 0, read: !!read, client: chatClient() }).then(function (r) {
      if (!r.ok) return null;
      chatMerge(r.result.msgs, true); CHAT.unread = r.result.unread || 0;
      if (r.result.live) chatLive(r.result.live, function () { chatPoll(location.hash === "#/chat").then(function () { chatDraw(); }); });
      if (CHAT.unread > before && /^#?\/?$/.test(location.hash) && !workDone) viewHome(); // a new message: show it on Home
      return r;
    });
  }
  /* minimal Supabase Realtime client (Phoenix protocol): join one public channel, keep it alive, call ping() on a broadcast */
  function chatLive(cfg, ping) {
    if (!window.WebSocket || !cfg || !cfg.url || (CHAT.sock && CHAT.topic === cfg.topic)) return;
    var ws, ref = 0, hb = null;
    try { ws = new WebSocket(cfg.url + "?apikey=" + encodeURIComponent(cfg.key) + "&vsn=1.0.0"); } catch (e) { return; }
    CHAT.sock = ws; CHAT.topic = cfg.topic;
    ws.onopen = function () {
      ws.send(JSON.stringify({ topic: "realtime:" + cfg.topic, event: "phx_join", payload: { config: { broadcast: { self: false }, presence: { key: "" }, private: false }, access_token: cfg.key }, ref: String(++ref) }));
      hb = setInterval(function () { if (ws.readyState === 1) ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) })); }, 25000);
    };
    ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m && m.event === "broadcast") ping(); };
    ws.onclose = ws.onerror = function () { clearInterval(hb); if (CHAT.sock === ws) { CHAT.sock = null; CHAT.topic = ""; } };
  }
  function chatStop() { if (CHAT.sock) { try { CHAT.sock.close(); } catch (e) { /* closed */ } CHAT.sock = null; CHAT.topic = ""; } }
  var HREF_OK = /^#\/[a-z0-9][a-z0-9\/_-]{0,60}$/i;
  /* by delivery time (a scheduled message is stored with the time it is delivered), then by id */
  function chatOrder(a, b) { return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id - b.id; }
  function chatTime(iso) { var d = new Date(iso); return isNaN(d) ? "" : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function chatDay(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); }
  /* one conversation; mine = "learner" on the learner's phone, "admin" in the teacher's view */
  function chatLogHTML(msgs, mine, other) {
    if (!msgs.length) return '<p class="sub chat-empty">No messages yet.</p>';
    msgs = msgs.slice().sort(chatOrder);
    var html = "", day = "", lastMine = -1, now = new Date().toISOString();
    msgs.forEach(function (m, i) { if (m.sender === mine) lastMine = i; });
    msgs.forEach(function (m, i) {
      var d = chatDay(m.created_at); if (d !== day) { day = d; html += '<p class="chat-day">' + esc(d) + "</p>"; }
      var me = m.sender === mine, a = m.action && HREF_OK.test(m.action.href || "") ? m.action : null;
      var later = m.created_at > now; // scheduled, not delivered yet (only the admin's own view has these)
      html += '<div class="chat-b ' + (me ? "me" : "them") + (later ? " sched" : "") + '"><span class="sr">' + (me ? "You" : other) + ": </span>" + (m.body ? '<p>' + esc(m.body).replace(/\n/g, "<br>") + "</p>" : "") +
        (a ? '<a class="btn small ' + (me ? "" : "primary ") + 'chat-act" href="' + esc(a.href) + '">' + esc(a.label) + " ›</a>" : "") +
        (later ? '<small>⏰ Scheduled · ' + esc(chatDay(m.created_at)) + " " + chatTime(m.created_at) + ' · <button type="button" class="linklike" data-unsched="' + m.id + '">Cancel</button></small>'
          : '<small>' + chatTime(m.created_at) + (me && i === lastMine && m.seen_at ? " · Seen" : "") + "</small>") + "</div>";
    });
    return html;
  }
  function chatCard() {
    if (!CHAT.unread) return "";
    var last = CHAT.msgs.filter(function (m) { return m.sender === "admin"; }).pop();
    return '<a class="card chat-new" href="#/chat" id="chat-card"><b>💬 ' + (CHAT.unread > 1 ? CHAT.unread + " new messages" : "New message") + " from the C&amp;B team</b>" +
      (last ? "<small>" + esc((last.body || (last.action && last.action.label) || "").slice(0, 90)) + "</small>" : "") + "</a>";
  }
  function chatDraw() {
    var log = document.getElementById("chat-log"); if (!log) return;
    var atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.innerHTML = chatLogHTML(CHAT.msgs, "learner", "C&B team");
    if (atEnd || !log.dataset.drawn) { log.scrollTop = log.scrollHeight; log.dataset.drawn = "1"; }
  }
  function viewChat() {
    var head = '<section class="card chat-head"><h2>💬 C&amp;B team</h2><p class="sub">Messages, news and practice tips from the C&amp;B team. Only the team sees what you write here.</p></section>';
    if (!chatCode()) { render(head + '<section class="card"><p>Chat uses your cloud backup to know it is you. Turn on <b>Cloud backup</b> in Me first.</p><a class="btn primary" href="#/me">Open Me</a></section>', "me"); return; }
    var draft = (document.getElementById("chat-in") || {}).value || "";
    render(head + '<section class="card chat-box"><div id="chat-log" class="chat-log" role="log" aria-live="polite"></div>' +
      '<div class="chat-form"><label class="sr" for="chat-in">Message</label><textarea id="chat-in" rows="2" maxlength="1000" placeholder="Write to the C&amp;B team…">' + esc(draft) + '</textarea><button type="button" class="btn primary" id="chat-send">Send</button></div>' +
      (window.AI && AI.available() ? "" : '<p class="sub">You are offline. Messages load when you are back online.</p>') + "</section>", "me");
    chatDraw();
    chatPoll(true).then(chatDraw);
    clearInterval(CHAT.timer);
    CHAT.timer = setInterval(function () { if (location.hash !== "#/chat") { clearInterval(CHAT.timer); return; } if (!document.hidden) chatPoll(true).then(chatDraw); }, 15000);
    var btn = document.getElementById("chat-send"), inp = document.getElementById("chat-in");
    btn.onclick = function () {
      var v = inp.value.trim(); if (!v) { inp.focus(); return; }
      btn.disabled = true;
      AI.call("chat_send", { code: chatCode(), body: v, since: 0 }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) { UI.toast(r.error === "chat_full" ? "That's a lot for today. Try again tomorrow." : AI.errMsg(r.error), "⚠️"); return; }
        inp.value = ""; chatMerge(r.result.msgs, true); var log = document.getElementById("chat-log"); if (log) log.dataset.drawn = ""; chatDraw();
      });
    };
  }
  (function () {
    setTimeout(function () { chatPoll(false); }, 4000); // the teacher sees the app was opened; unread messages show on Home
    document.addEventListener("visibilitychange", function () { if (document.hidden) chatStop(); else chatPoll(location.hash === "#/chat").then(chatDraw); });
    setInterval(function () { if (!document.hidden && location.hash !== "#/chat") chatPoll(false); }, 60000);
  })();
  function syncSoon() { clearTimeout(syncTimer); syncTimer = setTimeout(function () { syncNow(); }, 20000); }
  function syncRestore(code) {
    code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return AI.call("sync_get", { code: code }).then(function (r) {
      if (!r.ok) throw new Error(AI.errMsg(r.error));
      var m = r.result.meta || {}, when = r.result.updated_at ? new Date(r.result.updated_at).toLocaleString() : "unknown time";
      if (!window.confirm("Replace the progress on this phone with the backup from " + when + " (" + (m.xp || 0) + " XP, " + (m.words || 0) + " words)?")) return false;
      Store.importJSON(JSON.stringify(r.result.data));
      syncSave({ code: code, rev: r.result.rev, last: Date.now(), mark: syncMark() });
      buildIndex(); applySettings(); return true;
    });
  }
  (function () {
    var aw = Game.award; Game.award = function () { var r = aw.apply(this, arguments); try { studyTick(); } catch (e) { /* never block a reward */ } syncSoon(); return r; };
    document.addEventListener("visibilitychange", function () { if (document.hidden) { clearTimeout(syncTimer); syncNow(); } });
    setTimeout(function () { syncNow(); }, 8000); // catches a save that was cut off when the app was closed
  })();
  window.Sync = { now: syncNow, cfg: syncCfg, summary: studySummary, _fit: fitSummary };

  /* ---------- Google sign-in (optional, next to the restore code) ----------
     The app asks the server for a one-time ticket, goes to Google through Supabase Auth and comes back to
     ?gt=<ticket>#access_token=…. Whichever page lands there (the home-screen app, or Safari when iOS opens the sign-in
     outside the app) finishes the sign-in on the server; the app then reads the result with its ticket. Only the
     Supabase Auth user id is kept on the server, linked to the restore code. */
  var GOOGLE_KEY = "cbChinese.google", GCFG = null, GLAND = null;
  function gPending() { try { var g = JSON.parse(localStorage.getItem(GOOGLE_KEY) || "null"); return g && /^[a-f0-9]{48}$/.test(g.ticket) && Date.now() - g.at < 15 * 60000 ? g : null; } catch (e) { return null; } }
  function gClear() { try { localStorage.removeItem(GOOGLE_KEY); } catch (e) { /* ignore */ } }
  function gCfg() {
    if (GCFG) return GCFG;
    GCFG = aiOn() ? AI.call("auth_cfg", {}).then(function (r) { return r.ok ? r.result : { google: false }; }) : Promise.resolve({ google: false });
    GCFG.then(function (c) { if (!c.google) setTimeout(function () { GCFG = null; }, 60000); });
    return GCFG;
  }
  function gStart(intent) {
    var go = function () {
      return gCfg().then(function (cf) {
        if (!cf.google) throw new Error("Google sign-in is not switched on yet.");
        return AI.call("auth_start", { intent: intent, code: intent === "link" ? syncCfg().code : undefined }).then(function (r) {
          if (!r.ok) throw new Error(AI.errMsg(r.error));
          try { localStorage.setItem(GOOGLE_KEY, JSON.stringify({ ticket: r.result.ticket, intent: intent, at: Date.now() })); } catch (e) { /* the landing page still finishes it */ }
          location.href = cf.url + "&redirect_to=" + encodeURIComponent(location.origin + location.pathname + "?gt=" + r.result.ticket);
        });
      });
    };
    // linking needs a backup on the server first
    var c = syncCfg(); if (intent === "link" && !c.code) return syncNow(true).then(function (x) { if (x !== "saved") throw new Error(AI.errMsg(x)); return go(); });
    return go();
  }
  function gMark(on) { var c = syncCfg(); if (on) c.google = true; else delete c.google; syncSave(c); }
  /* what to do with a finished sign-in, in the app that started it */
  function gHandle(res, g) {
    gClear();
    if (!res || res.status === "waiting") return;
    if (res.status === "linked") { gMark(true); UI.toast("Backup linked to your Google account", "🔗"); if (/^#\/me/.test(location.hash)) route(); return; }
    if (res.status === "none") { UI.toast("No backup is linked to this Google account yet.", "⚠️"); return; }
    if (res.status === "code") { syncRestore(res.code).then(function (ok) { if (ok) { gMark(true); UI.toast("Progress restored", "✅"); location.hash = "#/"; route(); } }, function (e) { UI.toast(e.message, "⚠️"); }); return; }
    if (res.status === "other") {
      if (window.confirm("This Google account is already linked to another backup (another phone).\n\nOK = load that backup on this phone.\nCancel = link THIS phone's backup to Google instead.")) {
        syncRestore(res.code).then(function (ok) { if (ok) { gMark(true); UI.toast("Progress restored", "✅"); route(); } }, function (e) { UI.toast(e.message, "⚠️"); });
      } else AI.call("auth_replace", { ticket: g.ticket }).then(function (r) { if (r.ok) { gMark(true); UI.toast("This phone's backup is now linked to Google", "🔗"); } else UI.toast(AI.errMsg(r.error), "⚠️"); });
    }
  }
  /* on start: are we the page Google came back to? Takes the token out of the address bar right away. */
  function gLanding() {
    var m = /[?&]gt=([a-f0-9]{48})/.exec(location.search), h = location.hash || "";
    if (!m || !/access_token=|error=/.test(h)) return;
    var q = {}; h.replace(/^#/, "").split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) try { q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " ")); } catch (e) { /* skip */ } });
    try { history.replaceState(null, "", location.pathname + "#/me/backup"); } catch (e) { location.hash = "#/me/backup"; }
    GLAND = { ticket: m[1], token: q.access_token || "", error: q.error_description || q.error || "" };
  }
  function gFinish() {
    var L = GLAND; GLAND = null; if (!L) return;
    var mine = gPending(), here = mine && mine.ticket === L.ticket;
    if (L.error || !L.token) { if (here) gClear(); UI.toast("Google sign-in was cancelled" + (L.error ? ": " + L.error : ""), "⚠️"); return; }
    AI.call("auth_finish", { ticket: L.ticket, token: L.token }).then(function (r) {
      if (!r.ok) { UI.toast(AI.errMsg(r.error), "⚠️"); return; }
      if (here) { gHandle(r.result, mine); return; }
      // Google came back in Safari, not in the home-screen app: the app finishes when it is opened again
      render('<section class="card result">' + UI.mascot("cheer", 80) + '<h2>Signed in with Google ✓</h2><p class="sub">Now go back to the <b>C&amp;B Chinese</b> app on your home screen. It finishes by itself when you open it.</p></section>', "me");
    });
  }
  function gPoll() {
    var g = gPending(); if (!g || !aiOn()) return;
    AI.call("auth_poll", { ticket: g.ticket }).then(function (r) { if (r.ok && r.result.status !== "waiting") gHandle(r.result, g); else if (!r.ok && r.error === "bad_ticket") gClear(); });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) gPoll(); });
  function wireGoogle(box) {
    if (!box) return;
    gCfg().then(function (cf) {
      if (!document.body.contains(box)) return;
      if (!cf.google) { box.innerHTML = isAdmin() ? '<p class="sub muted">Admin: Google sign-in appears here once it is switched on in Supabase (see supabase/SETUP.md).</p>' : ""; return; }
      var c = syncCfg();
      var drawG = function (linked) {
        box.innerHTML = c.code ? (linked ? '<p class="sub">🔗 <b>Linked to Google.</b> On a new phone, tap “Restore with Google” and your progress comes back, no code needed.</p><div class="actions"><button class="btn small" id="g-unlink">Unlink Google</button></div>'
          : '<p class="sub">Link this backup to your Google account, so a new phone gets it back without the restore code.</p><div class="actions"><button class="btn small primary" id="g-link">Sign in with Google</button></div>')
          : '<div class="actions"><button class="btn small primary" id="g-get">Restore with Google</button></div>';
        var on = function (id, fn) { var b = document.getElementById(id); if (b) b.onclick = function () { b.disabled = true; fn().catch(function (e) { b.disabled = false; UI.toast(e.message, "⚠️"); }); }; };
        on("g-link", function () { return gStart("link"); });
        on("g-get", function () { return gStart("get"); });
        on("g-unlink", function () {
          if (!window.confirm("Unlink Google? Your backup stays; you would need the restore code on a new phone.")) return Promise.resolve();
          return AI.call("auth_unlink", { code: c.code }).then(function (r) { if (!r.ok) throw new Error(AI.errMsg(r.error)); gMark(false); drawG(false); UI.toast("Google unlinked", "🔗"); });
        });
      };
      if (!c.code) { drawG(false); return; }
      drawG(!!c.google);
      AI.call("auth_status", { code: c.code }).then(function (r) { if (r.ok && document.body.contains(box)) { gMark(r.result.linked); drawG(r.result.linked); } });
    });
  }
  function wireSync() {
    var box = document.getElementById("sync-box"); if (!box) return;
    function draw() {
      var c = syncCfg(), h = "";
      if (c.off) h = '<p class="sub">Off. Your progress is only on this phone.</p><div class="actions"><button class="btn primary small" id="y-on">Turn on</button><button class="btn small" id="y-code">Restore with a code</button></div>';
      else if (c.conflict) h = '<p class="warn">Another phone saved this backup on ' + esc(c.conflict.at ? new Date(c.conflict.at).toLocaleString() : "an unknown date") + " (" + (c.conflict.meta.xp || 0) + " XP). This phone has " + Store.state.xp + ' XP. Choose which one to keep; backup is paused until you do.</p><div class="actions"><button class="btn primary small" id="y-take">Use the cloud copy</button><button class="btn small" id="y-keep">Keep this phone</button></div>';
      else h = '<p class="sub">' + (c.code ? "On. " + (c.last ? "Last saved: " + esc(new Date(c.last).toLocaleString()) + "." : "Not saved yet.") : "On. The first backup is made after your first study session.") +
        " A copy of your progress is saved on the app's server after you study. No account is needed. The C&amp;B team can see progress numbers such as XP, streak, scores and study days, but never your answers or notes.</p>" +
        (c.err ? '<p class="warn">Last try failed: ' + esc(AI.errMsg(c.err)) + "</p>" : "") +
        (c.code ? '<p class="sub">Restore code: <b class="sync-code" id="y-show">' + esc(syncShow(c.code)) + "</b><br>Type it on a new phone to load your progress there. Keep it private: anyone with the code can open your backup.</p>" : "") +
        '<div class="actions">' + (c.code ? '<button class="btn primary small" id="y-up">☁️ Back up now</button>' : "") + '<button class="btn small" id="y-code">Restore with a code</button><button class="btn small" id="y-off">Turn off</button></div>';
      box.innerHTML = h + '<div id="y-google" class="y-google"></div><div id="y-form" hidden><label for="y-in">Restore code</label><input id="y-in" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX"><div class="actions"><button class="btn primary small" id="y-go">Restore</button></div></div>';
      function on(id, fn) { var b = document.getElementById(id); if (b) b.onclick = function () { fn(b); }; }
      function done(msg, icon) { UI.toast(msg, icon); draw(); }
      function load(code, b) {
        b.disabled = true;
        syncRestore(code).then(function (ok) { if (ok) { UI.toast("Progress restored", "✅"); route(); } else b.disabled = false; }, function (e) { b.disabled = false; UI.toast(e.message, "⚠️"); });
      }
      on("y-up", function (b) { b.disabled = true; syncNow(true).then(function (r) { done(r === "saved" ? "Backed up" : AI.errMsg(r), r === "saved" ? "☁️" : "⚠️"); }); });
      on("y-code", function () { document.getElementById("y-form").hidden = false; document.getElementById("y-in").focus(); });
      wireGoogle(document.getElementById("y-google"));
      on("y-go", function (b) { load(document.getElementById("y-in").value, b); });
      on("y-take", function (b) { load(c.code, b); });
      on("y-keep", function (b) { b.disabled = true; syncNow(true).then(function (r) { done(r === "saved" ? "This phone's progress is now the backup" : AI.errMsg(r), r === "saved" ? "☁️" : "⚠️"); }); });
      on("y-on", function () { var n = syncCfg(); delete n.off; syncSave(n); syncNow(true).then(draw); draw(); });
      on("y-off", function () {
        var n = syncCfg(), wipe = n.code && window.confirm("Also delete the copy on the server?\n\nOK = delete it. Cancel = keep it there.");
        if (wipe) AI.call("sync_delete", { code: n.code });
        syncSave(wipe ? { off: true } : { off: true, code: n.code, rev: n.rev }); draw();
      });
    }
    draw();
  }

