// Checks how the service worker treats the optional content packs (HSK 5, extra HSK 4 words) across an app update,
// with a fake Cache Storage and a fake network. No browser needed.  Usage: node tools/sw_packs_test.mjs
import fs from "fs"; import vm from "vm"; import path from "path"; import { fileURLToPath } from "url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const t = (name, ok, extra = "") => { (ok ? pass++ : fail++); console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  " + extra)); };
const ORIGIN = "https://example.test/app/";
const abs = (u) => new URL(typeof u === "string" ? u : u.url, ORIGIN).href;

// online: true, false (every request fails) or "stall" (a pack request never answers) · status: what the network answers
function world(packFiles, stored, online = true, status = 200) {
  const store = {}; // cache name -> { url: body }
  const fetched = [];
  const cacheOf = (name) => {
    const m = store[name] || (store[name] = {});
    return {
      keys: async () => Object.keys(m).map((url) => ({ url })),
      match: async (r) => (abs(r) in m ? { ok: true, body: m[abs(r)], clone() { return this; } } : undefined),
      put: async (r, res) => { m[abs(r)] = res.body; },
      delete: async (r) => delete m[abs(r)],
      addAll: async (list) => { list.forEach((r) => { m[abs(r)] = "shell"; }); }
    };
  };
  const listeners = {};
  const sb = {
    URL, Promise, console, setTimeout,
    Request: function (url, init) { this.url = abs(url); this.method = "GET"; this.init = init; },
    location: { origin: new URL(ORIGIN).origin },
    caches: { open: async (n) => cacheOf(n), keys: async () => Object.keys(store), delete: async (n) => delete store[n] },
    fetch: async (r) => { fetched.push(abs(r)); if (!online) throw new Error("offline"); if (online === "stall" && /hsk5|hsk4x/.test(abs(r))) return new Promise(() => {}); if (status !== 200) return { ok: false, status, body: "error page", clone() { return this; } }; return { ok: true, body: "net:" + abs(r), clone() { return this; } }; },
    self: { addEventListener: (ev, fn) => { listeners[ev] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} } }
  };
  vm.createContext(sb);
  const src = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8").replace("var PACK_FILES = [];", "var PACK_FILES = " + JSON.stringify(packFiles) + ";");
  if (!src.includes(JSON.stringify(packFiles))) throw new Error("PACK_FILES marker missing in sw.js");
  if (!src.includes("var PACK_WAIT_MS = 15000;")) throw new Error("PACK_WAIT_MS marker missing in sw.js");
  const src2 = src.replace("var PACK_WAIT_MS = 15000;", "var PACK_WAIT_MS = 60;"); // the real wait is 15 s
  vm.runInContext(src2, sb);
  Object.keys(stored || {}).forEach((name) => { store[name] = {}; stored[name].forEach((u) => { store[name][abs(u)] = "old"; }); });
  const run = async (ev) => { let p; listeners[ev]({ waitUntil: (x) => { p = x; } }); await p; };
  const get = async (url) => { let p; listeners.fetch({ request: { url: abs(url), method: "GET" }, respondWith: (x) => { p = x; } }); return p ? await p : null; };
  return { store, fetched, run, get, names: (n) => Object.keys(store[n] || {}).map((u) => u.replace(ORIGIN, "")).sort() };
}
const NEW = ["data/hsk5.bbbbbbbbbb.js", "data/hsk4x.dddddddddd.js"];

{ // a learner who never opened a pack: an update downloads none of them
  const w = world(NEW, {});
  await w.run("install"); await w.run("activate");
  t("update, no pack on the phone: nothing is downloaded", w.fetched.every((u) => !/hsk5|hsk4x/.test(u)) && w.names("cb-packs").length === 0, w.fetched.filter((u) => /hsk/.test(u)).join());
}
{ // HSK 5 on the phone (old edition): the update brings the new edition and drops the old one; hsk4x stays untouched
  const w = world(NEW, { "cb-packs": ["data/hsk5.aaaaaaaaaa.js"] });
  await w.run("install");
  t("update, old HSK 5 on the phone: the new edition is stored during install", w.names("cb-packs").join() === "data/hsk5.aaaaaaaaaa.js,data/hsk5.bbbbbbbbbb.js" && w.fetched.filter((u) => /hsk4x/.test(u)).length === 0, w.names("cb-packs").join());
  await w.run("activate");
  t("update: the old edition is removed once the new one is there", w.names("cb-packs").join() === "data/hsk5.bbbbbbbbbb.js", w.names("cb-packs").join());
}
{ // same, but the phone is offline while the update installs: keep the old edition rather than nothing
  const w = world(NEW, { "cb-packs": ["data/hsk5.aaaaaaaaaa.js", "data/hsk4x.cccccccccc.js"] }, false);
  await w.store; // (no-op)
  let threw = false; try { await w.run("install"); } catch (e) { threw = true; }
  await w.run("activate");
  t("update while offline: install does not fail and the old editions are kept", !threw && w.names("cb-packs").join() === "data/hsk4x.cccccccccc.js,data/hsk5.aaaaaaaaaa.js", w.names("cb-packs").join());
}
{ // fetch: a pack is stored on first use and then served from the phone
  const w = world(NEW, {});
  const a = await w.get("data/hsk5.bbbbbbbbbb.js");
  const n1 = w.fetched.length;
  const b = await w.get("data/hsk5.bbbbbbbbbb.js");
  t("fetch: a pack goes to the network once, then comes from the cache", a && /^net:/.test(a.body) && b && w.fetched.length === n1 && w.names("cb-packs").join() === "data/hsk5.bbbbbbbbbb.js", w.names("cb-packs").join());
  t("fetch: packs are not kept in the versioned shell cache", !Object.keys(w.store).some((k) => k.indexOf("cb-shell-") === 0 && w.names(k).some((u) => /hsk5/.test(u))));
}
{ // the update could not bring the new edition and the phone is now offline: the app asks for the new name and gets the old edition
  const w = world(NEW, { "cb-packs": ["data/hsk5.aaaaaaaaaa.js"] }, false);
  const a = await w.get("data/hsk5.bbbbbbbbbb.js");
  t("fetch offline: an older edition of the same pack is served instead of failing", a && a.body === "old" && w.names("cb-packs").join() === "data/hsk5.aaaaaaaaaa.js", a && a.body);
  let threw = false; try { await w.get("data/hsk4x.dddddddddd.js"); } catch (e) { threw = true; }
  t("fetch offline: a pack that was never on the phone still fails (no other kind is served)", threw);
  const s = world(NEW, { "cb-packs": ["data/hsk5.aaaaaaaaaa.js"] }, true, 404);
  const b = await s.get("data/hsk5.bbbbbbbbbb.js"), c = await s.get("data/hsk4x.dddddddddd.js");
  t("fetch, server answers 404: the older edition is served and the error page is not stored", b && b.body === "old" && c && c.ok === false && s.names("cb-packs").join() === "data/hsk5.aaaaaaaaaa.js", s.names("cb-packs").join());
}
{ // a pack download that never finishes must not hold back the update
  const w = world(NEW, { "cb-packs": ["data/hsk5.aaaaaaaaaa.js"] }, "stall");
  const t0 = Date.now(); let done = false;
  await Promise.race([w.run("install").then(() => { done = true; }), new Promise((r) => setTimeout(r, 3000))]);
  await w.run("activate");
  t("update with a stalled pack download: install finishes after the wait, the old edition is kept", done && Date.now() - t0 < 2500 && w.names("cb-packs").join() === "data/hsk5.aaaaaaaaaa.js", String(Date.now() - t0));
  t("source: the wait for packs during install is 15 s", /var PACK_WAIT_MS = 15000;/.test(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8")));
}
{ // the built precache list must not contain the packs
  const src = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  t("source: the packs are not in the precache list", !/PRECACHE = \[[^\]]*hsk(5|4x)/.test(src) && !/"data\/hsk5/.test(src.split("PRECACHE:START")[1].split("PRECACHE:END")[0]));
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
