#!/usr/bin/env python3
"""Remove solid edge backgrounds from game icon PNGs (beige/gray matte)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ICON_DIR = Path(__file__).resolve().parents[1] / "public" / "icon"
TOLERANCE = 42
FEATHER = 18


def edge_bg_color(im: Image.Image) -> tuple[int, int, int]:
    w, h = im.size
    samples: list[tuple[int, int, int]] = []
    step = max(1, min(w, h) // 8)
    for x in range(0, w, step):
        samples.append(im.getpixel((x, 0))[:3])
        samples.append(im.getpixel((x, h - 1))[:3])
    for y in range(0, h, step):
        samples.append(im.getpixel((0, y))[:3])
        samples.append(im.getpixel((w - 1, y))[:3])
    rs = sorted(s[0] for s in samples)
    gs = sorted(s[1] for s in samples)
    bs = sorted(s[2] for s in samples)
    mid = len(rs) // 2
    return rs[mid], gs[mid], bs[mid]


def mostly_transparent(im: Image.Image) -> bool:
    w, h = im.size
    transparent = sum(1 for y in range(h) for x in range(w) if im.getpixel((x, y))[3] < 16)
    return transparent / (w * h) > 0.35


def remove_background(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    if mostly_transparent(im):
        return im
    bg = edge_bg_color(im)
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            dist = math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)
            if dist <= TOLERANCE:
                px[x, y] = (r, g, b, 0)
            elif dist <= TOLERANCE + FEATHER:
                t = (dist - TOLERANCE) / FEATHER
                px[x, y] = (r, g, b, int(a * t))
    return im


def main() -> None:
    for path in sorted(ICON_DIR.glob("*.png")):
        im = Image.open(path)
        out = remove_background(im)
        out.save(path, optimize=True)
        print(f"processed {path.name}")


if __name__ == "__main__":
    main()
