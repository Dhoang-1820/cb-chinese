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
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
