#!/usr/bin/env python3
"""Regenerate client/src/test-fixtures/base-game-manifest.json from the official card spreadsheet."""

from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "client/src/test-fixtures/base-game-manifest.json"
DEFAULT_XLSX = Path("/tmp/dune_cards.xlsx")

ALIASES: dict[str, str | None] = {
    "Chrysknife": "Crysknife",
    "Peter De Vries": "Piter De Vries",
    "Reverend Mother Mohaim": "Reverend Mother Mohiam",
    "Sardukar Infantry": "Sardaukar Infantry",
    "Sardukar Legion": "Sardaukar Legion",
    "Shifting Allegiancs": "Shifting Allegiances",
    "CHOAM shares": "CHOAM Shares",
    "Councilor's Dispensation": "Councilor\u2019s Dispensation",
    "Plans within Plans": "Plans Within Plans",
    "Machinaitions": "Machinations",
    "Desert Power": "Desert Raid",
    "Siege of Arakeen": "Siege of Arrakeen",
    "Battle for Arakeen": "Siege of Arrakeen",
    "Battle for Carthag": "Siege of Carthag",
    "Battle for Imperial Basin": "Siege of Imperial Basin",
    "Secure Imperial Basin": "Siege of Imperial Basin",
    "Sort Through The Chaos": "Cloak and Dagger",
}


def canon(name: str) -> str | None:
    mapped = ALIASES.get(name, name)
    return mapped


def is_base(exp: str) -> bool:
    if not exp:
        return False
    e = exp.lower().strip()
    return e in ("base", "1. base") or e.startswith("1. base")


def parse_sheet(z: zipfile.ZipFile, sheet_path: str, strings: list[str]) -> list[dict[str, str]]:
    sheet = ET.fromstring(z.read(sheet_path))
    rows: list[dict[str, str]] = []
    for row in sheet.findall(f".//{NS}row"):
        row_cells: dict[str, str] = {}
        for c in row.findall(f"{NS}c"):
            ref = c.get("r", "")
            m = re.match(r"([A-Z]+)(\d+)", ref)
            if not m:
                continue
            col = m.group(1)
            v = c.find(f"{NS}v")
            if v is None:
                continue
            val = v.text or ""
            if c.get("t") == "s":
                val = strings[int(val)]
            row_cells[col] = val
        rows.append(row_cells)
    return rows


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main() -> int:
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    if not xlsx.exists():
        print(f"Missing spreadsheet: {xlsx}", file=sys.stderr)
        print("Download from Dropbox URL in plans/base-game/README.md", file=sys.stderr)
        return 1

    with zipfile.ZipFile(xlsx) as z:
        ss = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings = [
            "".join(t.text or "" for t in si.iter(f"{NS}t"))
            for si in ss.findall(f".//{NS}si")
        ]
        sheet_paths = [
            "xl/worksheets/sheet1.xml",
            "xl/worksheets/sheet3.xml",
            "xl/worksheets/sheet5.xml",
            "xl/worksheets/sheet6.xml",
        ]
        ir_rows, intrigue_rows, conflict_rows, leader_rows = [
            parse_sheet(z, p, strings) for p in sheet_paths
        ]

    manifest: dict = {
        "source": str(xlsx.name),
        "filter": "expansion column = base / 1. base",
        "rules": {
            "pdf": "https://d19y2ttatozxjp.cloudfront.net/pdfs/DUNE_IMPERIUM_Rules_2020_10_26.pdf",
            "doc": "https://docs.google.com/document/d/15FrreNVs2eAnEWlNCmChQuBr5LLg0HHgC7BqWGk7KYw/edit",
        },
        "imperiumRow": [],
        "startingDeck": [],
        "reserve": ["Arrakis Liaison", "The Spice Must Flow", "Foldspace"],
        "intrigue": [],
        "conflicts": [],
        "leaders": [],
        "nameAliases": ALIASES,
    }

    for row in ir_rows[2:]:
        name = row.get("A", "")
        if not name or not is_base(row.get("N", "")):
            continue
        code = canon(name)
        if not code:
            continue
        manifest["imperiumRow"].append(
            {
                "excelName": name,
                "codeName": code,
                "qty": int(row["B"]) if row.get("B", "").isdigit() else row.get("B"),
                "cost": int(row["C"]) if row.get("C", "").isdigit() else row.get("C"),
                "agentIcons": row.get("F", ""),
                "agentBox": row.get("I", ""),
                "revealPersuasion": row.get("J", ""),
                "revealSwords": row.get("K", ""),
                "testId": f"imperium/{slug(code)}",
            }
        )

    for row in intrigue_rows[2:]:
        name = row.get("A", "")
        if not name or not is_base(row.get("G", "")):
            continue
        code = canon(name)
        if not code:
            continue
        manifest["intrigue"].append(
            {
                "excelName": name,
                "codeName": code,
                "qty": int(row["B"]) if row.get("B", "").isdigit() else row.get("B"),
                "type": row.get("C", ""),
                "benefit": row.get("E", ""),
                "testId": f"intrigue/{slug(code)}",
            }
        )

    for row in conflict_rows[2:]:
        name = row.get("A", "")
        if not name or not is_base(row.get("H", "")):
            continue
        code = canon(name) or name
        manifest["conflicts"].append(
            {
                "excelName": name,
                "codeName": code,
                "stage": int(row["C"]) if row.get("C", "").isdigit() else row.get("C"),
                "firstPrize": row.get("E", ""),
                "testId": f"conflict/{slug(code)}",
            }
        )

    for row in leader_rows[2:]:
        name = row.get("A", "")
        if not name or not is_base(row.get("F", "")):
            continue
        code = canon(name)
        if not code:
            continue
        manifest["leaders"].append(
            {
                "excelName": name,
                "codeName": code,
                "testId": f"leader/{slug(code)}",
            }
        )

    agg: dict[str, int] = defaultdict(int)
    for c in manifest["imperiumRow"]:
        q = c["qty"]
        if isinstance(q, int):
            agg[c["codeName"]] += q
    seen: set[str] = set()
    deduped = []
    for c in manifest["imperiumRow"]:
        if c["codeName"] in seen:
            continue
        seen.add(c["codeName"])
        c = {**c, "qty": agg[c["codeName"]]}
        deduped.append(c)
    manifest["imperiumRow"] = deduped

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({len(deduped)} imperium, {len(manifest['intrigue'])} intrigue)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
