#!/usr/bin/env python3
"""iOS launch screens (apple-touch-startup-image): the app icon, centred on the light background colour.

    python3 tools/gen_splash.py          # writes icons/splash/<w>x<h>.png and prints the <link> tags for index.html

Needs Pillow. iOS only shows a launch image whose size matches the phone exactly, so there is one per screen size
(portrait only, like the manifest). The files are small because they use a 64-colour palette.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BG = (0xEC, 0xE8, 0xFA)  # --bg of the light theme in css/style.css
# CSS width, CSS height, pixel ratio
SIZES = [(375, 667, 2),   # SE 2/3, 8
         (414, 736, 3),   # 8 Plus
         (375, 812, 3),   # X, XS, 11 Pro, 12/13 mini
         (414, 896, 2),   # XR, 11
         (414, 896, 3),   # XS Max, 11 Pro Max
         (390, 844, 3),   # 12, 13, 14, 16e
         (428, 926, 3),   # 12/13 Pro Max, 14 Plus
         (393, 852, 3),   # 14 Pro, 15, 16
         (430, 932, 3),   # 14 Pro Max, 15/16 Plus
         (402, 874, 3),   # 16 Pro, 17
         (440, 956, 3)]   # 16 Pro Max, 17 Pro Max


def main():
    out = os.path.join(ROOT, "icons", "splash")
    os.makedirs(out, exist_ok=True)
    icon = Image.open(os.path.join(ROOT, "icons", "icon-512.png")).convert("RGB")
    total, tags = 0, []
    for w, h, r in SIZES:
        W, H = w * r, h * r
        side = 96 * r  # 96 CSS px on every phone
        ic = icon.resize((side * 4, side * 4), Image.LANCZOS)
        mask = Image.new("L", ic.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, ic.size[0] - 1, ic.size[1] - 1], radius=int(side * 4 * 0.225), fill=255)
        tile = Image.new("RGB", ic.size, BG); tile.paste(ic, (0, 0), mask)
        tile = tile.resize((side, side), Image.LANCZOS)
        im = Image.new("RGB", (W, H), BG)
        im.paste(tile, ((W - side) // 2, (H - side) // 2))
        im = im.quantize(colors=64, method=Image.MEDIANCUT, dither=Image.NONE)
        name = "%dx%d.png" % (W, H)
        im.save(os.path.join(out, name), optimize=True)
        total += os.path.getsize(os.path.join(out, name))
        tags.append('  <link rel="apple-touch-startup-image" media="screen and (device-width: %dpx) and (device-height: %dpx) and (-webkit-device-pixel-ratio: %d) and (orientation: portrait)" href="icons/splash/%s">' % (w, h, r, name))
    print("\n".join(tags))
    print("%d files, %.1f KB" % (len(SIZES), total / 1024.0))


if __name__ == "__main__":
    main()
