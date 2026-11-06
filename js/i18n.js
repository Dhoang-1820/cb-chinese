/* Interface language (Vietnamese or English).
   Every piece of interface text in js/app/*.js and js/games.js is written in English and passed through tx():
     tx("Settings")                      -> "Cài đặt" when the interface is Vietnamese, "Settings" otherwise
     tx("Level {n}", { n: 3 })           -> "Cấp 3" / "Level 3"   ({name} placeholders, values are inserted as given)
   The English text is the key, so English output is exactly what it was before this table existed, and a phrase
   missing from the table simply shows in English. tools/i18n_check.js fails the tests when a tx() phrase has no
   Vietnamese entry or an entry loses a placeholder.
   Language: Store.state.settings.uiLang ("vi" | "en", changed in Me → Settings), else this device's default
   (localStorage cbChinese.uiLang), else Vietnamese.
   Chinese learning content and the "Meanings" setting (word meanings in vi / en / both) are separate and unchanged. */
(function () {
  "use strict";
  var VI = window.CB_I18N_VI || {};
  function lang() {
    var s = window.Store && Store.state && Store.state.settings;
    if (s && (s.uiLang === "vi" || s.uiLang === "en")) return s.uiLang;
    var d = null;
    try { d = localStorage.getItem("cbChinese.uiLang"); } catch (e) { /* storage blocked */ }
    return d === "en" ? "en" : "vi";
  }
  function fill(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m; });
  }
  function tx(en, vars) {
    var out = lang() === "vi" && Object.prototype.hasOwnProperty.call(VI, en) ? VI[en] : en;
    return fill(out, vars);
  }
  window.tx = tx;
  window.I18N = { lang: lang, tx: tx, table: VI };
})();
