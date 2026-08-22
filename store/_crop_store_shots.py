# -*- coding: utf-8 -*-
"""从使用截图生成 Edge 商店用 logo / 截图。"""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\Administrator\.cursor\projects\d\assets\c__Users_Administrator_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-f253f431-39c2-4087-a111-57882a688544.png"
ICON = os.path.join(os.path.dirname(ROOT), "icons", "icon-source.png")
if not os.path.isfile(ICON):
    ICON = os.path.join(os.path.dirname(ROOT), "icons", "icon128.png")


def cover_from_right(im: Image.Image, tw: int, th: int) -> Image.Image:
    target_aspect = tw / th
    w, h = im.size
    if w / h > target_aspect:
        nw = max(1, int(h * target_aspect))
        left = max(0, w - nw)
        im = im.crop((left, 0, w, h))
    else:
        nh = max(1, int(w / target_aspect))
        top = max(0, (h - nh) // 2)
        im = im.crop((0, top, w, top + nh))
    return im.resize((tw, th), Image.Resampling.LANCZOS)


def main():
    im = Image.open(SRC).convert("RGB")
    print("src", im.size)

    shot = cover_from_right(im, 1280, 800)
    p1 = os.path.join(ROOT, "screenshot-1280x800.png")
    shot.save(p1, "PNG", optimize=True)
    print("OK", p1)

    icon = Image.open(ICON).convert("RGBA")
    logo = icon.resize((300, 300), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (300, 300), (255, 255, 255))
    canvas.paste(logo, (0, 0), logo)
    p2 = os.path.join(ROOT, "logo-300.png")
    canvas.save(p2, "PNG", optimize=True)
    print("OK", p2)


if __name__ == "__main__":
    main()
