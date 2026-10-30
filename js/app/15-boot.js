  /* ---------- global events & boot ---------- */
  document.addEventListener("click", function (e) {
    var lvb = e.target.closest("[data-level]");
    if (lvb) { e.preventDefault(); setLevel(+lvb.getAttribute("data-level")); return; }
    var fl = e.target.closest("[data-flag]");
    if (fl) { e.preventDefault(); openReport({ ref: fl.getAttribute("data-flag"), label: fl.getAttribute("data-flag-label") || fl.getAttribute("data-flag") }); return; }
    var wl = e.target.closest(".wlink");
    if (wl) { e.preventDefault(); e.stopPropagation(); var host = wl.closest(".zh, p, li, .line, .bubble") || wl.parentNode; openWordSheet(wl.getAttribute("data-w"), host ? host.textContent.replace(/\s+/g, " ").trim().slice(0, 300) : ""); return; }
    var b = e.target.closest("[data-say]");
    if (b) {
      e.preventDefault(); e.stopPropagation();
      var say = b.getAttribute("data-say");
      var qbox = b.closest(".q"), qkey = qbox && qbox.querySelector(".qn") ? "q:" + qbox.querySelector(".qn").textContent : "say:" + say;
      if (inMockListening() && !playOnceOk(qkey)) { b.classList.add("used"); return; }
      b.classList.add("playing"); setTimeout(function () { b.classList.remove("playing"); }, 900);
      if (inMockListening() && EXAM && EXAM.strict) b.classList.add("used");
      Audio2.play(say, b.getAttribute("data-voice") || "F", null, mockRate());
    }
  }, true);

  function boot() {
    gLanding();
    applySettings();
    app.setAttribute("tabindex", "-1");
    watchDom();
    document.getElementById("btn-flag").onclick = function () { openReport(); };
    var hch = document.getElementById("chip-heart");
    if (hch) { hch.setAttribute("role", "button"); hch.setAttribute("tabindex", "0"); hch.setAttribute("title", "Hearts earned from correct answers");
      hch.onclick = function () { var n = Store.state.stats.hearts || 0; UI.toast(n + " hearts earned · one for each correct answer", "❤️"); }; }
    document.getElementById("btn-py").onclick = function () {
      Store.state.settings.showPinyin = !Store.state.settings.showPinyin; Store.save(); applySettings();
      UI.toast(Store.state.settings.showPinyin ? "Pinyin on" : "Pinyin off", "拼");
    };
    if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addListener(applySettings);
    if (!BUNDLED && !window.CB_MANIFEST) { render('<p class="warn">data/manifest.js is missing.</p>'); return; }
    (BUNDLED ? Promise.resolve() : loadAll(window.CB_MANIFEST.concat(window.CB_CORE_FILES || []).concat(window.CB_EXTRA_FILES || []))).then(function () {
      buildIndex();
      try { weekTick(); } catch (e) { console.warn(e); }
      window.addEventListener("hashchange", route);
      route();
      setTimeout(function () { gFinish(); gPoll(); }, 300);
      setTimeout(function () { bankRefresh(); }, 12000);
      // warm up the rest in the background so it's ready (and cached for offline) before it's needed
      whenIdle(4000).then(function () { ensureFull().then(function () { return ensureMocks(); }).then(function () { if (window.Content) { Content.apply(); Content.sync(false).then(function () { Content.apply(); }); } }, function () {}); });
      /* packs this learner already uses (HSK 5 opened once, extra HSK 4 words in review): load them when idle so their
         words are in Review, Search and the due count. A first-time learner never downloads them here. */
      whenIdle(3000).then(function () { if (h5Wanted()) ensureH5(); if (x4Wanted()) ensureX4(); });
      if (!Store.state.settings.onboarded) setTimeout(showGuide, 600);
    });
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        // iOS resumes home-screen apps without reloading, so check for a new version on every resume.
        document.addEventListener("visibilitychange", function () { if (!document.hidden) reg.update().catch(function () {}); });
        reg.update().catch(function () {}); // check right away on launch, not only on the browser's own schedule
      }).catch(function (e) { console.warn("SW registration failed", e); });
      autoUpdate();
    }
    try { if (sessionStorage.getItem("cbUpdated")) { sessionStorage.removeItem("cbUpdated"); setTimeout(function () { UI.toast("App updated", "✨"); }, 600); } } catch (e) {}
  }

  /* When a new version takes over, reload once — but only on a "safe" screen, never mid-lesson or mid-game. */
  function autoUpdate() {
    if (!navigator.serviceWorker.controller) return;        // first install: nothing old to replace
    var pending = false, done = false;
    function safe() { var h = location.hash.replace(/^#\/?/, ""); return h === "" || h === "learn" || h === "games" || h === "review" || h === "me"; }
    function go() {
      if (done || !pending || !safe()) return;
      done = true;
      try { sessionStorage.setItem("cbUpdated", "1"); } catch (e) {}
      location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", function () { pending = true; go(); });
    window.addEventListener("hashchange", go);
    /* the new version finished downloading while the app was in the background: apply it as soon as it comes back on a safe screen */
    document.addEventListener("visibilitychange", function () { if (!document.hidden) go(); });
  }

  window.App = {
    practiceTop: practiceTop, _sessionPlan: sessionPlan,
    esc: esc, M: M, PY: PY, SAY: SAY, shuffle: shuffle, render: render, setKeys: setKeys, typing: typing, rect: rect, norm: norm,
    dayWords: dayWords, studiedWords: studiedWords, levelBadge: levelBadge, SAYX: SAYX, refreshChrome: refreshChrome,
    markWork: markWork, resetWork: function () { workDone = false; }, readingSet: readingSet, _talk: viewTalk, packFromArg: packFromArg, packQuizDone: packQuizDone, h5Loaded: h5Loaded, x4Loaded: x4Loaded, ensureH5: ensureH5, ensureX4: ensureX4, get CORE() { return CORE; }, get COREMAP() { return COREMAP; }, get DAYS() { return DAYS; }, get DAYMAP() { return DAYMAP; }, get WORDS() { return WORDS; }, get WORDMAP() { return WORDMAP; }
  };
  boot();
})();
