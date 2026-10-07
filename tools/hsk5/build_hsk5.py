#!/usr/bin/env python3
"""Builds data/hsk5/wordsNN.js from tools/hsk5/wordlist.tsv + tools/hsk5/entries/*.txt.

Usage:  python3 tools/hsk5/build_hsk5.py [--review]

wordlist.tsv   hanzi TAB pinyin, in source order (HSK 2.0 level 5 minus words already in the app).
entries/*.txt  one word per line:  hanzi|pos|en|vi|segmented example|example en|example vi
               The example is written with spaces between words; pinyin is generated word by word:
               CEDICT (vendor/dict/cedict.v1.js) reading, else pypinyin, with the overrides below.
               A token may carry its reading inline:  得{děi}   过{guo}
--review       prints every polyphonic token and the reading chosen, and words outside HSK 1-5.
"""
import json, os, re, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pinyin_util import syl_to_marks, tone_of, join_syllables, strip_tone
from pypinyin import lazy_pinyin, Style

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, "data", "hsk5")
PACK = 20
REVIEW = "--review" in sys.argv

# ---- headword pinyin: deliberate choices where the source list gives several readings or differs from CEDICT
HEAD = {
    "便": "biàn", "划": "huá", "片": "piàn", "抢": "qiǎng", "切": "qiē", "数": "shǔ", "吐": "tù", "系": "xì",
    "涨": "zhǎng", "挣": "zhèng", "嗯": "èn", "元旦": "Yuándàn", "打交道": "dǎjiāodao", "干活儿": "gànhuór", "系领带": "jìlǐngdài",
    "不要紧": "búyàojǐn", "不见得": "bújiànde", "老婆": "lǎopo", "佩服": "pèifú", "痛快": "tòngkuài",
    "秘书": "mìshū", "华裔": "huáyì", "使劲儿": "shǐjìnr",
}

# ---- readings for single-character tokens (pypinyin default is used otherwise)
CHAR = {
    "地": "de", "得": "de", "长": "cháng", "教": "jiāo", "倒": "dǎo", "弹": "tán", "似": "sì", "挣": "zhèng",
    "调": "tiáo", "兴": "xìng", "切": "qiē", "削": "xiāo", "谁": "shéi", "划": "huá", "吐": "tù", "嗯": "èn",
    "唉": "ài", "一": "yī", "不": "bù", "数": "shǔ", "儿": "r", "哦": "ò", "嘛": "ma", "啦": "la", "哇": "wa",
    "呀": "ya", "哈": "hā", "咱": "zán", "俩": "liǎ", "薄": "báo", "熟": "shú", "血": "xuè", "露": "lù",
    "着": "zhe", "了": "le", "过": "guò", "还": "hái", "都": "dōu", "为": "wèi", "只": "zhǐ", "种": "zhǒng",
    "行": "xíng", "重": "zhòng", "发": "fā", "空": "kōng", "当": "dāng", "干": "gàn", "少": "shǎo", "好": "hǎo",
    "难": "nán", "和": "hé", "没": "méi", "要": "yào", "会": "huì", "觉": "jué", "看": "kàn", "中": "zhōng",
    "朝": "cháo", "称": "chēng", "传": "chuán", "转": "zhuǎn", "背": "bèi", "藏": "cáng", "占": "zhàn",
    "处": "chù", "相": "xiāng", "量": "liàng", "应": "yīng", "假": "jiǎ", "差": "chà", "乐": "lè", "正": "zhèng",
    "间": "jiān", "场": "chǎng", "结": "jié", "落": "luò", "累": "lèi", "省": "shěng", "待": "dài", "担": "dān",
    "别": "bié", "系": "xì", "卷": "juǎn", "圈": "quān", "片": "piàn", "便": "biàn", "更": "gèng", "几": "jǐ",
    "大": "dà", "把": "bǎ", "给": "gěi", "花": "huā", "喝": "hē", "往": "wǎng", "涨": "zhǎng", "抢": "qiǎng",
    "哪": "nǎ", "那": "nà", "这": "zhè", "个": "gè", "上": "shàng", "下": "xià", "里": "lǐ", "得": "de",
}

# ---- readings for multi-character tokens where CEDICT is missing, has two readings, or lacks the usual neutral tone
WORD = {}
# ---- proper nouns (capitalised)
NAME = {
    "中国": "Zhōngguó", "北京": "Běijīng", "上海": "Shànghǎi", "越南": "Yuènán", "河内": "Hénèi", "欧洲": "Ōuzhōu",
    "亚洲": "Yàzhōu", "美国": "Měiguó", "日本": "Rìběn", "日语": "Rìyǔ", "英国": "Yīngguó", "法国": "Fǎguó", "韩国": "Hánguó", "泰国": "Tàiguó", "越南语": "Yuènányǔ", "汉语": "Hànyǔ", "中文": "Zhōngwén", "英语": "Yīngyǔ", "长城": "Chángchéng",
    "春节": "Chūnjié", "中秋节": "Zhōngqiūjié", "国庆节": "Guóqìngjié", "长江": "Cháng Jiāng",
    "黄河": "Huáng Hé", "小王": "Xiǎo Wáng", "小李": "Xiǎo Lǐ", "小张": "Xiǎo Zhāng", "小明": "Xiǎomíng",
    "小刘": "Xiǎo Liú", "小陈": "Xiǎo Chén", "老王": "Lǎo Wáng", "老李": "Lǎo Lǐ", "老张": "Lǎo Zhāng",
    "王": "Wáng", "李": "Lǐ", "刘": "Liú", "陈": "Chén", "赵": "Zhào",
}
exec(open(os.path.join(HERE, "overrides.py"), encoding="utf8").read()) if os.path.exists(os.path.join(HERE, "overrides.py")) else None

# 一 keeps first tone in these tokens (ordinals, dates)
YI_KEEP = {"一月", "一号", "一日", "一楼", "一流", "一等", "一一", "一级", "一年级"}

PUNCT = {"，": ",", "。": ".", "？": "?", "！": "!", "、": ",", "：": ":", "；": ";", "“": "“", "”": "”", "…": "…", "—": "—", "《": "“", "》": "”"}
CJK = re.compile(r"^[一-鿿]+$")

# ---- dictionaries
cedict = {}
raw = open(os.path.join(ROOT, "vendor", "dict", "cedict.v1.js"), encoding="utf8").read()
for line in raw.split("\n"):
    p = line.split("\t")
    if len(p) >= 3 and CJK.match(p[0]):
        cedict[p[0]] = [p[i] for i in range(1, len(p), 2)]
hsk = set(open(os.path.join(HERE, "hsk1-5.txt"), encoding="utf8").read().split())
headword_py = {}
order = []
for line in open(os.path.join(HERE, "wordlist.tsv"), encoding="utf8"):
    h, py = line.rstrip("\n").split("\t")
    order.append(h)
    headword_py[h] = HEAD.get(h) or py.split(",")[0].replace(" ", "").strip()
    # the source list writes no apostrophes (e.g. "téngài"): take the CEDICT syllable split when it is the same reading
    if h not in HEAD and h in cedict:
        for r in cedict[h]:
            j = join_syllables([syl_to_marks(x) for x in r.split()])
            if "'" in j and j.replace("'", "") == headword_py[h].replace("'", ""):
                headword_py[h] = j
hsk |= set(order)

review_poly = {}
reviewed_file = os.path.join(HERE, "reviewed.txt")
REVIEWED = set(tuple(l.rstrip("\n").split("\t")[:2]) for l in open(reviewed_file, encoding="utf8")) if os.path.exists(reviewed_file) else set()


def read_token(tok, sample):
    """-> list of syllables for one word token (tone marks), using overrides, CEDICT, then pypinyin."""
    if tok in NAME:
        return [NAME[tok]], True
    if tok in WORD:
        return WORD[tok].split(), False
    if len(tok) == 1:
        if tok in CHAR:
            return [CHAR[tok]], False
        r = lazy_pinyin(tok, style=Style.TONE)[0]
        if tok in cedict and len(cedict[tok]) > 1:
            review_poly.setdefault((tok, r), sample)
        return [r], False
    if tok in headword_py and tok not in cedict:
        return None, False
    if tok in cedict:
        rs = cedict[tok]
        syl = [syl_to_marks(x) for x in rs[0].split()]
        if len(rs) > 1:
            review_poly.setdefault((tok, "".join(syl)), sample)
        return syl, False
    # greedy longest-match decomposition
    out, i = [], 0
    while i < len(tok):
        for L in range(min(4, len(tok) - i), 0, -1):
            piece = tok[i:i + L]
            if L == 1 or piece in WORD or piece in cedict:
                s, _ = read_token(piece, sample)
                out += s
                i += L
                break
    return out, False


def split_py(word):
    """Split a tone-marked headword pinyin into itself as a single unit (kept joined)."""
    return [word]


def sentence_pinyin(seg, where):
    toks = seg.split()
    units = []   # (kind, text, syllables)
    for t in toks:
        for part in re.findall(r"[一-鿿]+(?:\{[^}]*\})?|[^一-鿿\s]", t):
            m = re.match(r"^([一-鿿]+)\{([^}]*)\}$", part)
            if m:
                units.append(["w", m.group(1), m.group(2).split("-"), False])
            elif CJK.match(part):
                if part in headword_py and part not in WORD:
                    units.append(["w", part, None, False])
                else:
                    syl, proper = read_token(part, seg)
                    units.append(["w", part, syl, proper])
            elif part in PUNCT:
                units.append(["p", part, PUNCT[part], False])
            else:
                raise SystemExit(f"{where}: character not allowed in example: {part!r}")
    # sandhi for 一 / 不 at the start of a token
    for k, u in enumerate(units):
        if u[0] != "w" or u[2] is None or u[3]:
            continue
        h, syl = u[1], u[2]
        if h[0] in "一不" and strip_tone(syl[0]) in ("yi", "bu") and h not in YI_KEEP:
            nxt = None
            if len(syl) > 1:
                nxt = syl[1]
            elif k + 1 < len(units) and units[k + 1][0] == "w":
                n = units[k + 1]
                nxt = n[2][0] if n[2] else headword_first.get(n[1])
            if nxt:
                first = re.split(r"\s", nxt)[0]
                tn = tone_of(first_syllable(first))
                if h[0] == "一" and tone_of(syl[0]) == 1:
                    prev = units[k - 1][1] if k and units[k - 1][0] == "w" else ""
                    if not (prev.endswith("第") or prev.endswith("十")):
                        syl[0] = "yí" if tn == 4 or (first.lower().startswith("gè") or first.lower() == "ge") else "yì"
                elif h[0] == "不" and tone_of(syl[0]) == 4 and tn == 4:
                    syl[0] = "bú"
    out = ""
    for k, u in enumerate(units):
        if u[0] == "p":
            if u[1] == "“":
                out += (" " if out else "") + "“"
            else:
                out = out.rstrip() + u[2]
            continue
        w = headword_py[u[1]] if u[2] is None else (u[2][0] if u[3] else join_syllables(u[2]))
        attach = u[1] in ("们", "着") and k and units[k - 1][0] == "w" and u[2] is not None and u[2][0] in ("men", "zhe")
        # lesson style: verb-suffix 了 is attached (xiěle bàogào); clause-final 了 stands alone (xiě wán le.)
        if (u[1] == "了" and u[2] == ["le"] and k and units[k - 1][0] == "w"
                and k + 1 < len(units) and units[k + 1][0] == "w" and units[k + 1][1] not in ("吧", "吗", "呢", "啊", "啦", "嘛")):
            attach = True
        # lesson style: ordinals are hyphenated (dì-yī)
        if re.match(r"^第[一二三四五六七八九十百]+$", u[1]) and u[2] is not None:
            w = "dì-" + join_syllables(u[2][1:])
        if out and not out.endswith("“") and not attach:
            out += " "
        out += w
    out = re.sub(r"\s+", " ", out).strip()
    # lesson style: zhège / nàge / nǎge joined, hěn duō and dì yī written as in the lessons
    out = re.sub(r"(?<![a-zāáǎàēéěèīíǐìōóǒòūúǔùü])(zhè|nà|nǎ) gè(?![a-zāáǎàēéěèīíǐìōóǒòūúǔùü])", r"\1ge", out)
    out = re.sub(r"(?<![a-zāáǎàēéěèīíǐìōóǒòūúǔùü])hěnduō(?![a-zāáǎàēéěèīíǐìōóǒòūúǔùü])", "hěn duō", out)
    out = re.sub(r"(?<![a-zāáǎàēéěèīíǐìōóǒòūúǔùü])dì (yī|èr|sān|sì|wǔ|liù|qī|bā|jiǔ|shí)", r"dì-\1", out)
    out = re.sub(r"(^|[.?!]\s+|“)([a-zāáǎàēéěèīíǐìōóǒòūúǔù])", lambda m: m.group(1) + m.group(2).upper(), out)
    if out.startswith("“"):
        out = "“" + out[1:2].upper() + out[2:]
    zh = "".join(u[1] for u in units)
    return zh, out, units


def first_syllable(word):
    """Rough first syllable of a joined pinyin word: enough to read its tone."""
    m = re.match(r"^[^aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]*[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+", word.lower())
    return m.group(0) if m else word


HEADSET = set(HEAD)
headword_first = {h: first_syllable(p) for h, p in headword_py.items()}


def known(tok):
    if tok in hsk or tok in NAME or tok in ALLOW:
        return True
    if len(tok) == 1:
        return tok in hsk_chars
    for L in range(len(tok) - 1, 0, -1):
        if (tok[:L] in hsk or (L == 1 and tok[0] in hsk_chars)) and known(tok[L:]):
            return True
    return False


hsk_chars = set("".join(hsk))
ALLOW = set()
app_words = os.path.join(HERE, "app-words.txt")
if os.path.exists(app_words):
    hsk |= set(open(app_words, encoding="utf8").read().split())

entries, problems, oov = {}, [], {}
for f in sorted(glob.glob(os.path.join(HERE, "entries", "*.txt"))):
    for n, line in enumerate(open(f, encoding="utf8"), 1):
        line = line.rstrip("\n")
        if not line.strip() or line.startswith("#"):
            continue
        p = [x.strip() for x in line.split("|")]
        where = f"{os.path.basename(f)}:{n}"
        if len(p) != 7:
            problems.append(f"{where}: expected 7 fields, got {len(p)}: {line[:30]}")
            continue
        h = p[0]
        if h not in headword_py:
            problems.append(f"{where}: {h} is not in wordlist.tsv")
            continue
        if h in entries:
            problems.append(f"{where}: {h} entered twice")
        zh, py, units = sentence_pinyin(p[4], where)
        if h not in zh:
            problems.append(f"{where}: example does not contain {h}: {zh}")
        nchar = len(re.findall(r"[一-鿿]", zh))
        if not 8 <= nchar <= 20:
            problems.append(f"{where}: {h} example has {nchar} characters: {zh}")
        if not zh[-1] in "。？！":
            problems.append(f"{where}: {h} example lacks final punctuation")
        for u in units:
            if u[0] == "w" and not known(u[1]):
                oov.setdefault(u[1], f"{h}: {zh}")
        entries[h] = {"hanzi": h, "pinyin": headword_py[h], "pos": p[1], "level": "HSK5", "vi": p[3], "en": p[2],
                      "example": {"zh": zh, "py": py, "vi": p[6], "en": p[5]}}

done = [h for h in order if h in entries]
missing = [h for h in order if h not in entries]
if problems:
    print("\n".join(problems))
if REVIEW:
    print("--- polyphonic tokens (reading chosen | sample)")
    for (t, r), s in sorted(review_poly.items()):
        if (t, r) in REVIEWED:
            continue
        print(f"{t}\t{r}\t{s}")
    print("--- tokens outside HSK 1-5 (heuristic)")
    for t, s in sorted(oov.items()):
        print(f"{t}\t{s}")

for old in glob.glob(os.path.join(OUT, "words*.js")):
    os.remove(old)
os.makedirs(OUT, exist_ok=True)
# only whole packs are written, in list order
seq = []
for h in order:
    if h not in entries:
        break
    seq.append(h)
if len(seq) < len(order):
    seq = seq[: len(seq) // PACK * PACK]
npack = 0
for i in range(0, len(seq), PACK):
    npack += 1
    chunk = seq[i:i + PACK]
    words = []
    for k, h in enumerate(chunk):
        w = {"id": "h5-%04d" % (i + k + 1)}
        w.update(entries[h])
        words.append(w)
    head = ("/* HSK 5 word pack %d: HSK 2.0 level-5 vocabulary (words not already in the HSK 1-4 lessons and decks).\n"
            "   Generated by tools/hsk5/build_hsk5.py; do not edit by hand. Word list: see data/hsk5/README.md.\n"
            "   Meanings and example sentences were machine-written for this app and are not yet human-checked. */\n" % npack)
    body = ",\n    ".join(json.dumps(w, ensure_ascii=False) for w in words)
    js = (head + "(window.CB_HSK5 = window.CB_HSK5 || []).push({\n"
          '  "pack": %d,\n  "checked": false,\n  "title": %s,\n  "range": %s,\n  "words": [\n    %s\n  ]\n});\n'
          % (npack, json.dumps({"en": "HSK 5 · Pack %d" % npack, "vi": "HSK 5 · Gói %d" % npack}, ensure_ascii=False),
             json.dumps(chunk[0] + " – " + chunk[-1], ensure_ascii=False), body))
    open(os.path.join(OUT, "words%02d.js" % npack), "w", encoding="utf8").write(js)
print(f"entries: {len(entries)} / {len(order)} | written: {len(seq)} words in {npack} packs | missing: {len(missing)}"
      + (f" (next: {' '.join(missing[:8])})" if missing else ""))
sys.exit(1 if problems else 0)
