#!/usr/bin/env python3
"""Build vendor/chars/chars.v1.js: one entry per course character (and per part of one) for the character card (#/char/X).

Inputs (download them anywhere, then pass the paths):
  1. Make Me a Hanzi dictionary.txt  https://github.com/skishore/makemeahanzi  (LGPL-3.0) — parts, origin type, hint,
     which stroke belongs to which part
  2. hanviet-pinyin-words src/hanvietData.js  (npm, MIT, (c) 2024 Phong Phan) — Hán Việt readings by pinyin
  3. unihan.db from the cjk-unihan npm package (SQLite copy of Unicode's Unihan; Unicode licence) — traditional forms
     (Hán Việt is keyed by traditional characters), definitions and kVietnamese as a fallback

  python3 tools/build_chars.py <dictionary.txt> <hanvietData.js> <unihan.db>

The course characters are the files in vendor/hanzi/ (stroke data). The output keeps only what the card shows.
When the content changes, write chars.v2.js and update CHARS_URL in js/app/11-chars.js (the file is cached cache-first).
"""
import json, os, re, sqlite3, sys, unicodedata, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDC2 = set("⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻")
IDC3 = set("⿲⿳")

# Common radicals and parts: Hán Việt name and a short Vietnamese meaning (written for this app).
# Variant shapes point at the full character's name.
RAD_VI = {
    "言": ("ngôn", "lời nói"), "讠": ("ngôn", "lời nói"), "水": ("thủy", "nước"), "氵": ("thủy", "nước"), "氺": ("thủy", "nước"),
    "手": ("thủ", "tay"), "扌": ("thủ", "tay"), "人": ("nhân", "người"), "亻": ("nhân", "người"), "儿": ("nhân", "người (chân người)"),
    "心": ("tâm", "tim, lòng"), "忄": ("tâm", "tim, lòng"), "⺗": ("tâm", "tim, lòng"), "口": ("khẩu", "miệng"), "囗": ("vi", "vây quanh"),
    "女": ("nữ", "phụ nữ"), "子": ("tử", "con"), "宀": ("miên", "mái nhà"), "木": ("mộc", "cây, gỗ"), "艹": ("thảo", "cỏ"), "艸": ("thảo", "cỏ"),
    "日": ("nhật", "mặt trời, ngày"), "月": ("nguyệt", "trăng (hoặc thịt)"), "肉": ("nhục", "thịt"), "土": ("thổ", "đất"),
    "纟": ("mịch", "sợi tơ"), "糸": ("mịch", "sợi tơ"), "钅": ("kim", "kim loại"), "金": ("kim", "kim loại, vàng"), "饣": ("thực", "ăn"),
    "食": ("thực", "ăn"), "辶": ("sước", "bước đi"), "走": ("tẩu", "chạy, đi"), "足": ("túc", "chân"), "⻊": ("túc", "chân"),
    "目": ("mục", "mắt"), "贝": ("bối", "vỏ sò, tiền"), "貝": ("bối", "vỏ sò, tiền"), "车": ("xa", "xe"), "火": ("hỏa", "lửa"),
    "灬": ("hỏa", "lửa"), "礻": ("thị", "thần, cúng tế"), "示": ("thị", "thần, cúng tế"), "衤": ("y", "áo"), "衣": ("y", "áo"),
    "疒": ("nạch", "bệnh"), "广": ("nghiễm", "mái hiên, nhà"), "门": ("môn", "cửa"), "阝": ("phụ / ấp", "gò đất / thành ấp"),
    "刂": ("đao", "dao"), "刀": ("đao", "dao"), "力": ("lực", "sức"), "犭": ("khuyển", "chó, thú"), "犬": ("khuyển", "chó"),
    "王": ("ngọc", "ngọc"), "玉": ("ngọc", "ngọc"), "石": ("thạch", "đá"), "禾": ("hòa", "lúa"), "竹": ("trúc", "tre"),
    "⺮": ("trúc", "tre"), "米": ("mễ", "gạo"), "页": ("hiệt", "đầu"), "雨": ("vũ", "mưa"), "马": ("mã", "ngựa"), "鸟": ("điểu", "chim"),
    "鱼": ("ngư", "cá"), "虫": ("trùng", "sâu bọ"), "山": ("sơn", "núi"), "彳": ("xích", "bước chân"), "攵": ("phộc", "đánh, tác động"),
    "攴": ("phộc", "đánh, tác động"), "欠": ("khiếm", "há miệng, thiếu"), "冫": ("băng", "băng, lạnh"), "白": ("bạch", "trắng"),
    "立": ("lập", "đứng"), "田": ("điền", "ruộng"), "皿": ("mãnh", "bát đĩa"), "见": ("kiến", "nhìn thấy"), "舟": ("chu", "thuyền"),
    "耳": ("nhĩ", "tai"), "酉": ("dậu", "bình rượu"), "户": ("hộ", "cửa"), "巾": ("cân", "khăn"), "尸": ("thi", "thân người"),
    "大": ("đại", "to, lớn"), "小": ("tiểu", "nhỏ"), "夕": ("tịch", "chiều tối"), "方": ("phương", "vuông, hướng"),
    "隹": ("chuy", "chim"), "羊": ("dương", "con dê, con cừu"), "⺶": ("dương", "con dê, con cừu"), "⺷": ("dương", "con dê, con cừu"),
    "牛": ("ngưu", "trâu bò"), "牜": ("ngưu", "trâu bò"), "网": ("võng", "lưới"), "罒": ("võng", "lưới"), "寸": ("thốn", "tấc, bàn tay"),
    "弓": ("cung", "cái cung"), "戈": ("qua", "cây giáo"), "斤": ("cân", "cái rìu"), "殳": ("thù", "binh khí"), "又": ("hựu", "bàn tay"),
    "厂": ("hán", "sườn núi"), "冖": ("mịch", "khăn trùm"), "亠": ("đầu", "nắp, đầu"), "八": ("bát", "tám, chia ra"), "十": ("thập", "mười"),
    "一": ("nhất", "một"), "几": ("kỷ", "cái ghế"), "卩": ("tiết", "đốt tre"), "厶": ("khư", "riêng tư"), "匕": ("chủy", "cái thìa"),
    "勹": ("bao", "bao bọc"), "工": ("công", "người thợ"), "己": ("kỷ", "bản thân"), "干": ("can", "cái khiên"), "幺": ("yêu", "nhỏ bé"),
    "廾": ("củng", "chắp tay"), "彡": ("sam", "lông, nét vẽ"), "文": ("văn", "văn, nét vẽ"), "斗": ("đẩu", "cái đấu"), "毛": ("mao", "lông"),
    "气": ("khí", "hơi"), "片": ("phiến", "mảnh"), "牙": ("nha", "răng"), "甘": ("cam", "ngọt"), "生": ("sinh", "sống, sinh ra"),
    "用": ("dụng", "dùng"), "皮": ("bì", "da"), "矢": ("thỉ", "mũi tên"), "穴": ("huyệt", "hang"), "老": ("lão", "già"), "耂": ("lão", "già"),
    "自": ("tự", "tự mình, cái mũi"), "至": ("chí", "đến"), "舌": ("thiệt", "cái lưỡi"), "色": ("sắc", "màu"), "虍": ("hổ", "vằn hổ"),
    "血": ("huyết", "máu"), "行": ("hành", "đi"), "西": ("tây", "phía tây"), "覀": ("á", "che đậy"), "角": ("giác", "cái sừng"),
    "谷": ("cốc", "thung lũng"), "豆": ("đậu", "hạt đậu"), "身": ("thân", "thân mình"), "辛": ("tân", "cay"), "里": ("lý", "làng, dặm"),
    "青": ("thanh", "xanh"), "革": ("cách", "da thuộc"), "音": ("âm", "âm thanh"), "风": ("phong", "gió"), "飞": ("phi", "bay"),
    "首": ("thủ", "đầu"), "香": ("hương", "thơm"), "高": ("cao", "cao"), "鬼": ("quỷ", "ma"), "麻": ("ma", "cây gai"), "黑": ("hắc", "đen"),
    "齿": ("xỉ", "răng"), "夂": ("truy", "đi chậm"), "止": ("chỉ", "dừng"), "歹": ("đãi", "xấu"), "父": ("phụ", "cha"), "爪": ("trảo", "móng vuốt"),
    "爫": ("trảo", "móng vuốt"), "母": ("mẫu", "mẹ"), "比": ("tỷ", "so sánh"), "长": ("trường", "dài"), "门": ("môn", "cửa"),
    "非": ("phi", "không phải"), "面": ("diện", "mặt"), "鼻": ("tỵ", "mũi"), "瓜": ("qua", "quả dưa"), "瓦": ("ngõa", "ngói"),
    "臣": ("thần", "bề tôi"), "而": ("nhi", "mà, râu"), "龙": ("long", "rồng"), "丶": ("chủ", "dấu chấm"), "丿": ("phiệt", "nét phẩy"),
    "乙": ("ất", "can Ất"), "亅": ("quyết", "nét móc"), "冂": ("quynh", "vùng biên"), "凵": ("khảm", "há miệng"), "匚": ("phương", "cái hộp"),
    "卜": ("bốc", "bói"), "士": ("sĩ", "học trò"), "尢": ("uông", "yếu"), "巛": ("xuyên", "sông"), "川": ("xuyên", "sông"),
    "廴": ("dẫn", "bước dài"), "弋": ("dặc", "bắn"), "无": ("vô", "không"), "曰": ("viết", "nói"), "毋": ("vô", "chớ"), "氏": ("thị", "họ"),
    "爻": ("hào", "hào (quẻ)"), "疋": ("sơ", "đơn vị vải"), "癶": ("bát", "gạt ra"), "缶": ("phẫu", "đồ sành"), "羽": ("vũ", "lông vũ"),
    "聿": ("duật", "cây bút"), "臼": ("cữu", "cái cối"), "艮": ("cấn", "bền"), "见": ("kiến", "nhìn thấy"), "辰": ("thần", "thời gian"),
    "邑": ("ấp", "thành ấp"), "阜": ("phụ", "gò đất"), "隶": ("đãi", "kịp"), "韦": ("vi", "da thuộc"), "飠": ("thực", "ăn"),
    "鬲": ("cách", "cái đỉnh"), "鹿": ("lộc", "con hươu"), "黄": ("hoàng", "vàng"), "鼓": ("cổ", "cái trống"), "鼠": ("thử", "con chuột"),
    "⺈": ("đao", "dao"), "⺊": ("bốc", "bói"), "⺌": ("tiểu", "nhỏ"), "⺍": ("tiểu", "nhỏ"), "⺧": ("ngưu", "trâu bò"), "⺨": ("khuyển", "chó, thú"),
    "⺩": ("ngọc", "ngọc"), "⺪": ("sơ", "đơn vị vải"), "⺫": ("võng", "lưới"), "⺼": ("nhục", "thịt"), "⻌": ("sước", "bước đi"),
    "⻏": ("ấp", "thành ấp"), "⻖": ("phụ", "gò đất"), "⺆": ("quynh", "vùng biên"), "⺄": ("ất", "can Ất"), "⺀": ("băng", "băng, lạnh"),
    "⺁": ("hán", "sườn núi"), "⺅": ("nhân", "người"), "⺉": ("đao", "dao"), "⺋": ("tiết", "đốt tre"), "⺮": ("trúc", "tre"),
}

TONE_MARKS = {"ā": ("a", 1), "á": ("a", 2), "ǎ": ("a", 3), "à": ("a", 4), "ē": ("e", 1), "é": ("e", 2), "ě": ("e", 3), "è": ("e", 4),
              "ī": ("i", 1), "í": ("i", 2), "ǐ": ("i", 3), "ì": ("i", 4), "ō": ("o", 1), "ó": ("o", 2), "ǒ": ("o", 3), "ò": ("o", 4),
              "ū": ("u", 1), "ú": ("u", 2), "ǔ": ("u", 3), "ù": ("u", 4), "ǖ": ("v", 1), "ǘ": ("v", 2), "ǚ": ("v", 3), "ǜ": ("v", 4), "ü": ("v", 0)}


def numbered(py):
    """xiáng -> xiang2 (the key style of hanvietData)"""
    tone, out = 5, ""
    for ch in py.lower():
        if ch in TONE_MARKS:
            base, t = TONE_MARKS[ch]
            out += base
            if t: tone = t
        else:
            out += ch
    return out + str(tone)


def parse_ids(s, i=0):
    """Return (tree, next_index). tree = char | (op, [children])"""
    ch = s[i]
    if ch in IDC2 or ch in IDC3:
        n = 3 if ch in IDC3 else 2
        kids, j = [], i + 1
        for _ in range(n):
            if j >= len(s): break
            k, j = parse_ids(s, j)
            kids.append(k)
        return (ch, kids), j
    return ch, i + 1


def to_ids(t):
    return t if isinstance(t, str) else t[0] + "".join(to_ids(k) for k in t[1])


def find_path(t, target, path=()):
    if isinstance(t, str): return path if t == target else None
    for i, k in enumerate(t[1]):
        p = find_path(k, target, path + (i,))
        if p is not None: return p
    return None


def main(dict_path, hv_path, db_path):
    mm = {}
    for line in open(dict_path, encoding="utf-8"):
        d = json.loads(line)
        mm[d["character"]] = d
    by_ids = {}
    for c, d in mm.items():
        if d.get("decomposition") and len(c) == 1: by_ids.setdefault(d["decomposition"], c)
    src = open(hv_path, encoding="utf-8").read()
    hvd = json.loads(src[src.index("{"):src.rindex("}") + 1])
    db = sqlite3.connect(db_path)

    def uni(ch):
        r = db.execute("select kTraditionalVariant,kDefinition,kVietnamese,kSemanticVariant,kZVariant from unihan where character=?", (ch,)).fetchone()
        return r or ("", "", "", "", "")

    def cps(field):
        return [chr(int(x[2:].split("<")[0], 16)) for x in (field or "").split() if x.startswith("U+")]

    def hanviet(ch, pys):
        """Hán Việt for each pinyin reading of ch, from the character itself, then its traditional forms and variants."""
        u = uni(ch)
        cands = [ch] + cps(u[0]) + cps(u[3]) + cps(u[4])
        out = []
        for py in pys or [""]:
            k, got = numbered(py) if py else "", []
            k2 = k.replace("v", "u:")
            for c in cands:
                e = hvd.get(c)
                if not e: continue
                got = e.get("*") or e.get(k) or e.get(k2) or (e[list(e)[0]] if len(e) == 1 or not py else [])
                if got: break
            out.append(", ".join(got[:2]))
        if not any(out):
            for c in cands:
                v = uni(c)[2]
                if v: return [v.split()[0]]
        return out

    hz_dir = os.path.join(ROOT, "vendor", "hanzi")
    course = sorted(f[:-5] for f in os.listdir(hz_dir) if f.endswith(".json") and len(f[:-5]) == 1)
    out, parts_needed, warn = {}, set(), []

    def entry(ch, full):
        d = mm.get(ch, {})
        py = [p for p in (d.get("pinyin") or []) if p][:3]
        e = {}
        if py: e["py"] = py
        hv = [x for x in hanviet(ch, py) if x]
        if hv: e["hv"] = hv if len(hv) > 1 and len(set(hv)) > 1 else hv[0]
        definition = d.get("definition") or uni(ch)[1] or ""
        if definition: e["d"] = definition[:90]
        if ch in RAD_VI:
            e["rn"], e["rv"] = RAD_VI[ch]  # radical name (Hán Việt) and Vietnamese meaning
        if not full: return e
        ids = d.get("decomposition") or ""
        ety = d.get("etymology") or {}
        if ids and ids[0] in IDC2 | IDC3 and "？" not in ids[:1]:
            tree, _ = parse_ids(ids)
            if not isinstance(tree, str):
                e["lay"] = tree[0]
                ks = []
                for k in tree[1]:
                    c = k if isinstance(k, str) else by_ids.get(to_ids(k), "")
                    ks.append(c if c and c != "？" else "")  # "" keeps the place of a part with no single character
                if any(ks): e["k"] = ks
                # which part each stroke belongs to: "s" meaning part, "p" sound part, or the top-level part index
                matches = d.get("matches") or []
                try:
                    strokes = json.load(open(os.path.join(hz_dir, ch + ".json"), encoding="utf-8"))["strokes"]
                except FileNotFoundError:
                    strokes = []
                sp = find_path(tree, ety.get("semantic")) if ety.get("type") == "pictophonetic" and ety.get("semantic") else None
                pp = find_path(tree, ety.get("phonetic")) if ety.get("type") == "pictophonetic" and ety.get("phonetic") else None
                if strokes and len(matches) == len(strokes) and all(m is not None for m in matches):
                    roles = ""
                    for m in matches:
                        m = tuple(m)
                        if sp is not None and m[:len(sp)] == sp: roles += "s"
                        elif pp is not None and m[:len(pp)] == pp: roles += "p"
                        elif sp is not None or pp is not None: roles += "."
                        else: roles += str(m[0]) if m else "."
                    e["r"] = roles
                elif strokes:
                    warn.append(ch + " strokes " + str(len(strokes)) + " matches " + str(len(matches)))
        if ety.get("type"):
            e["t"] = {"pictophonetic": "p", "ideographic": "i", "pictographic": "g"}.get(ety["type"], "")
            if ety.get("semantic"): e["s"] = ety["semantic"]
            if ety.get("phonetic"): e["p"] = ety["phonetic"]
            if ety.get("hint"): e["h"] = ety["hint"][:160]
        for c in [x for x in (e.get("k") or []) if x] + [e.get("s", ""), e.get("p", "")]:
            if c and c != ch: parts_needed.add(c)
        try:
            e["n"] = len(json.load(open(os.path.join(hz_dir, ch + ".json"), encoding="utf-8"))["strokes"])
        except FileNotFoundError:
            pass
        return e

    for ch in course: out[ch] = entry(ch, True)
    for ch in sorted(parts_needed):
        if ch not in out: out[ch] = entry(ch, False)
    nohv = [c for c in course if "hv" not in out[c]]
    js = ("/* Character card data (#/char/X). Generated by tools/build_chars.py — do not edit by hand.\n"
          "   Parts, origin and stroke-to-part matches: Make Me a Hanzi dictionary.txt (LGPL-3.0, github.com/skishore/makemeahanzi).\n"
          "   Hán Việt: hanviet-pinyin-words (MIT, (c) 2024 Phong Phan). Traditional forms, definitions: Unicode Unihan (Unicode licence).\n"
          "   Radical names and Vietnamese meanings of parts: written for this app. See vendor/chars/README.md. */\n"
          "window.CB_CHARS=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    os.makedirs(os.path.join(ROOT, "vendor", "chars"), exist_ok=True)
    path = os.path.join(ROOT, "vendor", "chars", "chars.v1.js")
    open(path, "w", encoding="utf-8").write(js)
    print("wrote", path, len(js.encode("utf-8")), "bytes;", len(course), "course characters,", len(out) - len(course), "parts;",
          "no Hán Việt:", "".join(nohv) or "none", "; stroke/part mismatches:", len(warn))
    for w in warn[:20]: print("  ", w)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__); sys.exit(2)
    main(*sys.argv[1:])
