#!/usr/bin/env python3
"""Browser tests for C&B Chinese, run against a BUILT site on a simulated iPhone 14.

    pip install playwright && playwright install chromium
    tests/run.sh                 # builds, starts the servers, runs everything
    python3 tests/e2e.py reader  # one group, with the servers already running

Environment: BASE (default http://localhost:8766/) and AI_URL (default http://localhost:9201/ai, see tests/mockai.mjs).
Nothing here depends on today's date: exam dates and study logs are set relative to "today".
The script exits with 1 when any check fails.
"""
import asyncio, datetime, json, os, sys
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


async def open_app(browser, state=None, path="", ai=False, expect_errors=False, seed=True, **ctx_opts):
    """A fresh phone with the given saved state (None = first run). Returns (context, page).
    seed=False adds nothing to storage on later page loads, for tests that check what is left after a reload."""
    dev = dict(PW.devices["iPhone 14"]); dev.pop("default_browser_type", None)
    ctx = await browser.new_context(**dev, **ctx_opts)
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
    check("first run: setup dialog is shown", await pg.locator("#su-time").count() == 1 and await pg.locator("#su-days").count() == 1)
    await pg.wait_for_timeout(200)
    check("setup dialog: focus is inside and it has a name", await pg.evaluate("(()=>{const m=document.querySelector('.modal');return m.contains(document.activeElement)&&!!m.getAttribute('aria-labelledby')})()"))
    await pg.keyboard.press("Escape")
    check("setup dialog: Escape does not skip setup", await pg.locator("#su-go").count() == 1)
    vp = pg.viewport_size
    box = await pg.locator("#su-go").bounding_box()
    check("setup dialog: Continue is on screen", box and box["y"] + box["height"] <= vp["height"], box)
    await pg.click(".su-o[data-v='50']"); await pg.click("#su-time [data-v='12:30']"); await pg.click("#su-days [data-v='3']")
    await pg.fill("#su-exam", day(40)); await pg.click("#su-go"); await pg.wait_for_timeout(300)
    st = await pg.evaluate("Store.state.settings")
    check("setup: choices are saved", st.get("dailyGoal") == 50 and st.get("remindTime") == "12:30" and st.get("weeklyDays") == 3 and st.get("examDate") == day(40) and st.get("setupDone"), st)
    check("guide follows setup", await pg.locator("#g-next").count() == 1)
    await pg.click("#g-skip"); await pg.wait_for_timeout(500)
    check("after the guide the Home screen is usable", await pg.locator(".modal-wrap").count() == 0 and await pg.locator(".session-cta").count() == 1)
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
               ("plan", "#/plan"), ("ready", "#/ready"), ("reader", "#/read"), ("quiz", "#/day/1/quiz")]
    mocks = [{"id": 1, "date": day(-2), "mode": "exam", "total": 188, "sections": {"listening": 52, "reading": 74, "writing": 62}}]
    for theme in ("light", "dark"):
        ctx, pg = await open_app(b, {"settings": settings(theme=theme), "srs": {}, "skills": {"listen-word": {"r": 10, "w": 14}}, "mockHistory": mocks})
        await pg.wait_for_timeout(800)
        bad = {}
        for name, h in screens:
            await go(pg, h, 700)
            if name == "me": await pg.evaluate("document.querySelectorAll('#app details').forEach(d=>d.open=true)")
            if name == "reader": await pg.click("#rd-sample"); await pg.wait_for_timeout(300)
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


GROUPS = [("first_run", t_first_run), ("home", t_home), ("habit", t_habit), ("flame", t_flame), ("anims", t_anims), ("ready", t_ready), ("learn", t_learn), ("hearts", t_hearts),
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
