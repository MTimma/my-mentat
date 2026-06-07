# Task 02 — Types & data models for Rise of Ix

> Depends on [01-feature-flag-and-setup.md](./01-feature-flag-and-setup.md).
> Strictly type-level / declarative — no reducer logic in this task.
> Subsequent tasks (03–10) reference the symbols added here.

---

## 1. Goal

Extend `client/src/types/GameTypes.ts` (and add small companion files
under `client/src/data/`) so that all Rise of Ix mechanics can be
**declared in card data** and **read by the reducer/UI** in later tasks.

This task adds **only types, enums, default values, and pure helpers**.
No reducer code.

---

## 2. Requirements

1. **R1 — `AgentIcon`** is extended with the 2 new Ix board agent icons:
   `IX` (planet Ix), `CHOAM` (CHOAM Shipping). These are needed by:
   - Dreadnought (Landsraad icon, already exists, no new icon),
   - Tech Negotiation (Landsraad, no new icon),
   - Smuggling and Interstellar Shipping (Spice Trade, no new icon).
   - But the **Ix board** has its own “planet Ix” agent slots for House Hagal
     in solo (out of scope). We still expose a placeholder so future work
     can build on it.
   > In the printed game **no Rise of Ix board space introduces a new
   > Agent icon** — they reuse Landsraad and Spice Trade. Therefore `IX`
   > and `CHOAM` are *not* added unless a downstream task needs them.
   > **Action: skip these enum additions; document the decision in the
   > `AgentIcon` JSDoc.**
2. **R2 — `Infiltration` icons.** Add a single boolean **`infiltrate`**
   already on `Card` (exists). Confirm Rise of Ix uses the same boolean
   semantics. No type change needed; just a JSDoc clarification linking
   to the Rise of Ix infiltration rule.
3. **R3 — `Cost` extensions.**
   - `discard?: number` — already exists ✅
   - `troops?: number` — already exists ✅
   - `dreadnoughts?: number` — **NEW**, paid from supply/garrison (per
     card).
   - `negotiator?: boolean` — **NEW**, “return any number of negotiators
     from Ix” cost-side; implementations choose how many to spend.
   - `spice?: number` and `solari?: number` — exist ✅
   - `intrigueBottom?: number` — **NEW**, “place N intrigue card(s) on the
     bottom of the deck” (Sonic Snoopers tech, Court Intrigue card).
   - `influence?: InfluenceAmounts` — exists ✅
4. **R4 — `Reward` extensions.**
   - `dreadnoughts?: number` — **NEW**, commission N dreadnoughts.
   - `freighter?: number | 'recall'` — **NEW**, number = advance N spaces
     on Shipping track, `'recall'` = recall and collect rewards (rule
     allows either, per Freighter icon). Card data picks **one or the
     other** by being a `Reward`/`Cost` pair.
   - `acquireTech?: { discount?: 0 | 1 | 2 }` — **NEW**, allow acquire of
     one tech tile, optionally with a built-in spice discount.
   - `techNegotiator?: number` — **NEW**, place N negotiators on Ix.
   - `dividens` — **NEW**, +5 solari to active player and
     +1 solari to each opponent. dividends should be implemented as rewards 5 solari and nested 'forOpponents' : 1 solari reward
   - `revealUnload?: boolean` — **NEW**, marker that this card's Reveal
     box triggers on discard / trash also (Unload). Conceptually a card
     **property** rather than a per-effect reward — see §4.4 below; we
     model it on `Card` (R5), not `Reward`.
5. **R5 — `Card` extensions.**
   - `unload?: boolean` — **NEW**, marks Reveal effects as triggered on
     discard or trash as well (Unload icon).
   - `riseOfIx?: boolean` — **NEW**, source-marker (used for UI badge
     and filtering). Not strictly required for logic but very cheap to
     read.
6. **R6 — `Player` extensions.**
   - `dreadnoughts?: { supply: number; garrison: number; conflict: number; control: ControlMarkerType[] }`
     — track all 4 zones. Default for base players is
     `{ supply: 0, garrison: 0, conflict: 0, control: [] }`. With
     Rise of Ix on, `supply` is seeded at `2`.
   - `freighterStep?: 0 | 1 | 2 | 3` — position on the Shipping
     track (0 = bottom, 3 = top). Default `0`.
   - `tech?: PlayerTechTile[]` — owned tech tiles, each carrying
     `{ id: TechTileId; faceUp: boolean }`. Default `[]`.
   - `negotiatorsOnIx?: number` — troops placed on Ix as negotiators.
     Default `0`. Commeent: this should be tracked similar to conflict deployed troops
   - `snoopers?: Partial<Record<FactionType, boolean>>` — Tessia
     Vernius only. Default `{}`.
7. **R7 — `GameState` extensions.**
   - `expansions: Expansions` — added in Task 01.
   - `ixBoard?: { stacks: TechTileId[][]; nextFaceUpRevealed: Record<number, boolean> }`
     — three stacks of tech tile IDs, in their current top-down order;
     `nextFaceUpRevealed[stackIndex]` is true when the top is face-up.
     Default `undefined` (state is irrelevant unless RoI is on).
8. **R8 — `TechTile` type.** New companion enum + interface in
   `client/src/data/techTiles.ts`:
   ```ts
   export enum TechTileId {
     ARTILLERY = 'artillery',
     CHAUMURKY = 'chaumurky',
     DETONATION_DEVICES = 'detonation_devices',
     DISPOSAL_FACILITY = 'disposal_facility',
     FLAGSHIP = 'flagship',
     HOLOPROJECTORS = 'holoprojectors',
     HOLTZMAN_ENGINE = 'holtzman_engine',
     INVASION_SHIPS = 'invasion_ships',
     MEMOCORDERS = 'memocorders',
     MINIMIC_FILM = 'minimic_film',
     RESTRICTED_ORDINANCE = 'restricted_ordinance',
     SHUTTLE_FLEET = 'shuttle_fleet',
     SONIC_SNOOPERS = 'sonic_snoopers',
     SPACEPORT = 'spaceport',
     SPY_SATELLITES = 'spy_satellites',
     TRAINING_DRONES = 'training_drones',
     TROOP_TRANSPORTS = 'troop_transports',
     WINDTRAPS = 'windtraps',
   }

   export enum TechTileTiming {
     REVEAL = 'reveal',
     ROUND_START = 'round-start',
     AGENT = 'agent',
     AGENT_REVEAL_ONCE_PER_ROUND = 'agent-reveal-once-per-round',
     AGENT_REVEAL_ALWAYS = 'agent-reveal-always',
     AGENT_REVEAL_ONE_TIME = 'agent-reveal-one-time',
     ENDGAME = 'endgame',
     AFTER_CONFLICT = 'after-conflict',
   }

   export interface TechTile {
     id: TechTileId
     name: string
     cost: number              // base spice cost (before discounts)
     image: string             // /technologies/rise_of_ix/<id>.png
     timing: TechTileTiming[]
     acquireEffect?: Reward    // when first acquired
     description: string       // human-readable
     /** Reducer hook — see 06-tech-tiles.md. Optional now. */
     customEffect?: CustomEffect
   }
   ```
9. **R9 — `CustomEffect` extensions.** New members in the
   `CustomEffect` enum. **Names only here**, not handlers (handlers in
   later tasks):

   ```ts
   // 02-types-and-data-models.md — ENUM ONLY
   COMMISSION_DREADNOUGHT = 'COMMISSION_DREADNOUGHT',
   ACQUIRE_TECH = 'ACQUIRE_TECH',
   ACQUIRE_TECH_DISCOUNT_1 = 'ACQUIRE_TECH_DISCOUNT_1',
   ACQUIRE_TECH_DISCOUNT_2 = 'ACQUIRE_TECH_DISCOUNT_2',
   TECH_NEGOTIATOR = 'TECH_NEGOTIATOR',
   FREIGHTER_ADVANCE = 'FREIGHTER_ADVANCE',
   FREIGHTER_RECALL = 'FREIGHTER_RECALL',
   DIVIDENDS = 'DIVIDENDS',
   UNLOAD_REVEAL = 'UNLOAD_REVEAL',
   DISCARD_FROM_HAND = 'DISCARD_FROM_HAND',
   // RoI-specific intrigue/leader hooks
   GLIMPSE_THE_PATH = 'GLIMPSE_THE_PATH',
   GRAND_CONSPIRACY = 'GRAND_CONSPIRACY',
   MACHINE_CULTURE = 'MACHINE_CULTURE',
   CULL = 'CULL',
   QUID_PRO_QUO = 'QUID_PRO_QUO',
   STRONGARM = 'STRONGARM',
   SECRET_FORCES = 'SECRET_FORCES',
   IXIAN_PROBE = 'IXIAN_PROBE',
   DIVERSION = 'DIVERSION',
   EXPEDITE = 'EXPEDITE',
   BLACKMAIL = 'BLACKMAIL',
   CANNON_TURRETS = 'CANNON_TURRETS',
   STRATEGIC_PUSH = 'STRATEGIC_PUSH',
   SECOND_WAVE = 'SECOND_WAVE',
   WAR_CHEST = 'WAR_CHEST',
   FINESSE = 'FINESSE',
   ADVANCED_WEAPONRY = 'ADVANCED_WEAPONRY',
   // RoI leaders
   RHOMBUR_DREADNOUGHT_STRENGTH = 'RHOMBUR_DREADNOUGHT_STRENGTH',
   HUDRO_INTRIGUE_PEEK = 'HUDRO_INTRIGUE_PEEK',
   YUNA_SOLARI_BONUS = 'YUNA_SOLARI_BONUS',
   ARMAND_TRASH_IN_PLAY = 'ARMAND_TRASH_IN_PLAY',
   ILESA_SET_ASIDE = 'ILESA_SET_ASIDE',
   TESSIA_SNOOPER = 'TESSIA_SNOOPER',
   ```
10. **R10 — `RewardType` additions.**
    - `DREADNOUGHT = 'Dreadnought'`
    - `FREIGHTER = 'Freighter'`
    - `TECH = 'Tech'`
    - `NEGOTIATOR = 'Negotiator'`
11. **R11 — `GainSource` extensions.**
    - `TECH = 'tech'` (gains tied to a tech tile firing)
    - `IX_BOARD = 'ix-board'` (gains tied to acquiring a tech tile)
    - `SHIPPING_TRACK = 'shipping-track'` (recall rewards)
12. **R12 — `SpaceProps` extensions.**
    - `riseOfIx?: boolean` — marks the new CHOAM-overlay spaces.
    - `gridSide?: 'main' | 'ix'` — marks whether the hotspot lives on
      the main board or the side Ix panel. Default `'main'`.
13. **R13 — `Leader` extensions.**
    - `riseOfIx?: boolean` — marks the 6 new RoI leaders.
    - `tessiaSnoopers?: Partial<Record<FactionType, boolean>>` — only
      used by Tessia. Storing per-faction snooper placement (the
      rulebook says: at game start, Tessia places snoopers on the
      influence track at certain step values). Default `{}`.
    - `hudroPeekUsed?: boolean` — once-per-game flag for Viscount Hundro.

---

## 3. Files touched

| File | Change |
|---|---|
| `client/src/types/GameTypes.ts` | All R1–R12 type/enum additions. Pure additions, no removals/renames. |
| `client/src/data/techTiles.ts` (new) | The `TechTileId`, `TechTileTiming`, `TechTile` definitions and the 18-row `TECH_TILES: TechTile[]` array (declarative data only; reducer wiring later). |
| `client/src/data/expansions.ts` (new) | `NO_EXPANSIONS`, `Expansions` type re-export, helper `withRiseOfIx<T>(state: T, when: () => T): T`. |
| `client/src/utils/units.ts` (new) | Helpers `unitsInConflict(player)`, `unitsInGarrison(player)` returning `troops + dreadnoughts`. Used by every card / conflict that talks about "units". |
| `client/src/data/cards.ts` | Type-level only: extend `Card` literal types in existing arrays to compile against `unload`. **No data added here in this task** — RoI cards are added in [`08`](./08-imperium-row-cards.md). |

---

## 4. Detailed design

### 4.1 No new AgentIcon enum members

(Decision recorded in R1.) Rise of Ix board spaces reuse `LANDSRAAD`
and `SPICE_TRADE`. The Tech Negotiation **icon on cards** is *not* an
agent icon — it is a `Reward` field (`techNegotiator`). The Acquire
Tech icon on cards is `acquireTech`. The Freighter icon on cards is
`freighter`. The Dreadnought commission icon on cards is `dreadnoughts`
in `Reward`.

### 4.2 Units helper

```ts
// client/src/utils/units.ts
import { Player } from '../types/GameTypes'

export function unitsInConflict(p: Player): number {
  const t = p.combatTroops // wait — combatTroops is on GameState
  // Re-derive from gameState in caller. See note below.
  return 0 // placeholder; do not implement here, units helpers are mostly read in reducer with full state
}
```

**Implementation note.** Because troops in combat live on
`gameState.combatTroops[playerId]`, the `unitsInConflict` helper must
take both `player` and the surrounding `gameState`. The actual
signature is:

```ts
export function unitsInConflictForPlayer(state: GameState, playerId: number): number {
  return (state.combatTroops?.[playerId] ?? 0)
       + (state.players.find(p => p.id === playerId)?.dreadnoughts?.conflict ?? 0)
}
```

### 4.3 Player default seed

When Rise of Ix is enabled at game setup, **player seeding** (in
`GameStateSetup.tsx`) must hydrate:

- `dreadnoughts: { supply: 2, garrison: 0, conflict: 0, control: [] }`
- `freighterStep: 0`
- `tech: []`
- `negotiatorsOnIx: 0`
- `snoopers: {}`

When Rise of Ix is OFF, these fields must either be **absent** or set
to the documented defaults (`supply: 0`, etc.). Tests in
[`01-feature-flag-and-setup.md`](./01-feature-flag-and-setup.md#6-unit-tests)
already cover that.

### 4.4 Unload as a Card property

The Rise of Ix Unload icon decorates the **Reveal box** as a whole and
fires on **discard or trash** of that card. We model it once at the
card level:

```ts
interface Card {
  // ...existing...
  unload?: boolean
}
```

Reducer behaviour (Task 08 details):

- `REVEAL_CARDS` already fires Reveal effects. `card.unload` doesn’t
  change that path.
- `DISCARD_FROM_HAND` and any place where a card is moved to discard or
  trash *before* its owner’s Reveal turn must fire `revealEffect[]`
  when `card.unload === true`.
- **Source of gain** is the same card; we add a `Gain` row with a
  source name suffix `(Unload)` for traceability.

### 4.5 Tech tiles data — declarative

The `TECH_TILES` array in `client/src/data/techTiles.ts` is **the
canonical source of card text and cost** for Rise of Ix tech. Each row
references a `customEffect` (when needed) defined in `CustomEffect`.

> Card-by-card field values are intentionally left to
> [`06-tech-tiles.md`](./06-tech-tiles.md) so this task stays purely
> type-level. The empty array shape is what this task delivers.

---

## 5. Acceptance criteria

1. **AC1** — `npm run build` succeeds with the new types added (no
   downstream files updated yet — declarative additions only).
2. **AC2** — `tsc -b` reports no diagnostics for the new symbols.
3. **AC3** — The base reducer compiles unchanged (all RoI types are
   optional or default-zeroed).
4. **AC4** — `client/src/data/techTiles.ts` exports an array of length 18.
5. **AC5** — `client/src/utils/units.ts` exports
   `unitsInConflictForPlayer(state, playerId)` whose return is
   `combatTroops[playerId] ?? 0` when no dreadnoughts exist (base game
   parity).

---

## 6. Unit tests

**Path:** `client/src/utils/__tests__/units.test.ts` (new)

- [ ] `unitsInConflictForPlayer returns combatTroops only when dreadnoughts.conflict is 0`
- [ ] `unitsInConflictForPlayer adds dreadnoughts.conflict to combatTroops`
- [ ] `unitsInConflictForPlayer returns 0 if player not found`

**Path:** `client/src/data/__tests__/techTiles.test.ts` (new)

- [ ] `TECH_TILES has exactly 18 entries`
- [ ] `every TechTileId enum value appears once in TECH_TILES`
- [ ] `every tile has an image URL that starts with "/technologies/rise_of_ix/"`

> Each subsequent plan file adds its own narrow tests on top of these.

---

## 7. Notes / paraphrase risk

- **AgentIcon decision** (no new icons) — explicit per rulebook.
- **Negotiator return** is a *cost* paid at Acquire Tech time, not a
  free reward. Game UI must let the user choose how many to return.
- **Freighter `'recall'`** is a single action that yields multiple
  rewards (each space ≤ current pos). In the data layer we model it as
  a single `freighter: 'recall'`; the reducer expands it to the actual
  reward list. See [`05-freighter-shipping-track.md`](./05-freighter-shipping-track.md).
- **Dividends** is modelled as `dividends: true` rather than as a
  partial reward because it touches every player.
- **Unload** is a card flag, not a reward modifier, so a single boolean
  is sufficient. The reducer references `card.unload` directly.
