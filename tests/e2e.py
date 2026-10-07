#!/usr/bin/env python3
"""Browser tests for C&B Chinese, run against a BUILT site on a simulated iPhone 14.

    pip install playwright && playwright install chromium
    tests/run.sh                 # builds, starts the servers, runs everything
    python3 tests/e2e.py reader  # one group, with the servers already running

Environment: BASE (default http://localhost:8766/) and AI_URL (default http://localhost:9201/ai, see tests/mockai.mjs).
Nothing here depends on today's date: exam dates and study logs are set relative to "today".
The script exits with 1 when any check fails.
"""
import asyncio, datetime, itertools, json, os, sys, urllib.request
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE", "http://localhost:8766/")
AI_URL = os.environ.get("AI_URL", "http://localhost:9201/ai")
SLOW = float(os.environ.get("SLOW", "1"))
CI = bool(os.environ.get("GITHUB_ACTIONS"))
KEY = "cbChinese.progress.v1"
TODAY = datetime.date.today()
results, page_errors = [], []


def day(n):
    return (TODAY + datetime.timedelta(days=n)).isoformat()


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("  ok   " if ok else "  FAIL ") + name + ("" if ok else "   <- " + str(detail)[:300]), flush=True)
    if not ok and CI:  # shows up as an annotation on the run, so the failure can be read without opening the log
        print("::error title=Browser test failed::" + (name + " <- " + str(detail)[:300]).replace("\n", " "), flush=True)


def settings(**extra):
    s = {"onboarded": True, "setupDone": True, "installHintDismissed": True, "theme": "light", "examDate": day(30)}
    s.update(extra)
    return s


async def open_app(browser, state=None, path="", ai=False, expect_errors=False, seed=True, watch=None, **ctx_opts):
    """A fresh phone with the given saved state (None = first run). Returns (context, page).
    seed=False adds nothing to storage on later page loads, for tests that check what is left after a reload.
    watch: a list that collects the URL of every request the phone makes, from the very first one."""
    dev = dict(PW.devices["iPhone 14"]); dev.pop("default_browser_type", None)
    ctx = await browser.new_context(**dev, **ctx_opts)
    if watch is not None:
        ctx.on("request", lambda r: watch.append(r.url))
    await ctx.route("**/*.supabase.co/**", lambda r: r.abort())  # a test must never reach the real AI service
    init = ""
    if not seed:
        pass
    elif state is not None:
        init += "if(!localStorage.getItem('%s'))localStorage.setItem('%s',%s);" % (KEY, KEY, json.dumps(json.dumps(state)))
    if not seed:
        pass
    elif ai:
        init += "localStorage.setItem('cbChinese.ai',%s);" % json.dumps(json.dumps({"url": AI_URL, "code": ""}))
    else:  # never call the real AI service from a test
        init += "localStorage.setItem('cbChinese.ai',%s);" % json.dumps(json.dumps({"url": "http://localhost:1/off", "code": ""}))
    if init:
        await ctx.add_init_script(init)
    pg = await ctx.new_page()
    if SLOW > 1:  # SLOW=4 imitates a slow machine, to find checks that only pass on a fast one
        cdp = await ctx.new_cdp_session(pg); await cdp.send("Emulation.setCPUThrottlingRate", {"rate": SLOW})
    if not expect_errors:
        pg.on("pageerror", lambda e: page_errors.append(str(e)))
    pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
    await pg.goto(BASE + path)
    await pg.wait_for_selector("#app > *:not(.skel)")
    return ctx, pg


async def no_dialogs(pg):
    """Badge and level-up dialogs pop up as XP grows; close them so they do not cover the next button."""
    await pg.evaluate("document.querySelectorAll('.modal-wrap').forEach(e=>e.remove())")


async def go(pg, hash_, wait=600):
    await pg.evaluate("h=>{location.hash=h}", hash_)
    await pg.wait_for_timeout(wait)


# Text that is too faint to read (WCAG AA: 4.5:1, or 3:1 for large text). Returns a list of offenders.
CONTRAST_JS = r"""() => {
  const out = [], seen = {};
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const rgb = c => { const m = (c || '').match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lum = m => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const bgOf = e => { while (e) { const m = rgb(getComputedStyle(e).backgroundColor); if (m && (m.length < 4 || m[3] > 0.9)) return m; e = e.parentElement; } return [255, 255, 255]; };
  document.querySelectorAll('#app *').forEach(e => {
    if (!vis(e) || !e.childNodes.length) return;
    const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!t) return;
    const cs = getComputedStyle(e), fg = rgb(cs.color); if (!fg) return;
    const a = lum(fg), b = lum(bgOf(e)), cr = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const size = parseFloat(cs.fontSize), need = (size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700)) ? 3 : 4.5;
    if (cr < need) { const k = (e.className || e.tagName) + '|' + cs.color; if (!seen[k]) { seen[k] = 1; out.push(t.slice(0, 24) + ' ' + cr.toFixed(1) + ':1'); } }
  });
  return out;
}"""


# ----------------------------------------------------------------------------------------------------------------------
async def t_first_run(b):
    ctx, pg = await open_app(b, None)
    await pg.wait_for_selector("#su-go")
    check("first run: one short setup step (exam date, study time, days a week)", await pg.locator("#su-exam").count() == 1 and await pg.locator("#su-time").count() == 1 and await pg.locator("#su-days").count() == 1
          and await pg.locator("#su-goal, #su-lv, #g-skip").count() == 0)
    check("setup dialog: defaults are preselected", await pg.locator("#su-time .on").get_attribute("data-v") == "20:00" and await pg.locator("#su-days .on").get_attribute("data-v") == "5" and bool(await pg.input_value("#su-exam")))
    await pg.wait_for_timeout(200)
    check("setup dialog: focus is inside and it has a name", await pg.evaluate("(()=>{const m=document.querySelector('.modal');return m.contains(document.activeElement)&&!!m.getAttribute('aria-labelledby')})()"))
    await pg.keyboard.press("Escape")
    check("setup dialog: Escape does not skip setup", await pg.locator("#su-go").count() == 1)
    vp = pg.viewport_size
    box = await pg.locator("#su-go").bounding_box()
    check("setup dialog: Continue is on screen", box and box["y"] + box["height"] <= vp["height"], box)
    await pg.click("#su-time [data-v='12:30']"); await pg.click("#su-days [data-v='3']")
    check("setup dialog: the chosen option is marked for screen readers", await pg.locator("#su-days [aria-pressed='true']").get_attribute("data-v") == "3")
    await pg.fill("#su-exam", day(40)); await pg.click("#su-go"); await pg.wait_for_timeout(600)
    st = await pg.evaluate("Store.state.settings")
    check("setup: choices are saved, the rest keeps its default", st.get("remindTime") == "12:30" and st.get("weeklyDays") == 3 and st.get("examDate") == day(40) and st.get("setupDone") and st.get("onboarded") and st.get("dailyGoal") == 30, st)
    check("after setup the Home screen is usable (no guide pages)", await pg.locator(".modal-wrap").count() == 0 and await pg.locator(".session-cta").count() == 1)
    check("after setup Home shows the chosen exam date and weekly goal", "40 days" in await pg.inner_text("#app") and "Study 3 days" in await pg.inner_text(".wkrow"))
    await go(pg, "#/me", 500); await pg.click("#s-guide"); await pg.wait_for_timeout(300)
    check("the guide pages are still under Me", await pg.locator("#g-next").count() == 1 and await pg.locator("#su-go").count() == 0)
    await ctx.close()
    # Continue straight away: defaults are saved
    ctx, pg = await open_app(b, None)
    await pg.wait_for_selector("#su-go"); await pg.click("#su-go"); await pg.wait_for_timeout(600)
    st = await pg.evaluate("Store.state.settings")
    check("setup: Continue with no choices keeps the defaults", st.get("remindTime") == "20:00" and st.get("weeklyDays") == 5 and st.get("onboarded") and await pg.locator(".modal-wrap").count() == 0, st)
    await ctx.close()


async def t_resume(b):
    back = "document.dispatchEvent(new Event('visibilitychange'))"
    shown = "window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))"
    mark = "document.querySelector('#app > *').setAttribute('data-old','1')"
    old = "document.querySelectorAll('#app [data-old]').length"

    async def at(pg, days, h, m=0):
        """Set the phone's clock, and make sure it took (a clock change is sometimes lost right after another one)."""
        t = datetime.datetime.combine(TODAY + datetime.timedelta(days=days), datetime.time(h, m))
        for _ in range(10):
            await pg.clock.set_fixed_time(t)
            if await pg.evaluate("(()=>{const d=new Date();return [d.getFullYear(),d.getMonth()+1,d.getDate(),d.getHours(),d.getMinutes()]})()") == [t.year, t.month, t.day, t.hour, t.minute]: return
            await pg.wait_for_timeout(50)
        raise Exception("the test clock could not be set")

    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await pg.clock.install(time=datetime.datetime.combine(TODAY, datetime.time(9, 0)))
    await pg.reload(); await pg.wait_for_selector(".quests")
    await pg.evaluate(mark); await at(pg, 0, 10); await pg.evaluate(back); await pg.wait_for_timeout(200)
    check("resume: Home is left alone after a short break", await pg.evaluate(old) == 1)
    await at(pg, 0, 12, 30)
    await pg.evaluate("document.body.insertAdjacentHTML('beforeend','<div class=\"modal-wrap\" id=\"x-dlg\"></div>')")
    await pg.evaluate(back); await pg.wait_for_timeout(200)
    check("resume: Home is not redrawn under an open dialog", await pg.evaluate(old) == 1)
    await pg.evaluate("document.getElementById('x-dlg').className='fx-streak'"); await pg.evaluate(back); await pg.wait_for_timeout(200)
    check("resume: Home is not redrawn under a celebration card", await pg.evaluate(old) == 1)
    await pg.evaluate("document.getElementById('x-dlg').remove()"); await pg.evaluate(back); await pg.wait_for_timeout(300)
    check("resume: Home is redrawn after more than 3 hours away", await pg.evaluate(old) == 0 and await pg.locator(".quests").count() == 1)
    await pg.evaluate(mark); await pg.evaluate(shown); await pg.wait_for_timeout(200)
    check("resume: not redrawn twice in a row", await pg.evaluate(old) == 1)
    # a new day, only one hour later on the clock
    await at(pg, 0, 23, 30); await go(pg, "#/me", 300); await go(pg, "#/", 500)
    await pg.evaluate(mark); await at(pg, 1, 0, 30)
    await pg.evaluate(shown); await pg.wait_for_timeout(300)
    check("resume: Home is redrawn when the day changed", await pg.evaluate(old) == 0 and await pg.evaluate("Store.today()") == day(1))
    # other screens are never touched
    await go(pg, "#/day/1/quiz"); await pg.wait_for_selector(".opt")
    await pg.evaluate(mark); await at(pg, 2, 12)
    await pg.evaluate(back); await pg.evaluate(shown); await pg.wait_for_timeout(300)
    check("resume: a screen other than Home is never redrawn", await pg.evaluate(old) == 1 and await pg.locator(".opt").count() > 0)
    await ctx.close()


async def t_tip(b):
    async def tip(state, ai=False):
        ctx, pg = await open_app(b, state, ai=ai)
        el = pg.locator("#tip")
        r = (await el.get_attribute("data-rule"), await el.inner_text(), await pg.locator("#tip-go").get_attribute("href")) if await el.count() else (None, "", None)
        return ctx, pg, r
    base = {"settings": settings(examDate=day(120)), "srs": {}}
    ctx, pg, r = await tip(base)
    ids = await pg.evaluate("App.WORDS.slice(0,25).map(w=>w.id)")
    check("tip: today's lesson when nothing else applies", r[0] == "lesson" and r[2] == "#/day/1", r)
    check("tip: one small card above the More fold with one button", await pg.locator("#tip .btn").count() == 1 and await pg.evaluate("!document.querySelector('details.more #tip')"))
    await pg.click("#tip-go"); await pg.wait_for_timeout(500)
    seen = await pg.evaluate("JSON.parse(localStorage.getItem('cbChinese.tip'))")
    check("tip: the button opens the screen and the tap is remembered", await pg.evaluate("location.hash") == "#/day/1" and seen == {"d": day(0), "r": "lesson"}, seen)
    await go(pg, "#/", 600)
    check("tip: hidden for the rest of the day once acted on", await pg.locator("#tip").count() == 0 and await pg.locator(".quests").count() == 1)
    await pg.evaluate("localStorage.setItem('cbChinese.tip',JSON.stringify({d:'2020-01-01',r:'lesson'}))"); await go(pg, "#/me", 300); await go(pg, "#/", 600)
    check("tip: back the next day", await pg.locator("#tip").count() == 1)
    await ctx.close()
    done = {"1": {"completed": True, "completedOn": day(0), "quizBest": 9}}
    ctx, pg, r = await tip(dict(base, days=done))
    check("tip: 'all caught up' links to listening or the Reader", r[0] in ("listen", "read") and r[2] in ("#/listen-mode", "#/read") and "All caught up" in r[1], r)
    await ctx.close()
    ctx, pg, r = await tip({"settings": settings(examDate=day(30)), "srs": {}, "days": done})
    check("tip: a mock exam when none was taken in 14 days and the exam is near", r[0] == "mock" and r[2] == "#/mock", r)
    await ctx.close()
    mock = [{"id": 1, "date": day(-3), "mode": "exam", "total": 188, "sections": {"listening": 52, "reading": 74, "writing": 62}}]
    ctx, pg, r = await tip({"settings": settings(examDate=day(30)), "srs": {}, "days": done, "mockHistory": mock})
    check("tip: no mock tip after a recent mock", r[0] in ("listen", "read"), r)
    await ctx.close()
    slog = {day(-2): {"m": 10, "s": 1, "h": 20, "k": {"measure": [4, 8], "vocab": [20, 2], "pinyin": [1, 5]}}}
    ctx, pg, r = await tip(dict(base, slog=slog, log={day(-2): 30}))
    check("tip: the weakest skill of the last 14 days (10+ answers, under 70%)", r[0] == "weak" and r[2] == "#/game/measure" and "33%" in r[1], r)
    await ctx.close()
    mlog = [{"d": day(-1), "k": "t:%d" % i, "s": "confusable"} for i in range(6)]
    ctx, pg, r = await tip(dict(base, slog=slog, mlog=mlog, skills={"confusable": {"r": 4, "w": 8}}))
    check("tip: a mistake pattern comes before the weakest skill", r[0] == "pattern" and r[2] == "#/game/confuse" and "Confusable words" in r[1], r)
    await ctx.close()
    srs = {i: {"box": 1, "due": day(-1), "right": 0, "wrong": 0, "added": day(-3), "last": day(-2)} for i in ids}
    ctx, pg, r = await tip(dict(base, srs=srs, slog=slog, mlog=mlog, skills={"confusable": {"r": 4, "w": 8}}))
    check("tip: 20 or more due words come first", r[0] == "due" and r[2] == "#/review" and "25 words are due. Clear them first." in r[1], r)
    await ctx.close()
    # the coach's plan already asks for the same skill -> no second card
    today = datetime.date.today(); mon = (today - datetime.timedelta(days=today.weekday())).isoformat()
    def plan(skill):
        return [{"w": mon, "d": day(0), "base": {"skills": {skill: 0}, "cards": 0, "mocks": 0}, "actions": [{"text": "Practise this", "minutes": 10, "skill": skill}]}]
    ctx, pg, r = await tip(dict(base, slog=slog, coachLog=plan("measure")))
    check("tip: not shown when the coach's plan has the same skill open", r[0] is None and await pg.locator("#coach-plan li").count() == 1, r)
    await ctx.close()
    ctx, pg, r = await tip(dict(base, slog=slog, coachLog=plan("typing")))
    check("tip: shown beside a coach plan about something else", r[0] == "weak" and await pg.locator("#coach-plan li").count() == 1, r)
    await ctx.close()


async def t_theme(b):
    metas = "[...document.querySelectorAll('meta[name=\"theme-color\"]')].map(m=>m.content)"
    bg = "(()=>{const m=getComputedStyle(document.body).backgroundColor.match(/\\d+/g);return '#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('')})()"
    for scheme in ("light", "dark"):
        ctx, pg = await open_app(b, {"settings": settings(theme="auto"), "srs": {}}, color_scheme=scheme)
        m = await pg.evaluate(metas); col = await pg.evaluate(bg)
        used = await pg.evaluate("[...document.querySelectorAll('meta[name=\"theme-color\"]')].filter(m=>matchMedia(m.media).matches).map(m=>m.content)")
        check("status bar: follows the system theme (%s) and matches the page background" % scheme, len(m) == 2 and used == [col], (m, used, col))
        await go(pg, "#/me", 500)
        other = "dark" if scheme == "light" else "light"
        await pg.select_option("#s-theme", other); await pg.wait_for_timeout(300)
        m = await pg.evaluate(metas); col = await pg.evaluate(bg)
        check("status bar: changes with a manual theme (%s on a %s phone)" % (other, scheme), m == [col, col] and col == ("#17161f" if other == "dark" else "#ece8fa"), (m, col))
        await pg.select_option("#s-theme", "auto"); await pg.wait_for_timeout(300)
        m = await pg.evaluate(metas)
        check("status bar: back to the system colours with theme System (%s)" % scheme, m == ["#ece8fa", "#17161f"], m)
        await ctx.close()
    # export: share sheet when the phone can share a file, download otherwise
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await pg.evaluate("()=>{window.__sh=null;navigator.canShare=d=>!!(d&&d.files&&d.files.length);navigator.share=d=>{window.__sh={n:d.files[0].name,t:d.files[0].type};return Promise.resolve()}}")
    await go(pg, "#/me", 500); await pg.evaluate("document.querySelectorAll('#app details').forEach(d=>d.open=true)")
    await pg.click("#s-exp"); await pg.wait_for_timeout(300)
    sh = await pg.evaluate("window.__sh")
    check("export: uses the share sheet with a JSON file when files can be shared", sh and sh["n"].endswith(".json") and sh["t"] == "application/json", sh)
    await pg.evaluate("()=>{navigator.canShare=()=>false}")
    async with pg.expect_download() as dl:
        await pg.click("#s-exp")
    d = await dl.value
    check("export: falls back to a download", d.suggested_filename.startswith("cb-chinese-progress-"), d.suggested_filename)
    await ctx.close()


async def t_home(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    check("home: quests card with 3 rows, chest locked", await pg.locator(".quests .qrow").count() == 3 and await pg.locator("#q-chest").is_disabled())
    check("home: weekly goal ring", await pg.locator(".wkrow .wk-dots i").count() == 7)
    check("home: Reader row", await pg.locator("a.toolrow[href='#/read']").count() == 1)
    check("home: 'take a mock' readiness prompt when there is no data", await pg.locator(".readyc.empty").count() == 1)
    try:
        await pg.wait_for_selector(".trackrow:not(.toolrow)", timeout=12000); ok = True
    except Exception:
        ok = False
    check("home: C&B track row appears after idle", ok)
    untagged = await pg.evaluate("[...document.querySelectorAll('.zh,.hz')].filter(e=>e.lang!=='zh-CN').length")
    check("home: Chinese text is tagged as Chinese", untagged == 0, untagged)
    await pg.evaluate("()=>{var s=Store.state,t=Store.today();s.log[t]=40;s.sessions=s.sessions||{};s.sessions[t]=true;s.days[1]=Object.assign(s.days[1]||{},{completed:true,completedOn:t});Store.save();}")
    await go(pg, "#/learn"); await go(pg, "#/", 900)
    check("home: chest unlocks when the 3 quests are done", not await pg.locator("#q-chest").is_disabled())
    xp0 = await pg.evaluate("Store.state.xp")
    await pg.click("#q-chest"); await pg.wait_for_timeout(700)
    check("home: chest gives 20 XP once", await pg.evaluate("Store.state.xp") - xp0 == 20 and await pg.evaluate("!!Store.state.questChest[Store.today()]"))
    await ctx.close()


async def t_habit(b):
    # words missed again and again -> pattern card -> drill of exactly those words
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    ids = await pg.evaluate("App.WORDS.slice(0,3).map(w=>w.id)")
    await ctx.close()
    mlog = [{"d": day(-1), "k": "w:" + ids[0], "s": "vocab"}] * 4 + [{"d": day(-2), "k": "w:" + ids[1], "s": "pinyin"}] * 3
    state = {"settings": settings(weeklyDays=3, remindTime="20:00"), "streak": {"count": 3, "last": day(-1), "best": 3},
             "log": {day(-1): 40, day(-2): 35}, "mlog": mlog, "freezes": 0, "skills": {"vocab": {"r": 2, "w": 4}}}
    ctx, pg = await open_app(b, state)
    await pg.clock.install(time=datetime.datetime.combine(TODAY, datetime.time(21, 30)))
    await pg.reload(); await pg.wait_for_selector(".quests")
    txt = await pg.locator(".pattern").inner_text() if await pg.locator(".pattern").count() else ""
    check("habit: pattern card shows the evidence", "×4" in txt and "×3" in txt, txt)
    check("habit: streak-at-risk card after the study time", await pg.locator("a.cta[href='#/session/rescue']").count() == 1)
    await pg.click("#pt-go"); await pg.wait_for_timeout(700)
    check("habit: Practise opens a deck of the missed words", "Words you keep missing" in await pg.inner_text("#app"))
    # weekly goal met -> one freeze, only once
    await pg.evaluate("()=>{const s=Store.state,t=Store.today(),d=new Date(t+'T00:00:00'),ws=Store.addDays(t,-((d.getDay()+6)%7));for(let i=0;i<7;i++)s.log[Store.addDays(ws,i)]=20;Store.save();}")
    await pg.reload(); await pg.wait_for_selector(".quests"); await pg.wait_for_timeout(900)
    f1 = await pg.evaluate("Store.state.freezes")
    await pg.reload(); await pg.wait_for_selector(".quests"); await pg.wait_for_timeout(900)
    check("habit: meeting the weekly goal earns one freeze, once", f1 == 1 and await pg.evaluate("Store.state.freezes") == 1, f1)
    await ctx.close()


async def t_flame(b):
    state = {"settings": settings(), "srs": {}, "streak": {"count": 3, "last": day(-1), "best": 3}, "log": {day(-1): 30}}
    ctx, pg = await open_app(b, state)
    await pg.evaluate("Game.award(5)")
    try:
        await pg.wait_for_selector(".fx-streak .fs-anim svg", timeout=8000); shown = True
    except Exception:
        shown = False
    check("streak flame: plays when the streak grows, with the real number", shown and (await pg.locator(".fs-n").inner_text()) == "4")
    await pg.evaluate("Game.award(5)"); await pg.wait_for_timeout(700)
    check("streak flame: only once a day", await pg.locator(".fx-streak").count() <= 1)
    await pg.wait_for_selector(".fx-streak", state="detached", timeout=9000)
    check("streak flame: removes itself", await pg.locator(".fx-streak").count() == 0)
    await ctx.close()
    # two rewards at once: the flame first, then the daily-goal card, never on top of each other
    ctx, pg = await open_app(b, state)
    await pg.evaluate("Game.award(40)")
    await pg.wait_for_selector(".fx-streak"); await pg.wait_for_timeout(600)
    first = await pg.locator(".fs-t").inner_text(); one = await pg.locator(".fx-streak").count()
    await pg.click(".fx-streak"); await pg.wait_for_timeout(900)
    second = await pg.locator(".fs-t").inner_text() if await pg.locator(".fs-t").count() else ""
    check("celebration cards: queued one at a time (streak, then daily goal)", one == 1 and first == "day streak" and second == "Daily goal reached", (one, first, second))
    await ctx.close()
    ctx, pg = await open_app(b, state, reduced_motion="reduce")
    await pg.evaluate("Game.award(5)"); await pg.wait_for_timeout(1500)
    check("streak flame: skipped with reduced motion", await pg.locator(".fx-streak").count() == 0 and await pg.evaluate("Store.state.streak.count") == 4)
    await ctx.close()


async def t_anims(b):
    async def playing(pg, name):
        try:
            await pg.wait_for_selector(".lt[data-lt='%s'] .lt-in svg" % name, timeout=8000); return True
        except Exception:
            return False
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    check("animations: the dog peeks beside the 2-minute link", await playing(pg, "dog-peek"))
    await go(pg, "#/review", 500)
    check("animations: the sleeping cat on an empty Review", await playing(pg, "cat-sleep") and await pg.locator(".lt[data-lt='cat-sleep'] > svg").count() == 0)
    await go(pg, "#/day/1/quiz"); await pg.wait_for_selector(".opt")
    n = await pg.evaluate("CB_DAYS.find(d=>d.day===1).quiz.length")
    for i in range(n):
        await no_dialogs(pg)
        k = await pg.evaluate("i=>CB_DAYS.find(d=>d.day===1).quiz[i].answer", i)
        await pg.click(".opt[data-k='%s']" % k); await pg.click("#qnext"); await pg.wait_for_timeout(120)
    check("animations: the loving cat when a lesson quiz is passed", await playing(pg, "cat-love"))
    await no_dialogs(pg)
    await pg.evaluate("()=>{const d=document.createElement('div');d.className='ai-card ai-wait';d.textContent='🤖 Thinking…';document.getElementById('app').appendChild(d)}")
    check("animations: the robot on an 'AI is thinking' card", await playing(pg, "robot") and "Thinking" in await pg.locator(".ai-wait").inner_text())
    await go(pg, "#/", 400)
    check("animations: players are released when the screen changes", await pg.locator(".lt[data-lt='robot']").count() == 0)
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await pg.route("**/vendor/lottie/**", lambda r: r.abort())
    await go(pg, "#/review", 900)
    check("animations: the coin mascot stays when an animation cannot load", await pg.locator(".lt[data-lt='cat-sleep'] svg").count() == 1 and await pg.locator(".lt .lt-in svg").count() == 0)
    await ctx.close()


async def t_ready(b):
    skills = {"listen-word": {"r": 10, "w": 14}, "vocab": {"r": 40, "w": 8}, "typing": {"r": 9, "w": 6}}
    mocks = [{"id": 1, "date": day(-6), "mode": "exam", "total": 171, "sections": {"listening": 48, "reading": 68, "writing": 55}},
             {"id": 2, "date": day(-2), "mode": "exam", "total": 188, "sections": {"listening": 52, "reading": 74, "writing": 62}}]
    ctx, pg = await open_app(b, {"settings": settings(), "skills": skills})
    check("ready: rough estimate from practice answers", "ROUGH" in (await pg.locator(".readyc").inner_text()).upper())
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(), "skills": skills, "mockHistory": mocks})
    card = await pg.locator(".readyc").inner_text()
    check("ready: score card from mock results", "/300" in card and "Listening" in card, card)
    await go(pg, "#/ready")
    txt = await pg.inner_text("#app")
    check("ready: page shows three sections and what to fix first", all(k in txt for k in ("Listening", "Reading", "Writing", "Fix first")), txt[:200])
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(examDate=day(9)), "skills": skills, "mockHistory": mocks})
    order = await pg.evaluate("[...document.querySelectorAll('#app > *')].slice(0,4).map(e=>e.className)")
    check("final 14 days: readiness and the final plan lead Home", "readyc" in order[1] and "final-mode" in order[2], order)
    check("final 14 days: new lessons become a small link", await pg.locator("a.cta.g-coral[href^='#/day/']").count() == 0)
    await ctx.close()


async def t_learn(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "days": {"1": {"completed": True, "quizBest": 9}, "2": {"completed": True, "quizBest": 8}, "3": {"completed": True, "quizBest": 10}}})
    await go(pg, "#/learn", 1500)
    check("learn: path has 90 lessons, 3 done, one next", await pg.locator(".pnode").count() == 90 and await pg.locator(".pnode.done").count() == 3 and await pg.locator(".pnode.next").count() == 1)
    await pg.locator(".pnode.next").click(force=True); await pg.wait_for_timeout(700)
    check("learn: the next node opens day 4", await pg.evaluate("location.hash") == "#/day/4")
    await go(pg, "#/learn", 900); await pg.click("[data-lv=grid]"); await pg.wait_for_timeout(600)
    check("learn: grid view lists 90 lessons", await pg.locator(".daycard").count() == 90)
    await go(pg, "#/plan", 900)
    faint = await pg.evaluate(CONTRAST_JS)
    check("plan: week-by-week rows are readable", await pg.locator(".pw").count() >= 3 and not faint, faint)
    await ctx.close()


async def t_pages(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await pg.wait_for_timeout(1500)
    bad = []
    for n in range(1, 91):
        for tab in ("words", "reading", "grammar", "practice", "quiz"):
            await go(pg, "#/day/%d/%s" % (n, tab), 130)
            t = await pg.inner_text("#app")
            if len(t) < 40 or "not available" in t or "Something broke" in t:
                await pg.wait_for_timeout(700); t = await pg.inner_text("#app")  # lazy data may still be loading
                if len(t) < 40 or "not available" in t or "Something broke" in t: bad.append("day %d %s" % (n, tab))
    check("every lesson tab renders (90 days x 5 tabs)", not bad, bad[:8])
    bad = []
    for route in ["#/mock/%d" % m for m in range(1, 7)] + ["#/games", "#/review", "#/me", "#/progress", "#/grammar", "#/mistakes", "#/official", "#/search", "#/talk", "#/track", "#/learn/core", "#/learn/mine", "#/reports"]:
        await go(pg, route, 500)
        t = await pg.inner_text("#app")
        empty = await pg.locator("#q").count() == 0 if route == "#/search" else len(t) < 60
        if empty or "Something broke" in t: bad.append(route)
    check("every main screen renders", not bad, bad)
    # the new screens: every HSK 5 pack and grammar point, every extra pack, families, both levels of the grammar list, the new games
    bad = []
    await go(pg, "#/learn/h5", 300); await pg.wait_for_selector(".daycard[href^='#/pack/h5']", timeout=15000)
    await go(pg, "#/learn/extra", 300); await pg.wait_for_selector(".daycard[href^='#/pack/x4']", timeout=15000)
    for n in range(1, 63):
        await go(pg, "#/pack/h5/%d" % n, 110)
        if await pg.locator(".word.card").count() != (11 if n == 62 else 20) or await pg.locator(".word.card .w-ex").count() != (11 if n == 62 else 20): bad.append("pack h5/%d" % n)
    for n in range(1, 6):
        await go(pg, "#/pack/x4/%d" % n, 110)
        if await pg.locator(".word.card").count() != (11 if n == 5 else 20): bad.append("pack x4/%d" % n)
    for gid in ["h5g%02d" % n for n in range(1, 43)] + ["g%02d" % n for n in range(1, 71)]:
        await go(pg, "#/grammar/" + gid, 90)
        if await pg.locator(".gpat").count() != 1 or await pg.locator(".w-ex").count() != 2: bad.append("grammar " + gid)
    check("every HSK 5 pack, extra pack and grammar point renders (67 packs, 112 points)", not bad, bad[:8])
    bad = []
    for route in ["#/learn/h5", "#/learn/h5p", "#/grammar/h5", "#/learn/extra", "#/families", "#/game/bank", "#/game/wordorder", "#/game/confuse/h5", "#/game/order/h5", "#/game/picture/h5", "#/game/measure/h5",
                  "#/game/quick/p-h5-62", "#/cards/p-h5-1", "#/cards/p-x4-5", "#/pack/h5/99", "#/pack/x4/0", "#/grammar/h5g99", "#/game/confuse/zz"]:
        await go(pg, route, 400)
        t = await pg.inner_text("#app")
        if len(t) < 12 or "Something broke" in t or ("/99" in route or "/0" in route or "g99" in route) != ("not found" in t): bad.append(route)
    check("the new screens render, and unknown packs or points say so", not bad, bad)
    await ctx.close()


async def t_hearts(b):
    for reduced in (False, True):
        ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, reduced_motion="reduce" if reduced else "no-preference")
        async def flying():
            await pg.wait_for_timeout(120); return await pg.locator(".fx-heart, .fx-big").count()
        await go(pg, "#/day/1/quiz"); await pg.wait_for_selector(".opt")
        k = await pg.evaluate("CB_DAYS.find(d=>d.day===1).quiz[0].answer")
        await pg.locator(".opt:not([data-k='%s'])" % k).first.click(); wrong = await flying()
        await pg.click("#qnext"); k = await pg.evaluate("CB_DAYS.find(d=>d.day===1).quiz[1].answer")
        await pg.click(".opt[data-k='%s']" % k); right = await flying()
        await pg.wait_for_timeout(1700); left = await pg.locator(".fx-heart, .fx-big").count()
        if reduced:
            check("hearts: no animation with reduced motion", wrong == 0 and right == 0, (wrong, right))
        else:
            check("hearts: a right answer pops hearts, a wrong one does not, and they clean up", wrong == 0 and right > 0 and left == 0, (wrong, right, left))
        check("hearts: the counter still goes up" + (" (reduced motion)" if reduced else ""), await pg.evaluate("Store.state.stats.hearts") >= 1)
        await ctx.close()


async def t_talk(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await go(pg, "#/talk/payslip", 700)
    await pg.fill("#t-text", "我问工资条"); await pg.click("#t-send")
    await pg.wait_for_selector(".tb-fix", timeout=15000)
    check("role-play: the AI corrects a clumsy sentence", "我想问一下" in await pg.locator(".tb-fix").inner_text())
    for t in ("我想问工资条。", "好的。", "谢谢你。"):
        await pg.fill("#t-text", t); await pg.click("#t-send"); await pg.wait_for_timeout(1200)
    check("role-play: the scene ends with a summary and 15 XP", await pg.locator(".ai-card").count() >= 1 and await pg.evaluate("Store.state.xp") >= 15)
    await ctx.close()


async def t_sync(b):
    opened = "document.getElementById('sync-box').closest('details').open=true"
    cfg = "JSON.parse(localStorage.getItem('cbChinese.sync')||'{}')"
    c1, p1 = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    check("backup: nothing is sent before any study", await p1.evaluate("Sync.now()") == "off")
    await p1.evaluate("Game.award(40)"); await no_dialogs(p1)
    r = await p1.evaluate("Sync.now()"); c = await p1.evaluate(cfg)
    check("backup: saved after study, with a 16-character code", r == "saved" and c.get("rev") == 1 and len(c.get("code", "")) == 16, (r, c))
    check("backup: nothing is sent again when nothing changed", await p1.evaluate("Sync.now()") == "same")
    await go(p1, "#/me", 500); await p1.evaluate(opened)
    shown = await p1.locator("#y-show").inner_text()
    check("backup: Me shows the restore code in groups of four", shown.replace("-", "") == c["code"] and shown.count("-") == 3, shown)
    # the admin sees this phone, as numbers only
    await p1.evaluate("localStorage.setItem('cbChinese.ai.admin','admin-code-12345')")
    await go(p1, "#/fixes", 500); await p1.click("[data-fxtab='learners']"); await p1.wait_for_selector(".lrn", timeout=10000)
    card = await p1.locator(".lrn").first.inner_text()
    check("admin: the learner is listed with XP and the study summary", "40 XP" in card and "Study days" in card and "No coach plan yet" in card, card[:200])
    check("admin: the card shows progress and the habit strip", "Lessons 0/" in card and "words due" in card and "No mock exam taken yet" in card and await p1.locator(".lrn .lrn-days i").count() == 28 and await p1.locator(".lrn .lrn-days i.on").count() == 1, card[:300])
    lid = await p1.evaluate("Content.admin('learners_list',{}).then(r=>r.result.rows[0].id)")
    await p1.evaluate("Content.admin('learner_label',{id:%s,label:'Hoang'})" % json.dumps(lid)); await p1.wait_for_timeout(300)
    await p1.evaluate("Game.award(1)"); await p1.evaluate("Sync.now()")
    await go(p1, "#/", 200); await go(p1, "#/fixes", 500); await p1.wait_for_selector(".lrn", timeout=10000)
    check("admin: the name given to a learner survives the next backup", "Hoang" in await p1.locator(".lrn").first.inner_text())
    bad = await p1.evaluate("AI.call('learners_list',{},{'x-admin-code':'wrong-code-000000'}).then(r=>r.error)")
    check("admin: the list needs the reviewer code", bad == "bad_admin", bad)
    await p1.evaluate("localStorage.removeItem('cbChinese.ai.admin')")
    # a second phone restores with the code
    c2, p2 = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await go(p2, "#/me", 500); await p2.evaluate(opened)
    await p2.click("#y-code"); await p2.fill("#y-in", "AAAA-BBBB-CCCC-DDDD"); await p2.click("#y-go"); await p2.wait_for_timeout(700)
    check("backup: a wrong code changes nothing", await p2.evaluate("Store.state.xp") == 0)
    await p2.fill("#y-in", shown.lower()); await p2.click("#y-go"); await p2.wait_for_timeout(900)
    check("backup: the second phone gets the progress", await p2.evaluate("Store.state.xp") == 41, await p2.evaluate("Store.state.xp"))
    await p2.evaluate("Game.award(10)"); await no_dialogs(p2)
    r2 = await p2.evaluate("Sync.now()"); k2 = await p2.evaluate(cfg)
    check("backup: the second phone saves on top", r2 in ("saved", "same") and k2.get("rev", 0) >= 2, (r2, k2))  # the start-up save may add one more  # "same" when the start-up save got there first
    # the first phone must not overwrite it silently
    await p1.evaluate("Game.award(5)"); await no_dialogs(p1)
    r1 = await p1.evaluate("Sync.now()")
    check("backup: the first phone is told about the newer copy", r1 == "conflict", (r1, await p1.evaluate(cfg), await p2.evaluate(cfg)))
    await go(p1, "#/", 300); await go(p1, "#/me", 500); await p1.evaluate(opened)
    check("backup: Me asks which copy to keep", await p1.locator("#y-take").count() == 1 and await p1.locator("#y-keep").count() == 1)
    await p1.click("#y-take"); await p1.wait_for_timeout(900)
    check("backup: 'Use the cloud copy' loads it", await p1.evaluate("Store.state.xp") == 51, await p1.evaluate("Store.state.xp"))
    await go(p1, "#/me", 500); await p1.evaluate(opened)
    await p1.click("#y-off"); await p1.wait_for_timeout(600)
    check("backup: turning off (and deleting) stops saving", await p1.evaluate("Sync.now()") == "off" and "code" not in await p1.evaluate(cfg))
    gone = await p2.evaluate("AI.call('sync_get',{code:%s}).then(r=>r.error)" % json.dumps(c["code"]))
    check("backup: the deleted copy is gone from the server", gone == "no_backup", gone)
    await c1.close(); await c2.close()


async def t_coach(b):
    today = datetime.date.today(); mon = today - datetime.timedelta(days=today.weekday()); iso = lambda d: d.isoformat()
    log = {iso(today - datetime.timedelta(days=i)): 30 for i in range(1, 12) if i not in (3, 4)}
    # made on Friday of last week: Home keeps a plan for 9 days, so this holds on every weekday the tests run
    old = {"w": iso(mon - datetime.timedelta(days=7)), "d": iso(mon - datetime.timedelta(days=3)), "base": {"skills": {"measure": 20}, "cards": 0, "mocks": 0},
           "actions": [{"text": "Do measure words", "minutes": 10, "skill": "measure"}, {"text": "Take one mock exam", "minutes": 30, "skill": "mock"}]}
    state = {"settings": settings(), "srs": {}, "log": log, "xp": 270, "skills": {"measure": {"r": 30, "w": 10}}, "coachLog": [old],
             "weekly": {"cur": {"start": iso(mon), "skills": {}, "cards": 0, "fc": None}}}
    ctx, pg = await open_app(b, state, ai=True)
    sm = await pg.evaluate("Sync.summary()")
    check("summary: study days and the longest gap come from the saved history", sm["active28"] == 9 and sm["longestGap"] == 2 and sm["minutes"] is None, sm)
    check("coach plan: last week's plan is on Home straight away", await pg.locator("#coach-plan li").count() == 2 and await pg.locator("#coach-plan li.done").count() == 1)
    await pg.wait_for_function("Store.state.coachLog.length === 2", timeout=20000); await pg.wait_for_timeout(300)
    lg = await pg.evaluate("Store.state.coachLog")
    check("coach: runs by itself once a week and keeps the advice", len(lg) == 2 and lg[1]["w"] == iso(mon) and len(lg[1]["actions"]) >= 1, lg)
    saved = await pg.evaluate("JSON.parse(localStorage.getItem('cbChinese.ai.weekly')).res.result")
    check("coach: was told which of last week's actions were done", saved.get("follow_up") == "Done: 1 of 2.", saved.get("follow_up"))
    check("coach plan: on Home with a button per action", await pg.locator("#coach-plan li").count() == len(lg[1]["actions"]) and await pg.locator("#coach-plan li a.btn").count() == len(lg[1]["actions"]))
    sk = lg[1]["actions"][0]["skill"]
    await pg.evaluate("for(let i=0;i<10;i++)Learn.record('t:'+i,{skill:%s,statsOnly:true},true)" % json.dumps(sk))
    await go(pg, "#/me", 300); await go(pg, "#/", 600)
    check("coach plan: an action is ticked after 10 answers in that skill", await pg.locator("#coach-plan li.done").count() >= 1)
    await pg.evaluate("Game.award(5)"); await no_dialogs(pg)
    e = await pg.evaluate("Store.state.slog[Store.today()]")
    check("study log: a session, its minutes and answers per skill are recorded", e and e["s"] == 1 and e["m"] >= 1 and e["k"].get(sk, [0])[0] == 10, e)
    await pg.reload(); await pg.wait_for_timeout(6000)
    check("coach: not asked again in the same week", len(await pg.evaluate("Store.state.coachLog")) == 2)
    await ctx.close()


async def t_track(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await go(pg, "#/track", 1500)
    check("track: 24 weeks listed", await pg.locator("a[href^='#/track/']").count() == 24)
    done = 0
    for w in range(1, 25):
        for s in range(1, 4):
            await go(pg, "#/track/%d/%d" % (w, s), 350)
            await no_dialogs(pg)
            if await pg.locator("#tk-done").count():
                await pg.click("#tk-done")
            else:
                if await pg.locator("#tk-quiz").count(): await pg.click("#tk-quiz")
                guard = 0
                while await pg.locator("#tk-q .opt").count() and guard < 30:
                    await no_dialogs(pg)
                    await pg.locator("#tk-q .opt").first.click(); await pg.wait_for_selector("#tk-next")
                    await pg.click("#tk-next"); guard += 1; await pg.wait_for_timeout(50)
            try:
                await pg.wait_for_selector("#tk-end .ai-card", timeout=5000); done += 1
            except Exception:
                pass
    check("track: all 72 sessions can be finished and are saved", done == 72 and await pg.evaluate("Object.keys(Store.state.track).length") == 72, done)
    await ctx.close()


async def t_reader(b):
    ctx, pg = await open_app(b, {"settings": settings(showPinyin=False), "srs": {}})
    await go(pg, "#/read", 600)
    await pg.click("#rd-sample"); await pg.wait_for_timeout(400)
    check("reader: course words are recognised without the dictionary", await pg.locator(".rw.c").count() > 10 and await pg.locator(".rw.d").count() == 0)
    await pg.locator(".rw.c").first.click(); await pg.wait_for_selector(".wsheet")
    check("reader: tapping a course word opens its word sheet", await pg.locator(".wsheet .ws-mean").count() >= 1)
    await pg.click("[data-close]"); await pg.wait_for_timeout(400)
    await pg.click("#rd-dl"); await pg.wait_for_selector(".rw.d", timeout=30000)
    words = await pg.evaluate("[...document.querySelectorAll('.rw')].map(e=>e.textContent)")
    check("reader: the dictionary adds more words and removes its download card", await pg.locator(".rd-dl").count() == 0 and "社会保险" in words, words[:12])
    check("reader: the split keeps 人力资源 together", "人力资源" in words and "联系" in words, words[-8:])
    await pg.check("#rd-pyt"); await pg.wait_for_timeout(300)
    check("reader: pinyin can be shown above the words", await pg.locator(".rd-text rt").count() > 10)
    n0 = await pg.evaluate("Store.state.custom.length")
    await pg.locator(".rw.d").first.click(); await pg.wait_for_selector("#rt-save")
    await pg.click("#rt-save"); await pg.wait_for_timeout(400)
    saved = await pg.evaluate("Store.state.custom.slice(-1)[0]")
    check("reader: a dictionary word can be saved to My words and review", await pg.evaluate("Store.state.custom.length") == n0 + 1 and saved["pinyin"] and saved["en"] and await pg.evaluate("!!Store.state.srs['%s']" % saved["id"]), saved)
    await ctx.close()


async def t_a11y(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await go(pg, "#/games", 500)
    check("navigation: focus moves to the new screen and the page title follows", await pg.evaluate("document.activeElement&&document.activeElement.id") == "app" and (await pg.title()).startswith("Games"), await pg.title())
    await go(pg, "#/day/1", 900)
    check("lesson: Chinese text is tagged as Chinese", await pg.evaluate("(()=>{const l=[...document.querySelectorAll('#app .zh')];return l.length>5&&l.every(e=>e.lang==='zh-CN')})()"))
    await pg.focus("#btn-flag"); await pg.click("#btn-flag"); await pg.wait_for_selector(".modal-wrap.report"); await pg.wait_for_timeout(200)
    check("dialog: focus moves inside", await pg.evaluate("document.querySelector('.modal-wrap .modal').contains(document.activeElement)"))
    inside = True
    for _ in range(8):
        await pg.keyboard.press("Tab")
        inside = inside and await pg.evaluate("document.querySelector('.modal-wrap .modal').contains(document.activeElement)")
    check("dialog: Tab stays inside", inside)
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(500)
    check("dialog: Escape closes it and focus returns to the button", await pg.locator(".modal-wrap").count() == 0 and await pg.evaluate("document.activeElement&&document.activeElement.id") == "btn-flag")
    await ctx.close()


async def t_crash(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, expect_errors=True)
    await pg.evaluate("()=>{Games.hub=function(){throw new Error('boom in games')}}")
    await go(pg, "#/games", 500)
    txt = await pg.inner_text("#app")
    check("crash: a broken screen shows a way out", "Something broke" in txt and await pg.locator("#crash-reload").count() == 1 and await pg.locator(".crash a[href='#/']").count() == 1, txt[:120])
    check("crash: the error is saved under Problem reports", await pg.evaluate("Store.state.reports.some(r=>/boom in games/.test(r.text))"))
    await go(pg, "#/", 600)
    check("crash: Home still works afterwards", await pg.locator(".quests").count() == 1)
    await pg.evaluate("(()=>{const x=document.createElement('button');x.id='bad-btn';x.onclick=()=>{throw new Error('boom in a button')};document.getElementById('app').appendChild(x)})()")
    await pg.evaluate("document.getElementById('bad-btn').click()"); await pg.wait_for_timeout(300)
    check("crash: an error in a button shows the reload bar, not a blank screen", await pg.locator("#crash-bar").count() == 1 and await pg.locator(".quests").count() == 1)
    await ctx.close()


async def t_contrast(b):
    screens = [("home", "#/"), ("learn", "#/learn"), ("lesson", "#/day/1"), ("orange lesson", "#/day/16"), ("games", "#/games"), ("review", "#/review"), ("me", "#/me"),
               ("plan", "#/plan"), ("ready", "#/ready"), ("reader", "#/read"), ("quiz", "#/day/1/quiz"),
               # screens added with HSK 5, the extra HSK 4 words and the two new games
               ("hsk5 words", "#/learn/h5"), ("hsk5 pack", "#/pack/h5/1"), ("hsk5 grammar", "#/grammar/h5"), ("hsk5 grammar point", "#/grammar/h5g01"), ("hsk5 practice", "#/learn/h5p"),
               ("hsk5 game", "#/game/confuse/h5"), ("grammar list", "#/grammar"), ("hsk words", "#/learn/core"), ("extra words", "#/learn/extra"), ("extra pack", "#/pack/x4/1"),
               ("families", "#/families"), ("lesson words with phrases", "#/day/1/words"), ("word bank", "#/game/bank"), ("arrange the words", "#/game/wordorder")]
    mocks = [{"id": 1, "date": day(-2), "mode": "exam", "total": 188, "sections": {"listening": 52, "reading": 74, "writing": 62}}]
    for theme in ("light", "dark"):
        ctx, pg = await open_app(b, {"settings": settings(theme=theme), "srs": {}, "skills": {"listen-word": {"r": 10, "w": 14}}, "mockHistory": mocks})
        await pg.wait_for_timeout(800)
        bad = {}
        for name, h in screens:
            await go(pg, h, 700)
            if name == "me": await pg.evaluate("document.querySelectorAll('#app details').forEach(d=>d.open=true)")
            if name == "reader": await pg.click("#rd-sample"); await pg.wait_for_timeout(300)
            if name in ("hsk5 words", "extra words"): await pg.wait_for_selector(".daycard[href^='#/pack/']", timeout=15000)
            if name == "families": await pg.locator("details.fam summary").first.click(); await pg.wait_for_timeout(150)
            if name == "lesson words with phrases": await pg.wait_for_selector(".wx-b", timeout=10000); await pg.evaluate("document.querySelectorAll('#app details').forEach(d=>d.open=true)")
            if name in ("hsk5 game", "word bank"):  # the answer screen as well: explanation, used words, report link
                first = await pg.evaluate(CONTRAST_JS)
                if first: bad[name + " question"] = first[:4]
                await pg.locator(".opt").first.click(); await pg.wait_for_timeout(150)
                if name == "word bank": await pg.click("#qnext"); await pg.wait_for_timeout(200)
            if name == "arrange the words":
                for k in range(await pg.locator("#pool .piece").count()): await pg.locator("#pool .piece").nth(k).click()
                await pg.click("#chk"); await pg.wait_for_timeout(150)
            if name == "games":  # the daily-challenge card changes colour by day; check it in every colour, starting with today's
                for cls in ("", "g-sun", "g-coral", "g-teal", "g-blue", "g-violet", "g-boss"):
                    if cls: await pg.evaluate("c=>{const e=document.querySelector('.gfeat');e.className=e.className.replace(/g-[a-z]+/,c)}", cls)
                    f = await pg.evaluate(CONTRAST_JS)
                    if f: bad["games " + (cls or "today")] = f[:4]
                continue
            faint = await pg.evaluate(CONTRAST_JS)
            if faint: bad[name] = faint[:4]
        check("contrast: no faint text in the %s theme" % theme, not bad, bad)
        await ctx.close()


def pack_urls(urls):
    """Requests for the optional content packs (HSK 5, extra HSK 4 words)."""
    return [u.rsplit("/", 1)[-1] for u in urls if "/data/hsk5" in u or "/data/hsk4x" in u]


async def t_hsk5(b):
    urls = []
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, watch=urls)
    await pg.wait_for_timeout(9000)  # past the idle loaders (lesson data, mocks, track)
    check("first load: no HSK 5 or extra-word file is requested", not pack_urls(urls) and any("/data/full.js" in u for u in urls), pack_urls(urls))
    await go(pg, "#/learn", 900)
    check("learn: the level switch shows HSK 4 by default", await pg.locator(".lvl-sw [data-level]").count() == 2 and await pg.locator(".lvl-sw [aria-pressed='true']").get_attribute("data-level") == "4" and await pg.locator(".pnode").count() == 90)
    check("learn (HSK 4): still no pack file requested", not pack_urls(urls), pack_urls(urls))
    await pg.click(".lvl-sw [data-level='5']"); await pg.wait_for_selector(".daycard", timeout=15000)
    txt = await pg.inner_text("#app")
    check("HSK 5: the switch opens 62 word packs and the choice is saved", await pg.locator(".daycard").count() == 62 and await pg.evaluate("Store.state.settings.level") == 5 and await pg.locator(".lvl-sw [aria-pressed='true']").get_attribute("data-level") == "5")
    check("HSK 5: the honest note is shown", "HSK 5 content is new and not yet checked by a teacher. Use the flag button to report mistakes." in txt, txt[:200])
    check("HSK 5: its data was fetched only now, as one file", len(pack_urls(urls)) >= 1 and all(u.startswith("hsk5.") for u in pack_urls(urls)), pack_urls(urls))
    check("HSK 5: focus moved to the new screen", await pg.evaluate("document.activeElement&&document.activeElement.id") == "app")
    await pg.locator(".daycard").first.click(); await pg.wait_for_selector(".word.card")
    check("HSK 5 pack: 20 word cards with a report link each", await pg.evaluate("location.hash") == "#/pack/h5/1" and await pg.locator(".word.card").count() == 20 and await pg.locator(".word.card .w-flag").count() == 20)
    check("HSK 5 pack: Chinese text is tagged as Chinese", await pg.evaluate("(()=>{const l=[...document.querySelectorAll('#app .zh, #app .hz')];return l.length>30&&l.every(e=>e.lang==='zh-CN')})()"))
    card = await pg.locator(".word.card").first.inner_text()
    check("HSK 5 pack: a card shows hanzi, pinyin, meaning, level and an example", "哎" in card and "āi" in card and "HSK 5" in card and "哎，你怎么现在才来？" in card, card[:200])
    await pg.locator(".word.card .w-flag").first.click(); await pg.wait_for_selector(".modal-wrap.report"); await pg.wait_for_timeout(200)
    check("HSK 5 pack: the report link opens the report dialog with focus inside", await pg.evaluate("document.querySelector('.modal-wrap .modal').contains(document.activeElement)"))
    await pg.fill("#rp-text", "test note"); await pg.click("#rp-save"); await pg.wait_for_timeout(500)
    check("HSK 5 pack: the report is saved with the screen", await pg.evaluate("Store.state.reports.length") == 1 and await pg.evaluate("Store.state.reports[0].route") == "#/pack/h5/1")
    await no_dialogs(pg)
    await pg.click("#add-all"); await pg.wait_for_timeout(500); await no_dialogs(pg)
    ids = await pg.evaluate("Object.keys(Store.state.srs)")
    check("HSK 5 pack: 'Add to review' puts its 20 words in spaced review", len(ids) == 20 and all(i.startswith("h5-") for i in ids) and "All in review" in await pg.inner_text("#app"), ids[:3])
    check("HSK 5 words count in the due badge", await pg.inner_text("#due-badge") == "20")
    await go(pg, "#/review", 700)
    check("review: the HSK 5 words are due", "20 words due" in await pg.inner_text("#app"))
    await pg.click("#start"); await pg.wait_for_selector("#card")
    check("review: an HSK 5 card is shown", await pg.evaluate("/^[\u3400-\u9fff]+$/.test(document.querySelector('#card .hz').textContent)"))
    await go(pg, "#/search", 500); await pg.fill("#q", "爱护"); await pg.wait_for_timeout(400)
    hit = await pg.locator("#results .wl-row a").first.get_attribute("href")
    check("search: an HSK 5 word is found and links to its pack", hit == "#/pack/h5/1" and "HSK 5 pack 1" in await pg.inner_text("#results"), hit)
    await go(pg, "#/read", 600); await pg.fill("#rd-in", "我们要爱护公司的设备。"); await pg.click("#rd-go"); await pg.wait_for_timeout(300)
    check("reader: an HSK 5 word counts as a course word", await pg.evaluate("[...document.querySelectorAll('.rw.c')].some(e=>e.textContent.indexOf('爱护')>=0)"))
    await go(pg, "#/pack/h5/1", 600); await pg.click("#pack-quiz"); await pg.wait_for_selector(".opts")
    for _ in range(10):
        await pg.locator(".opt").first.click(); await pg.click("#qnext"); await pg.wait_for_timeout(120)
    await pg.wait_for_selector(".result"); await no_dialogs(pg)
    rec = await pg.evaluate("Store.state.packs['h5-1']"); sk = await pg.evaluate("Object.keys(Store.state.skills)")
    check("HSK 5 pack quiz: 10 questions, the result is kept with the pack", bool(rec) and rec.get("p") == 1 and "/ 10" in await pg.inner_text(".result") and await pg.locator(".result a[href='#/pack/h5/1']").count() == 1, rec)
    check("HSK 5 answers are counted under their own skill", sk == ["h5-vocab"], sk)
    check("HSK 5 answers do not feed the HSK 4 readiness estimate", await pg.evaluate("Sync.summary().progress.ready") is None)
    await pg.evaluate("Store.state.packs['h5-1'].b=9;Store.save()")
    await pg.reload(); await pg.wait_for_selector("#app > *:not(.skel)"); await go(pg, "#/learn", 300); await pg.wait_for_selector(".daycard", timeout=15000)
    first = await pg.locator(".daycard").first.inner_text()
    check("after a reload Learn opens HSK 5 again, with the pack's progress", await pg.locator(".daycard").count() == 62 and "20/20 in review" in first and "quiz 9/10" in first and await pg.locator(".daycard.done").count() == 1, first)
    await pg.click(".lvl-sw [data-level='4']"); await pg.wait_for_selector(".pnode")
    check("the switch goes back to HSK 4 and remembers it", await pg.evaluate("Store.state.settings.level") == 4 and await pg.locator(".pnode").count() == 90)
    await ctx.close()


async def t_grammar5(b):
    gr = {"g01": {"best": 5, "passes": 1, "mastered": True}, "h5g01": {"best": 4, "passes": 1, "mastered": False}, "zz9": {"best": 5, "passes": 1, "mastered": True}}
    ctx, pg = await open_app(b, {"settings": settings(level=5, h5=True), "srs": {}, "grammar": gr})
    keys = sorted(await pg.evaluate("Object.keys(Store.state.grammar)"))
    check("saved progress: HSK 4 and HSK 5 grammar ids are kept, anything else is dropped", keys == ["g01", "h5g01"], keys)
    await go(pg, "#/grammar", 900)
    check("HSK 4 grammar: 70 points with a filter", await pg.locator(".gitem").count() == 70 and await pg.locator("#g-q").count() == 1 and await pg.locator(".lvl-sw [aria-pressed='true']").get_attribute("data-level") == "4")
    await pg.fill("#g-q", "把"); await pg.wait_for_timeout(200)
    n = await pg.locator(".gitem:not([hidden])").count()
    check("grammar filter: typing narrows the list and says how many are left", 0 < n < 20 and ("%d of 70" % n) in await pg.inner_text("#g-count"), n)
    await pg.fill("#g-q", "so sanh"); await pg.wait_for_timeout(200)
    check("grammar filter: Vietnamese without accents works", await pg.locator(".gitem:not([hidden])").count() >= 1)
    await pg.fill("#g-q", ""); await pg.click("[data-gf='done']"); await pg.wait_for_timeout(200)
    check("grammar filter: 'Mastered' shows only mastered points", await pg.locator(".gitem:not([hidden])").count() == 1 and await pg.locator("[data-gf='done']").get_attribute("aria-pressed") == "true")
    await pg.click("[data-gf='all']")
    await go(pg, "#/grammar/h5", 300); await pg.wait_for_selector(".gitem", timeout=15000)
    txt = await pg.inner_text("#app")
    check("HSK 5 grammar: 42 points, the note, and saved progress", await pg.locator(".gitem").count() == 42 and "not yet checked by a teacher" in txt and "Best 4/5" in await pg.locator(".gitem").first.inner_text() and "HSK 5 grammar checklist" in txt)
    await pg.locator(".gitem").nth(1).click(); await pg.wait_for_selector(".gpat")
    check("HSK 5 grammar point: pattern, two examples, Chinese tagged", await pg.evaluate("location.hash") == "#/grammar/h5g02" and await pg.locator(".w-ex").count() == 2 and await pg.evaluate("[...document.querySelectorAll('#app .zh')].every(e=>e.lang==='zh-CN')") and "hsk 5 grammar 2/42" in (await pg.inner_text("#app")).lower())
    await pg.click("a[href='#/grammar/h5g02/practice']"); await pg.wait_for_selector(".opts")
    ref = await pg.evaluate("(Content.locate(document.getElementById('app').innerText)[0]||{}).ref")
    check("HSK 5 grammar question: a problem report finds the item", bool(ref) and ref.startswith("gq:h5g02:") and await pg.evaluate("!!Content.resolve('grammar:h5g01')&&!!Content.snapshot(%s)" % json.dumps(ref)), ref)
    for _ in range(5):
        k = await pg.evaluate("(()=>{const q=document.querySelector('#qcard .q').textContent;return CB_HSK5_GRAMMAR[1].quiz.find(x=>x.q===q).answer})()")
        await pg.click(".opt[data-k='%d']" % k); await pg.click("#qnext"); await pg.wait_for_timeout(120)
    await pg.wait_for_selector(".result"); await no_dialogs(pg)
    st = await pg.evaluate("Store.state.grammar.h5g02"); sk = await pg.evaluate("Object.keys(Store.state.skills)")
    check("HSK 5 grammar: 5/5 masters the point, counted under its own skill", st.get("mastered") and st.get("best") == 5 and sk == ["h5-grammar"] and "5 / 5" in await pg.inner_text(".result"), (st, sk))
    check("HSK 5 grammar: the result links back to the HSK 5 checklist", await pg.locator(".result a[href='#/grammar/h5']").count() == 1)
    await pg.reload(); await pg.wait_for_selector("#app > *:not(.skel)")
    st = await pg.evaluate("Store.state.grammar.h5g02")
    check("HSK 5 grammar progress survives a reload", bool(st) and st.get("mastered") is True, st)
    await go(pg, "#/grammar/h5", 300); await pg.wait_for_selector(".gitem", timeout=15000)
    check("HSK 5 grammar: the list shows the mastered point", await pg.locator(".gitem.done").count() == 1)
    await ctx.close()


ZH_TAGGED = "(()=>{const l=[...document.querySelectorAll('#app .zh, #app .hz')];return l.length>0&&l.every(e=>e.lang==='zh-CN')})()"


async def t_practice5(b):
    ctx, pg = await open_app(b, {"settings": settings(level=5, h5=True), "srs": {}})
    await go(pg, "#/learn/h5p", 300); await pg.wait_for_selector(".grow", timeout=15000)
    txt = await pg.inner_text("#app")
    check("HSK 5 practice: four games listed with the note", await pg.locator(".grow").count() == 4 and "not yet checked by a teacher" in txt and "96 questions" in txt and "110 questions" in txt, txt[:300])
    await pg.locator(".grow").first.click(); await pg.wait_for_selector(".opts")
    check("HSK 5 practice: the game opens on the HSK 5 set", await pg.evaluate("location.hash") == "#/game/confuse/h5" and "HSK 5 · Confusable Words" in await pg.inner_text(".ghead"))
    for i in range(10):
        ans = await pg.evaluate("(()=>{const q=document.querySelector('#qcard .q').textContent;const it=CB_HSK5_DRILLS.confuse.find(x=>x.q===q);return it?it.answer:null})()")
        if i == 0:
            check("HSK 5 round: the question comes from the HSK 5 data and its Chinese is tagged", ans is not None and await pg.evaluate(ZH_TAGGED))
        await pg.click(".opt[data-k='%s']" % ans)
        if i == 0:
            ref = await pg.locator("#qfb .w-flag").get_attribute("data-flag")
            check("HSK 5 round: the answer has a report link that resolves", bool(ref) and ref.startswith("drill:h5c") and await pg.evaluate("!!Content.resolve(%s)&&!!Content.snapshot(%s)" % (json.dumps(ref), json.dumps(ref))), ref)
        await pg.click("#qnext"); await pg.wait_for_timeout(120)
    await pg.wait_for_selector(".result"); await no_dialogs(pg)
    gs = await pg.evaluate("Store.state.games"); sk = await pg.evaluate("Object.keys(Store.state.skills)")
    check("HSK 5 round: score and plays are kept apart from HSK 4", gs.get("confuse5") == {"best": 10, "plays": 1} and "confuse" not in gs, gs)
    check("HSK 5 round: counted under an HSK 5 skill, with XP for the daily goal", sk == ["h5-confusable"] and await pg.evaluate("Store.state.xp") == 20 and await pg.evaluate("Store.state.log[Store.today()]") == 20, sk)
    check("HSK 5 round: readiness for the HSK 4 exam is untouched", await pg.evaluate("Sync.summary().progress.ready") is None and await pg.evaluate("Sync.summary().trend.length") == 0)
    check("HSK 5 round: the result leads back to HSK 5 practice", await pg.locator(".result a[href='#/learn/h5p']").count() == 1 and await pg.locator("#again").get_attribute("href") == "#/game/confuse/h5")
    await go(pg, "#/game/order/h5", 300); await pg.wait_for_selector(".opts")
    it = await pg.evaluate("(()=>{const a=document.querySelector('.abc .zh').textContent;return CB_HSK5_DRILLS.order.find(x=>x.parts.A===a)})()")
    await pg.click(".opt[data-k='%s']" % it["answer"])
    check("HSK 5 sentence order: the answer shows the full sentence with its full stop", it["zh"] in await pg.inner_text("#qfb"), await pg.inner_text("#qfb"))
    await go(pg, "#/game/measure/h5", 300); await pg.wait_for_selector(".opts")
    check("HSK 5 measure words: four options", await pg.locator(".opt").count() == 4)
    await go(pg, "#/game/picture/h5", 300); await pg.wait_for_selector("#pw")
    check("HSK 5 picture writing opens", await pg.locator("#pw-check").count() == 1)
    await go(pg, "#/learn/h5p", 500)
    check("HSK 5 practice: the list shows the best score", "Best 10" in await pg.locator(".grow").first.inner_text())
    await go(pg, "#/game/confuse", 600); await pg.wait_for_selector(".opts")
    ans = await pg.evaluate("(()=>{const q=document.querySelector('#qcard .q').textContent;const it=CB_DRILLS.confuse.find(x=>x.q===q);return it?it.answer:null})()")
    await pg.click(".opt[data-k='%s']" % ans)
    check("HSK 4 game is unchanged: HSK 4 data, HSK 4 skill, no extra report link", ans is not None and "confusable" in await pg.evaluate("Object.keys(Store.state.skills)") and await pg.locator("#qfb .w-flag").count() == 0)
    await ctx.close()


def order_for(tokens, target):
    """Indexes of the tokens in the order that spells target."""
    for perm in itertools.permutations(range(len(tokens))):
        if "".join(tokens[i] for i in perm) == target: return list(perm)
    return None


async def t_newgames(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await go(pg, "#/games", 600)
    check("games: Word Bank and Arrange the Words are listed", await pg.locator(".grow[href='#/game/bank']").count() == 1 and await pg.locator(".grow[href='#/game/wordorder']").count() == 1)
    # --- arrange the words: one wrong answer, then right ones (an 'alt' order when the item has one)
    await pg.click(".grow[href='#/game/wordorder']"); await pg.wait_for_selector("#pool .piece")
    check("arrange the words: Chinese is tagged and focus is on the screen", await pg.evaluate(ZH_TAGGED) and await pg.evaluate("document.activeElement&&document.activeElement.id") == "app")
    used_alt = False; wrong_id = None
    for i in range(8):
        pieces = await pg.evaluate("[...document.querySelectorAll('#pool .piece')].map(e=>e.textContent)")
        it = await pg.evaluate("p=>CB_DRILLS_EXTRA.wordorder.find(x=>x.tokens.slice().sort().join('|')===p.slice().sort().join('|'))", pieces)
        if i == 0:
            check("arrange the words: tokens are shuffled", it is not None and pieces != it["tokens"], pieces)
            target = "".join(reversed(it["tokens"])); wrong_id = it["id"]
        elif it.get("alt"):
            target = it["alt"][0]; used_alt = True
        else:
            target = it["answer"]
        order = order_for(it["tokens"], target) or list(range(len(it["tokens"])))
        taken = []
        for k in order:  # tap the piece that carries this token (the same text can appear twice)
            idx = next(j for j, t in enumerate(pieces) if t == it["tokens"][k] and j not in taken); taken.append(idx)
            await pg.locator("#pool .piece").nth(idx).click()
        if i == 0:
            check("arrange the words: Check unlocks when every word is placed", await pg.locator("#chk").is_enabled() and await pg.locator("#ans .piece").count() == len(pieces))
        await pg.click("#chk"); await pg.wait_for_timeout(100)
        fb = await pg.inner_text("#qfb")
        if i == 0:
            check("arrange the words: a wrong order shows the right sentence, the pattern and a report link", "Correct order" in fb and it["answer"] in fb and "Pattern" in fb and await pg.locator("#qfb .w-flag").get_attribute("data-flag") == "drill:" + it["id"], fb[:200])
        elif not fb.startswith("✓"):
            check("arrange the words: answer accepted (%s)" % it["id"], False, fb[:120])
        await pg.click("#chk"); await pg.wait_for_timeout(120)
    await pg.wait_for_selector(".result"); await no_dialogs(pg)
    st = await pg.evaluate("Store.state"); 
    check("arrange the words: a full round is scored 7 of 8, with XP", st["games"].get("wordorder") == {"best": 7, "plays": 1} and "7 / 8" in await pg.inner_text(".result") and st["xp"] == 14, st["games"])
    check("arrange the words: counts as word order, the miss goes to the notebook", st["skills"].get("word-order") == {"r": 7, "w": 1} and ("dr:wordorder:" + wrong_id) in st["mistakes"], st["skills"])
    alts = await pg.evaluate("CB_DRILLS_EXTRA.wordorder.filter(x=>x.alt&&x.alt.length).length")
    check("arrange the words: the data has items with a second correct order", alts > 0, alts)
    await go(pg, "#/mistakes/word-order", 900)
    check("notebook: the missed sentence can be practised again", await pg.locator("#pool .piece").count() >= 3)
    # an 'alt' order is accepted (always checked, whatever the shuffle picked above)
    ok = await pg.evaluate("""(()=>{const it=CB_DRILLS_EXTRA.wordorder.find(x=>x.alt&&x.alt.length);const q=Games._drillQ('wordorder',it);App.render(q.html,'game');let res=null;q.wire(v=>{res=v});
      const want=it.alt[0];let rest=want;const pool=[...document.querySelectorAll('#pool .piece')];
      const go=(s,usedIdx)=>{if(!s)return usedIdx;for(let j=0;j<pool.length;j++){if(usedIdx.indexOf(j)>=0)continue;const t=pool[j].textContent;if(s.indexOf(t)===0){const r=go(s.slice(t.length),usedIdx.concat([j]));if(r)return r;}}return null};
      const seq=go(want,[]);if(!seq)return 'no order';seq.forEach(j=>pool[j].click());document.getElementById('chk').click();const good=document.querySelector('#qfb .qexp').classList.contains('ok');document.getElementById('chk').click();return good&&res===true})()""")
    check("arrange the words: an 'alt' order is accepted", ok is True, ok)
    # --- word bank: two groups of five sentences
    await go(pg, "#/game/bank", 600); await pg.wait_for_selector(".opts.bank")
    check("word bank: six words to choose from, Chinese tagged", await pg.locator(".opts.bank .opt").count() == 6 and await pg.evaluate(ZH_TAGGED))
    seen_groups = []; used_ok = True
    for i in range(10):
        it = await pg.evaluate("(()=>{const q=document.querySelector('#qcard .q').textContent;for(const g of CB_DRILLS_EXTRA.bank){const x=g.items.find(y=>y.q===q);if(x)return {g:g.id,n:x.n,answer:x.answer}}return null})()")
        if it["g"] not in seen_groups: seen_groups.append(it["g"])
        nth = i % 5  # sentences already answered in this group
        used_ok = used_ok and await pg.locator(".opts.bank .opt.used").count() == nth and await pg.locator(".opts.bank .opt:disabled").count() == nth
        await pg.click(".opts.bank .opt[data-k='%d']" % it["answer"])
        if i == 0:
            ref = await pg.locator("#qfb .w-flag").get_attribute("data-flag")
            snap = await pg.evaluate("Content.snapshot(%s)" % json.dumps(ref))
            check("word bank: the report link names the sentence and carries the six words", ref == "drill:%s:%d" % (it["g"], it["n"]) and bool(snap) and len(snap.get("bank", [])) == 6 and snap.get("answer") == it["answer"], (ref, snap))
        await pg.click("#qnext"); await pg.wait_for_timeout(120)
    await pg.wait_for_selector(".result"); await no_dialogs(pg)
    st = await pg.evaluate("Store.state")
    check("word bank: words already used in a group are crossed out", used_ok and len(seen_groups) == 2, seen_groups)
    check("word bank: a full round of 10 is scored, with XP", st["games"].get("bank") == {"best": 10, "plays": 1} and "10 / 10" in await pg.inner_text(".result"), st["games"])
    check("word bank: counts as choosing the right word", st["skills"].get("fill-word") == {"r": 10, "w": 0}, st["skills"])
    await go(pg, "#/games", 500)
    check("games: both new games show their best score", "Best 10" in await pg.locator(".grow[href='#/game/bank']").inner_text() and "Best 7" in await pg.locator(".grow[href='#/game/wordorder']").inner_text())
    await ctx.close()


async def t_extras(b):
    urls = []
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, watch=urls)
    await go(pg, "#/learn/core", 900)
    check("HSK words: links to the extra HSK 4 words and to word families", await pg.locator(".more-words a[href='#/learn/extra']").count() == 1 and await pg.locator(".more-words a[href='#/families']").count() == 1 and not pack_urls(urls), pack_urls(urls))
    await pg.click(".more-words a[href='#/learn/extra']"); await pg.wait_for_selector(".daycard[href^='#/pack/x4']", timeout=15000)
    txt = await pg.inner_text("#app")
    check("extra HSK 4 words: 91 words in 5 packs, loaded on demand as one file", await pg.locator(".daycard").count() == 5 and "91 official" in txt and "not yet checked by a teacher" in txt and len(pack_urls(urls)) >= 1 and all(u.startswith("hsk4x.") for u in pack_urls(urls)), (txt[:120], pack_urls(urls)))
    await pg.locator(".daycard").first.click(); await pg.wait_for_selector(".word.card")
    card = await pg.locator(".word.card").first.inner_text()
    check("extra pack: the same pack screen, with level badge, phrase, example and report link", await pg.evaluate("location.hash") == "#/pack/x4/1" and await pg.locator(".word.card").count() == 20 and await pg.locator(".w-flag").count() == 20 and "饭馆" in card and "HSK 1" in card and "一家饭馆" in card, card[:200])
    check("extra pack: Chinese is tagged, focus is on the screen", await pg.evaluate(ZH_TAGGED) and await pg.evaluate("document.activeElement&&document.activeElement.id") == "app")
    await pg.click("#add-all"); await pg.wait_for_timeout(500); await no_dialogs(pg)
    ids = await pg.evaluate("Object.keys(Store.state.srs)")
    check("extra pack: its words go into spaced review", len(ids) == 20 and all(i.startswith("x4-") for i in ids), ids[:3])
    await go(pg, "#/search", 500)
    check("search: a link to word families", await pg.locator("#results a[href='#/families']").count() == 1)
    await pg.fill("#q", "饭馆"); await pg.wait_for_timeout(400)
    check("search: an extra word is found and links to its pack", await pg.locator("#results .wl-row a").first.get_attribute("href") == "#/pack/x4/1")
    await go(pg, "#/game/quick/p-x4-1", 700)
    check("extra pack: its quiz starts", await pg.locator(".opts .opt").count() == 4)
    # common phrases on a lesson word card and on a core-deck card
    await go(pg, "#/day/1/words", 900); await pg.wait_for_selector("#w-d01-01 .wx-b", timeout=10000)
    card = await pg.locator("#w-d01-01").inner_text()
    dup = await pg.evaluate("(()=>{const l=[...document.querySelectorAll('#w-d01-01 .coll .zh')].map(e=>e.textContent);return l.length!==new Set(l).size})()")
    check("lesson word card: a 'Common phrases' block from the extra data, without repeats", "COMMON PHRASES" in card.upper() and "发工资" in card and not dup, card[:300])
    core = await pg.evaluate("(()=>{const it=CB_HSK4X.filter(p=>p.kind==='collocations').map(p=>p.items).flat().find(i=>i.src==='core');return {ref:it.ref,zh:it.phrases[0].zh,set:App.WORDMAP[it.ref]._set}})()")
    await go(pg, "#/core/%d" % core["set"], 900)
    check("core word card: common phrases too", core["zh"] in await pg.locator("#w-" + core["ref"]).inner_text(), core)
    # opposites
    op = await pg.evaluate("(()=>{const it=CB_HSK4X.find(p=>p.kind==='opposites').items[0];return {a:it.a.ref,ah:it.a.hanzi,b:it.b.ref,bh:it.b.hanzi,set:App.WORDMAP[it.a.ref]._set}})()")
    await go(pg, "#/core/%d" % op["set"], 900)
    blk = await pg.locator("#w-%s .w-x" % op["a"]).inner_text()
    check("word card: its opposite is shown", "OPPOSITE" in blk.upper() and op["bh"] in blk, blk[:200])
    await pg.locator("#w-%s .w-x .wlink" % op["a"]).first.click(); await pg.wait_for_selector(".wsheet"); await pg.wait_for_timeout(250)
    sheet = await pg.inner_text(".wsheet")
    check("opposite: tapping it opens that word's sheet, which shows the pair from the other side", op["bh"] in await pg.inner_text(".wsheet .hz") and "OPPOSITE" in sheet.upper() and op["ah"] in sheet and await pg.evaluate("document.querySelector('.modal-wrap .modal').contains(document.activeElement)"), sheet[:200])
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(400)
    # families
    await go(pg, "#/families", 700)
    check("word families: 61 families, closed by default", await pg.locator("details.fam").count() == 61 and await pg.locator("details.fam[open]").count() == 0 and await pg.evaluate("document.activeElement&&document.activeElement.id") == "app")
    await pg.locator("details.fam summary").first.click(); await pg.wait_for_timeout(200)
    fam = await pg.locator("details.fam").first.inner_text()
    check("word families: opening one lists its words with pinyin, meaning and level", "经常" in fam and "jīngcháng" in fam and "HSK 3" in fam and await pg.evaluate(ZH_TAGGED), fam[:200])
    await pg.locator("details.fam .wlink").first.click(); await pg.wait_for_selector(".wsheet")
    check("word families: tapping a word opens its sheet", "经常" in await pg.inner_text(".wsheet .hz"))
    await ctx.close()


async def t_admin(b):
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await pg.evaluate("Game.award(40)"); await no_dialogs(pg)
    await pg.evaluate("Sync.now()")
    await pg.evaluate("localStorage.setItem('cbChinese.ai.admin','admin-code-12345')")
    before = await pg.evaluate("Content.admin('admin_stats',{}).then(r=>r.result)")
    await go(pg, "#/fixes", 400); await pg.wait_for_selector("#svc", timeout=10000)
    txt = await pg.inner_text("#svc")
    check("admin: the Service block shows AI calls against the cap, backups against the limit and reports waiting",
          ("AI calls today: %d/50" % before["ai"]["today"]) in txt and ("Phones with a backup: %d/20" % before["backups"]["n"]) in txt and "not saved for 3+ days: 0" in txt and ("Content reports waiting: %d" % before["reports"]["waiting"]) in txt, txt)
    check("admin: the Service block charts the last 14 days", await pg.locator("#svc svg.chart rect").count() == 14 and len(before["ai"]["days"]) == 14 and "last 14 days" in txt)
    faint = await pg.evaluate(CONTRAST_JS)
    await pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); await pg.wait_for_timeout(150)
    faint += await pg.evaluate(CONTRAST_JS)
    await pg.evaluate("document.documentElement.setAttribute('data-theme','light')")
    check("admin: the Service block is readable in both themes", not faint, faint[:4])
    # a waiting report and two AI calls later, and with every backup 5 days old
    await go(pg, "#/game/confuse", 700); await pg.wait_for_selector(".opts")
    st = await pg.evaluate("Content.report('drill:c01','the key looks wrong','#/game/confuse').then(r=>r.result&&r.result.status)")
    urllib.request.urlopen(AI_URL.replace("/ai", "/__stale")).read()
    await go(pg, "#/fixes", 400); await pg.wait_for_selector("#svc", timeout=10000)
    after = [await pg.inner_text("#svc-ai"), await pg.inner_text("#svc-rep"), await pg.inner_text("#svc-stale")]
    check("admin: the numbers follow what happens (2 more AI calls, 1 more report waiting, stale backups counted)",
          st in ("proposed", "needs_review") and after[0] == "%d/50" % (before["ai"]["today"] + 2) and after[1] == str(before["reports"]["waiting"] + 1) and int(after[2]) == before["backups"]["n"] >= 1, (st, after, before))
    await pg.click("[data-fxtab='learners']"); await pg.wait_for_selector(".lrn", timeout=10000)
    check("admin: the Service block stays on the Learners tab", await pg.locator("#svc").count() == 1)
    bad = await pg.evaluate("AI.call('admin_stats',{},{'x-admin-code':'wrong-code-000000'}).then(r=>r.error)")
    check("admin: the numbers need the reviewer code", bad == "bad_admin", bad)
    # an older server does not know the task: no block, everything else still works
    async def old_server(route):
        body = route.request.post_data or ""
        if '"admin_stats"' in body:
            await route.fulfill(status=400, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps({"ok": False, "error": "bad_task"}))
        else:
            await route.continue_()
    await ctx.route(AI_URL, old_server)
    await go(pg, "#/", 300); await go(pg, "#/fixes", 400); await pg.click("[data-fxtab='learners']"); await pg.wait_for_selector(".lrn", timeout=10000); await pg.wait_for_timeout(500)
    check("admin: with an older server there is no Service block and the screen still works", await pg.locator("#svc").count() == 0 and await pg.locator(".lrn").count() >= 1 and await pg.locator(".fx-tabs button").count() == 5)
    await pg.evaluate("AI.call('sync_delete',{code:Sync.cfg().code})")  # leave no backup behind for the other groups
    await ctx.close()


def heavy_state():
    """A learner who has used everything for a year: every log at its cap. The review deck is added in the page."""
    skills = ["vocab", "pinyin", "listen-word", "listen-tf", "listen-short", "listen-long", "listen-sentence", "quiz", "fill-word", "connectors", "passage", "word-order", "writing", "ordering",
              "confusable", "measure", "grammar", "typing", "handwriting", "h5-vocab", "h5-grammar", "h5-confusable", "h5-ordering", "h5-measure", "h5-writing"]
    s = {"settings": settings(level=5, h5=True), "srs": {}, "xp": 54000, "streak": {"count": 120, "last": day(0), "best": 120}, "freezes": 2}
    s["days"] = {str(i): {"quizBest": 9, "practice": {"matching": True, "fill": True, "translate": True}, "completed": True, "completedOn": day(-200 + i)} for i in range(1, 91)}
    for k in ("log", "sessions", "challenges", "questChest"):
        s[k] = {day(-i): (120 if k == "log" else True) for i in range(365)}
    s["slog"] = {day(-i): {"m": 35.5, "s": 2, "h": 20, "k": {k: [12, 3] for k in skills}} for i in range(56)}
    s["skills"] = {k: {"r": 1500, "w": 300} for k in skills}
    s["mlog"] = [{"d": day(-3), "k": "dr:confuse:h5c%03d" % (i % 96 + 1), "s": "h5-confusable"} for i in range(600)]
    s["mistakes"] = {"m:%d:L2-%d" % (i % 6 + 1, i): {"added": day(-40), "wrong": 2, "kind": "mock", "skill": "listen-short", "mock": i % 6 + 1, "item": "L2-%d" % i, "streak": 1, "last": day(-2)} for i in range(200)}
    s["mockHistory"] = [{"id": i % 6 + 1, "date": day(-60 + i), "mode": "exam", "strict": False, "total": 210, "sections": {"listening": 70, "reading": 72, "writing": 68}} for i in range(30)]
    s["grammar"] = {("g%02d" % i): {"best": 5, "passes": 2, "mastered": True} for i in range(1, 71)}
    s["grammar"].update({("h5g%02d" % i): {"best": 5, "passes": 2, "mastered": True} for i in range(1, 43)})
    s["packs"] = {("h5-%d" % i): {"b": 10, "p": 3} for i in range(1, 63)}
    s["games"] = {g: {"best": 99, "plays": 120} for g in "builder listen speed race boss quick drill write type confuse order picture coach measure bank wordorder confuse5 order5 picture5 measure5".split()}
    s["track"] = {"w%ds%d" % (w, b): True for w in range(1, 25) for b in range(1, 4)}
    s["reports"] = [{"id": "r%d" % i, "date": day(-9), "route": "#/game/confuse", "text": "t" * 120, "ctx": "c" * 300} for i in range(100)]
    s["custom"] = [{"id": "u%dabc" % i, "hanzi": "年终奖金", "pinyin": "niánzhōng jiǎngjīn", "vi": "thưởng cuối năm", "en": "year-end bonus", "example": {"zh": "今年的年终奖什么时候发？"}} for i in range(60)]
    return s


async def t_state(b):
    # what is new in saved progress survives export / import, and junk in an imported file is cleaned
    ctx, pg = await open_app(b, {"settings": settings(level=5, h5=True), "srs": {"h5-0001": {"box": 3, "due": day(2), "right": 4, "wrong": 1, "added": day(-9), "last": day(-2), "lapses": 1, "late": True}, "h5-0045": {"box": 1, "due": day(0), "right": 0, "wrong": 0, "added": day(0), "last": None}},
                                 "packs": {"h5-1": {"b": 9, "p": 2}, "h5-3": {"b": 4, "p": 1}, "x4-2": {"b": 10, "p": 1}}, "games": {"confuse5": {"best": 8, "plays": 3}, "bank": {"best": 10, "plays": 1}}, "grammar": {"h5g03": {"best": 5, "passes": 1, "mastered": True}}})
    await pg.wait_for_timeout(300)
    same = await pg.evaluate("(()=>{const pick=s=>JSON.stringify([s.settings.level,s.settings.h5,s.packs,s.games,s.grammar,s.srs]);const a=pick(Store.state);Store.importJSON(Store.serialize());return a===pick(Store.state)&&Store.state.settings.level===5&&Store.state.packs['h5-1'].b===9&&Store.state.games.confuse5.best===8})()")
    check("progress: level, pack results, HSK 5 scores and grammar survive export and import", same is True)
    hs = await pg.evaluate("Sync.summary().progress.hsk5")
    check("study summary: an hsk5 line with packs started / finished, words in review and grammar", hs == {"started": 2, "done": 1, "packs": 62, "words": 2, "grammar": 1}, hs)
    back = await pg.evaluate("(()=>{const before=JSON.parse(JSON.stringify(Store.state.srs));const c=Store.compact();const packed=Array.isArray(c.srs['h5-0001'])&&c.srs['h5-0045'].length===5;Store.importJSON(JSON.stringify({progress:c}));const a=Store.state.srs;return [packed,JSON.stringify(a['h5-0001'])===JSON.stringify(before['h5-0001']),a['h5-0045'].box===1&&a['h5-0045'].due===before['h5-0045'].due&&a['h5-0045'].last===null&&a['h5-0045'].added===before['h5-0045'].added]})()")
    check("cloud backup form: review cards are packed small and come back exactly", back == [True, True, True], back)
    junk = await pg.evaluate("(()=>{const p=JSON.parse(Store.serialize()).progress;p.settings.level='7';p.packs={'h5-1':{b:99,p:'x'},'evil':{b:1,p:1},'h5-2':'no'};p.games={'confuse5':{best:'9',plays:null},'<b>':{best:1,plays:1}};p.grammar={'h5g01':{best:5},'h5x':{best:5}};p.srs={'h5-0002':{box:99,due:'soon',right:'2',wrong:null},'bad':7};Store.importJSON(JSON.stringify({progress:p}));const s=Store.state;return [s.settings.level,s.packs,Object.keys(s.games),s.games.confuse5,Object.keys(s.grammar),s.srs['h5-0002'].box,s.srs['h5-0002'].due===Store.today(),s.srs['h5-0002'].right,'bad' in s.srs]})()")
    check("imported file: bad values in the new fields are cleaned", junk == [4, {"h5-1": {"b": 10, "p": 0}}, ["confuse5"], {"best": 9, "plays": 0}, ["h5g01"], 5, True, 2, False], junk)
    await ctx.close()
    # a year of heavy use with every word (HSK 4, extra and HSK 5) in review still fits in a cloud backup, and restores
    c1, p1 = await open_app(b, heavy_state(), ai=True)
    await go(p1, "#/learn/h5", 300); await p1.wait_for_selector(".daycard", timeout=15000)
    await go(p1, "#/learn/extra", 300); await p1.wait_for_selector(".daycard[href^='#/pack/x4']", timeout=15000)
    sizes = await p1.evaluate("""(()=>{const t=Store.today();App.WORDS.forEach((w,i)=>{Store.state.srs[w.id]={box:1+i%5,due:Store.addDays(t,i%16),right:3+i%20,wrong:i%4,added:Store.addDays(t,-30-i%200),last:Store.addDays(t,-i%9),late:i%7===0,lapses:i%4}});Store.save();
      const n=Object.keys(Store.state.srs).length;return {words:n,h5:Object.keys(Store.state.srs).filter(k=>k.indexOf('h5-')===0).length,plain:Store.serialize(false).length,compact:JSON.stringify(Store.compact()).length,srs:JSON.stringify(Store.compact().srs).length,saved:localStorage.getItem('cbChinese.progress.v1').length}})()""")
    print("    heavy user: %(words)d words in review (%(h5)d HSK 5) · plain %(plain)d chars · cloud backup %(compact)d chars (review deck %(srs)d) · on the phone %(saved)d" % sizes, flush=True)
    check("heavy user: every word is in review (3,000+, all 1,231 HSK 5 words)", sizes["words"] >= 3100 and sizes["h5"] == 1231, sizes)
    check("heavy user: the cloud backup stays under the server limit of 400,000 characters", sizes["compact"] < 360000 and sizes["plain"] > 400000, sizes)
    r = await p1.evaluate("Sync.now(true)"); cfg = await p1.evaluate("Sync.cfg()")
    check("heavy user: the server accepts the backup", r == "saved" and cfg.get("rev", 0) >= 1 and "err" not in cfg, (r, cfg))
    hs = await p1.evaluate("Sync.summary().progress.hsk5")
    check("heavy user: the study summary counts HSK 5", hs.get("started") == 62 and hs.get("done") == 62 and hs.get("words") == 1231 and hs.get("grammar") == 42, hs)
    await p1.evaluate("localStorage.setItem('cbChinese.ai.admin','admin-code-12345')")
    await go(p1, "#/fixes", 400); await p1.click("[data-fxtab='learners']"); await p1.wait_for_selector(".lrn-h5", timeout=10000)
    line = await p1.locator(".lrn-h5").first.inner_text()
    check("admin: the learner card shows the HSK 5 line", "HSK 5: 62/62 packs started, 62 finished" in line and "1231 words in review" in line and "42 grammar points mastered" in line, line)
    c2, p2 = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    got = await p2.evaluate("AI.call('sync_get',{code:%s}).then(r=>{Store.importJSON(JSON.stringify(r.result.data));const s=Store.state;return [Object.keys(s.srs).length,s.srs['h5-1231'],s.settings.level,Object.keys(s.packs).length,s.grammar.h5g42.mastered]})" % json.dumps(cfg["code"]))
    mine = await p1.evaluate("Store.state.srs['h5-1231']")
    check("heavy user: a second phone restores the whole deck from the compact backup", got[0] == sizes["words"] and {k: v for k, v in got[1].items() if v} == {k: v for k, v in mine.items() if v} and got[2:] == [5, 62, True], got)
    await p1.evaluate("AI.call('sync_delete',{code:Sync.cfg().code})")
    await c1.close(); await c2.close()


SW_READY = "navigator.serviceWorker&&navigator.serviceWorker.controller&&caches.open('cb-shell-test').then(c=>c.keys()).then(k=>k.length>20)"


async def sw_ready(pg):
    """Wait until the service worker controls the page and has stored the app shell."""
    for _ in range(80):
        if await pg.evaluate("Promise.resolve(%s).then(Boolean,()=>false)" % SW_READY): return True
        await pg.wait_for_timeout(250)
    return False


async def net(ctx, on):
    """Cut or restore the network: for the page (navigator.onLine) and at the test server (which also covers the service worker)."""
    await ctx.set_offline(not on)
    urllib.request.urlopen(BASE + "__net/" + ("on" if on else "off")).read()


async def t_offline(b):
    try:
        await offline_checks(b)
    finally:
        urllib.request.urlopen(BASE + "__net/on").read()  # never leave the server down for the next group


async def offline_checks(b):
    # HSK 5 opened once while online: afterwards it works with no network, even after the app is closed and opened again
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    check("offline: the service worker is in control", await sw_ready(pg))
    await go(pg, "#/learn", 600); await pg.click(".lvl-sw [data-level='5']"); await pg.wait_for_selector(".daycard", timeout=15000)
    kept = False
    for _ in range(40):
        kept = await pg.evaluate("caches.open('cb-packs').then(c=>c.keys()).then(k=>k.some(r=>/\\/data\\/hsk5\\.[0-9a-f]+\\.js$/.test(r.url)))")
        if kept: break
        await pg.wait_for_timeout(250)
    check("offline: the HSK 5 file is kept on the phone after the first visit", kept)
    await net(ctx, False)
    await pg.reload(); await pg.wait_for_selector("#app > *:not(.skel)", timeout=20000)
    await go(pg, "#/learn", 300); await pg.wait_for_selector(".daycard", timeout=15000)
    check("offline: after a reload Learn still opens the 62 HSK 5 packs", await pg.locator(".daycard").count() == 62)
    await pg.locator(".daycard").nth(4).click(); await pg.wait_for_selector(".word.card")
    check("offline: a pack shows its words", await pg.locator(".word.card").count() == 20)
    await pg.click("#add-all"); await pg.wait_for_timeout(400); await no_dialogs(pg)
    await go(pg, "#/review", 600)
    check("offline: its words go into review", "20 words due" in await pg.inner_text("#app"))
    await go(pg, "#/grammar/h5", 300); await pg.wait_for_selector(".gitem", timeout=15000)
    check("offline: HSK 5 grammar opens", await pg.locator(".gitem").count() == 42)
    await go(pg, "#/game/confuse/h5", 300); await pg.wait_for_selector(".opts", timeout=15000)
    check("offline: an HSK 5 practice game starts", await pg.locator(".opt").count() >= 2)
    await net(ctx, True)
    await ctx.close()
    # never opened while online: a clear message, a way back, and it loads once the phone is online again
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await sw_ready(pg); await pg.wait_for_timeout(6000)  # the rest of the HSK 4 course has been stored by now
    await net(ctx, False)
    await go(pg, "#/learn", 600); await pg.click(".lvl-sw [data-level='5']"); await pg.wait_for_selector("#pack-miss", timeout=15000)
    txt = await pg.inner_text("#app")
    check("offline, HSK 5 never downloaded: a clear message instead of an empty screen", "HSK 5 is not on this phone yet" in txt and "Connect to the internet" in txt and await pg.locator("#miss-retry").count() == 1, txt[:200])
    await go(pg, "#/pack/h5/1", 900)
    check("offline: a direct link to a pack shows the same message", await pg.locator("#pack-miss").count() == 1)
    await go(pg, "#/learn/extra", 900)
    check("offline: the extra HSK 4 words say so too", "These extra words are not on this phone yet" in await pg.inner_text("#app"))
    await go(pg, "#/day/1/words", 900)
    check("offline: a lesson still opens, just without the extra phrases", await pg.locator(".word.card").count() == 10 and await pg.locator(".wx-b").count() == 0)
    await go(pg, "#/learn", 900)
    check("offline: the message keeps the level switch", await pg.locator("#pack-miss").count() == 1 and await pg.locator(".lvl-sw [data-level='4']").count() == 1)
    await pg.click(".lvl-sw [data-level='4']"); await pg.wait_for_selector(".pnode", timeout=10000)
    check("offline: back on HSK 4 everything works", await pg.locator(".pnode").count() == 90 and await pg.evaluate("Store.state.settings.level") == 4)
    await pg.click(".lvl-sw [data-level='5']"); await pg.wait_for_selector("#pack-miss", timeout=15000)
    await net(ctx, True)
    await pg.click("#miss-retry"); await pg.wait_for_selector(".daycard", timeout=15000)
    check("online again: 'Try again' loads HSK 5", await pg.locator(".daycard").count() == 62)
    await ctx.close()


GROUPS = [("hsk5", t_hsk5), ("grammar5", t_grammar5), ("practice5", t_practice5), ("newgames", t_newgames), ("extras", t_extras), ("offline", t_offline), ("state", t_state), ("sync", t_sync), ("admin", t_admin), ("coach", t_coach), ("first_run", t_first_run), ("resume", t_resume), ("tip", t_tip), ("theme", t_theme), ("home", t_home), ("habit", t_habit), ("flame", t_flame), ("anims", t_anims), ("ready", t_ready), ("learn", t_learn), ("hearts", t_hearts),
          ("reader", t_reader), ("a11y", t_a11y), ("crash", t_crash), ("contrast", t_contrast), ("talk", t_talk),
          ("pages", t_pages), ("track", t_track)]
PW = None


async def main():
    global PW
    want = sys.argv[1:]
    async with async_playwright() as p:
        PW = p
        browser = await p.chromium.launch()
        for name, fn in GROUPS:
            if want and name not in want: continue
            print(name, flush=True)
            try:
                await fn(browser)
            except Exception as e:  # a crashed group is a failed check, and the other groups still run
                check(name + ": ran to the end", False, repr(e))
        await browser.close()
    check("no script errors on any screen", not page_errors, page_errors[:4])
    failed = [r for r in results if not r[1]]
    print("\n%d passed, %d failed" % (len(results) - len(failed), len(failed)))
    sys.exit(1 if failed else 0)


asyncio.run(main())
