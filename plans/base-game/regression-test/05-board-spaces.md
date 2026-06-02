# Board spaces (base)

22 spaces in `BOARD_SPACES`; each must have a `BOARD_HOTSPOTS` entry (`boardSpaces.test.ts`, `boardLayout.test.ts`).

## By region

### Emperor (4 spice / wealth)

| ID | Name | Cost | Notes |
|----|------|------|-------|
| 14 | Conspire | 4 spice | Troops + solari + intrigue |
| 15 | Wealth | — | 2 solari |

### Spacing Guild

| 17 | Heighliner | combat |
| 16 | Foldspace | acquire SMF |

### Bene Gesserit

| 19 | Selective Breeding | trash from deck |
| 18 | Secrets | draw intrigue |

### Fremen

| 21 | Sietch Tabr | requires 2 Fremen influence |
| 20 | Hardy Warriors | combat |
| 22 | Stillsuits | combat |

### Landsraad

| 9 | High Council | 5 solari |
| 12 | Hall of Oratory | |
| 10 | Mentat | |
| 13 | Swordmaster | |
| 11 | Rally Troops | 4 solari, 4 troops |

### Spice trade

| 8 | Sell Melange | 2 spice cost, variable payout |
| 7 | Secure Contract | 3 solari |

### Cities / desert

| 1–3 | Arrakeen, Carthag, Research Station | combat |
| 4–6 | Imperial Basin, Great Flat, Hagga Basin | makers + combat (basin) |

## Behavior todos

- Control bonus solari/spice when visiting Arrakeen, Carthag, Imperial Basin.
- Deploy limits on combat spaces.
- Sell Melange choice UI + cost payment.

## UI

Agent token position = `MARKER_ANCHORS` for `occupiedSpaces[spaceId]` (`boardLayout.test.ts`).

Tune with `?hotspotDebug=1` / `?markerDebug=1` per `boardHotspots.ts` header comment.
