#!/usr/bin/env python3
"""
Remove white/gray scan padding and edge halos from card art.

Uses a perimeter flood-fill (all image edges) through near-white and
transparent pixels, then strips light anti-aliasing fringes adjacent to
that background. Stops at the card's dark border so interior art is kept.
"""

from __future__ import annotations

import argparse
import sys
from collections import deque
from pathlib import Path

from PIL import Image

CARD_DIRS = (
    "imperium_row",
    "intrigue",
    "starter_deck",
)
EXTENSIONS = {".png", ".avif", ".webp", ".jpg", ".jpeg"}


def remove_card_padding(
    img: Image.Image,
    *,
    lum: int = 125,
    chroma: int = 48,
    fringe_lum: int = 95,
    fringe_passes: int = 4,
) -> tuple[Image.Image, int]:
    """Return a copy with exterior padding made transparent; second value is pixels cleared."""
    work = img.convert("RGBA")
    w, h = work.size
    px = work.load()
    cleared = 0

    def is_background(r: int, g: int, b: int, a: int) -> bool:
        if a < 30:
            return True
        mx, mn = max(r, g, b), min(r, g, b)
        if mx < 25 and a > 180:
            return False
        return mx >= lum and (mx - mn) <= chroma

    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= w or y >= h:
            continue
        if not is_background(*px[x, y]):
            continue
        seen.add((x, y))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            queue.append((x + dx, y + dy))

    for x, y in seen:
        if px[x, y][3] > 0:
            cleared += 1
        px[x, y] = (0, 0, 0, 0)

    def has_transparent_neighbor(x: int, y: int) -> bool:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] < 20:
                    return True
        return False

    # Only scan a border band — halos sit just inside the image edge.
    band = max(12, min(w, h) // 16)
    for _ in range(fringe_passes):
        to_clear: list[tuple[int, int]] = []
        for y in range(h):
            y_on_edge = y < band or y >= h - band
            for x in range(w):
                if not y_on_edge and x >= band and x < w - band:
                    continue
                r, g, b, a = px[x, y]
                if a < 15 or not has_transparent_neighbor(x, y):
                    continue
                mx, mn = max(r, g, b), min(r, g, b)
                if mx >= fringe_lum and (mx - mn) <= chroma:
                    to_clear.append((x, y))
        for x, y in to_clear:
            if px[x, y][3] > 0:
                cleared += 1
            px[x, y] = (0, 0, 0, 0)

    return work, cleared


def save_image(img: Image.Image, path: Path) -> None:
    ext = path.suffix.lower()
    if ext == ".avif":
        img.save(path, format="AVIF", quality=82)
    elif ext == ".webp":
        img.save(path, format="WEBP", quality=88, method=6)
    elif ext in {".jpg", ".jpeg"}:
        img.save(path, format="JPEG", quality=90)
    else:
        img.save(path)


def iter_card_files(public_dir: Path) -> list[Path]:
    files: list[Path] = []
    for sub in CARD_DIRS:
        root = public_dir / sub
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*")):
            if path.suffix.lower() in EXTENSIONS and path.is_file():
                files.append(path)
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--public-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "public",
        help="client/public directory",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    files = iter_card_files(args.public_dir)
    if not files:
        print("No card images found.", file=sys.stderr)
        return 1

    fixed = 0
    skipped = 0
    for path in files:
        with Image.open(path) as opened:
            img = opened.convert("RGBA")
        cleaned, cleared = remove_card_padding(img)
        if cleared == 0:
            skipped += 1
            continue
        rel = path.relative_to(args.public_dir)
        if args.dry_run:
            print(f"would fix ({cleared} px): {rel}")
            fixed += 1
            continue
        save_image(cleaned, path)
        print(f"fixed ({cleared} px): {rel}")
        fixed += 1

    print(f"done: fixed={fixed} skipped={skipped} total={len(files)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
