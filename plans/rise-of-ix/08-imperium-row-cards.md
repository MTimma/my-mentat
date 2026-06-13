# Task 08 — Rise of Ix Imperium Row cards

> Depends on Tasks 01, 02, 03, 04, 05, 06.
> Adds the 29 new Imperium cards as **declarative data** in
> `client/src/data/cards.ts` (or a new
> `client/src/data/cardsRiseOfIx.ts`) and notes the **per-card
> reducer impact**.

The user explicitly asked:

> "we have images for the new resources, but no implementation, need to
> analyse if/how each card would work in our reducer."

So the bulk of this file is a **per-card table** that maps every new
card to:

1. Its `Card` literal (proposed types, reusing the schema extensions
   in [`02-types-and-data-models.md`](./02-types-and-data-models.md)).
2. The **reducer hook** (declarative `Reward` only / new
   `CustomEffect` handler / manual logging fallback).
3. **Paraphrase risk** if the printed text differs.

> ✦ 2026-06-10 — adjustments since this plan was written:
>
> 1. **Base deck is 67 cards** (manifest-driven,
>    `baseGameManifest.test.ts`), not 64 — AC2 corrected below.
> 2. **`currTurn.troopsDeployedThisTurn` does not exist**; the field is
>    `troopsDeployedToConflict`. Check its semantics for Desert Ambush
>    (it counts deploys to the conflict; extend it if garrison deploys
>    must count too).
> 3. **No `DISCARD_FROM_HAND` action exists.** Discard-as-cost flows in
>    the base game use `CardSelectChoice` with `CardPile.HAND` /
>    `CardPile.DISCARD` — reuse that pattern (§5.3 updated).
> 4. **`currTurn.extraTurnAllowed` is a new field** (Weirding Way) —
>    coordinate with `canEndTurn`, turn-count bookkeeping and
>    `currTurn.gainsStartIndex` in the refactored reducer.
> 5. **Tests:** `client/src/data/__tests__/` does not exist. Put data
>    assertions in `client/src/components/GameContext/__tests__/`
>    (next to `imperiumRowCards.test.ts`, which already has the
>    manifest-driven `it.todo` scaffold pattern to copy), or create
>    `data/__tests__/` once, deliberately, and note it in plan 11.
> 6. **Useful precedents now in code:** Power Play influence handling
>    (Treachery), `infiltrateIgnoreOccupancyOnce` on `GameState`
>    (Bounty Hunter / infiltration), `pendingVictorSpiceThisCombat`
>    (deferred combat rewards).

---

## 1. Goal

Add 29 unique RoI Imperium cards. When `riseOfIx === true` they are
appended to the Imperium deck before shuffling (Task 01 R5).

For each card we either:

- **A. Declare** via existing `Reward`/`Cost` shape ➜ no reducer change.
- **B. Add `CustomEffect`** ➜ a small per-card reducer handler.
- **C. Mark "manual"** ➜ the card is logged when played but its
  effects are resolved by the user; the reducer just records a
  `Gain` row.

---

## 2. Requirements

1. **R1 — Data file.** New
   `client/src/data/cardsRiseOfIx.ts` exports
   `RISE_OF_IX_IMPERIUM_DECK: Card[]` with 29 entries (qty per cursor
   note: 25 unique + 4 dupes — see §3 for exact qty per row).
2. **R2 — Image paths.** Each card `image` matches a file under
   `client/public/imperium_row/rise_of_ix/<slug>.png`. The mapping
   table in §3 lists the exact filename.
3. **R3 — Card flag.** Each card has `riseOfIx: true`. Cards with
   Unload mark `unload: true`.
4. **R3b — Agent icons.** Each card’s `agentIcons` uses only existing
   `AgentIcon` values per §3.0: **Green → `LANDSRAAD`**, **Blue →
   `CITY`**, **Yellow → `SPICE_TRADE`**. Faction icons unchanged. Order
   in the array matches left-to-right on the card art (see §3 table).
5. **R4 — Per-card handlers.** Where category B, add the
   corresponding handler in `GameContext.tsx`.

---

## 3. Per-card table

> Quantities ("Qty") follow the user-provided table. The "Cat." column
> uses A/B/C from §1.

### 3.0 Agent icon colors (card art → `AgentIcon`)

Use **only** existing `AgentIcon` values. The color in parentheses is
from the printed card; map it to the enum as follows (do **not** infer
from the old plan’s wrong labels):

| Color on card | `AgentIcon` in data |
|---|---|
| **Green** | `LANDSRAAD` |
| **Blue** | `CITY` |
| **Yellow** | `SPICE_TRADE` |

Faction agent icons (`EMPEROR`, `SPACING_GUILD`, `BENE_GESSERIT`,
`FREMEN`) are unchanged — no color suffix.

In `cardsRiseOfIx.ts`, set `agentIcons: [AgentIcon.…]` per the table
below; keep the `("Color")` note in this plan only (not in code).

| Slug | Qty | Cost | Faction | Agent icons | Infl/Acq | Agent box | Reveal box | Unload | Cat. | Reducer notes |
|---|---|---|---|---|---|---|---|---|---|---|
| `appropriate.png` | 1 | 5 | EM | LANDSRAAD ("Green"), SPICE_TRADE ("Yellow") | Acquire: `freighter:1` | If you have **2× Inf EM**: `acquireTech:{}` and you may **pay Solari instead of spice** | persuasion:2 | – | **B** | `customEffect: ACQUIRE_TECH` with a flag `paySolariInsteadOfSpice` reads from extended `ACQUIRE_TECH` action. |
| `bounty_hunter.png` | 1 | 1 | – | CITY ("Blue") | Infiltrate: true | `+2 solari` **if used to send agent to occupied space by oppponente** (i.e., used Infiltration but on opponent agent space) | persuasion:1, combat:1 | – | **B** | New `CustomEffect.BOUNTY_INFILTRATION_BONUS`: checks `state.currTurn?.agentSpace` was placed despite occupied → award `+2 solari`. |
| `choam_delegate.png` | 1 | 1 | – | SPICE_TRADE ("Yellow") | Infiltrate: true | – | `+3 solari` | yes | **A** | Pure declarative: `revealEffect: [{ reward: { solari: 3 } }]`, `unload: true`. |
| `court_intrigue.png` | 1 | 2 | EM | EMPEROR | Infiltrate: true | Cost: `intrigueBottom:1` → `intrigueCards:1` | persuasion:1, combat:1 | – | **B** | this does not do anything in the db app because we do not keep track which intrigue a user has, only which played. so nothing happens, -1 for user and + 1 intrigue card. it could be useful to keep it for in case multiplayer game is created, but till then keep as just -1, +1 |
| `desert_ambush.png` | 1 | 3 | FR | SPICE_TRADE ("Yellow") | – | – | persuasion:1, combat:1, **1 enemy unit retreats per troop you deployed this turn** | – | **B** | New `CustomEffect.DESERT_AMBUSH`: count `state.currTurn?.troopsDeployedToConflict` (✦ actual field name; verify garrison-deploy semantics) and present a `pendingChoice` that lets user to choose which opponent retreats a unit per deployed troop |
| `embedded_agent.png` | 1 | 5 | BG | LANDSRAAD ("Green") | Infiltrate: true | `freighter:2` if **another BG card in play** | persuasion:1, intrigueCards:1 | – | **B** | Requirement reuse (`requirement.inPlay: BG`). Apply +2 freighter icons (so two pending Advance/Recall choices). |
| `esmar_tuek.png` | 1 | 5 | SG | CITY ("Blue"), SPICE_TRADE ("Yellow") | – | Cost: `spice:1` → `influence:{SG,1}, drawCards:1` | `spice:2, solari:2` | yes | **A** | Declarative; `unload: true`. |
| `freighter_fleet.png` | 2 | 2 | – | SPICE_TRADE ("Yellow") | – | – | `freighter:1` | yes | **A** | Declarative; `freighter:1`. |
| `full_scale_assault.png` | 1 | 8 | EM | EMPEROR, CITY ("Blue") | Acquire: `dreadnoughts:1` | `troops:2` | `persuasion:2`, **+3 combat per dreadnought in conflict** | – | **B** | New `CustomEffect.FULLSCALE_DREAD_SWORDS`: computes `+3 * dreadnoughtsInConflict(player)`. |
| `guild_accord.png` | 1 | 6 | SG | SPACING_GUILD | Infiltrate: true | **Heighliner space costs 2 spice less this turn** | `water:1` and (if SG alliance) `+3 spice` | yes | **B** | New `CustomEffect.GUILD_ACCORD_HEIGHTLINER_DISCOUNT`: stash a per-turn flag the cost helper reads. |
| `guild_chief_administrator.png` | 1 | 4 | SG | SPACING_GUILD, CITY ("Blue"), SPICE_TRADE ("Yellow") | – | Cost: `discard:1` → `trash:1` *(trash any one card you own)* | persuasion:1, **freighter:1** | – | **B** | Discard cost + CARD_SELECT trash. Standard. |
| `imperial_bashar.png` | 1 | 4 | EM | CITY ("Blue") | – | `troops:1` *or* `trash:1` (choose) | `persuasion:1`, **+2 combat + 1 per revealed card with a sword icon this turn** | – | **B** | New `CustomEffect.IMPERIAL_BASHAR_SWORDS`: iterates `revealedCardIds` and counts those whose `revealEffect[*].reward.combat ?? 0 > 0` *or* `swords > 0` (paraphrase: "card with sword"). |
| `imperial_shock_trooper.png` | 1 | 3 | EM | – | – | – | `persuasion:1`, **+2 combat (or +5 if player has at least one agent on an EM space)** | – | **B** | New `CustomEffect.SHOCKTROOPER_EM_BONUS`: bonus reads if any of the player's agents are on Emperor spaces. |
| `in_the_shadows.png` | 2 | 2 | BG | LANDSRAAD ("Green"), CITY ("Blue") | – | If **2× Inf BG**: `discard:1` → +1 influence (choose between EM/SG/FR) | `influence:{BG,1}` | yes | **B** | Standard`requirement.influence` + cost discard. |
| `ix_guild_compact.png` | 1 | 3 | SG | SPACING_GUILD | – | Cost: `discard:2` → `dreadnoughts:1` | `techNegotiator:2` | yes | **B** | tecbnegotiator increase decreaess the player troop count (it is a troop pieace IRL), and while it exists counts as discount for a tech tiel purchase. i think player has to choose if adn how much he uses for discount  |
| `ixian_engineer.png` | 2 | 5 | – | SPICE_TRADE ("Yellow") | – | `acquireTech:{}` | If you have **3 tech**: Trash this card → `victoryPoints:1` | – | **B** | New `CustomEffect.IXIAN_ENGINEER_VP`: if `player.tech.length >= 3`, push optional trashThisCard→VP. |
| `jamis.png` | 1 | 2 | FR | FREMEN | Infiltrate: true | `trash:1` | `persuasion:1, combat:2` | – | **A** | Declarative. |
| `landing_rights.png` | 1 | 4 | SG | CITY ("Blue") | – | `freighter:1` | `persuasion:2` | – | **A** | Declarative. |
| `local_fence.png` | 1 | 3 | – | CITY ("Blue") | – | Choose: `spice:-2 → solari:5` OR `solari:-5 → spice:4` | `persuasion:2` | – | **A** | Two `choiceOpt` play effects mirroring Lady Jessica / Bypass Protocol. |
| `negotiated_withdrawel.png` | 2 | 4 | – | SPICE_TRADE ("Yellow"), LANDSRAAD ("Green"), CITY ("Blue") | Acquire: `troops:1` | – | `persuasion:2`, **retreat 3× troops → +1 influence (choose)** | – | **B** | New `CustomEffect.NEGOTIATED_WITHDRAWAL`: enforce min retreat=3 from conflict to grant influence-of-choice. |
| `satellite_ban.png` | 1 | 5 | SG, FR | SPACING_GUILD, FREMEN | – | Cost: `discard:1` → `spice:1, water:1` | `persuasion:1`, **retreat up to 2 troops** | – | **B** | `retreatTroops:2` reward (existing field). |
| `sayyadina.png` | 1 | 3 | BG, FR | BENE_GESSERIT, FREMEN | – | Cost: `water:3` → `victoryPoints:1` | `persuasion:3` if **FR bond** | – | **B** | Standard. |
| `shai_hulud.png` | 1 | 7 | FR | SPICE_TRADE ("Yellow") | Acquire: `trash:1` | Cost: `trash:1` → `troops:2` | `combat:5` if **FR bond** | – | **B** | Two trash flows (one acquire-time, one play-time). |
| `spice_trader.png` | 1 | 4 | FR | CITY ("Blue"), SPICE_TRADE ("Yellow") | – | If **2× Inf FR**: `discard:1` → `spice:2` | `persuasion:2, combat:1` | – | **A** | Declarative. |
| `treachery.png` | 2 | 6 | – | EMPEROR, SPACING_GUILD, BENE_GESSERIT, FREMEN | – | **Gain 2 influence instead of 1** AND `trashThisCard` | `persuasion:0`, `troops:2, deployTroops:2 (mandatory)` | yes | **B** | New `CustomEffect.TREACHERY_DOUBLE_INFLUENCE`: ✦ scope resolved per §8 — applies **only to Treachery's own influence** (each Faction icon on this card grants 2 instead of 1), *not* to all influence this turn. Re-uses Power Play model. deploy troops is mandatory. usually deployTroops in our app is optional, but for this card has to be mandatory|
| `truthsayer.png` | 2 | 3 | EM, BG | EMPEROR, BENE_GESSERIT, LANDSRAAD ("Green") | – | Cost: `discard:1` → `drawCards:1` | `persuasion:1, combat:1` | – | **A** | Declarative. |
| `water_peddler.png` | 1 | 1 | – | – | Acquire: `water:1` | – | `water:1` | yes | **A** | Declarative. |
| `web_of_power.png` | 1 | 4 | BG | BENE_GESSERIT | Infiltrate: true | If **2× Inf each**: EM → `solari:2`, SG → `drawCards:1`, FR → `water:1` | `persuasion:1`, `influence:{any,1}` *[paraphrase risk: faction unclear]* | – | **B** | New `CustomEffect.WEB_OF_POWER`: evaluate the four "2× Inf each" conditions and grant the appropriate rewards. Reveal's `+1 inf` player choose. the rewards from influence during play are mandatory and pending, but need to consider how to show effects that are unapplicable, mayhbe in grayed out way |
| `weirding_way.png` | 1 | 3 | BG | CITY ("Blue"), SPICE_TRADE ("Yellow") | – | "May take another turn after this one" | `persuasion:1, combat:2` | – | **B** | New `CustomEffect.WEIRDING_WAY_EXTRA_TURN`: sets `state.currTurn.extraTurnAllowed = true`. Reducer's `END_TURN` checks this and, if set, leaves the active player unchanged for one more turn (consuming the flag). Edge cases: combat with the additional agent counter. |

**Total qty**: 1+1+1+1+1+1+1+2+1+1+1+1+1+2+1+2+1+1+1+2+1+1+1+1+2+2+1+1+1 = **35**.

> Note: the user-provided table includes 29 row entries (some qty 2),
> summing to 35 cards. The rulebook also says **35 Imperium Deck
> cards**. ✓ Matches.

---

## 4. Files touched

| File | Change |
|---|---|
| `client/src/data/cardsRiseOfIx.ts` (new) | `RISE_OF_IX_IMPERIUM_DECK: Card[]` populated per §3. |
| `client/src/data/cards.ts` | Import + re-export when `expansions.riseOfIx`. |
| `client/src/components/GameContext/GameContext.tsx` | Handlers for all category-B custom effects in §3. |
| `client/src/data/effectTexts.ts` | Human-readable strings for each new `CustomEffect`. |

---

## 5. Detailed design — recurring patterns

### 5.0 `agentIcons` in `cardsRiseOfIx.ts`

Example (colors from §3.0; enum names only in code):

```ts
// Guild Chief Administrator — SG + Blue + Yellow on art
agentIcons: [
  AgentIcon.SPACING_GUILD,
  AgentIcon.CITY,           // ("Blue")
  AgentIcon.SPICE_TRADE,    // ("Yellow")
],

// In the Shadows — Green + Blue on art
agentIcons: [
  AgentIcon.LANDSRAAD,      // ("Green")
  AgentIcon.CITY,           // ("Blue")
],

// Negotiated Withdrawal — Yellow, Green, Blue (left-to-right on card)
agentIcons: [
  AgentIcon.SPICE_TRADE,    // ("Yellow")
  AgentIcon.LANDSRAAD,      // ("Green")
  AgentIcon.CITY,           // ("Blue")
],
```

Board routing: when the player picks an agent icon on the card,
`PLACE_AGENT` / hotspot validation uses the **enum** above (same as
base game). Green icons send to Landsraad spaces, Blue to City spaces,
Yellow to Spice Trade spaces.

### 5.1 Faction-2-influence-each (Web of Power)

```ts
function applyWebOfPower(state: GameState, playerId: number): GameState {
  const have2 = (f: FactionType) =>
    (state.factionInfluence[f]?.[playerId] ?? 0) >= 2
  let s = state
  if (have2(FactionType.EMPEROR))         s = applyReward(s, playerId, { solari: 2 })
  if (have2(FactionType.SPACING_GUILD))   s = applyReward(s, playerId, { drawCards: 1 })
  if (have2(FactionType.FREMEN))          s = applyReward(s, playerId, { water: 1 })
  return s 
}
```

### 5.2 "Trash if condition" (Ixian Engineer)

If `player.tech.length >= 3` when the card is **revealed**, push an
**optional** effect: `trashThisCard: true → victoryPoints: 1`.

### 5.3 Unload mechanism (across cards)

When a card with `unload: true` is moved to the player's
`discardPile` or `trash` from anywhere other than the normal Reveal
flow, the reducer fires `revealEffect[*]` and logs each gain with
source name `"<card name> (Unload)"`. We add a single helper
`fireUnloadIfApplicable(state, playerId, card)` and call it from
every place where a card is moved:

- ✦ Discard-as-cost resolutions — there is **no** `DISCARD_FROM_HAND`
  action; the base game resolves discards through `CardSelectChoice`
  (`CardPile.HAND` / `CardPile.DISCARD`). Hook the helper into the
  `RESOLVE_CHOICE`/card-select resolution path where the chosen card
  lands in `discardPile`.
- `TRASH_CARD` (and any trash-as-cost card-select resolution).
- `REVEAL_CARDS` already handles the standard path; **do not double-fire**.

### 5.4 Extra-turn (Weirding Way)

Set `state.currTurn.extraTurnAllowed = true` when this card is
played. After the player ends their Agent turn (`END_TURN`), the
reducer:

```ts
if (state.currTurn?.extraTurnAllowed) {
  // skip "rotate active player" 
  state.currTurn = null
  state.canEndTurn = false
  // active player unchanged
  //TODO consider other stats, like turn count should still increase, etc
} else {
  // normal end-turn rotation
}
```



---

## 6. Acceptance criteria

1. **AC1** — All 35 cards appear in `RISE_OF_IX_IMPERIUM_DECK` with
   unique ids and matching image paths.
2. **AC2** — When `expansions.riseOfIx === true`, the Imperium deck
   contains both the base **67** (✦ corrected from 64) and the 35 RoI
   cards before shuffling (102 total).
3. **AC3** — Each card with `unload: true` triggers its Reveal effects
   on discard and on trash, with a `(Unload)` suffixed gain row.
4. **AC4** — Category-A cards apply via the standard reward pipeline
   with no per-card branching.
5. **AC5** — Category-B custom effects each pass their respective
   tests (§7).
6. **AC6** — Every RoI card’s `agentIcons` match §3.0 (no
   `LANDSRAAD` for Blue, no `CITY` for Yellow, no non-existent icons
   such as `DESERT`). Spot-check: `appropriate` =
   `[LANDSRAAD, SPICE_TRADE]`; `guild_chief_administrator` =
   `[SPACING_GUILD, CITY, SPICE_TRADE]`; `negotiated_withdrawel` =
   `[SPICE_TRADE, LANDSRAAD, CITY]` in that order.

---

## 7. Unit tests

**Path:** `client/src/components/GameContext/__tests__/riseOfIxCards.test.ts` (new)

**Path:** `client/src/components/GameContext/__tests__/cardsRiseOfIxData.test.ts` (new — ✦ moved from `data/__tests__/`, which doesn't exist; keep all reducer/data tests under `GameContext/__tests__/` per plan 11)

- [ ] `agent icon color mapping (§3.0)` — for each card with a colored
  icon in §3, `agentIcons` uses the correct enum (Green→LANDSRAAD,
  Blue→CITY, Yellow→SPICE_TRADE)
- [ ] `negotiated_withdrawel` icon order is
  `[SPICE_TRADE, LANDSRAAD, CITY]`
- [ ] `in_the_shadows` icon order is `[LANDSRAAD, CITY]`
- [ ] `appropriate` has `[LANDSRAAD, SPICE_TRADE]` (no `DESERT`)

Group tests per card. Each card gets at least 1 expectation:

- [ ] `Appropriate: with 2 EM influence, play offers Acquire Tech with pay-in-solari flag`
- [ ] `Bounty Hunter: +2 solari when agent placed on occupied space`
- [ ] `CHOAM Delegate: unload → +3 solari on discard`
- [ ] `Court Intrigue: discard cost → +1 intrigue replaced by bottom-of-deck card`
- [ ] `Desert Ambush: with 3 troops deployed, 3 retreat targets prompted`
- [ ] `Embedded Agent: with another BG in play, freighter:2 fires`
- [ ] `Esmar Tuek: Unload spice:2 + solari:2 on discard`
- [ ] `Freighter Fleet: reveal triggers single freighter choice; unload too`
- [ ] `Full-Scale Assault: reveal +3 per dreadnought in conflict`
- [ ] `Guild Accord: heighliner cost reduced by 2 only this turn`
- [ ] `Guild Chief Administrator: discard+trash flow, +1 freighter on reveal`
- [ ] `Imperial Bashar: reveal +2 per sword-revealing card this turn`
- [ ] `Imperial Shock Trooper: +5 combat if EM space, else +2`
- [ ] `In the Shadows: requires BG inf 2, applies 1 inf to chosen non-BG`
- [ ] `Ix-Guild Compact: discard 2 → dreadnoughts:1; unload techNegotiator:2`
- [ ] `Ixian Engineer: with 3 tech, reveal offers trashThisCard→VP`
- [ ] `Jamis: declarative trash:1 + combat:2`
- [ ] `Landing Rights: declarative freighter:1`
- [ ] `Local Fence: two OR options apply correctly`
- [ ] `Negotiated Withdrawel: must retreat 3 to gain influence`
- [ ] `Satellite Ban: discard 1 → spice+water; retreat up to 2 troops`
- [ ] `Sayyadina: water:3 cost → VP, persuasion:3 with FR bond`
- [ ] `Shai-Hulud: trash cost → +2 troops; combat:5 with FR bond`
- [ ] `Spice Trader: declarative discard for spice with FR inf 2`
- [ ] `Treachery: grants 2 influence per own faction icon (✦ own influence only, per §8); trashes self`
- [ ] `Truthsayer: discard:1 → draw:1`
- [ ] `Water Peddler: acquire +water; unload +water`
- [ ] `Web of Power: applies per-faction conditional rewards`
- [ ] `Weirding Way: sets extraTurnAllowed`

---

## 8. Notes / paraphrase risk

- **Agent icon colors:** Earlier drafts mis-labelled colors (e.g.
  `LANDSRAAD ("Blue")`, `CITY ("Yellow")`). Card art colors are
  authoritative: **Green = Landsraad, Blue = City, Yellow = Spice
  Trade**. §3 table and §3.0 are aligned; double-check against PNGs
  before merging data.
- **Appropriate**: paraphrase says "you may use Solari to buy" — meaning
  for the Tech tile cost. Verify: do we pay the **full** tile cost in
  Solari, or 1-Solari-per-spice? Rule clarification in the rulebook
  says **the cost in either currency at the same numeric value**, so
  we add a `paySolariInsteadOfSpice: boolean` to `ACQUIRE_TECH` action.
- **Bounty Hunter**: rulebook implies the "+2 Solari" trigger is
  Infiltration usage; encoded above.
- **Imperial Bashar "card with sword"**: the rulebook clarifications
  doc says "only counts other cards that actually provide swords this
  turn" (e.g. Bene Gesserit Sister's chosen 2 combat counts; if she
  chose 2 persuasion she does not count). The implementation should
  inspect *resolved* effects, not printed icons.
- **Treachery influence doubling**: the printed card says "instead of
  1, you gain 2 with each Faction icon shown" — this is **only the
  Treachery card's own influence**, not all influence this turn.
  Update the handler to only apply when the influence reward's source
  is Treachery itself. *Note: the user table is shorter than the
  printed text — verify.*
