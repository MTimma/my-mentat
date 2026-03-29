#!/usr/bin/env python3
"""
Extract individual conflict card crops and reward icon sprites from client/public/conflicts.png.
Requires Pillow (project venv: .venv-img:  python3 -m venv .venv-img && .venv-img/bin/pip install pillow).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "client/public/conflicts.png"
OUT_CARDS = ROOT / "client/public/conflicts/cards"
OUT_ICONS = ROOT / "client/public/icon"
OUT_SHEET = ROOT / "client/public/conflicts/conflicts-cards-only.png"


def icon_bbox_in_card(card_arr: np.ndarray) -> list[tuple[int, int, int, int] | None]:
    """Return tight boxes (x0,y0,x1,y1) in card coordinates for each of 3 reward tiers."""
    h, w = card_arr.shape[:2]
    hh = h // 3
    out: list[tuple[int, int, int, int] | None] = []
    for t in range(3):
        y0b = int(t * hh + hh * 0.12)
        y1b = int(t * hh + hh * 0.92)
        band = card_arr[y0b:y1b, int(w * 0.38) : int(w * 0.90), :]
        r, g, b, a = band[:, :, 0], band[:, :, 1], band[:, :, 2], band[:, :, 3]
        fg = (a > 45) & ((r + g + b) > 90)
        ys, xs = np.where(fg)
        if len(xs) == 0:
            out.append(None)
            continue
        pad = 1
        ox = int(w * 0.38)
        x0 = ox + int(xs.min()) - pad
        x1 = ox + int(xs.max()) + pad + 1
        y0_ = y0b + int(ys.min()) - pad
        y1_ = y0b + int(ys.max()) + pad + 1
        out.append((x0, y0_, x1, y1_))
    return out


def crop_icon_global(
    im: Image.Image,
    card_x0: int,
    card_y0: int,
    card_x1: int,
    card_y1: int,
    tier_index: int,
    *,
    keep_left_fraction: float | None = None,
) -> Image.Image:
    arr = np.array(im.crop((card_x0, card_y0, card_x1, card_y1)))
    boxes = icon_bbox_in_card(arr)
    b = boxes[tier_index]
    if b is None:
        raise RuntimeError("No icon bbox in tier")
    x0, y0, x1, y1 = b
    if keep_left_fraction is not None:
        w = x1 - x0
        x1 = x0 + max(1, int(w * keep_left_fraction))
    gx0, gy0 = card_x0 + x0, card_y0 + y0
    gx1, gy1 = card_x0 + x1, card_y0 + y1
    return im.crop((gx0, gy0, gx1, gy1))


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    if (w, h) != (700, 921):
        raise SystemExit(f"Unexpected size {w}x{h}; update x_edges / layout if source changed.")

    x_edges = [13, 109, 229, 347, 456, 576, 687]

    rows = [
        (26, 188, 6, None),
        (280, 442, 5, [0, 1, 2, 3, 4]),
        (465, 630, 6, None),
        (731, 893, 5, [0, 1, 2, 3, 4]),
    ]

    names = [
        [
            "skirmish-1",
            "skirmish-2",
            "skirmish-3",
            "skirmish-4",
            "skirmish-5",
            "skirmish-6",
        ],
        [
            "terrible-purpose",
            "secure-imperial-basin",
            "siege-of-carthag",
            "siege-of-arrakeen",
            "desert-power",
        ],
        [
            "raid-stockpiles",
            "trade-monopoly",
            "guild-bank-raid",
            "sort-through-the-chaos",
            "machinations",
            "cloak-and-dagger",
        ],
        [
            "economic-supremacy",
            "battle-for-arrakeen",
            "battle-for-carthag",
            "battle-for-imperial-basin",
            "grand-vision",
        ],
    ]

    OUT_CARDS.mkdir(parents=True, exist_ok=True)
    OUT_ICONS.mkdir(parents=True, exist_ok=True)
    OUT_SHEET.parent.mkdir(parents=True, exist_ok=True)

    crops: list[Image.Image] = []
    count = 0
    for row_i, (y0, y1, n, slots) in enumerate(rows):
        use = list(range(n)) if slots is None else slots
        assert len(use) == n
        assert len(names[row_i]) == n
        for j, slot in enumerate(use):
            xa, xb = x_edges[slot], x_edges[slot + 1]
            crop = im.crop((xa, y0, xb, y1))
            crops.append(crop)
            crop.save(OUT_CARDS / f"{names[row_i][j]}.png")
            count += 1

    # Icons — SKIRMISH row: card columns 0..5 map to edges 0..5
    # tier 0 = 1st, 1 = 2nd, 2 = 3rd
    def card_rect(col: int, y0: int, y1: int) -> tuple[int, int, int, int]:
        return (x_edges[col], y0, x_edges[col + 1], y1)

    r1 = (26, 188)
    # VP — skirmish-1, 1st
    crop_icon_global(im, *card_rect(0, *r1), 0).save(OUT_ICONS / "vp.png")
    # Intrigue draw — skirmish-2, 2nd (left icon only; right is Solari)
    crop_icon_global(im, *card_rect(1, *r1), 1, keep_left_fraction=0.44).save(OUT_ICONS / "intrigue.png")
    crop_icon_global(im, *card_rect(1, *r1), 1, keep_left_fraction=0.44).save(OUT_ICONS / "draw.png")
    # Influence — skirmish-1, 3rd
    crop_icon_global(im, *card_rect(0, *r1), 2).save(OUT_ICONS / "influence.png")
    # 2× Influence — skirmish-3, 2nd
    crop_icon_global(im, *card_rect(2, *r1), 1).save(OUT_ICONS / "influence-2x.png")
    # Troops (bumps / shield) — skirmish-3, 1st (left icon only; right is troop cube)
    crop_icon_global(im, *card_rect(2, *r1), 0, keep_left_fraction=0.52).save(OUT_ICONS / "troops.png")

    # Mosaic: rows of 6 / 5 / 6 / 5 with uniform cell = max card size
    max_w = max(c.width for c in crops)
    max_h = max(c.height for c in crops)
    layout = [6, 5, 6, 5]
    sheet_w = max_w * 6
    sheet_h = sum(max_h for _ in layout)
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    i = 0
    y_off = 0
    for row_len in layout:
        for col in range(row_len):
            c = crops[i]
            sheet.paste(c, (col * max_w + (max_w - c.width) // 2, y_off + (max_h - c.height) // 2))
            i += 1
        y_off += max_h
    sheet.save(OUT_SHEET)

    print(f"Wrote {count} card PNGs under {OUT_CARDS}")
    print(f"Wrote icons: vp, intrigue, draw, influence, influence-2x, troops under {OUT_ICONS}")
    print(f"Wrote sheet {OUT_SHEET}")


if __name__ == "__main__":
    main()
