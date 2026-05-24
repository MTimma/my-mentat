# Task 07 — Rise of Ix leaders

> Depends on Tasks 01, 02, 04 (dreadnoughts), 05 (freighter), 06 (tech).
> Reducer + per-leader ability files, following the existing
> `client/src/data/leaderAbilities/*.ts` pattern.

---

## 1. Goal

Add the 6 new Rise of Ix leaders to the leader pool. Each leader has a
**Game Ability** and a **Signet Ring** effect.

The Baron Vladimir Harkonnen "RoI version" listed in the cursor note
**duplicates** the base Baron (same Masterstroke). We do **not** add a
second Baron entry; we reuse the existing one and only flag him as
valid in the RoI pool (he already is).

The 6 new leaders are:

1. **Prince Rhombur Vernius** (complexity 1)
2. **Viscount Hundro Moritani** (complexity 1)
3. **"Princess" Yuna Moritani** (complexity 2)
4. **Archduke Armand Ecaz** (complexity 2)
5. **Ilesa Ecaz** (complexity 3)
6. **Tessia Vernius** (complexity 4 — RoI uses the icon count
   convention up to 4)

---

## 2. Requirements

1. **R1 — Leader pool.** When `expansions.riseOfIx === true`,
   `getLeaderPool(expansions)` returns base 8 + RoI 6.
2. **R2 — Leader images.** Each leader has a file under
   `client/public/leaders/rise_of_ix/<slug>.jpg`. Use the same
   `LEADER_IMAGES` / `LEADER_ICON_SLUGS` pattern.
3. **R3 — Head icons.** Crop "head" thumbnails the same way base
   leaders are cropped (existing `crop-leader-heads` script can be
   pointed at the rise_of_ix folder). Out of scope for this code task,
   but document as a *content task*.
4. **R4 — Ability hooks.** Each leader adds at most **one new
   reducer hook** plus the standard `SIGNET_RING_EFFECTS` entry.
5. **R5 — Signet rings.** Each is wired via
   `client/src/data/signetRingEffects.ts` (the existing pattern). (have a separate file for roi effects)

---

## 3. Per-leader design

### 3.1 Prince Rhombur Vernius

- **Ability — Ixian Royalty:** "Your dreadnoughts have a strength of 4
  instead of 3."
- **Signet — Tech Negotiation OR Tech Acquire (discount):**
  "Buy 1 tech (or add 1 tech negotiator)."

**Implementation:**

- New module `client/src/data/leaderAbilities/rhomburDreadnoughtStrength.ts`
  exporting `dreadnoughtStrengthEach(leader)` — already referenced by
  Task 04. Returns `4` when the leader is Rhombur, else `3`.
- Signet effect: push a `pendingChoice`:
  - Option A: `reward: { acquireTech: {} }` (no discount).
  - Option B: `reward: { techNegotiator: 1 }`.

### 3.2 Viscount Hundro Moritani

- **Ability — Intelligence:** "Game start: look at top 2 intrigue cards,
  keep one (once per game)." in our app just add intrigue count to 1 for this player
- **Signet — Spice → Shipping:** "1 spice → +1 on shipping track. (shipping/freight)"

**Implementation:**

- Signet: push optional `cost: { spice: 1 }, reward: { freighter: 1 }`.

### 3.3 "Princess" Yuna Moritani

- **Ability — Spice Royalty:** "You start game with no water. When you gain
  Solari on your turn, increase the amount by 1."
- **Signet — 7 Solari → Influence + Spice + Troop:**
  "7 Solari → +1 inf (choose), +1 spice, +1 troop."

**Implementation:**

- Setup: at game start, if a player picks Yuna, set
  `player.water = 0` (or whatever the base seed minus initial water is).
- New module
  `client/src/data/leaderAbilities/yunaSolariBonus.ts`:
  - `shouldGrantYunaSolariBonus(player, reward, source): boolean`
    returns true when player is Yuna, current player turn, and reward
    yields solari > 0.
  - Reducer call site: in `applyRewardToPlayer`, when applying a
    solari reward triggered during the active player's own turn,
    increment by +1 (single bonus regardless of number of solari
    gained in the same effect, per "increase the amount by 1" phrasing).
- Signet: push optional effect with cost 7 solari and three rewards.

### 3.4 Archduke Armand Ecaz

- **Ability — Houses' Confidence:** "If you have at least 2 agents on
  Yellow/Blue/Green spaces upon reveal, you may trash 1 card in play."
- **Signet — Free 3-cost acquire:** "You may acquire a card that costs
  3 or less."

**Implementation:**

- New module `armandTrashInPlay.ts`. At the **start of Reveal turn**,
  check if `state.occupiedSpaces` has 2 agents for this player on
  spaces whose `agentIcon` is `CITY` (yellow), `SPICE_TRADE` (yellow),
  `LANDSRAAD` (green)
  Push a `CARD_SELECT` pending choice over the player's `playArea`, revealed cards still give effect
- Signet: push a `CARD_SELECT` pending choice over Imperium Row cards
  whose `cost <= 3`, free acquire (uses existing `acquire: { limit: 3 }`
  semantics like Bypass Protocol).


### 3.5 Ilesa Ecaz

- **Ability — Hidden Pact:** "Round start: set a card aside. When
  played on your 2nd turn: +1 Solari, or if only 1 agent icon
  +1 spice."
- **Signet — Free Foldspace:** "1 Solari → 1 Foldspace card."

**Implementation:**

- New module `ilesaSetAside.ts`:
  - at start of second turn, need to reveal the selected card, meaning to just select one card from players deck in our app. then, if this card is played for agent turn in this same turn, do the following logic
  - the reducer offers reward:
    - If the played card has only 1 agent icon → `+1 spice`.
    - Else → `+1 solari`.
- Signet: 1 Solari → 1 Foldspace card. Mirror `'ACQUIRE_AL'` / SMF
  flow: a `'ACQUIRE_FS'` action paying `solari:1`, putting a free
  Foldspace card in player's discard.
- **`Player.setAsideCard?: Card | null`** new field.

### 3.6 Tessia Vernius

- **Ability — Subtle Subterfuge:** "Place snooper tokens on influence
  tracks." (Specifically: at game start, place one snooper on each
  faction's influence track at a chosen step.)
- **Signet — Influence steal:** "-1 inf ? → +1 inf with a faction
  where you still have a snooper token."

**Implementation:**

- `Player.snoopers` (Task 02 §R6) and `Leader.tessiaSnoopers` (Task 02
  §R13) capture state. will need an icon to be used on the image board on second influeence slots
- when gaining 2nd infl in a faction, need to remove it and place on the leader image (when clicking on see leader) and gain the respective reward. it starts fro top to bottom. first is discard card to gain one spice (optional). second is to gain the bonus from than faction. (the bonus is what player gets when reaching 4th step in base game, besides alliance token) third is to gain addditional influence in that faction, and fourth is to gain both the bonus and influence
- Signet: push a `pendingChoice` to spend `influence: { chooseOne: true, amounts: [E,SG,BG,F at 1] }`
  in exchange for `influence: { chooseOne: true, amounts: <factions where snooper exists> at 1 }`.
Do not skip this logic.

---

## 4. Files touched

| File | Change |
|---|---|
| `client/src/data/leaders.ts` | Append 6 new leaders; export `RISE_OF_IX_LEADERS`. |
| `client/src/data/leaderAbilities/rhomburDreadnoughtStrength.ts` (new) | Rhombur strength override. |
| `client/src/data/leaderAbilities/hudroIntriguePeek.ts` (new) | Once-per-game peek. |
| `client/src/data/leaderAbilities/yunaSolariBonus.ts` (new) | +1 solari on own turn. |
| `client/src/data/leaderAbilities/armandTrashInPlay.ts` (new) | Reveal-start trash trigger. |
| `client/src/data/leaderAbilities/ilesaSetAside.ts` (new) | Set-aside card + 2nd-turn bonus. |
| `client/src/data/signetRingEffects.ts` | 6 new entries. |
| `client/src/data/leaderAbilities.ts` | Re-export the new hooks (mirroring existing). |
| `client/src/components/GameContext/GameContext.tsx` | Wire the 4 ability hooks at the appropriate transition points (REVEAL_CARDS for Armand, applyRewardToPlayer for Yuna, ROUND_START for Ilesa, intrigue setup for Hudro, snooper setup for Tessia). |
| `client/src/components/LeaderSetupChoices/LeaderSetupChoices.tsx` | Add screens for Hudro (peek) once both have `sogChoice = true`. |

---

## 5. Acceptance criteria

1. **AC1** — All 6 leaders appear in `LEADERS_REFERENCE.md` /
   dropdown when `riseOfIx === true`.
2. **AC2** — Rhombur's strength helper returns 4 per dreadnought,
   verified via Task 04 tests.
3. **AC3** — Hudro's once-per-game peek can be dispatched exactly
   once; subsequent dispatches are no-ops.
4. **AC4** — Yuna gains +1 extra solari when a card / board space
   gives her solari during her own turn (and only her own turn).
5. **AC5** — Yuna starts with 0 water at game start.
6. **AC6** — Armand: starting Reveal turn with 2 agents on
   Yellow/Blue/Green spaces produces a `CARD_SELECT` trash prompt.
7. **AC7** — Ilesa: Round Start surfaces a `CARD_SELECT` to set aside
   a card; the card is held in `player.setAsideCard` until played.
8. **AC8** - when Tessia reachaes second in faction, the snooper token removed from image board and goes on the leader board. the rewards are correctly applied from top to bottom when new snooper are placed
9. **AC9** — Tessia signet pushes the correct influence transfer
   optional effect.
10. **AC10** — Time travel: leader-induced state changes are fully
    reversible.

---

## 6. Unit tests

**Path:** `client/src/data/leaderAbilities/__tests__/rhombur.test.ts` (new)

- [ ] `dreadnoughtStrengthEach returns 4 for Rhombur`
- [ ] `dreadnoughtStrengthEach returns 3 for everyone else`

**Path:** `client/src/data/leaderAbilities/__tests__/hudroIntriguePeek.test.ts` (new)

- [ ] `hudroPeekAvailable is true initially`
- [ ] `consumeHudroPeek toggles the flag`
- [ ] `Reducer HUDRO_PEEK_DONE increments intrigueCount and flips flag`
- [ ] `Reducer HUDRO_PEEK_DONE second time is a no-op`

**Path:** `client/src/data/leaderAbilities/__tests__/yunaSolariBonus.test.ts` (new)

- [ ] `Yuna gains +1 extra solari when reward.solari > 0 during own turn`
- [ ] `Non-Yuna players do not gain the bonus`
- [ ] `Yuna gains nothing extra when reward.solari is 0`
- [ ] `Yuna gains nothing extra when it's not her turn`
- [ ] `Yuna starts game with water === 0`

**Path:** `client/src/data/leaderAbilities/__tests__/armand.test.ts` (new)

- [ ] `Reveal start with 2 agents on green spaces -> pending CARD_SELECT trash`
- [ ] `Only 1 qualifying agent -> no prompt`
- [ ] `Non-Armand players -> no prompt`

**Path:** `client/src/data/leaderAbilities/__tests__/ilesa.test.ts` (new)

- [ ] `Round Start pushes CARD_SELECT for Ilesa player`
- [ ] `Card resolved into player.setAsideCard`
- [ ] `Playing on 2nd Agent turn with set-aside card grants +1 solari`
- [ ] `If the played card has 1 agent icon -> +1 spice instead`

**Path:** `client/src/data/leaderAbilities/__tests__/tessia.test.ts` (new)

- [ ] `Tessia setup adds snooper choices`
- [ ] `Signet effect transfers 1 influence to a snoopered faction`

---

## 7. Notes / paraphrase risk

- **Hudro intrigue peek**: the printed card text "look at the top 2 of
  the Intrigue Deck and keep one" is paraphrased in the user note as
  "look at top 2 intrigue cards, keep one (once per game)". Plan
  matches the printed text.
- **Yuna solari bonus**: the printed card says "when you gain Solari
  on your turn, increase the amount by 1". Interpretation question:
  is the bonus **per source** (every separate Solari gain +1) or
  **per turn**? Our model is **per source** (each `Reward.solari > 0`
  is +1) which matches the digital adaptation.
- **Armand colour classification**: see §3.4. Verify board art.
- **Ilesa set-aside**: rules say "If you decide to take a Reveal turn
  on your first turn of a round, add the card you set aside to your
  revealed cards. Ilesa Ecaz does not give you 1 spice or 1 Solari."
  Honour this in the reducer: when the set-aside card was used on
  the **first** revealed-card list, do **not** apply the bonus.
- **Baron Vladimir Harkonnen**: not added as a duplicate, see §1.
