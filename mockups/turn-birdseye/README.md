# Birds-eye turn UI mockups (v2)

Static HTML — open any `.html` in a browser. Icons/portraits in `assets/` (copied from `client/public`).

## Concept (corrected)

| Area | What it is |
|------|------------|
| **Combat dock portraits** | Existing vertical leader cards + resource grid. Keep them. |
| **Active seat** | Buttons **left** of portrait, **current-turn gains right** |
| **Other seats** | No buttons. Gains only if **this turn’s action** paid them something (control bonus, dividends, etc.) — not their own prior Wealth/Reveal |
| **Turn history** | Past turns, far right. Collapsed = head + action. Gains optional toggle |
| **Desktop footer** | Hidden — reclaim height for board + turn column |

Do **not** invent a separate “leader rows” bar of head icons. That missed the annotation.

```
[ Board ]  [ btn | ACTIVE portrait | gains ]  [ History ]
           [       other portrait | gains? ]
           [       other portrait          ]
```

## Locked decisions

| Topic | Decision |
|-------|----------|
| Active seat | Buttons \| portrait \| gains — no board overlay |
| Other seats | Incidental gains only (control bonus, dividends…) — not their own Wealth/Reveal |
| Gains style | Compact: small muted titles, tight chips (B). A = live baseline. C = stacked. |
| Overflow | One list; **More / Less** expands in place (no duplicate panel, no ✕) |
| Shortlist | **3b** Intr/Tech on portrait · **6** Intr/Tech under Play/End Turn |
| Mobile | Horizontal big profiles; column = unit of turn UI |

## Open first

```bash
open mockups/turn-birdseye/desktop-full-layout.html
open mockups/turn-birdseye/mobile-column-approaches.html
```

## Index

| File | Role |
|------|------|
| [desktop-full-layout.html](desktop-full-layout.html) | Desktop shortlist **3b / 6** |
| [mobile-column-approaches.html](mobile-column-approaches.html) | Mobile shortlist **3b / 6** |
| [mobile-full-layout.html](mobile-full-layout.html) | Earlier mobile (actions strip) |
| [buttons-option-1-grid2x2.html](buttons-option-1-grid2x2.html) | 2×2 buttons |
| [buttons-option-2-stacked3.html](buttons-option-2-stacked3.html) | Stacked 3 |
| [gains-option-a-baseline.html](gains-option-a-baseline.html) | Live TurnGainsDisplay sizing |
| [gains-option-b-bold-titles.html](gains-option-b-bold-titles.html) | Compact unified (recommended) |
| [gains-option-c-stacked-rows.html](gains-option-c-stacked-rows.html) | Stacked title rows |
| [turn-history-collapsed-toggle.html](turn-history-collapsed-toggle.html) | Past turns |

## Implementation note

Mockups decide placement + gains density. Pixel values come from `CombatAreaCluster` / `TurnGainsDisplay` in-app.
