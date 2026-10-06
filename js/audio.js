/* Audio: pre-generated neural-voice MP3s (audio/manifest.js) + tiny WebAudio sound effects.
   iOS/WebKit rules respected: one reused <audio> element, playback always starts from a tap. */
(function () {
  "use strict";
  var MALE_SPEAKERS = ["林浩", "陈明", "王总", "张经理"]; // keep in sync with tools/collect_texts.js
  var player = new Audio();
  player.preload = "auto";
  player.setAttribute("playsinline", "");
  var onEnd = null;

  function manifest() { return window.CB_AUDIO || {}; }
  function available() { return Object.keys(manifest()).length > 0; }
  function file(text, voice) {
    var m = manifest();
    return m[(voice || "F") + "|" + text] || m["F|" + text] || m["M|" + text] || null;
  }
  /* How much of the audio is stored on this phone (the service worker keeps every played clip in the "cb-audio" cache). */
  function saved(cb) {
    var files = allFiles(), total = files.length;
    if (!total || !window.caches || location.protocol.indexOf("http") !== 0) { cb({ have: 0, total: total, ok: false }); return; }
    caches.open("cb-audio").then(function (c) { return c.keys(); }).then(function (keys) {
      var set = {}; keys.forEach(function (r) { try { set[new URL(r.url).pathname.replace(/^.*\/audio\//, "audio/")] = 1; } catch (e) { /* ignore */ } });
      var have = 0; files.forEach(function (f) { if (set[f]) have++; });
      cb({ have: have, total: total, ok: true });
    }).catch(function () { cb({ have: 0, total: total, ok: false }); });
  }
  function finish() { if (onEnd) { var cb = onEnd; onEnd = null; cb(); } }
  player.addEventListener("ended", finish);
  player.addEventListener("error", function () {
    if (navigator.onLine === false && window.UI) UI.toast("This audio isn't saved on the phone yet. Connect, then tap Download in Me.", "🔊");
    finish();
  });

  function play(text, voice, cb, rate) {
    var f = file(text, voice);
    if (!f) {
      if (window.UI) UI.toast(available() ? "No recording for this text yet." : "Audio isn't generated yet — it's created when you deploy (see README).");
      if (cb) cb();
      return false;
    }
    onEnd = null;
    try { player.pause(); } catch (e) {}
    onEnd = cb || null;
    player.src = "audio/" + f;
    var r = rate || (window.Store && Store.state.settings.audioRate) || 1;
    player.defaultPlaybackRate = r; player.playbackRate = r; // iOS can reset playbackRate when src changes
    var p = player.play();
    if (p && p.catch) p.catch(function () { finish(); });
    return true;
  }
  function playAll(items, rate) {
    var i = 0;
    (function next() { if (i < items.length) { var it = items[i++]; play(it.text, it.voice, next, rate); } })();
  }
  /* Warm the next clip so it starts instantly: the service worker keeps audio cache-first. */
  var warmed = {};
  function prefetch(text, voice) {
    var f = text && file(text, voice);
    if (!f || warmed[f] || !window.fetch || location.protocol.indexOf("http") !== 0) return;
    warmed[f] = 1;
    fetch("audio/" + f).catch(function () { delete warmed[f]; });
  }
  function stop() { onEnd = null; try { player.pause(); } catch (e) {} stopNoise(); }

  /* ---- background noise for listening practice (synthesised, no files) ----
     Level 0 off · 1 light café hum · 2 busy room. Only runs while a clip plays, and only on screens that turn it on
     (Listening Drill, mock listening) — App.route() resets it to 0 on every navigation. */
  var noiseLevel = 0, noiseBuf = null, noiseRun = null;
  function makeNoise(c) {
    var len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0), last = 0, peak = 0, i;
    for (i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last; if (Math.abs(last) > peak) peak = Math.abs(last); }
    for (i = 0; i < len; i++) d[i] /= peak || 1;
    return buf;
  }
  function startNoise() {
    if (!noiseLevel || noiseRun) return;
    var c = ac(); if (!c || !c.createBiquadFilter) return;
    try {
      var src = c.createBufferSource(); src.buffer = noiseBuf || (noiseBuf = makeNoise(c)); src.loop = true;
      var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = noiseLevel === 2 ? 2200 : 1300;
      var g = c.createGain(), base = noiseLevel === 2 ? 0.34 : 0.14; g.gain.value = base;
      var lfo = null;
      if (noiseLevel === 2) { // slow swell, like voices rising and falling
        lfo = c.createOscillator(); lfo.frequency.value = 0.35; var lg = c.createGain(); lg.gain.value = 0.1; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      }
      src.connect(lp); lp.connect(g); g.connect(c.destination); src.start();
      noiseRun = { src: src, lfo: lfo, g: g };
    } catch (e) { noiseRun = null; }
  }
  function stopNoise() {
    var r = noiseRun; noiseRun = null; if (!r) return;
    try { r.g.gain.value = 0; r.src.stop(); if (r.lfo) r.lfo.stop(); } catch (e) {}
  }
  function setNoise(level) { noiseLevel = level === 2 ? 2 : level === 1 ? 1 : 0; if (!noiseLevel) stopNoise(); }
  player.addEventListener("playing", startNoise);
  player.addEventListener("pause", stopNoise);
  player.addEventListener("ended", stopNoise);
  player.addEventListener("error", stopNoise);
  function voiceFor(speaker) { return MALE_SPEAKERS.indexOf(speaker) >= 0 ? "M" : "F"; }
  function allFiles() {
    var m = manifest(), seen = {}, out = [];
    Object.keys(m).forEach(function (k) { if (!seen[m[k]]) { seen[m[k]] = 1; out.push("audio/" + m[k]); } });
    return out;
  }

  /* ---- sound effects (synthesised, no files) ---- */
  var ctx = null;
  function ac() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!ctx) ctx = new C();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, delay, vol) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function on() { return !window.Store || Store.state.settings.sfx !== false; }
  var sfx = {
    tap: function () { if (on()) tone(520, 0.06, "triangle", 0, 0.08); },
    good: function (opts) {
      if (!(opts && opts.quiet) && window.App && App.markWork) App.markWork();
      if (on()) { tone(660, 0.12, "sine"); tone(990, 0.18, "sine", 0.09); }
      if (!(opts && opts.quiet) && window.UI && UI.hearts) UI.hearts(); // correct answer → heart burst
    },
    bad: function () {
      if (window.App && App.markWork) App.markWork(); if (on()) { tone(220, 0.16, "square", 0, 0.07); tone(160, 0.2, "square", 0.1, 0.07); } },
    combo: function (n) { if (on()) tone(600 + Math.min(n, 8) * 80, 0.1, "triangle"); },
    win: function () { if (on()) [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, "triangle", i * 0.11); }); },
    hit: function () { if (on()) { tone(140, 0.12, "sawtooth", 0, 0.1); tone(90, 0.18, "sine", 0.05, 0.2); } }
  };
  // Unlock WebAudio on the first touch (iOS requirement).
  document.addEventListener("touchstart", function unlock() { ac(); document.removeEventListener("touchstart", unlock); }, { passive: true });

  window.Audio2 = { play: play, playAll: playAll, stop: stop, prefetch: prefetch, noise: setNoise, has: function (t, v) { return !!file(t, v); }, available: available, voiceFor: voiceFor, allFiles: allFiles, saved: saved, sfx: sfx };
})();
