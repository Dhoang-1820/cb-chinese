// Cloud backup format: what js/storage.js sends (Store.backup) must be readable by the version of the app that was
// live before it (tests/fixtures/storage_live.js), and a very large deck must still fit under the server limit.
// No browser needed.  Usage: node tests/backup_test.mjs
import fs from "fs"; import vm from "vm"; import path from "path"; import { fileURLToPath } from "url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const t = (name, ok, extra = "") => { (ok ? pass++ : fail++); console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  " + String(extra).slice(0, 300))); };
const KEY = "cbChinese.progress.v1", SERVER_MAX = 400000;

/* one phone: the given storage code with the given saved progress */
function phone(file, saved) {
  const ls = {}; if (saved) ls[KEY] = JSON.stringify(saved);
  const sb = { window: {}, console: { warn() {}, log() {} }, navigator: {}, document: {},
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sb, { filename: file });
  return { S: sb.window.Store, saved: () => JSON.parse(ls[KEY]) };
}
const NOW = "js/storage.js", LIVE = "tests/fixtures/storage_live.js";
const pad = (n, w) => String(n).padStart(w, "0");
function deck(n, h5) {
  const srs = {};
  for (let i = 0; i < n; i++) {
    const id = i < h5 ? "h5-" + pad(i + 1, 4) : "d" + pad(1 + (i % 90), 2) + "-" + pad(i, 4);
    const c = { box: 1 + (i % 5), due: "2026-10-" + pad(1 + (i % 28), 2), right: i % 23, wrong: i % 4, added: "2026-0" + (1 + (i % 9)) + "-15", last: i % 6 ? "2026-09-" + pad(1 + (i % 30), 2) : null };
    if (i % 4 === 0) c.lapses = 1 + (i % 3);
    if (i % 7 === 0) c.late = true;
    srs[id] = c;
  }
  return srs;
}
function state(n, h5) {
  return { version: 2, settings: { onboarded: true, setupDone: true, examDate: "2026-11-14", theme: "dark", dailyGoal: 50 }, srs: deck(n, h5), xp: 4200,
    streak: { count: 12, last: "2026-10-07", best: 30 }, log: { "2026-10-07": 60, "2026-10-06": 45 }, games: { speed: { best: 31, plays: 9 }, confuse: { best: 10, plays: 4 } },
    grammar: { g01: { best: 5, passes: 1, mastered: true }, g44: { best: 3, passes: 0, mastered: false } }, skills: { vocab: { r: 300, w: 40 }, grammar: { r: 50, w: 20 } },
    mistakes: { "w:d01-0001": { kind: "word", skill: "vocab", id: "d01-0001", wrong: 2, streak: 0, added: "2026-10-01", last: "2026-10-06" } },
    mockHistory: [{ id: 1, date: "2026-10-01", mode: "exam", strict: false, total: 201, sections: { listening: 70, reading: 66, writing: 65 } }],
    days: { 1: { quizBest: 9, practice: { fill: true }, completed: true, completedOn: "2026-09-01" } }, custom: [{ id: "u1abc", hanzi: "年终奖", pinyin: "niánzhōngjiǎng", vi: "thưởng cuối năm", en: "year-end bonus" }] };
}
const cardsOf = (srs) => JSON.stringify(Object.keys(srs).sort().map((id) => { const c = srs[id]; return [id, c.box, c.due, c.right, c.wrong, c.added, c.last || null, c.lapses || 0, !!c.late]; }));

{ // ---- a normal learner (every HSK 4 lesson and deck word in review: about 1,900 cards) ----
  const st = state(1900, 0), a = phone(NOW, st), sent = a.S.backup(), text = JSON.stringify(sent);
  t("normal size: the backup is sent in the plain format (cards are objects)", Object.keys(sent.srs).every((id) => !Array.isArray(sent.srs[id]) && typeof sent.srs[id].due === "string"), text.slice(0, 200));
  t("normal size: the backup is what is saved on the phone", text === JSON.stringify(a.S.state) && text.length < 300000, text.length);
  const old = phone(LIVE); old.S.importJSON(JSON.stringify(sent)); // what syncRestore does with the server's copy
  const got = old.S.state;
  t("live version restores it: every review card comes back exactly", cardsOf(got.srs) === cardsOf(st.srs) && Object.keys(got.srs).length === 1900, Object.keys(got.srs).length);
  t("live version restores it: cards are usable there (due date and box as it expects)", Object.keys(got.srs).every((id) => /^\d{4}-\d{2}-\d{2}$/.test(got.srs[id].due) && got.srs[id].box >= 1 && got.srs[id].box <= 5));
  t("live version restores it: XP, streak, games, grammar, skills, mistakes, mocks, lessons, own words", got.xp === 4200 && got.streak.count === 12 && got.games.speed.best === 31 && got.grammar.g44.best === 3 && got.grammar.g01.mastered === true &&
    got.skills.vocab.r === 300 && got.mistakes["w:d01-0001"].wrong === 2 && got.mockHistory[0].total === 201 && got.days[1].completed === true && got.custom[0].hanzi === "年终奖" && got.settings.dailyGoal === 50 && got.settings.theme === "dark", JSON.stringify(got).slice(0, 300));
  // ... and when that old phone backs up again, the new code reads its copy back without loss
  const again = phone(NOW); again.S.importJSON(JSON.stringify(old.saved()));
  t("and back: the new version reads the live version's backup", cardsOf(again.S.state.srs) === cardsOf(st.srs) && again.S.state.xp === 4200);
}
{ // ---- the limit between the two formats ----
  const small = phone(NOW, state(2500, 600)), big = phone(NOW, state(4600, 1231));
  const s1 = JSON.stringify(small.S.backup()).length, plainBig = JSON.stringify(big.S.state).length, sentBig = big.S.backup(), s2 = JSON.stringify(sentBig).length;
  t("plain while the progress is under 300,000 characters", s1 < 300000 && !Array.isArray(small.S.backup().srs["h5-0001"]), s1);
  t("very large deck (4,600 cards, all of HSK 5): plain would not fit, so it is sent compact", plainBig > SERVER_MAX && Array.isArray(sentBig.srs["h5-0001"]), plainBig);
  t("very large deck: the backup fits under the server limit of 400,000 with room for the code, numbers and summary", s2 + 6000 < SERVER_MAX, s2);
  const back = phone(NOW); back.S.importJSON(JSON.stringify(sentBig));
  t("very large deck: the new version restores every card exactly from the compact form", cardsOf(back.S.state.srs) === cardsOf(big.S.state.srs) && Object.keys(back.S.state.srs).length === 4600);
  // just over the switch: compact is far smaller than plain, so there is no size between the two that fits neither
  let n = 2500; while (JSON.stringify(phone(NOW, state(n, 600)).S.state).length <= 300000) n += 50;
  const edge = phone(NOW, state(n, 600)), e = edge.S.backup();
  t("just over 300,000 characters: compact, and much smaller", Array.isArray(e.srs["h5-0001"]) && JSON.stringify(e).length < 200000, n + " cards → " + JSON.stringify(e).length);
}
{ // ---- two phones studied: merging the cloud copy into this phone (Store.mergeIn) loses nothing ----
  const base = { settings: { onboarded: true, examDate: "2026-11-14", lang: "vi" }, xp: 100, log: { "2026-10-01": 60, "2026-10-02": 40 },
    srs: { a: { box: 3, due: "2026-10-10", right: 3, wrong: 0, added: "2026-10-01", last: "2026-10-05" }, b: { box: 2, due: "2026-10-09", right: 1, wrong: 1, added: "2026-10-01", last: "2026-10-04" } },
    streak: { count: 2, last: "2026-10-02", best: 5 }, mistakes: { "m:1:R1-1": { kind: "mock", skill: "fill-word", wrong: 1, streak: 0, last: "2026-10-02" } },
    mockHistory: [{ id: 1, date: "2026-10-02", mode: "exam", total: 200, sections: { listening: 70, reading: 70, writing: 60 } }], badges: { first: "2026-10-01" }, sessions: { "2026-10-02": true } };
  const here = JSON.parse(JSON.stringify(base)), cloud = JSON.parse(JSON.stringify(base));
  // this phone: studied card a again, a new card c, one more day
  here.srs.a = { box: 4, due: "2026-10-20", right: 4, wrong: 0, added: "2026-10-01", last: "2026-10-08" }; here.srs.c = { box: 1, due: "2026-10-09", right: 0, wrong: 1, added: "2026-10-08", last: "2026-10-08" };
  here.log["2026-10-08"] = 30; here.xp = 130; here.streak = { count: 1, last: "2026-10-08", best: 5 }; here.settings.lang = "en";
  // the other phone: studied card b, took a mock, fixed the mistake, earned a badge, a later study day
  cloud.srs.b = { box: 3, due: "2026-10-15", right: 2, wrong: 1, added: "2026-10-01", last: "2026-10-07" }; cloud.log["2026-10-07"] = 50; cloud.xp = 150;
  cloud.mockHistory.push({ id: 2, date: "2026-10-07", mode: "exam", total: 220, sections: { listening: 80, reading: 70, writing: 70 } });
  cloud.mistakes["m:1:R1-1"] = { kind: "mock", skill: "fill-word", wrong: 1, streak: 1, last: "2026-10-07" }; cloud.badges.mock = "2026-10-07"; cloud.streak = { count: 6, last: "2026-10-07", best: 6 };
  const p = phone(NOW, here); p.S.mergeIn(cloud); const m = p.S.state, saved = p.saved();
  t("merge: each card keeps its latest version from either phone", m.srs.a.box === 4 && m.srs.b.box === 3 && !!m.srs.c, JSON.stringify(m.srs));
  t("merge: study days from both phones, XP covers both", m.log["2026-10-07"] === 50 && m.log["2026-10-08"] === 30 && m.xp >= 180, m.xp);
  t("merge: mock attempts from both phones, no duplicates", m.mockHistory.length === 2 && m.mockHistory[1].id === 2);
  t("merge: a mistake keeps its newer state, badges from both", m.mistakes["m:1:R1-1"].streak === 1 && m.badges.mock === "2026-10-07" && m.badges.first === "2026-10-01");
  t("merge: the streak from the phone that studied last, best of both", m.streak.last === "2026-10-08" && m.streak.best === 6, JSON.stringify(m.streak));
  t("merge: this phone keeps its own settings", m.settings.lang === "en");
  t("merge: the result is saved on the phone", saved.srs.b.box === 3 && saved.mockHistory.length === 2);
  const again = phone(NOW, JSON.parse(JSON.stringify(m))); again.S.mergeIn(JSON.parse(JSON.stringify(m)));
  t("merge: merging the same copy twice changes nothing", JSON.stringify(again.S.state.srs) === JSON.stringify(m.srs) && again.S.state.mockHistory.length === 2 && again.S.state.xp === m.xp);
  const big = phone(NOW, here); big.S.mergeIn(phone(NOW, state(4600, 1231)).S.backup());
  t("merge: a compact cloud copy (very large deck) is unpacked before merging", Object.keys(big.S.state.srs).length === 4603 && !Array.isArray(big.S.state.srs["h5-0001"]));
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
