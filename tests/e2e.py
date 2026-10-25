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
    for route in ["#/mock/%d" % m for m in range(1, 9)] + ["#/games", "#/review", "#/me", "#/progress", "#/grammar", "#/mistakes", "#/official", "#/search", "#/talk", "#/track", "#/learn/core", "#/learn/mine", "#/reports"]:
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
    await go(pg, "#/talk", 500)
    check("role-play: 16 scenes in three groups (just chat, everyday HR, law & policy)", await pg.locator("a[href^='#/talk/']").count() == 16 and await pg.locator(".talk-grp").count() == 3)
    await pg.click("[data-lvl='hsk5']"); await pg.wait_for_timeout(200)
    check("role-play: the HSK 5 level is remembered", await pg.evaluate("JSON.parse(localStorage.getItem('cbChinese.talk')).level") == "hsk5")
    await go(pg, "#/talk/overtime", 300)
    await pg.wait_for_selector(".tb-ai .zh", timeout=15000)
    check("role-play: the AI writes the opening, and the rules card is shown", "加班费" in await pg.locator(".tb-ai").first.inner_text() and await pg.locator(".talk-rules li").count() == 4)
    check("role-play: new words from the reply are shown", await pg.locator(".tb-words .tw").count() >= 1)
    check("role-play: every AI line has a play button (the phone's voice reads replies with no recording)", await pg.locator(".tb-ai .say").count() >= 1)
    spoken = await pg.evaluate("(()=>{let said=null;Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:u=>{said=u.text;setTimeout(()=>u.onend&&u.onend(),10)},cancel:()=>{},getVoices:()=>[]}});window.SpeechSynthesisUtterance=function(t){this.text=t};document.querySelector('.tb-ai .say').click();return new Promise(r=>setTimeout(()=>r(said),200))})()")
    check("role-play: tapping play on an AI reply speaks it", spoken and "加班费" in spoken, spoken)
    await pg.fill("#t-text", "我问工资条"); await pg.click("#t-send")
    await pg.wait_for_selector(".tb-fix", timeout=15000)
    check("role-play: the AI corrects a clumsy sentence", "我想问一下" in await pg.locator(".tb-fix").inner_text())
    check("role-play: a level-up version with its grammar point", "既然" in await pg.locator(".tb-up").first.inner_text() and "既然…就" in await pg.locator(".tb-up").first.inner_text())
    check("role-play: no Finish button before 3 replies", await pg.locator("#t-fin").is_hidden())
    for t in ("我想看一下工资条。", "按照规定，周日是两倍。", "我们会在下个月补发。", "好的，谢谢。"):
        await pg.fill("#t-text", t); await pg.click("#t-send"); await pg.wait_for_timeout(1200)
    check("role-play: the conversation keeps going after the case is discussed (no early end)", await pg.locator(".talk-end").count() == 0 and await pg.locator("#t-text").is_visible())
    await pg.click("#t-fin")
    await pg.wait_for_selector(".talk-end", timeout=15000)
    check("role-play: Finish ends with a goodbye from the character", "谢谢你" in await pg.locator(".tb-ai").last.inner_text())
    end = await pg.locator(".talk-end").inner_text()
    check("role-play: the case ends with a score, feedback, a phrase and 20 XP when solved", "8/10" in end and "按照规定" in end and await pg.evaluate("Store.state.xp") >= 20, end[:200])
    check("role-play: the best score is kept per scene", await pg.evaluate("JSON.parse(localStorage.getItem('cbChinese.talk')).best.overtime") == 8)
    tl = await pg.evaluate("Store.state.talkLog")
    check("role-play: a finished talk is logged for the teacher's view (scene, score, goal met, level)", len(tl) == 1 and tl[0]["id"] == "overtime" and tl[0]["s"] == 8 and tl[0]["g"] is True and tl[0]["l"] in (4, 5), tl)
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})  # AI pointed at a dead address
    await go(pg, "#/talk/payslip", 1500)
    check("role-play: without the AI the scene's own opening line is shown", await pg.locator(".tb-ai .zh").count() == 1)
    await ctx.close()


async def t_practice2(b):
    # --- "Learn it" card: an item missed 3+ times in 14 days is taught before it is asked again; others are asked straight away
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    ws = await pg.evaluate("App.WORDS.filter(w=>w._day===1&&w.example).slice(0,2).map(w=>({id:w.id,hz:w.hanzi,py:w.pinyin}))")
    await ctx.close()
    rep, one = ws[0], ws[1]
    mis = {"w:" + rep["id"]: {"kind": "word", "id": rep["id"], "skill": "vocab", "added": day(-5), "wrong": 3, "streak": 0},
           "w:" + one["id"]: {"kind": "word", "id": one["id"], "skill": "vocab", "added": day(-5), "wrong": 1, "streak": 0}}
    mlog = [{"d": day(-i), "k": "w:" + rep["id"], "s": "vocab"} for i in (1, 3, 6)] + [{"d": day(-2), "k": "w:" + one["id"], "s": "vocab"}]
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "mistakes": mis, "mlog": mlog})
    await pg.evaluate("Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false})")  # offline: the card is built from local data only
    await go(pg, "#/mistakes/vocab", 800); await pg.wait_for_selector("#learnit, #qcard", timeout=10000)
    card = await pg.locator("#learnit").inner_text() if await pg.locator("#learnit").count() else ""
    check("learn it: a word missed 3 times gets a teaching card first (word, pinyin, meaning, example, hint)",
          rep["hz"] in card and "missed 3 times" in card and "Memory hint" in card and await pg.locator("#learnit .w-ex").count() == 1 and await pg.locator("#learnit .py").count() >= 1, card[:300])
    check("learn it: offline the card is complete and has no AI button", await pg.locator("#li-ai").count() == 0 and await pg.locator("#learnit .li-hints li").count() >= 1)
    box = await pg.locator("#li-go").bounding_box()
    check("learn it: the continue button is a full touch target", box and box["height"] >= 44, box)
    await pg.click("#li-go"); await pg.wait_for_selector("#qcard")
    check("learn it: then the same item is asked", await pg.locator("#learnit").count() == 0 and await pg.locator("#qcard .opt").count() >= 2)
    await pg.locator("#qcard .opt").first.click(); await pg.click("#qnext"); await pg.wait_for_timeout(300)
    check("learn it: an item missed once is asked without a card", await pg.locator("#learnit").count() == 0 and await pg.locator("#qcard").count() == 1)
    await ctx.close()
    # every kind of notebook item gets a card: typed sentence, drill, mock, grammar and lesson quiz
    kinds = {"ty:我每天坐地铁上班": ({"kind": "type", "skill": "typing", "core": "我每天坐地铁上班", "end": "。", "py": "Wǒ měitiān zuò dìtiě shàngbān.", "vi": "Tôi đi tàu điện đi làm mỗi ngày.", "en": "I take the metro to work every day."}, "我每天坐地铁上班"),
             "dr:confuse:c01": ({"kind": "drill", "skill": "confusable", "d": "confuse", "id": "c01"}, "我以为他今天不来上班"),
             "m:1:R1-1": ({"kind": "mock", "skill": "fill-word", "mock": 1, "item": "R1-1"}, "他每天按时去公司"),
             "gr:g01:0": ({"kind": "gram", "skill": "grammar", "g": "g01", "i": 0}, "他把那封邮件删了"),
             "q:20:4": ({"kind": "quiz", "skill": "quiz", "day": 20, "idx": 4}, "两个月")}
    mis2 = {k: dict(v[0], added=day(-5), wrong=3, streak=0) for k, v in kinds.items()}
    mlog2 = [{"d": day(-i), "k": k, "s": v[0]["skill"]} for k, v in kinds.items() for i in (1, 2, 4)]
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "mistakes": mis2, "mlog": mlog2})
    for k, v in kinds.items():
        await go(pg, "#/mistakes/" + v[0]["skill"], 800); await pg.wait_for_selector("#learnit, #qcard", timeout=10000)
        txt = await pg.locator("#learnit").inner_text() if await pg.locator("#learnit").count() else ""
        check("learn it: a card for a repeated " + v[0]["kind"] + " item", v[1] in txt and "Memory hint" in txt, txt[:200])
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "mistakes": mis, "mlog": mlog}, ai=True)
    await go(pg, "#/mistakes/vocab", 800); await pg.wait_for_selector("#li-ai", timeout=10000)
    await pg.click("#li-ai"); await pg.wait_for_selector("#li-out .ai-card:not(.ai-wait)", timeout=15000)
    check("learn it: with the AI on, Explain with AI answers on the card", "Test answer" in await pg.locator("#li-out").inner_text())
    await ctx.close()

    # --- reading drill: questions from mocks already taken and lesson passages, never from a mock not yet taken
    st = {"settings": settings(), "srs": {}, "mocks": {"1": {"best": 150, "plays": 1}},
          "mockHistory": [{"id": 1, "date": day(-3), "mode": "exam", "total": 150, "sections": {"listening": 60, "reading": 40, "writing": 50}}]}
    ctx, pg = await open_app(b, st)
    await go(pg, "#/games", 400)
    check("reading drill: listed in Games", await pg.locator(".grow[href='#/game/reading']").count() == 1)
    await go(pg, "#/learn", 600)
    check("reading drill: linked from Learn", await pg.locator("#learn-reading[href='#/game/reading']").count() == 1)
    await go(pg, "#/game/reading", 800); await pg.wait_for_selector(".rd-drill .passage-in", timeout=10000)
    srcs, right = [], 0
    for i in range(3):
        await pg.wait_for_selector(".rd-drill .opts .opt")
        srcs.append(await pg.locator(".rd-drill .sub").first.inner_text())
        if i == 0:
            check("reading drill: a passage, a question and four choices", len((await pg.locator(".passage-in").inner_text()).strip()) > 30 and await pg.locator(".rd-drill .opts .opt").count() == 4)
        await pg.locator(".rd-drill .opts .opt").first.click()
        ok = await pg.locator(".rd-drill .opt.wrong").count() == 0
        right += 1 if ok else 0
        if i == 0:
            check("reading drill: graded, with the right answer marked", await pg.locator(".rd-drill .opt.right").count() == 1 and await pg.locator("#qfb .qexp").count() == 1)
        await pg.click("#qnext"); await pg.wait_for_timeout(200)
    res = await pg.locator(".result h2").inner_text()
    check("reading drill: three questions, then the score", ("%d / 3" % right) in res, res)
    check("reading drill: only from mock 1 (taken) or lessons", all(("Mock test 1" in x) or x.startswith("📖 Day") for x in srcs), srcs)
    sk = await pg.evaluate("Store.state.skills.passage")
    check("reading drill: answers count towards reading passages", sk and sk["r"] + sk["w"] == 3, sk)
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await go(pg, "#/game/reading", 800); await pg.wait_for_selector(".rd-drill .passage-in", timeout=10000)  # lessons and mocks load on demand
    n_mock = await pg.evaluate("App.readingSet(40).filter(q=>/^m:/.test(q.key)).length")
    check("reading drill: no mock questions before any mock is taken", n_mock == 0 and await pg.evaluate("App.readingSet(3).length") == 3, n_mock)
    await ctx.close()

    # --- weak-skill steps in Today's session: typing / word order under 75% with 10+ answers
    async def plan(state, ai=False, offline=False):
        c, p = await open_app(b, dict({"settings": settings(), "srs": {}}, **state), ai=ai)
        if offline:  # the AI is "off" when the phone is offline (there is always a built-in AI address)
            await p.evaluate("Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false})")
        await go(p, "#/session", 1200); await p.wait_for_selector("#ss-go", timeout=10000)
        steps = await p.evaluate("[...document.querySelectorAll('.task[data-step]')].map(e=>[e.dataset.step,e.innerText])")
        await c.close()
        return dict(steps), [x[0] for x in steps]
    d, ids = await plan({"skills": {"typing": {"r": 6, "w": 6}, "word-order": {"r": 5, "w": 6}}})
    check("session: weak typing (50%, 12 answers) becomes a typing focus step, not a second typing step", "weak-type" in d and "type" not in ids and "3 sentences" in d["weak-type"], d)
    check("session: weak word order (45%, 11 answers) adds a 3-sentence word order step", "weak-order" in d and "3 sentences" in d["weak-order"], d)
    d, ids = await plan({"skills": {"typing": {"r": 5, "w": 3}, "word-order": {"r": 9, "w": 3}}})
    check("session: no focus steps with too few answers (8) or at 75%", "weak-type" not in ids and "weak-order" not in ids and "type" in ids, ids)
    d, ids = await plan({"settings": settings(sessionMode="quick"), "skills": {"typing": {"r": 6, "w": 6}, "word-order": {"r": 5, "w": 6}}})
    check("session: quick sessions keep the focus steps short (2 sentences)", "2 sentences" in d.get("weak-type", "") and "2 sentences" in d.get("weak-order", ""), d)
    low_r = [{"id": 1, "date": day(-3), "mode": "exam", "total": 170, "sections": {"listening": 65, "reading": 45, "writing": 60}}]
    low_l = [{"id": 1, "date": day(-3), "mode": "exam", "total": 170, "sections": {"listening": 45, "reading": 65, "writing": 60}}]
    d, ids = await plan({"mockHistory": low_r, "mocks": {"1": {"plays": 1, "best": 170}}})
    check("session: a reading step while reading is the weakest section", "reading" in ids, ids)
    d, ids = await plan({"mockHistory": low_l, "mocks": {"1": {"plays": 1, "best": 170}}})
    check("session: no reading step when another section is weaker", "reading" not in ids, ids)

    # --- role-play step: only with the AI on; scene matches the current lesson, else the least-tried scene
    d, ids = await plan({"days": {"4": {"completed": True}}}, ai=True)
    check("session: with the AI on, an optional 3-minute talk is the last step, on the lesson topic (day 4 overtime)", ids[-1] == "talk" and "Overtime" in d["talk"] and "optional" in d["talk"], d)
    d, ids = await plan({"days": {"27": {"completed": True}}, "talkLog": [{"d": day(-1), "id": "payslip", "s": 7, "g": True, "l": 4}]}, ai=True)
    check("session: a lesson with no matching scene gets the least-tried scene", "talk" in d and "Annual leave" in d["talk"], d)
    d, ids = await plan({"days": {"4": {"completed": True}}}, ai=True, offline=True)
    check("session: no talk step when the AI is off (offline)", "talk" not in ids and "type" in ids, ids)
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await pg.evaluate("App._talk('overtime',{mini:3,exit:'#/',onDone:function(s){window.__talkDone=s}})")
    await pg.wait_for_selector(".tb-ai .zh", timeout=15000)
    check("mini talk: says it is 3 replies and can be skipped", await pg.locator("#t-mini").count() == 1 and await pg.locator("#t-skip").count() == 1)
    for t in ("我想看一下工资条。", "按照规定，周日是两倍。", "我们会在下个月补发。"):
        await pg.fill("#t-text", t); await pg.click("#t-send"); await pg.wait_for_timeout(1200)
    await pg.wait_for_selector(".talk-end", timeout=15000)
    check("mini talk: after 3 replies it ends with the score by itself", "8/10" in await pg.locator(".talk-end").inner_text())
    await pg.click("#t-cont"); await pg.wait_for_timeout(200)
    check("mini talk: Continue hands the score back to the session", await pg.evaluate("window.__talkDone") == 8)
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
    await go(p1, "#/fixes", 500); await p1.click("[data-fxtab='learners']"); await p1.wait_for_selector(".lt-card", timeout=10000)
    check("admin: the Learners tab opens the learner tracking screen", p1.url.endswith("#/learners"), p1.url)
    card = await p1.locator(".lt-card").first.inner_text()
    check("admin: the overview card shows status, streak and lessons", ("On track" in card or "Behind plan" in card) and "Streak" in card and "Lessons 0/" in card and "Readiness" in card, card[:200])
    check("admin: the overview card has the 28-day strip", await p1.locator(".lt-card .lrn-days i").count() == 28 and await p1.locator(".lt-card .lrn-days i.on").count() == 1)
    lid = await p1.evaluate("Content.admin('learners_list',{}).then(r=>r.result.rows[0].id)")
    key = lid[:8]
    await p1.evaluate("Content.admin('learner_label',{id:%s,label:'Hoang'})" % json.dumps(lid)); await p1.wait_for_timeout(300)
    await p1.evaluate("Game.award(1)"); await p1.evaluate("Sync.now()")
    await go(p1, "#/", 200); await go(p1, "#/learners", 500); await p1.wait_for_selector(".lt-card", timeout=10000)
    check("admin: the name given to a learner survives the next backup", "Hoang" in await p1.locator(".lt-card").first.inner_text())
    await go(p1, "#/learners/%s/progress" % key, 500); await p1.wait_for_selector(".lt-saved", timeout=10000)
    t = await p1.locator("#lt-body").inner_text()
    check("admin: Progress shows readiness, XP per week, pace and mocks", "Readiness" in t and "XP per week" in t and "Pace to the exam" in t and "No mock exam taken yet" in t and "Hoang" in t, t[:300])
    await go(p1, "#/learners/%s/practice" % key, 500); await p1.wait_for_selector(".lt-saved", timeout=10000)
    t = await p1.locator("#lt-body").inner_text()
    check("admin: Practice shows vocabulary, role-play and skills", "Vocabulary" in t and "AI role-play" in t and "No role-play finished yet" in t and "Skill accuracy" in t, t[:300])
    await go(p1, "#/learners/%s/habit" % key, 500); await p1.wait_for_selector(".lt-saved", timeout=10000)
    t = await p1.locator("#lt-body").inner_text()
    check("admin: Habit shows the calendar, rhythm and coach plan", "Last 28 days" in t and "Rhythm" in t and "No coach plan yet" in t and await p1.locator(".lt-cal i.d").count() == 28 and await p1.locator(".lt-cal i.d.on").count() == 1, t[:300])
    check("admin: the section tabs are links with the current one marked", await p1.locator(".seg3 a[aria-current='page']").inner_text() == "Habit" and await p1.locator(".lt-pick[aria-current='page']").count() == 1)
    # numbers the phone keeps for the teacher: role-play log, weekly snapshots, mocks
    await p1.evaluate("""(()=>{const t=Store.today();Store.state.talkLog=[{d:t,id:'payslip',s:8,g:true,l:4},{d:t,id:'leave',s:6,g:false,l:5}];
      Store.state.trk=[{w:Store.addDays(t,-14),r:150,m:10,c:30},{w:Store.addDays(t,-7),r:160,m:14,c:36},{w:t,r:170,m:20,c:40}];
      Store.state.mockHistory=[{id:'m1',date:t,total:190,sections:{listening:70,reading:70,writing:50}}];Store.save()})()""")
    sm = await p1.evaluate("Sync.summary()")
    check("summary: role-play, vocabulary, streak, weekly XP and history are in it", sm["talk"]["tried"] == 2 and sm["talk"]["avg"] == 7 and sm["talk"]["wk"][7] == 2 and sm["talk"]["lvl"] == 5 and sm["vocab"]["all"] > 0 and len(sm["xpw"]) == 8 and len(sm["trk"]) == 3 and "n" in sm["streak"] and sm["pace"]["total"] > 0, sm)
    check("summary: it stays well under the server's 8,000 characters", len(json.dumps(sm)) < 7500, len(json.dumps(sm)))
    await p1.evaluate("Sync.now(true)")
    await go(p1, "#/learners/%s/practice" % key, 500); await p1.wait_for_selector(".lt-saved", timeout=10000)
    t = await p1.locator("#lt-body").inner_text()
    check("admin: role-play numbers (talks, average, scenes tried, level, last talk)", "2/16" in t and "scenes tried" in t and "Level HSK 5" in t and "Last talk:" in t and "6/10" in t, t[:500])
    await go(p1, "#/learners/%s/progress" % key, 500); await p1.wait_for_selector(".lt-saved", timeout=10000)
    t = await p1.locator("#lt-body").inner_text()
    check("admin: Progress draws the weekly lines and lists the mock", await p1.locator("#lt-body svg.chart").count() >= 2 and "190" in t and "Mock exams" in t, t[:300])
    await go(p1, "#/learners", 500); await p1.wait_for_selector(".lt-card", timeout=10000)
    check("admin: the overview shows the change since last week", "+10 vs last week" in await p1.locator(".lt-card").first.inner_text(), await p1.locator(".lt-card").first.inner_text())
    await p1.evaluate("window._shared=null;Object.defineProperty(navigator,'share',{configurable:true,value:t=>{window._shared=t.text;return Promise.resolve()}})")
    await p1.click(".lt-card a[href$='/chat']"); await p1.wait_for_selector("#ac-share", timeout=10000); await p1.click("#ac-share"); await p1.wait_for_timeout(200)
    msg = await p1.evaluate("window._shared") or ""
    check("admin: Chat › Send by Zalo / share opens the share sheet with a Vietnamese nudge for that learner", "Chào Hoang" in msg and "ngày nữa là thi HSK" in msg and "加油" in msg and "http" in msg, msg)
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
    await go(pg, "#/", 700)
    row = await pg.locator("#h5-row").inner_text() if await pg.locator("#h5-row").count() else ""
    check("Home: while on HSK 5 a row leads to the next unfinished pack", "Continue with pack 2" in row and "1/62 packs finished" in row and "20 words in review" in row and await pg.locator("#h5-row").get_attribute("href") == "#/pack/h5/2", row)
    await go(pg, "#/learn", 300); await pg.wait_for_selector(".daycard", timeout=15000)
    await pg.click(".lvl-sw [data-level='4']"); await pg.wait_for_selector(".pnode")
    await go(pg, "#/", 600)
    check("Home: no HSK 5 row on HSK 4", await pg.locator("#h5-row").count() == 0)
    await go(pg, "#/learn", 600)
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
    await go(pg, "#/", 300); await go(pg, "#/grammar", 700)
    check("grammar filter: kept when coming back to the list", await pg.locator(".gitem:not([hidden])").count() == 1)
    await go(pg, "#/grammar/h5", 300); await pg.wait_for_selector(".gitem", timeout=15000)
    txt = await pg.inner_text("#app")
    check("HSK 5 grammar: 42 points (its own, empty filter), the note, and saved progress", await pg.locator(".gitem:not([hidden])").count() == 42 and "not yet checked by a teacher" in txt and "Best 4/5" in await pg.locator(".gitem").first.inner_text() and "HSK 5 grammar checklist" in txt)
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
    # a word opened from inside a word sheet replaces that sheet; closing it puts focus back where the first one was opened
    await pg.locator(".wsheet .w-x .wlink").first.click(); await pg.wait_for_timeout(400)
    check("word sheet opened from a word sheet: one sheet, now for the first word", await pg.locator(".modal-wrap").count() == 1 and op["ah"] in await pg.inner_text(".wsheet .hz") and await pg.evaluate("document.querySelector('.modal-wrap .modal').contains(document.activeElement)"))
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(500)
    back = await pg.evaluate("(()=>{const a=document.activeElement,o=document.querySelector('#w-%s .w-x .wlink');return [document.querySelectorAll('.modal-wrap').length,a===o,a&&a.tagName+'.'+a.className]})()" % op["a"])
    check("word sheet opened from a word sheet: after closing, focus is back on the link that opened the first one", back[0] == 0 and back[1] is True, back)
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
    check("admin: the Service block is on the content review screen", await pg.locator("#svc").count() == 1)
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
    await go(pg, "#/", 300); await go(pg, "#/fixes", 600); await pg.wait_for_timeout(500)
    svc_none = await pg.locator("#svc").count() == 0 and await pg.locator(".fx-tabs button").count() == 5
    await pg.click("[data-fxtab='learners']"); await pg.wait_for_selector(".lt-card", timeout=10000)
    check("admin: with an older server there is no Service block and the screens still work", svc_none and await pg.locator(".lt-card").count() >= 1)
    await pg.evaluate("AI.call('sync_delete',{code:Sync.cfg().code})")  # leave no backup behind for the other groups
    await ctx.close()


MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def admin2_state():
    """A learner with numbers this week and last week (weeks start Monday), for the admin's HSK 4 totals, alerts and Week tab."""
    mon = TODAY - datetime.timedelta(days=TODAY.weekday()); iso = lambda d: d.isoformat(); lmon = mon - datetime.timedelta(days=7)
    wd = TODAY.weekday() + 1  # days of this week so far
    log = {iso(mon + datetime.timedelta(days=i)): 20 for i in range(wd)}
    log.update({iso(lmon + datetime.timedelta(days=i)): 30 for i in range(5)})
    slog = {iso(TODAY): {"m": 12.4, "s": 1, "h": 20, "k": {"fill-word": [6, 4], "listen-tf": [8, 2], "h5-vocab": [5, 5]}},
            iso(lmon + datetime.timedelta(days=2)): {"m": 30, "s": 2, "h": 19, "k": {"quiz": [9, 1]}}}
    srs = {"d01-01": {"box": 5, "due": day(9), "right": 6, "wrong": 0, "added": iso(mon), "last": day(0)},
           "d01-02": {"box": 1, "due": day(1), "right": 0, "wrong": 0, "added": day(0), "last": None},
           "h5-0001": {"box": 2, "due": day(2), "right": 1, "wrong": 0, "added": day(0), "last": day(0)},
           "x4-0001": {"box": 2, "due": day(2), "right": 1, "wrong": 0, "added": day(0), "last": day(0)},
           "u1abc": {"box": 1, "due": day(1), "right": 0, "wrong": 0, "added": day(0), "last": None}}
    for i in range(1, 31):  # 30 HSK 4 Core words added last week and left waiting: the stale-review alert
        srs["k%03d" % i] = {"box": 2, "due": day(-10), "right": 1, "wrong": 1, "added": iso(lmon + datetime.timedelta(days=1)), "last": day(-12)}
    trk = [{"w": iso(lmon - datetime.timedelta(days=7)), "r": 140, "m": 4, "c": 10}, {"w": iso(lmon), "r": 150, "m": 10, "c": 30}, {"w": iso(mon), "r": 165, "m": 14, "c": 40}]
    mlog = [{"d": day(-1), "k": "dr:confuse:c0%d" % (i % 3 + 1), "s": "confusable"} for i in range(12)]  # 3 items, 12 misses
    talk = [{"d": iso(lmon + datetime.timedelta(days=1)), "id": "payslip", "s": 7, "g": True, "l": 4}, {"d": day(0), "id": "leave", "s": 8, "g": True, "l": 4}, {"d": day(0), "id": "payslip", "s": 9, "g": True, "l": 4}]
    st = {"settings": settings(examDate=day(430)), "srs": srs, "log": log, "slog": slog, "trk": trk, "mlog": mlog, "talkLog": talk, "xp": sum(log.values()),
          "custom": [{"id": "u1abc", "hanzi": "年终奖金", "pinyin": "niánzhōng jiǎngjīn", "vi": "thưởng cuối năm", "en": "year-end bonus"}],
          "skills": {"fill-word": {"r": 6, "w": 4}, "listen-tf": {"r": 8, "w": 2}, "quiz": {"r": 9, "w": 1}, "confusable": {"r": 2, "w": 12}}}
    return st, wd


async def t_admin2(b):
    st, wd = admin2_state()
    ctx, pg = await open_app(b, st, ai=True)
    sm = await pg.evaluate("Sync.summary()")
    course = await pg.evaluate("App.DAYS.reduce((a,d)=>a+(d.words||[]).length,0)+App.CORE.reduce((a,s)=>a+s.words.length,0)")
    vo = sm["vocab"]
    check("summary: vocabulary counts HSK 4 course words only (lessons, Core, Foundation), HSK 5 and extra/own words apart",
          vo == {"hsk": 4, "all": course, "mastered": 1, "learning": 31, "overdue": 30, "h5": 1, "ex": 2} and course < 2000, (vo, course))
    names = [t["skill"] for t in sm["trend"]]
    check("summary: skill names are readable, never raw ids", "Choosing the right word" in names and "True/false listening" in names and not any(n in ("fill-word", "listen-tf", "quiz") for n in names), names)
    rep = [p for p in sm["patterns"] if p["kind"] == "repeat"]
    check("summary: a repeat-mistake pattern says how many items and how many misses", rep and rep[0]["n"] == 12 and rep[0]["k"] == 3, sm["patterns"])
    w = sm["wk"]["w"]
    check("summary: per-week study days, minutes, right/wrong HSK 4 answers and HSK 4 words added, this week last",
          len(w) == 8 and w[-1] == [wd, 12, 14, 6, 2] and w[-2] == [5, 30, 9, 1, 30] and sm["wk"]["s"] == (TODAY - datetime.timedelta(days=TODAY.weekday())).isoformat()[2:], sm["wk"])
    full = await pg.evaluate("(()=>{const s=Sync.summary();s.wk.w=s.wk.w.map(()=>[7,999,9999,9999,999]);return [JSON.stringify(s).length,Sync._fit(Object.assign(s,{days28:'1'.repeat(7300)})).wk]})()")
    check("summary: the week numbers are small, and a summary that is still too long drops them", full[0] < 4000 and full[1] is None, full)
    r = await pg.evaluate("Sync.now(true)")
    check("summary: the server accepts the backup with the new fields", r == "saved", r)
    await pg.evaluate("localStorage.setItem('cbChinese.ai.admin','admin-code-12345')")
    real = await pg.evaluate("Content.admin('learners_list',{}).then(r=>r.result.rows[0])")
    check("server: the summary comes back as sent (no server change needed)", real["summary"].get("wk") == sm["wk"] and real["summary"]["vocab"]["hsk"] == 4, real.get("summary", {}).get("vocab"))
    # an older phone (raw skill ids, every word counted, a past exam) and one without an exam date, next to the real one
    old = {"id": "b" * 64, "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "rev": 1, "meta": {"label": "Old phone", "last": day(0), "streak": 2},
           "summary": {"trend": [{"skill": "fill-word", "acc": 40, "before": None, "n": 10}, {"skill": "listen-tf", "acc": 55, "before": None, "n": 9}],
                       "patterns": [{"kind": "skill", "skill": "handwriting", "n": 7}, {"kind": "repeat", "skill": "", "n": 16}],
                       "vocab": {"mastered": 40, "learning": 200, "all": 3135, "overdue": 31}, "progress": {"exam": day(-3), "lessons": 3}, "xpw": [0, 0, 0, 0, 0, 0, 40, 60], "streak": {"n": 2, "best": 4}}}
    none = {"id": "c" * 64, "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "rev": 1, "meta": {"label": "No date", "last": day(0)}, "summary": {"progress": {"exam": ""}}}
    async def rows(route):
        if '"learners_list"' not in (route.request.post_data or ""):
            await route.continue_(); return
        res = await route.fetch(); body = await res.json()
        body["result"]["rows"] = body["result"]["rows"][:1] + [old, none]
        await route.fulfill(response=res, body=json.dumps(body))
    await ctx.route(AI_URL, rows)
    key = real["id"][:8]
    await go(pg, "#/learners", 500); await pg.wait_for_selector(".lt-card", timeout=10000)
    al = await pg.locator(".lt-al").all_inner_texts()
    far = TODAY + datetime.timedelta(days=430); past = TODAY - datetime.timedelta(days=3)
    fmt = lambda d: "%d %s %d" % (d.day, MON3[d.month - 1], d.year)
    alt = " | ".join(al)
    check("admin alert: an exam date far away, in the past or missing is flagged",
          ("Exam date is %s (430 days away)" % fmt(far)) in alt and ("Exam date %s has passed" % fmt(past)) in alt and "No exam date set" in alt, al)
    check("admin alert: items that keep being missed (with the item count from newer phones, without it from older ones)",
          "3 items keep being missed · 12 misses in 14 days" in alt and "The same items keep being missed · 16 misses in 14 days" in alt, al)
    check("admin alert: 30+ reviews waiting more than 3 days is flagged (was 100+)", "30 words waiting more than 3 days" in alt and "31 words waiting more than 3 days" in alt, al)
    card = await pg.locator(".lt-card").first.inner_text()
    check("admin: the learner card says to check the exam date", ("Exam date is %s" % fmt(far)) in card and "check it" in card, card)
    check("admin: a Mistakes or Reviews alert opens Practice", await pg.locator(".lt-al[href$='/practice']").count() >= 3 and await pg.locator(".lt-al[href$='/progress']").count() == 3)
    await go(pg, "#/learners/%s/practice" % key, 500); await pg.wait_for_selector(".lt-saved", timeout=10000)
    t = await pg.locator("#lt-body").inner_text()
    check("admin Practice: the vocabulary card counts HSK 4 course words and lists HSK 5 / extra words apart",
          ("%d HSK 4 course words" % course) in t and "1 mastered" in t.replace("\n", " ") and "Also in review, not counted above: 1 HSK 5 · 2 extra or own words" in t.replace("\n", " ") and "3135" not in t, t[:500])
    check("admin Practice: skill names are readable", "Choosing the right word" in t and "fill-word" not in t, t[:600])
    await go(pg, "#/learners/bbbbbbbb/practice", 500); await pg.wait_for_selector(".lt-saved", timeout=10000)
    t = await pg.locator("#lt-body").inner_text()
    check("admin Practice: an older phone's raw skill ids are shown as names, and its word total is labelled as all words",
          "Choosing the right word" in t and "True/false listening" in t and "Handwriting (stroke order)" in t and "fill-word" not in t and "listen-tf" not in t and "words on the phone" in t, t[:600])
    await go(pg, "#/learners/%s/week" % key, 500); await pg.wait_for_selector("#lt-week", timeout=10000)
    tab = await pg.evaluate("[...document.querySelectorAll('#lt-week tbody tr')].map(r=>[...r.children].map(c=>c.innerText.trim()))")
    got = {r[0]: r[1:] for r in tab}
    exp = {"Study days": ["5", str(wd)], "Minutes": ["30", "12"], "XP": ["150", str(20 * wd)], "Accuracy (HSK 4 answers)": ["90%", "70%"], "Readiness /300": ["150", "165"],
           "HSK 4 words added": ["30", "2"], "Words mastered (net)": ["6", "4"], "Role-play talks": ["1", "2"]}
    check("admin Week: last week and this week side by side for every number", all(got.get(k, [None, None])[:2] == v for k, v in exp.items()), got)
    check("admin Week: changes are written out with arrows, not colour alone",
          got["Accuracy (HSK 4 answers)"][2] == "▼ −20 pts" and got["Readiness /300"][2] == "▲ +15" and got["Role-play talks"][2] == "▲ +1" and got["Words mastered (net)"][2] == "▼ −2", got)
    check("admin Week: the tab is the fourth section (Chat is fifth) and marked current", await pg.locator(".seg3 a").count() == 5 and await pg.locator(".seg3 a").nth(3).inner_text() == "Week" and await pg.locator(".seg3 a[aria-current='page']").inner_text() == "Week")
    await go(pg, "#/learners/bbbbbbbb/week", 500); await pg.wait_for_selector("#lt-week", timeout=10000)
    t = await pg.locator("#lt-week").inner_text()
    check("admin Week: an older phone shows what it has and says what needs the newer app", "need the newer app" in t and "60" in t, t)
    faint = []
    for theme in ("light", "dark"):
        await pg.evaluate("document.documentElement.setAttribute('data-theme',%s)" % json.dumps(theme)); await pg.wait_for_timeout(150)
        for h in ("#/learners/%s/week" % key, "#/learners"):
            await go(pg, h, 500); await pg.wait_for_selector("#lt-body section, #lt-body .lt-card", timeout=10000)
            faint += await pg.evaluate(CONTRAST_JS)
    await pg.evaluate("document.documentElement.setAttribute('data-theme','light')")
    check("admin: the Week tab, alerts and exam-date line are readable in both themes", not faint, faint[:4])
    small = await pg.evaluate("[...document.querySelectorAll('.seg3 a, .lt-al, .lt-pick')].filter(e=>{const r=e.getBoundingClientRect();return r.height<44}).length")
    check("admin: tabs, alerts and learner chips are at least 44px tall", small == 0, small)
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
    # the study summary must fit the server's 8,000 characters even at its largest: 8 trend rows, patterns, a plan with three long texts in two languages
    big = await p1.evaluate("""(()=>{const t=Store.today(),txt='Luyện \\"lượng từ\\" mỗi ngày 10 phút / Practise \\"measure words\\" for 10 minutes every day. '.repeat(8);
      Store.state.coachLog=[{w:Store.addDays(t,-3),d:t,base:{skills:{},cards:0,mocks:0},actions:['measure','listen-sentence','word-order'].map(k=>({text:txt,minutes:15,skill:k}))}];
      for(let i=0;i<40;i++)Store.state.mlog.push({d:t,k:'w:d01-0'+(1+i%5),s:'vocab'},{d:t,k:'dr:measure:m'+i,s:'measure'},{d:t,k:'ls:'+i,s:'listen-sentence'});
      Store.state.skills.measure={r:10,w:90};Store.state.skills['listen-sentence']={r:10,w:90};
      for(let h=0;h<24;h++){const d=Store.addDays(t,-h);if(Store.state.slog[d])Store.state.slog[d].h=h}
      const sm=Sync.summary();return {len:JSON.stringify(sm).length,trend:sm.trend.length,patterns:sm.patterns.length,plan:sm.plan?sm.plan.actions.map(a=>a.text.length):null,hours:Object.keys(sm.hours).length,h5:!!sm.progress.hsk5}})()""")
    print("    largest study summary: %(len)d characters · %(trend)d trend rows · %(patterns)d patterns · %(hours)d start hours · plan texts %(plan)s" % big, flush=True)
    check("study summary: at its largest it stays under the server's 8,000 characters, with the plan and the HSK 5 numbers", big["len"] < 7500 and big["trend"] == 8 and big["plan"] and len(big["plan"]) == 3 and min(big["plan"]) >= 20 and big["h5"], big)
    fit = await p1.evaluate("""(()=>{const mk=n=>({span:28,trend:[1,2,3,4,5,6,7,8].map(i=>({skill:'s'+i,acc:50,before:40,n:99})),patterns:[{kind:'skill',skill:'x',n:9}],hours:{20:9},progress:{hsk5:{started:1}},plan:{w:'2026-10-05',actions:[1,2,3].map(()=>({text:'字'.repeat(n),skill:'Measure words',done:false}))}});
      const a=Sync._fit(mk(200)),b=Sync._fit(mk(3000)),c=Sync._fit(Object.assign(mk(10),{days28:'1'.repeat(9000)}));
      return [JSON.stringify(a).length,a.plan.actions[0].text.length,JSON.stringify(b).length,b.plan.actions[0].text.length,b.trend.length,c.plan,c.trend.length]})()""")
    check("study summary: a short one is left alone; a too long one has its plan texts shortened first, then lists dropped", fit[0] < 7500 and fit[1] == 200 and fit[2] <= 7500 and 20 <= fit[3] < 3000 and fit[4] == 8 and fit[5] is None and fit[6] == 3, fit)
    hw = await p1.evaluate("[Games._hwSkill(App.WORDMAP['h5-0001']),Games._hwSkill(App.WORDMAP['d01-01']),Learn.exam(Games._hwSkill(App.WORDMAP['h5-0001'])),Learn.exam('handwriting'),!!Learn.SKILLS['h5-writing']]")
    check("handwriting: an HSK 5 word is recorded under the HSK 5 writing skill, not the HSK 4 exam skill", hw == ["h5-writing", "handwriting", False, True, True], hw)
    await p1.evaluate("localStorage.setItem('cbChinese.ai.admin','admin-code-12345')")
    hkey = await p1.evaluate("Content.admin('learners_list',{}).then(r=>r.result.rows[0].id.slice(0,8))")
    await go(p1, "#/learners/%s/progress" % hkey, 500); await p1.wait_for_selector(".lt-saved", timeout=10000)
    line = await p1.locator("#lt-body").inner_text()
    check("admin: Progress shows the HSK 5 packs started", "HSK 5 packs started" in line and "62/62" in line, line[:400])
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


async def t_engage(b):
    # back after 4 days away: the 5-minute restart is the first card on Home
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "log": {day(-4): 30, day(-5): 20}, "xp": 50})
    await go(pg, "#/", 900)
    first = await pg.evaluate("(()=>{const a=document.querySelector('#app a.cta');return a?a.getAttribute('href'):null})()")
    check("comeback: after 4 days away the 5-minute restart is the first card on Home", first == "#/session/comeback" and "4 days away" in (await pg.locator("a.comeback").inner_text()).lower(), first)
    check("comeback: the 2-minute shortcut is not offered at the same time", await pg.locator("a[href='#/session/rescue']").count() == 0)
    await pg.evaluate("(()=>{const ids=App.WORDS.slice(0,12).map(w=>w.id);ids.forEach((id,i)=>{Store.state.srs[id]={box:2,due:Store.addDays(Store.today(),-(i+1)),right:1,wrong:0,added:Store.addDays(Store.today(),-20),last:null}});Store.save()})()")
    await go(pg, "#/session/comeback", 1200); await pg.wait_for_selector("#ss-go", timeout=10000)
    t = await pg.locator(".result").inner_text()
    check("comeback: the restart reviews the 8 oldest overdue words, then one short step", "5-minute restart" in t and "Review 8 overdue words" in t, t[:300])
    await pg.evaluate("Game.award(5)"); await go(pg, "#/learn"); await go(pg, "#/", 900)
    check("comeback: gone once something is studied today", await pg.locator("a.comeback").count() == 0)
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "log": {day(-1): 30}, "xp": 30})
    await go(pg, "#/", 700)
    check("comeback: not shown after only one day away", await pg.locator("a.comeback").count() == 0)
    await ctx.close()
    # the exam countdown plan
    ctx, pg = await open_app(b, {"settings": settings(examDate=day(10)), "srs": {}})
    await go(pg, "#/", 700)
    check("exam plan: on Home 10 days before the exam", await pg.locator(".exam-plan").count() == 1 and "10 days left" in await pg.locator(".exam-plan").inner_text())
    await go(pg, "#/exam", 1200); await pg.wait_for_selector(".ep-list li", timeout=10000)
    rows = await pg.evaluate("[...document.querySelectorAll('.ep-list li')].map(l=>l.className.split(' ')[0]+'|'+l.innerText.replace(/\\s+/g,' '))")
    kinds = [r.split("|")[0] for r in rows]
    check("exam plan: the page counts the days left", "10 days left" in await pg.locator(".score-big").inner_text())
    check("exam plan: one row per day, the light day, then exam day last", len(rows) == 11 and kinds[-1] == "ep-exam" and kinds[-2] == "ep-light", rows)
    mocks = [10 - i for i, k in enumerate(kinds) if k == "ep-mock"]
    check("exam plan: a mock every third day, counted back from 2 days before (8, 5, 2 days left)", mocks == [8, 5, 2], mocks)
    check("exam plan: every other day is a section focus", all(k == "ep-focus" for i, k in enumerate(kinds) if 10 - i not in (0, 1, 2, 5, 8)), kinds)
    check("exam plan: the final-week mock is a full set in the exam simulator", "Full mock in the exam simulator" in rows[kinds.index("ep-mock")] and await pg.locator(".ep-mock a[href$='/sim']").count() == 3, rows)
    check("exam plan: links go to real screens", await pg.evaluate("[...document.querySelectorAll('.ep-list a')].every(a=>/^#\\/[a-z]/.test(a.getAttribute('href')))"))
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(examDate=day(30)), "srs": {}})
    await go(pg, "#/", 700)
    check("exam plan: not on Home a month before", await pg.locator(".exam-plan").count() == 0)
    await go(pg, "#/exam", 700)
    check("exam plan: the page says when it starts", "starts 21 days before" in await pg.locator("#app").inner_text())
    await ctx.close()


async def t_mocks2(b):
    """Repeated mock sets: the forecast is built from first attempts, learners and the admin see which scores are repeats,
    the exam plan picks sets not taken yet, and the two new sets (7, 8) are well-formed."""
    sec = lambda l, r, w: {"listening": l, "reading": r, "writing": w}
    # saved before this version: no rep flag, so the repeat comes from the order
    rep_hist = [{"id": 1, "date": day(-3), "mode": "exam", "total": 200, "sections": sec(60, 70, 70)},
                {"id": 1, "date": day(-1), "mode": "exam", "total": 280, "sections": sec(95, 95, 90)}]
    two_sets = [dict(rep_hist[0]), dict(rep_hist[1], id=2)]
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "mockHistory": two_sets, "mocks": {"1": {"best": 200, "plays": 1, "lastScore": 200}, "2": {"best": 280, "plays": 1, "lastScore": 280}}})
    await go(pg, "#/ready", 900)
    t = await pg.inner_text("#app")
    check("mocks2: two different sets both count fully (~244)", "~244" in t and "2 first-attempt mocks" in t, t[:300])
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "mockHistory": rep_hist, "mocks": {"1": {"best": 280, "plays": 2, "lastScore": 280}}})
    await go(pg, "#/ready", 900)
    t = await pg.inner_text("#app")
    # first attempt 200 at weight 1, the retake 280 at 0.3: (200 + 0.3*280) / 1.3 ≈ 218, not 244
    check("mocks2: a retake of the same set counts much less in readiness (~218)", "~218" in t, t[:300])
    check("mocks2: readiness says it is based on 1 first attempt + 1 repeat", "1 first-attempt mock + 1 repeat (count less)" in t, t[:400])
    await go(pg, "#/mock", 900)
    row1 = await pg.locator("a.cta[href='#/mock/1']").inner_text(); row2 = await pg.locator("a.cta[href='#/mock/2']").inner_text()
    check("mocks2: the mock list marks a taken set as a repeat and an untaken one as new", "Repeat" in row1 and "counts less" in row1 and "Repeat" not in row2 and "New" in row2, (row1, row2))
    await go(pg, "#/mock/1", 700)
    check("mocks2: the intro of a taken set says the questions were seen", "you have seen these questions" in await pg.inner_text("#app"))
    await go(pg, "#/mock/1/result", 700)
    check("mocks2: the saved result of a retake says it counts less", await pg.locator(".rep-note").count() == 1)
    faint = []
    for theme in ("light", "dark"):
        await pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", theme)
        for route in ("#/mock", "#/mock/1", "#/mock/1/result"):
            await go(pg, route, 500); faint += [theme + " " + route + ": " + x for x in await pg.evaluate(CONTRAST_JS)]
    check("mocks2: repeat notes and labels are readable in both themes", not faint, faint)
    await go(pg, "#/mock/1/result", 500)
    sm = await pg.evaluate("Sync.summary()")
    ms = sm["progress"]["mocks"]
    check("mocks2: the summary marks the repeat (rep:1) and gives the first-attempt average", len(ms) == 2 and "rep" not in ms[0] and ms[1].get("rep") == 1 and sm["progress"]["mfa"] == [1, 200], sm["progress"])
    check("mocks2: the summary stays well under 7,500 characters", len(json.dumps(sm)) < 7500, len(json.dumps(sm)))
    await ctx.close()
    # the admin's Progress table for that phone
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "mockHistory": rep_hist, "mocks": {"1": {"best": 280, "plays": 2, "lastScore": 280}}}, ai=True)
    await pg.evaluate("Game.award(40)"); await no_dialogs(pg)
    r = await pg.evaluate("Sync.now()")
    await pg.evaluate("localStorage.setItem('cbChinese.ai.admin','admin-code-12345')")
    # other groups' phones are in the same list: pick this one by its summary
    lid = await pg.evaluate("Content.admin('learners_list',{}).then(r=>(r.result.rows.filter(x=>x.summary&&x.summary.progress&&x.summary.progress.mfa&&x.summary.progress.mfa[1]===200&&(x.summary.progress.mocks||[]).length===2)[0]||r.result.rows[0]).id)")
    await go(pg, "#/learners/%s/progress" % lid[:8], 500); await pg.wait_for_selector(".lt-saved", timeout=10000)
    rws = await pg.evaluate("[...document.querySelectorAll('#lt-body .lt-tab tbody tr')].map(r=>r.innerText.toLowerCase())")
    t = await pg.locator("#lt-body").inner_text()
    check("mocks2: admin Progress marks the repeated row in text and shows the first-attempt average", r == "saved" and len(rws) == 2 and "repeat" not in rws[0] and "repeat" in rws[1] and "First-attempt average: 200/300 over 1 set" in t, (r, rws, t[-300:]))
    await ctx.close()
    # a new attempt stores the flag: take set 7 twice in practice mode (skipping every question)
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    await go(pg, "#/mock/7", 1200); await pg.wait_for_selector("#m-practice", timeout=15000)
    check("mocks2: new set 7 says it is not yet checked by a teacher", "not yet checked by a teacher" in await pg.inner_text("#app") and await pg.locator(".rep-note").count() == 0)
    for attempt in range(2):
        await go(pg, "#/mock/7", 700); await pg.click("#m-practice")
        for _ in range(3):
            await pg.wait_for_selector("#m-next", timeout=10000); await pg.wait_for_timeout(300); await pg.click("#m-next"); await pg.wait_for_timeout(500)
        await pg.wait_for_function("location.hash==='#/mock/7/result'", timeout=10000); await pg.wait_for_timeout(400); await no_dialogs(pg)
        if attempt == 0:
            check("mocks2: a first attempt has no repeat note", await pg.locator(".rep-note").count() == 0)
    h = await pg.evaluate("Store.state.mockHistory.map(x=>x.rep)")
    check("mocks2: new entries store rep (first false, retake true)", h == [False, True], h)
    check("mocks2: the result of a retake says it counts less", "counts less" in await pg.locator(".rep-note").inner_text())
    await pg.reload(); await pg.wait_for_selector("#app > *:not(.skel)")
    check("mocks2: the rep flag survives a reload (storage clean keeps it)", await pg.evaluate("Store.state.mockHistory.map(x=>x.rep)") == [False, True])
    await ctx.close()
    # the exam plan: untaken sets first, then the one taken longest ago, marked as a repeat
    taken = [{"id": i, "date": day(-21 + i), "mode": "exam", "total": 220, "sections": sec(70, 75, 75)} for i in range(1, 7)]
    ctx, pg = await open_app(b, {"settings": settings(examDate=day(10)), "srs": {}, "mockHistory": taken, "mocks": {str(i): {"best": 220, "plays": 1, "lastScore": 220} for i in range(1, 7)}})
    await go(pg, "#/exam", 1200); await pg.wait_for_selector(".ep-list li", timeout=10000)
    rows = await pg.evaluate("[...document.querySelectorAll('.ep-list li.ep-mock a')].map(a=>[a.getAttribute('href'),a.innerText.replace(/\\s+/g,' ')])")
    check("mocks2: final-week mock days use full sets in the simulator, oldest first, even as repeats",
          [r[0] for r in rows] == ["#/mock/4/sim", "#/mock/5/sim", "#/mock/6/sim"] and all("(repeat)" in r[1] for r in rows), rows)
    await ctx.close()
    # 21 days out, nothing taken: the earlier mock days use the short sets, the full sets wait for the final week
    ctx, pg = await open_app(b, {"settings": settings(examDate=day(20)), "srs": {}})
    await go(pg, "#/exam", 1200); await pg.wait_for_selector(".ep-list li", timeout=10000)
    rows = await pg.evaluate("[...document.querySelectorAll('.ep-list li.ep-mock a')].map(a=>a.getAttribute('href'))")
    check("mocks2: early mock days take short sets; days 8, 5 and 2 take full sets 4, 5, 6 in the simulator",
          rows[-3:] == ["#/mock/4/sim", "#/mock/5/sim", "#/mock/6/sim"] and all(r in ("#/mock/1", "#/mock/2", "#/mock/3", "#/mock/7", "#/mock/8") for r in rows[:-3]) and len(rows) >= 5, rows)
    # the new sets are loaded and shaped like the other shortened tests
    shape = await pg.evaluate("""(()=>{const c=m=>[m.listening.p1.length,m.listening.p2.length,m.listening.p3.length,m.reading.p1.length,m.reading.p2.length,
      m.reading.p3.reduce((a,p)=>a+p.questions.length,0),m.writing.p1.length,m.writing.p2.length].join(',');
      const by={};(window.CB_MOCK||[]).forEach(m=>by[m.id]=c(m));return by})()""")
    check("mocks2: sets 7 and 8 load, with the same parts and counts as set 1", shape.get("7") == shape.get("1") and shape.get("8") == shape.get("1") and len(shape) == 8, shape)
    await ctx.close()
    import subprocess
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    out = subprocess.run(["node", "tools/validate.js"], cwd=root, capture_output=True, text=True)
    check("mocks2: the content validator passes with 8 mock exams", out.returncode == 0 and "Mock exams        : 8" in out.stdout and "PASS  Mock exams well-formed" in out.stdout, out.stdout[-400:] + out.stderr[-400:])

# ----------------------------------------------------------------------------------------------------------------------
HOOK_Q = "(()=>{if(window.__qh)return;window.__qh=1;const o=Games._q.makeQ;Games._q.makeQ=function(w,t){const q=o(w,t);window.__q=q;return q}})()"


async def answer_q(pg, right=True):
    """Answer the current word question (Quick Quiz style) right or wrong, using the question the app just built."""
    k = await pg.evaluate("(r=>{const q=window.__q,i=q.opts.findIndex(o=>o.id===q.w.id);return r?i:(i+1)%%q.opts.length})(%s)" % ("true" if right else "false"))
    await pg.click(".opt[data-k='%d']" % k); await pg.click("#qnext"); await pg.wait_for_timeout(80)


async def t_knowledge2(b):
    # --- weekly review quiz: only words added and grammar practised in the last 7 days
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}})
    pick = await pg.evaluate("(()=>{const seen={},out=[];App.WORDS.filter(w=>w._day).forEach(w=>{if(!seen[w.hanzi]){seen[w.hanzi]=1;out.push(w.id)}});return out.slice(0,14)})()")
    await ctx.close()
    new, old = pick[:10], pick[10:]
    srs = {i: {"box": 1, "due": day(0), "right": 0, "wrong": 0, "added": day(0), "last": None} for i in new}
    srs.update({i: {"box": 3, "due": day(5), "right": 2, "wrong": 0, "added": day(-10), "last": day(-3)} for i in old})
    gram = {"g01": {"best": 3, "passes": 0, "mastered": False, "n": 1, "d": day(-1)}, "g02": {"best": 4, "passes": 1, "mastered": False, "n": 2, "d": day(-12)},
            "g03": {"best": 3, "passes": 0, "mastered": False}}
    ctx, pg = await open_app(b, {"settings": settings(), "srs": srs, "grammar": gram})
    g3 = await pg.evaluate("Store.state.grammar.g03")
    check("weekly quiz: older grammar progress counts as practised once, with no date", g3.get("n") == 1 and "d" not in g3, g3)
    check("weekly quiz: offered on Home once 10 new words came in this week", await pg.locator("a.wq-cta").count() == 1)
    await go(pg, "#/learn", 600)
    check("weekly quiz: reachable from Learn", await pg.locator("a.wq-row[href='#/weekly']").count() == 1)
    await pg.evaluate(HOOK_Q)
    await go(pg, "#/weekly", 900); await pg.wait_for_selector(".opts", timeout=15000)
    total = int((await pg.locator(".ghr").inner_text()).split("/")[1])
    g01 = await pg.evaluate("CB_GRAMMAR.find(g=>g.id==='g01').title.zh")
    words, grams, xp0 = [], [], await pg.evaluate("Store.state.xp")
    for _ in range(total):
        await no_dialogs(pg)
        gt = pg.locator(".qcard > p.sub .zh")
        if await gt.count():
            grams.append(await gt.inner_text())
            await pg.click(".opts .opt >> nth=0"); await pg.click("#qnext"); await pg.wait_for_timeout(80)
        else:
            words.append(await pg.evaluate("window.__q.w.id")); await answer_q(pg, True)
    check("weekly quiz: about 10 questions mixing words and grammar", total == 10 and len(words) == 8 and len(grams) == 2, (total, len(words), len(grams)))
    check("weekly quiz: words only from the last 7 days", words and all(w in new for w in words), words)
    check("weekly quiz: grammar only from points practised in the last 7 days", grams and all(g == g01 for g in grams), grams)
    await pg.wait_for_selector(".wq-result")
    st = await pg.evaluate("Store.state.wquiz")
    check("weekly quiz: completion is recorded for this week, with XP like other quizzes", len(st) == 1 and list(st.values())[0]["n"] == 10 and await pg.evaluate("Store.state.xp") - xp0 >= 16, (st, xp0))
    await no_dialogs(pg)
    await go(pg, "#/", 800)
    check("weekly quiz: hidden on Home once done this week", await pg.locator("a.wq-cta").count() == 0)
    await go(pg, "#/learn", 500)
    check("weekly quiz: Learn says it is done this week", "done this week" in (await pg.locator("a.wq-row").inner_text()).lower())
    # practising a grammar point records the round and the date
    await go(pg, "#/grammar/g05/practice", 900); await pg.wait_for_selector(".opts")
    for _ in range(5):
        await no_dialogs(pg); await pg.click(".opts .opt >> nth=0"); await pg.click("#qnext"); await pg.wait_for_timeout(80)
    g5 = await pg.evaluate("Store.state.grammar.g05")
    check("grammar practice: records one round and today's date", g5.get("n") == 1 and g5.get("d") == await pg.evaluate("Store.today()"), g5)
    await ctx.close()
    # offered from the 5th day of the week; on Monday with only a few new words it waits
    monday = TODAY - datetime.timedelta(days=TODAY.weekday())
    for off, want in ((0, 0), (4, 1)):
        d = (monday + datetime.timedelta(days=off)).isoformat()
        srs = {i: {"box": 1, "due": d, "right": 0, "wrong": 0, "added": d, "last": None} for i in new[:5]}
        ctx, pg = await open_app(b, {"settings": settings(), "srs": srs})
        await pg.clock.install(time=datetime.datetime.combine(monday + datetime.timedelta(days=off), datetime.time(10, 0)))
        await pg.reload(); await pg.wait_for_selector(".quests")
        check("weekly quiz: %s with 5 new words" % ("not offered on Monday" if not want else "offered on Friday"), await pg.locator("a.wq-cta").count() == want)
        await ctx.close()

    # --- lesson catch-up: only when behind plan and not in the final 14 days
    behind = {"settings": settings(examDate=day(30), coreTarget=30), "srs": {}, "log": {day(-20): 30, day(-1): 20},
              "days": {str(n): {"quizBest": 8, "practice": {}, "completed": True, "completedOn": day(-20)} for n in (1, 2, 3)}}
    ctx, pg = await open_app(b, behind)
    await go(pg, "#/", 800)
    cta = pg.locator("a.cu-cta")
    txt = await cta.inner_text() if await cta.count() else ""
    check("catch-up: offered on Home when behind plan", "Catch up: 2 short lessons today" in txt and "Day 4 + Day 5" in txt, txt)
    check("catch-up: takes the place of Continue (no duplicate card)", await pg.locator("a.cta[href^='#/day/']").count() == 0 and await pg.locator("a.mini-link[href='#/day/4']").count() == 1)
    plan_txt = await pg.locator(".today").text_content()
    check("catch-up: Today's plan uses the same wording", "Catch up: 2 short lessons" in plan_txt and "Finish Day" not in plan_txt, plan_txt[:200])
    await pg.evaluate(HOOK_Q)
    await cta.click(); await pg.wait_for_selector("#cu-go", timeout=15000)
    await pg.click("#cu-go"); await pg.wait_for_selector(".fcard")
    n = int((await pg.locator(".deck-top span").last.inner_text()).split("/")[1])
    check("catch-up: only the lesson's key words as flashcards", n == 6, n)
    for _ in range(n):
        await pg.click("#flip"); await pg.click("#gotit"); await pg.wait_for_timeout(350)
    await pg.wait_for_selector("#cu-next", timeout=5000)
    check("catch-up: the grammar point, no dialogue", await pg.locator(".cu-gram .g-point").count() == 1 and await pg.locator(".chat, .msg").count() == 0)
    await pg.click("#cu-next"); await pg.wait_for_selector(".opts")
    for _ in range(5):
        await no_dialogs(pg); await answer_q(pg, True)
    await pg.wait_for_selector(".cu-result")
    rec = await pg.evaluate("Store.state.days[4]")
    check("catch-up: a passed check counts the lesson as done, flagged as catch-up", rec.get("completed") and rec.get("cu") == await pg.evaluate("Store.today()"), rec)
    await no_dialogs(pg)
    await pg.click("#cu-on"); await pg.wait_for_selector(".fcard")
    for _ in range(int((await pg.locator(".deck-top span").last.inner_text()).split("/")[1])):
        await pg.click("#flip"); await pg.click("#gotit"); await pg.wait_for_timeout(350)
    await pg.wait_for_selector(".opts", timeout=5000)  # Day 5 is a review day: no grammar box, straight to the check
    for _ in range(5):
        await no_dialogs(pg); await answer_q(pg, False)
    await pg.wait_for_selector(".cu-result")
    check("catch-up: a failed check does not count", not await pg.evaluate("!!(Store.state.days[5]||{}).completed") and await pg.locator("#cu-retry").count() == 1)
    await no_dialogs(pg)
    await go(pg, "#/plan", 700)
    check("catch-up: the study plan says how many lessons were catch-ups", "1 of them as short catch-up lessons" in await pg.inner_text("#app"))
    await ctx.close()
    ctx, pg = await open_app(b, dict(behind, settings=settings(examDate=day(10), coreTarget=30)))
    await go(pg, "#/", 800)
    check("catch-up: not offered in the final 14 days", await pg.locator("a.cu-cta").count() == 0)
    await ctx.close()
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "log": {day(-1): 30}, "days": {str(n): {"quizBest": 8, "practice": {}, "completed": True, "completedOn": day(-1)} for n in (1, 2)}})
    await go(pg, "#/", 800)
    check("catch-up: not offered when on track", await pg.locator("a.cu-cta").count() == 0 and await pg.locator("a.cta[href='#/day/3']").count() == 1)
    await go(pg, "#/catchup", 900)
    check("catch-up: the page explains when it is offered", "No catch-up needed" in await pg.inner_text("#app"))

    # --- grammar coverage: never practised / practised / mastered
    await pg.evaluate("(()=>{Store.state.grammar={g01:{best:5,passes:2,mastered:true,n:2,d:Store.today()},g02:{best:3,passes:0,mastered:false,n:1},g33:{best:0,passes:0,mastered:false,n:0}};Store.save()})()")
    await pg.wait_for_function("!!window.CB_FULL", timeout=15000)
    await go(pg, "#/grammar", 900)
    cov = await pg.locator("#g-cov").inner_text()
    check("grammar coverage: counts at the top", "68 never practised" in cov and "1 practised, not mastered" in cov and "1 mastered" in cov, cov)
    await pg.click("[data-gf='never']"); await pg.wait_for_timeout(200)
    vis = await pg.locator(".gitem:not([hidden])").count()
    check("grammar coverage: 'Never practised' filter", vis == 68 and await pg.locator(".gitem[href='#/grammar/g02']:not([hidden])").count() == 0
          and "Never practised" in await pg.locator(".gitem:not([hidden])").first.inner_text(), vis)
    await pg.click("[data-gf='all']")
    await go(pg, "#/", 900)
    foc = await pg.locator(".focus-plan").text_content()
    check("grammar coverage: Home suggests the never-practised point from a finished lesson", "根据 / 按照 · from Day 1, never practised" in foc, foc[:300])
    await ctx.close()


async def t_writing2(b):
    """Mock writing part 2 is scored by the AI examiner: Check with AI in practice, automatic scoring with partial points
    in the timed exam, a per-sentence breakdown on the result; offline it falls back to the model answer."""
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await go(pg, "#/mock/1", 1200); await pg.wait_for_selector("#m-practice", timeout=15000); await pg.click("#m-practice")
    for _ in range(2):
        await pg.wait_for_selector("#m-next", timeout=10000); await pg.wait_for_timeout(300); await pg.click("#m-next"); await pg.wait_for_timeout(500)
    await pg.wait_for_function("location.hash==='#/mock/1/writing'", timeout=10000)
    ids = await pg.evaluate("[...document.querySelectorAll('.w2-input')].map(e=>e.id.slice(3))")
    words = await pg.evaluate("[...document.querySelectorAll('.w2-scene b')].map(e=>e.textContent)")
    check("writing2: practice mode offers Check with AI on every part 2 sentence", len(ids) == 3 and await pg.locator("[id^=w2ai-]").count() == 3, ids)
    await pg.fill("#w2-" + ids[0], "我今天" + words[0] + "了。")
    await pg.click("#w2ai-" + ids[0]); await pg.wait_for_selector("#w2out-%s .w2-verdict" % ids[0], timeout=10000)
    t = await pg.inner_text("#w2out-" + ids[0])
    check("writing2: Check with AI shows a score out of 5 and counts 4+ as right", "5/5" in t and "Counts as right" in t, t[:200])
    await pg.fill("#w2-" + ids[0], "我今天" + words[0] + "了吗。")
    check("writing2: editing a scored sentence clears the score", await pg.inner_text("#w2out-" + ids[0]) == "")
    await ctx.close()
    # timed exam: sentences are scored when the exam ends; a 3/5 sentence gives partial points
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await go(pg, "#/mock/1", 1200); await pg.wait_for_selector("#m-exam", timeout=15000); await pg.click("#m-exam")
    for _ in range(2):
        await pg.wait_for_selector("#m-next", timeout=10000); await pg.wait_for_timeout(300); await pg.click("#m-next"); await pg.wait_for_timeout(500)
    await pg.wait_for_function("location.hash==='#/mock/1/writing'", timeout=10000); await pg.wait_for_timeout(300)
    check("writing2: the timed exam hides the model answer and says AI scores at the end",
          await pg.locator("[id^=w2show-]").count() == 0 and await pg.locator("[id^=w2ai-]").count() == 0 and "when you finish" in await pg.inner_text("#app"))
    await pg.fill("#w2-" + ids[0], "我今天" + words[0] + "了。")       # full marks
    await pg.fill("#w2-" + ids[1], "每天我" + words[1] + "。")          # grammar 1, natural 1 -> 3/5
    cnt = await pg.inner_text("#exam-count")
    check("writing2: a typed sentence counts as answered in the timed exam", cnt.startswith("2/"), cnt)
    await pg.click("#m-next"); await pg.wait_for_function("location.hash==='#/mock/1/result'", timeout=20000); await pg.wait_for_timeout(500)
    t = await pg.inner_text("#app")
    check("writing2: the result lists AI scores per sentence", "Writing part 2" in t and "5/5" in t and "3/5" in t, t[:600])
    h = await pg.evaluate("Store.state.mockHistory[0].sections.writing")
    # mock 1 writing: 5 ordering + 3 sentences = 8 items; nothing ordered, 1 + 0.6 sentence points = 1.6/8 = 20
    check("writing2: the writing score uses partial points (1.6 of 8 = 20)", h == 20, h)
    await pg.click(".w2-row summary >> nth=1"); await pg.wait_for_timeout(200)
    check("writing2: a row opens the full AI feedback with the correction", "我每天坐地铁去公司" in await pg.inner_text(".w2-row >> nth=1"))
    await no_dialogs(pg)
    await ctx.close()
    # offline: the old way (model answer and self-marking) still works
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await go(pg, "#/mock/1", 1200); await pg.wait_for_selector("#m-exam", timeout=15000)
    await ctx.set_offline(True); await pg.click("#m-exam")
    for _ in range(2):
        await pg.wait_for_selector("#m-next", timeout=10000); await pg.wait_for_timeout(300); await pg.click("#m-next"); await pg.wait_for_timeout(500)
    await pg.wait_for_function("location.hash==='#/mock/1/writing'", timeout=10000); await pg.wait_for_timeout(300)
    check("writing2: offline, the model answer and self-marking stay", await pg.locator("[id^=w2show-]").count() == 3 and "when you finish" not in await pg.inner_text("#app"))
    await ctx.close()

async def t_admin_group(b):
    """Admin overview: one card per learner holding all of that learner's alerts; tiny idle backups fold into a test group."""
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await pg.evaluate("localStorage.setItem('cbChinese.ai.admin','admin-code-12345')")
    now = datetime.datetime.now(datetime.timezone.utc)
    old = (now - datetime.timedelta(days=7)).isoformat()
    nhi = {"id": "d" * 64, "updated_at": old, "rev": 9, "meta": {"label": "Nhi", "last": day(-7), "xp": 3000, "streak": 0},
           "summary": {"vocab": {"mastered": 40, "learning": 200, "all": 1200, "overdue": 31}, "patterns": [{"kind": "repeat", "skill": "", "n": 16}], "progress": {"exam": day(21)}}}
    tst = {"id": "e" * 64, "updated_at": (now - datetime.timedelta(days=20)).isoformat(), "rev": 1, "meta": {"last": day(-20), "xp": 16}, "summary": {"progress": {"exam": day(21)}}}
    async def rows(route):
        if '"learners_list"' not in (route.request.post_data or ""):
            await route.continue_(); return
        res = await route.fetch(); body = await res.json()
        body["result"]["rows"] = [nhi, tst]
        await route.fulfill(response=res, body=json.dumps(body))
    await ctx.route(AI_URL, rows)
    await go(pg, "#/learners", 500); await pg.wait_for_selector(".lt-card", timeout=10000)
    groups = await pg.locator(".lt-alg").all_inner_texts()
    check("admin_group: one attention card per learner", len(groups) == 1 and groups[0].count("Nhi") == 1, groups)
    g = groups[0] if groups else ""
    check("admin_group: the card holds no-data, reviews and mistakes; a stale backup is not repeated next to it",
          "Nothing received for 7 days" in g and "backup is paused" in g and "31 words" in g and "16 misses" in g and "Last saved" not in g, g)
    check("admin_group: the idle 16 XP backup is folded away, not alerted", await pg.locator(".lt-test").count() == 1 and await pg.locator(".lt-card").count() == 1 and "(1)" in await pg.inner_text(".lt-test summary"))
    small = await pg.evaluate("[...document.querySelectorAll('.lt-alg .lt-al, .lt-test summary')].filter(e=>e.getBoundingClientRect().height<44).length")
    check("admin_group: alert lines are at least 44px tall", small == 0, small)
    await ctx.close()

async def t_sync_heal(b):
    """A backup paused by a 'conflict' that is really this phone's own earlier save (reply lost when iOS suspended the app)
    heals itself; a real conflict with a copy that is ahead stays paused and shows on Home."""
    cfg = "JSON.parse(localStorage.getItem('cbChinese.sync')||'{}')"
    c1, p1 = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await p1.evaluate("Game.award(40)"); await no_dialogs(p1)
    check("sync_heal: first save", await p1.evaluate("Sync.now()") == "saved")
    # the server saved rev 2 but the phone never heard back: it still thinks rev 1
    await p1.evaluate("Game.award(5)"); await p1.evaluate("Sync.now()")
    await p1.evaluate("(()=>{const c=%s;c.rev=1;localStorage.setItem('cbChinese.sync',JSON.stringify(c))})()" % cfg)
    await p1.evaluate("Game.award(5)")
    r = await p1.evaluate("Sync.now()"); c = await p1.evaluate(cfg)
    check("sync_heal: a lost reply does not pause backup; the phone catches up and saves", r == "saved" and c.get("rev") == 3 and "conflict" not in c, (r, c))
    # a phone already paused before this fix (older copy on the server) heals on its next save
    await p1.evaluate("(()=>{const c=%s;c.conflict={at:new Date().toISOString(),meta:{xp:10,words:0,last:''}};c.rev=1;delete c.mark;localStorage.setItem('cbChinese.sync',JSON.stringify(c))})()" % cfg)
    r = await p1.evaluate("Sync.now()"); c = await p1.evaluate(cfg)
    check("sync_heal: an existing pause by an older copy heals by itself", r == "saved" and "conflict" not in c, (r, c))
    # a real conflict: the server copy is ahead (more XP), so the learner must choose; Home says so
    code = c["code"]
    c2, p2 = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await p2.evaluate("localStorage.setItem('cbChinese.sync',JSON.stringify({code:%s,rev:%d}))" % (json.dumps(code), c["rev"]))
    await p2.evaluate("Game.award(500)"); await no_dialogs(p2)
    check("sync_heal: the other phone (ahead) saves", await p2.evaluate("Sync.now()") == "saved")
    await p1.evaluate("Game.award(1)")
    r = await p1.evaluate("Sync.now()")
    check("sync_heal: a copy that is ahead still pauses backup (nothing overwritten)", r == "conflict", r)
    await go(p1, "#/", 800)
    t = await p1.locator(".sync-paused").inner_text() if await p1.locator(".sync-paused").count() else ""
    check("sync_heal: Home shows that backup is paused and links to Me", "Backup paused" in t and await p1.locator(".sync-paused").get_attribute("href") == "#/me", t)
    await c1.close(); await c2.close()

async def t_prep(b):
    """Exam preparation: simulator link, review after a mock, where the points went, honest forecast,
    timed exam parts, daily AI writing step, repeat-mistake set."""
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await go(pg, "#/mock/4/sim", 1500); await pg.wait_for_selector("#sim-go", timeout=15000)
    check("prep: #/mock/4/sim opens the simulator checklist", "Exam simulator" in await pg.inner_text("#app"))
    # a practice attempt answering one listening question right and one wrong, skipping the rest
    await go(pg, "#/mock/1", 700); await pg.click("#m-practice"); await pg.wait_for_selector("#m-next", timeout=10000); await pg.wait_for_timeout(300)
    for _ in range(3):
        await pg.wait_for_selector("#m-next", timeout=10000); await pg.wait_for_timeout(300); await pg.click("#m-next"); await pg.wait_for_timeout(500)
    await pg.wait_for_function("location.hash==='#/mock/1/result'", timeout=10000); await pg.wait_for_timeout(400); await no_dialogs(pg)
    t = await pg.inner_text("#app")
    check("prep: the result says where the points went and how far from 180", "Where the points went" in t and "more points to pass (180)" in t, t[:600])
    rb = await pg.locator(".rev-btn").inner_text() if await pg.locator(".rev-btn").count() else ""
    n = await pg.evaluate("Store.state.mocks['1'].wrong.length")
    tot = await pg.evaluate("(()=>{const m=CB_MOCK.filter(x=>x.id===1)[0];return m.listening.p1.length+m.listening.p2.length+m.listening.p3.length+m.reading.p1.length+m.reading.p2.length+m.reading.p3.reduce((a,p)=>a+p.questions.length,0)+m.writing.p1.length+m.writing.p2.length})()")
    check("prep: the result offers a review of every wrong or skipped question", n == tot and ("Review %d mistakes" % n) in rb, (n, rb))
    await pg.reload(); await pg.wait_for_selector("#app > *:not(.skel)")
    check("prep: the saved review list survives a reload (storage keeps it)", await pg.evaluate("Store.state.mocks['1'].wrong.length") == tot)
    h = await pg.evaluate("Store.state.mockHistory[0]")
    check("prep: a new mock entry stores set size and self-marked writing", h.get("full") is False and h.get("ws") is False, h)
    await go(pg, "#/mock/1/review", 1200); await pg.wait_for_selector(".rv-item", timeout=10000)
    t = await pg.inner_text("#app")
    check("prep: the review shows sections, the transcript, your answer and the right one",
          await pg.locator(".rv-item").count() == tot and all(k in t.lower() for k in ("listening", "reading", "writing")) and "Yours:" in t and "Right:" in t and await pg.locator(".rv-item .script").count() >= 10, t[:400])
    await pg.click("[data-why='0']"); await pg.wait_for_selector("#rv-out-0 .ai-card:not(.ai-wait)", timeout=10000)
    check("prep: Why? asks the AI and shows the explanation", "Explain" in await pg.inner_text("#rv-out-0"), await pg.inner_text("#rv-out-0"))
    await pg.click("#rv-drill"); await pg.wait_for_selector("#qcard", timeout=10000)
    check("prep: Practise these starts a drill of the mock's mistakes", "Mock 1 mistakes" in await pg.inner_text("#app"))
    await ctx.close()
    # honest forecast: a short set in practice mode with self-marked writing counts less, and the forecast says so
    hist = [{"id": 1, "date": day(-3), "mode": "practice", "total": 280, "sections": {"listening": 90, "reading": 90, "writing": 100}},
            {"id": 4, "date": day(-1), "mode": "exam", "strict": True, "total": 200, "sections": {"listening": 70, "reading": 70, "writing": 60}, "full": True, "ws": False}]
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "mockHistory": hist})
    await go(pg, "#/official", 900)
    t = await pg.inner_text("#app")
    # weights: short practice 1*0.6*0.7*0.8^1=0.336 (writing 0.168); full exam 1 -> L,R = (0.336*90+70)/1.336=75; W=(0.168*100+60)/1.168=66 -> ~216
    check("prep: the forecast counts short, practice and self-marked mocks less (~216, not ~240)", "~216" in t, t[:500])
    check("prep: the forecast says what counted less", "Counted less" in t and "1 short 40-question set" in t and "writing you marked yourself in 1 mock" in t, t[:900])
    await ctx.close()
    # exam parts page
    ctx, pg = await open_app(b, {"settings": settings(), "srs": {}, "skills": {"fill-word": {"r": 5, "w": 5}}}, ai=True)
    await go(pg, "#/mock", 900)
    check("prep: the mock list links to timed exam parts and names the weakest part", "Practise one exam part" in await pg.inner_text("#app") and "Weakest: Reading part 1 · 50%" in await pg.inner_text("#app"))
    await go(pg, "#/parts", 1200); await pg.wait_for_selector(".grow", timeout=10000)
    t = await pg.inner_text("#app")
    check("prep: Exam parts lists all 8 parts with time at the real pace", all(("%s part %d" % (sname, k)) in t for sname, ks in (("Listening", (1, 2, 3)), ("Reading", (1, 2, 3)), ("Writing", (1, 2))) for k in ks) and "10 questions · 10:00 min" in t, t[:900])
    check("prep: the weakest part is offered first", "Your weakest: Reading part 1 (50%)" in t)
    await go(pg, "#/parts/R1", 1200); await pg.wait_for_selector("#qcard", timeout=10000)
    clk = await pg.inner_text("#dr-clock")
    check("prep: a part run has one clock at the real pace (10 questions = 10 minutes)", clk in ("10:00", "9:59", "9:58"), clk)
    srcs = await pg.evaluate("[...document.querySelectorAll('#qcard .sub')].map(e=>e.innerText).join(' ')")
    check("prep: questions come from the shorter tests, never the full sets 4-6", not any(("Mock test %d" % k) in srcs for k in (4, 5, 6)), srcs)
    await go(pg, "#/parts/R2", 1200); await pg.wait_for_selector("#qcard", timeout=10000)
    check("prep: reading part 2 uses sentence-order items (A B C)", await pg.locator("#qcard").count() == 1 and "/10" in await pg.inner_text(".ghr"))
    await go(pg, "#/session", 900)
    check("prep: Today's session has a daily AI writing step while the AI is on", "Write 2 sentences (AI scores them)" in await pg.inner_text("#app"))
    # repeat mistakes: an item missed 3 times in 14 days
    wid = await pg.evaluate("(window.CB_DAYS||[]).map(d=>(d.words||[])[0]).filter(Boolean)[0].id")
    await pg.evaluate("id=>{for(let i=0;i<3;i++)Learn.record('w:'+id,{kind:'word',skill:'vocab',id:id},false)}", wid)
    await go(pg, "#/mistakes", 800)
    t = await pg.inner_text("#app")
    check("prep: the notebook offers the repeat mistakes as their own set", await pg.locator("#mis-rep").count() == 1 and "Fix 1 repeat mistake" in t, t[:400])
    await pg.click("#mis-rep"); await pg.wait_for_selector(".ghead", timeout=10000)
    check("prep: the repeat set opens", "Repeat mistakes" in await pg.inner_text(".ghead"))
    await ctx.close()

async def t_chat(b):
    """Teacher chat: a learner and the admin on two phones, through the real server code (in-memory database)."""
    import random
    tag = str(random.randint(10000, 99999))
    c1, p1 = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await go(p1, "#/chat", 600)
    check("chat: without cloud backup the chat explains it needs backup", "Turn on" in await p1.inner_text("#app") and "Cloud backup" in await p1.inner_text("#app"))
    await p1.evaluate("Game.award(40)"); await no_dialogs(p1)
    check("chat: backup saved (the chat identity)", await p1.evaluate("Sync.now()") == "saved")
    await go(p1, "#/me", 600)
    check("chat: Me offers the teacher chat once backup is on", await p1.locator("a.chat-me[href='#/chat']").count() == 1)
    await go(p1, "#/chat", 1200); await p1.wait_for_selector("#chat-log", timeout=10000)
    check("chat: an empty conversation says so", "No messages yet" in await p1.inner_text("#chat-log"))
    await p1.fill("#chat-in", "老师好 " + tag); await p1.click("#chat-send")
    await p1.wait_for_function("document.querySelector('#chat-log .chat-b.me')", timeout=10000)
    check("chat: the learner's message appears on her side", tag in await p1.inner_text("#chat-log") and await p1.input_value("#chat-in") == "")
    # the teacher
    c2, p2 = await open_app(b, {"settings": settings(), "srs": {}}, ai=True)
    await p2.evaluate("localStorage.setItem('cbChinese.ai.admin','admin-code-12345')")
    rows = await p2.evaluate("Content.admin('learners_list',{}).then(r=>r.result.rows)")
    mine = None
    for r in rows:
        if r.get("unread"):
            got = await p2.evaluate("id=>Content.admin('admin_chat_get',{id:id,since:0}).then(r=>r.result.msgs.map(m=>m.body).join('|'))", r["id"])
            if tag in got: mine = r
    check("chat: the teacher's list counts her unread message and knows the app is open", mine is not None and mine["unread"] == 1 and mine.get("last_open") and (mine.get("client") or {}).get("b") == "on", mine)
    key = mine["id"][:8] if mine else "x"
    await p2.evaluate("id=>Content.admin('learner_label',{id:id,label:'Chat " + tag + "'})", mine["id"] if mine else "")
    await go(p2, "#/learners", 600); await p2.wait_for_selector(".lt-card", timeout=10000)
    t = await p2.inner_text("#app")
    check("chat: the overview shows a Chat alert and an unread badge", ("1 new message from Chat " + tag) in t and await p2.locator("a[href='#/learners/%s/chat'] .lt-unread" % key).count() >= 1, t[:500])
    check("chat: the overview card says the app is open now", "In the app now" in t)
    await go(p2, "#/learners/%s/chat" % key, 600); await p2.wait_for_selector("#ac-log .chat-b", timeout=10000)
    check("chat: the teacher sees her message in the Chat tab", tag in await p2.inner_text("#ac-log"))
    await p2.fill("#ac-in", "Làm phần đọc 1 nhé"); await p2.select_option("#ac-act", "#/parts/R1"); await p2.click("#ac-send")
    await p2.wait_for_function("document.querySelectorAll('#ac-log .chat-b.me').length===1", timeout=10000)
    check("chat: the teacher's message with a button is sent", "Reading part 1, timed" in await p2.inner_text("#ac-log"))
    import urllib.request
    lives = json.loads(urllib.request.urlopen(AI_URL.rsplit("/", 1)[0] + "/__lives").read().decode())
    check("chat: each message pings a live channel (no text in it)", len(lives) >= 2 and all(x.startswith("cb-") and tag not in x for x in lives), lives[-3:])
    # back on the learner's phone: Home shows the new message, the chat has the button
    await go(p1, "#/", 300)
    await p1.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p1.wait_for_timeout(1500)
    await go(p1, "#/learn", 200); await go(p1, "#/", 800)
    card = await p1.locator("#chat-card").inner_text() if await p1.locator("#chat-card").count() else ""
    check("chat: Home shows the teacher's new message with a preview", "New message from your teacher" in card and "Làm phần đọc 1" in card, card)
    await p1.click("#chat-card"); await p1.wait_for_selector("#chat-log .chat-b.them", timeout=10000)
    check("chat: the button in the message opens that screen", await p1.locator("#chat-log a.chat-act[href='#/parts/R1']").count() == 1)
    check("chat: the learner sees that the teacher read her message", "Seen" in await p1.inner_text("#chat-log .chat-b.me"))
    await go(p1, "#/", 800)
    check("chat: once read, the Home card goes away", await p1.locator("#chat-card").count() == 0)
    await go(p2, "#/learners", 200); await go(p2, "#/learners/%s/chat" % key, 1500); await p2.wait_for_selector("#ac-log .chat-b.me", timeout=10000)
    check("chat: the teacher sees Seen once she opened it", "Seen" in await p2.inner_text("#ac-log"))
    # privacy and checks
    r = await p2.evaluate("AI.call('chat_get',{code:'ABCDEFGHJKLMNPQR',since:0})")
    check("chat: an unknown restore code reads nothing", r.get("ok") is False and r.get("error") == "no_backup", r)
    r = await p1.evaluate("AI.call('admin_chat_get',{id:%s,since:0})" % json.dumps(mine["id"] if mine else ""))
    check("chat: the teacher's view needs the admin code", r.get("ok") is False and r.get("error") == "bad_admin", r)
    r = await p2.evaluate("id=>Content.admin('admin_chat_send',{id:id,body:'x',action:{label:'Hack',href:'javascript:alert(1)'}}).then(r=>r.result.msgs.slice(-1)[0])", mine["id"] if mine else "")
    check("chat: a button that is not an app screen is dropped", r and r.get("action") is None, r)
    # the phone tells the teacher when its backup is paused
    await p1.evaluate("(()=>{const c=JSON.parse(localStorage.getItem('cbChinese.sync'));c.conflict={at:new Date().toISOString(),meta:{xp:99999,words:9999,last:'2099-01-01'}};localStorage.setItem('cbChinese.sync',JSON.stringify(c))})()")
    await p1.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p1.wait_for_timeout(1500)
    await go(p2, "#/learners", 200); await go(p2, "#/", 100); await go(p2, "#/learners", 800); await p2.wait_for_selector(".lt-card", timeout=10000)
    t = await p2.inner_text("#app")
    check("chat: a paused backup on her phone is an urgent alert for the teacher", ("Backup is paused on Chat " + tag + "'s phone") in t, t[:700])
    await c1.close(); await c2.close()

GROUPS = [("prep", t_prep), ("writing2", t_writing2), ("admin_group", t_admin_group), ("hsk5", t_hsk5), ("grammar5", t_grammar5), ("practice5", t_practice5), ("newgames", t_newgames), ("extras", t_extras), ("offline", t_offline), ("state", t_state), ("sync", t_sync), ("admin", t_admin), ("admin2", t_admin2), ("coach", t_coach), ("first_run", t_first_run), ("resume", t_resume), ("tip", t_tip), ("theme", t_theme), ("home", t_home), ("habit", t_habit), ("flame", t_flame), ("anims", t_anims), ("ready", t_ready), ("learn", t_learn), ("hearts", t_hearts),
          ("reader", t_reader), ("a11y", t_a11y), ("crash", t_crash), ("contrast", t_contrast), ("talk", t_talk),
          ("pages", t_pages), ("track", t_track), ("engage", t_engage), ("mocks2", t_mocks2), ("knowledge2", t_knowledge2), ("practice2", t_practice2), ("sync_heal", t_sync_heal), ("chat", t_chat)]
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
