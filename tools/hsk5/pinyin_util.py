"""Pinyin helpers for the HSK 5 generator (tools/hsk5/build_hsk5.py)."""
import re

MARKS = {"a": "āáǎà", "e": "ēéěè", "i": "īíǐì", "o": "ōóǒò", "u": "ūúǔù", "ü": "ǖǘǚǜ"}
TONED = {m: (v, i + 1) for v, ms in MARKS.items() for i, m in enumerate(ms)}


def syl_to_marks(s):
    """'lv4' -> 'lǜ', 'r5' -> 'r', 'xian4' -> 'xiàn'."""
    m = re.match(r"^([a-zü:v]+)([1-5])$", s.lower())
    if not m:
        return s
    body, tone = m.group(1).replace("u:", "ü").replace("v", "ü"), int(m.group(2))
    if tone == 5:
        return body
    if "a" in body:
        v = "a"
    elif "e" in body:
        v = "e"
    elif "ou" in body:
        v = "o"
    else:
        v = [c for c in body if c in "aeiouü"][-1] if any(c in "aeiouü" for c in body) else None
    if v is None:
        return body
    i = body.rindex(v) if v not in "ae" and "ou" not in body else body.index(v)
    return body[:i] + MARKS[v][tone - 1] + body[i + 1:]


def tone_of(syl):
    """Tone (1-4, or 5 for neutral) of a tone-marked syllable."""
    for c in syl:
        if c in TONED:
            return TONED[c][1]
    return 5


def strip_tone(s):
    return "".join(TONED[c][0] if c in TONED else c for c in s)


def join_syllables(syls):
    """Join syllables of one word; apostrophe before a/o/e-initial syllables."""
    out = ""
    for k, s in enumerate(syls):
        if k and s != "r" and strip_tone(s)[0] in "aoe":
            out += "'"
        out += s
    return out


def numeric_to_word(numeric):
    """CEDICT 'fang1 an4' -> (['fāng','àn'])."""
    return [syl_to_marks(x) for x in numeric.split()]
