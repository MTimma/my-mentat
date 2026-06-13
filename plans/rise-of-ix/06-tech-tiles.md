# Task 06 — Tech tiles

> Depends on Tasks 01, 02, 03, 04 (dreadnoughts), 05 (freighter).
> This is the largest piece of new mechanics in the expansion.

> ✦ 2026-06-10 — adjustments since this plan was written:
>
> 1. **Assets done**: all 18 tile PNGs exist under
>    `client/public/technologies/rise_of_ix/` (the `TECH_TILES` data
>    file is still entirely to-do).
> 2. **`TechStacksModal` must use the board-modal portal pattern**
>    (`usePlayBoardModalPortal` + `PlayBoardModalContext` + classes in
>    `client/src/styles/playBoardModal.css`); trigger button sits next
>    to the `riseofix3` overlay per Task 03 §4.4. It must stay
>    board-scoped so it works with the play-chrome
>    `scopeModalsToBoard` mode.
> 3. **Reducer modularization**: `GameContext.tsx` is a ~5300-line
>    monolith. The "separate file" wish in §4 is **new** structure —
>    name it explicitly, e.g.
>    `client/src/components/GameContext/riseOfIxReducer.ts`, with pure
>    functions called from the main reducer switch.
> 4. **Existing hooks to reuse**: `state.acquireToTopThisRound`
>    (Spaceport) and `state.infiltrateIgnoreOccupancyOnce`
>    (Invasion Ships) already exist on `GameState` — extend their
>    semantics, don't redeclare.
> 5. **Blocked tiles**: Detonation Devices and Troop Transports depend
>    on Task 04 (dreadnought win flow) and Task 05 (freighter step 2)
>    respectively.
> 6. **GameStateSetup seeding**: seed `ixBoard` in the same
>    `onComplete` path that builds the initial `Player[]` (the setup
>    flow also initializes the play-chrome theme — see
>    `utils/playChromeTheme.ts` — keep the seeding alongside it).

---

## 1. Goal

Implement the 18 unique tech tiles, their acquisition flow, and their
per-tile effects.

The Ix board carries **3 stacks of 6 face-down tiles**; the top of
each stack is face-up. When a player triggers an **Acquire Tech**
icon, they may:

1. Pay the spice cost of one face-up tile (possibly reduced by
   discounts and/or returned **negotiators**), and
2. Take that tile to their supply,
3. Optionally trigger its `acquireEffect` (per-tile),
4. Reveal the next tile in the same stack.

Tiles may be flipped face-down ("used this round") and flipped back
face-up at Round Start.

---

## 2. Requirements

1. **R1 — Tech tile data.** `client/src/data/techTiles.ts` lists all
   18 tiles with `id`, `name`, `cost`, `image`, `timing`,
   `description`, optional `acquireEffect`, optional `customEffect`.
2. **R2 — Ix board state.** `GameState.ixBoard` (Task 02 §R7) is a
   3-stack array. Setup (in `GameStateSetup` when `riseOfIx === true`)
   shuffles 18 ids, splits into 3 stacks of 6, sets the top face-up.
3. **R3 — Acquire Tech action.**
   `{ type: 'ACQUIRE_TECH', playerId, tileId, negotiatorsReturned, discount }`
   in the reducer:
   - Compute `effectiveCost = max(0, baseCost - discount - negotiatorsReturned)`.
   - Validate `player.spice >= effectiveCost`.
   - Validate `negotiatorsReturned <= player.negotiatorsOnIx`.
   - Decrement `player.spice -= effectiveCost`.
   - Decrement `player.negotiatorsOnIx -= negotiatorsReturned` and
     increment `player.troops += negotiatorsReturned` (returns to
     supply per rulebook).
   - Append `{ id, faceUp: true }` to `player.tech`.
   - Apply `tile.acquireEffect` (push into `pendingRewards` or apply
     immediately if non-interactive).
   - Pop the tile from its stack; reveal next (`faceUp = true`) if
     stack is non-empty.
   - Log a `Gain` with `source: GainSource.IX_BOARD`, `type: RewardType.TECH`.
4. **R4 — Tech Negotiator action.**
   `{ type: 'TECH_NEGOTIATOR', playerId, amount: number }` increments
   `player.negotiatorsOnIx` by `amount` and decrements `player.troops`
   by the same. Validated at dispatch site (cap at `player.troops`).
   The reducer also supports `reward.techNegotiator: N`, which enqueues
   this action transparently (negotiators only placed if supply has
   troops; otherwise rule per rulebook: "nothing happens").
5. **R5 — Round Start flip-back.** When the Round Start phase begins,
   for every player, every tech tile with `faceUp === false`, flip it
   back to `faceUp: true`. Also fire any tile with
   `timing: [TechTileTiming.ROUND_START]` (see R6).
6. **R6 — Per-tile effects.** Each tile has a defined trigger window.
   The reducer iterates owners and fires:
   - **Reveal** (`REVEAL`): when a player's Reveal turn fires.
   - **Round Start** (`ROUND_START`): at phase transition.
   - **Agent, Reveal (Once Per Round)**: triggered by a button in
     `TurnControls`; the user dispatches when applicable. Flip
     face-down on use.
   - **Agent, Reveal (Always)**: triggers automatically per the rules.
     Some are passive modifiers (Spaceport, Troop Transports).
   - **Agent, Reveal (One Time)**: trigger button; trash the tile on
     use (Sonic Snoopers).
   - **Endgame**: scoring contribution in `RESOLVE_ENDGAME`.
   - **After Conflict**: hook in `RESOLVE_COMBAT` after winner
     determination.
7. **R7 — UI.**
   - `PlayerOverviewModal`: show owned tech tiles with face-up/face-down
     state.
   - `TurnControls`: per active player, when they own a tech tile that
     can be activated now, show a button to activate it (e.g. "Flagship
     — pay 4 solari, recruit 3 troops"). The reducer rejects activation
     if requirements unmet.
   - `TechStacksModal` (Task 03 §R5): tile detail tooltip; "Acquire"
     per stack; negotiator-return flow.
8. **R8 — Logging.** Every activation logs a `Gain` row sourced from
   `GainSource.TECH` with the tile name.

---

## 3. Per-tile design

The values below are paraphrased from the `.cursor/rise_of_ix` table.
Verify against the printed tiles before final implementation.

| # | ID | Name | Cost | Timing(s) | Acquire | Effect | Reducer hook |
|---|---|---|---|---|---|---|---|
| 1 | `ARTILLERY` | Artillery | 1 | REVEAL | – | +1 sword for each revealed card that provides ≥ 1 sword this turn | `customEffect: ARTILLERY` reads `currTurn.revealedCardIds` and counts cards whose `revealEffect[*].reward.combat ?? 0 > 0`. Adds that many to `player.combatValue`. |
| 2 | `CHAUMURKY` | Chaumurky | 4 | ENDGAME | `intrigueCards: 2` | Win tiebreakers | `RESOLVE_ENDGAME`: when comparing tiebreakers, treat this player as strictly higher than any opponent without Chaumurky. |
| 3 | `DETONATION_DEVICES` | Detonation Devices | 3 | AFTER_CONFLICT | – | When you win a Conflict with a dreadnought in it: +1 VP **and** return that dreadnought to your supply (instead of placing it on a board space). | After winner is determined and player had a dreadnought in the conflict, push a pending **OR** choice: "Take +1 VP and return dreadnought to supply" vs "Take control space normally". |
| 4 | `DISPOSAL_FACILITY` | Disposal Facility | 3 | REVEAL | `trash: 1` | If persuasion ≥ 6 during your Reveal turn, you may trash one card in play | Push optional effect in the reveal step. |
| 5 | `FLAGSHIP` | Flagship | 8 | AGENT_REVEAL_ONCE_PER_ROUND | `victoryPoints: 1` | Pay 4 Solari → +3 troops | Push optional effect with cost. Flip face-down on use. |
| 6 | `HOLOPROJECTORS` | Holoprojectors | 3 | AGENT_REVEAL_ONCE_PER_ROUND | – | Discard 1 card → draw 1 card | Push optional effect. Discard is `cost.discard: 1`, reward `drawCards: 1`. |
| 7 | `HOLTZMAN_ENGINE` | Holtzman Engine | 6 | ROUND_START, ENDGAME | – | Round Start: draw 1 card. Endgame: +1 VP if you have ≥ 2 Spice Must Flow. | Fire `drawCards: 1` at Round Start phase. At `RESOLVE_ENDGAME`, count `countSpiceMustFlowCards(player) >= 2 ? +1 VP : 0`. |
| 8 | `INVASION_SHIPS` | Invasion Ships | 5 | AGENT (Once Per Round) | `troops: 4` | Discard 1 → Enemy agents don't block your agent this turn | Adds `infiltrateIgnoreOccupancyOnce[playerId] = true` for the next Agent placement; flip face-down. |
| 9 | `MEMOCORDERS` | Memocorders | 2 | ENDGAME | `influence: { chooseOne: true, amounts: any one }` | Endgame: +1 VP if you have ≥ 3 influence on **all four** tracks | Standard endgame computation. |
| 10 | `MINIMIC_FILM` | Minimic Film | 2 | REVEAL | – | Reveal: +1 persuasion | Push +1 persuasion to current Reveal turn. |
| 11 | `RESTRICTED_ORDINANCE` | Restricted Ordinance | 4 | REVEAL | – | Reveal: +4 swords if you have a High Council seat | Push +4 combat conditional on `player.hasHighCouncilSeat`. |
| 12 | `SHUTTLE_FLEET` | Shuttle Fleet | 6 | ROUND_START | acquire effect: +1 influence on 2 of 4 (choose) | Round Start: +2 solari | Round Start firing path. |
| 13 | `SONIC_SNOOPERS` | Sonic Snoopers | 2 | AGENT_REVEAL_ONE_TIME | `intrigueCards: 1` | Trash this → put any number of your intrigue cards on the bottom of the intrigue deck, then draw that many intrigue cards | Trash only as we do not keep track of players intrigue cards, only count |
| 14 | `SPACEPORT` | Spaceport | 5 | AGENT_REVEAL_ALWAYS | `drawCards: 2` | Passive: you may put cards you acquire on top of your deck | Sets `state.acquireToTopThisRound[playerId] = true` for this player as long as they own the tile (i.e. permanent while owned). note it has to be optional. put the card into deck array isntead of discard|
| 15 | `SPY_SATELLITES` | Spy Satellites | 4 | AGENT_REVEAL_ONCE, ENDGAME | – | Pay 3 spice, trash this → +1 VP. OR Endgame: +1 VP for each faction where you have ≤ 1 influence. | Two pending paths: the trash-for-VP action and the endgame scoring. |
| 16 | `TRAINING_DRONES` | Training Drones | 3 | AGENT_REVEAL_ONCE_PER_ROUND | – | +1 troop | Push troops:1. Flip face-down. |
| 17 | `TROOP_TRANSPORTS` | Troop Transports | 2 | AGENT_REVEAL_ALWAYS | – | Whenever you recruit troops from the Shipping track, recruit an additional troop. You may deploy them to the conflict. | Hook in the freighter-step-2 reward: if owner has this tile, `troops` reward becomes `troops + 1` and includes `deployTroops: troops` for opt-in deploy. but deploy troops is only for these 3, (not +2 from garrison as usual)|
| 18 | `WINDTRAPS` | Windtraps | 2 | AFTER_CONFLICT | `water: 1` | When you win a Conflict: +1 water | Hook in `RESOLVE_COMBAT` for each winning owner. |

---

## 4. Files touched

| File | Change |
|---|---|
| `client/src/data/techTiles.ts` | Final declarative data per §3. |
| `client/src/types/GameTypes.ts` | `GameAction` adds `'ACQUIRE_TECH'`, `'TECH_NEGOTIATOR'`, `'ACTIVATE_TECH'`, `'FLIP_TECH'` (utility). |
| `client/src/components/GameContext/GameContext.tsx` | All reducer logic per R3–R6 + per-tile effect handlers. ✦ Keep RoI logic in a separate module — `client/src/components/GameContext/riseOfIxReducer.ts` — with pure functions called from the main reducer switch. |
| `client/src/components/TechStacksModal/TechStacksModal.tsx` | Acquire flow incl. negotiator return; per-tile hover tooltip. ✦ Built on `usePlayBoardModalPortal`; overlay class registered in `playBoardModal.css`. |
| `client/src/components/PlayerOverviewModal/PlayerOverviewModal.tsx` | Show owned tiles. |
| `client/src/components/TurnControls/TurnControls.tsx` | Per-player tech-activation buttons. |
| `client/src/utils/techTiles.ts` (new) | Pure helpers: `tileById(id)`, `playerOwnsTile(player, id)`, `firstStackTops(state)`. |

---

## 5. Detailed design

### 5.1 Acquire flow UX

1. User clicks "Acquire" on a face-up tile in `TechStacksModal`.
2. UI computes max returnable negotiators
   (`min(player.negotiatorsOnIx, tile.cost - tile.discount?)`).
3. If `player.negotiatorsOnIx > 0` and a discount could help, show a
   small numeric input (0..max) before the final confirm.
4. UI also surfaces any `discount` (e.g. 1 or 2) from the *triggering*
   effect — when Acquire Tech was triggered by **Tech Negotiation**
   board space we have a baked-in `discount: 1`.
5. Dispatch `{ type: 'ACQUIRE_TECH', playerId, tileId, negotiatorsReturned, discount }`.

The reducer is **the** place that subtracts spice; the UI never
mutates state directly.

### 5.2 Round Start phase additions

```ts
function applyRoundStart(state: GameState): GameState {
  let s = baseRoundStart(state) // existing logic
  if (!s.expansions.riseOfIx) return s
  // Flip face-down tiles face-up
  s = {
    ...s,
    players: s.players.map(p => ({
      ...p,
      tech: (p.tech ?? []).map(t => ({ ...t, faceUp: true }))
    }))
  }
  // Fire ROUND_START tile effects
  s.players.forEach(p => {
    p.tech?.forEach(({ id }) => {
      const tile = tileById(id)
      if (tile?.timing.includes(TechTileTiming.ROUND_START)) {
        s = applyTechEffect(s, p.id, tile, 'ROUND_START')
      }
    })
  })
  return s
}
```

### 5.3 Acquire effects

`tile.acquireEffect: Reward` reuses the standard reward flow:

- `intrigueCards: 2` (Chaumurky) → push 2 intrigue cards.
- `trash: 1` (Disposal Facility) → push trash choice.
- `victoryPoints: 1` (Flagship) → push +1 VP gain.
- `drawCards: 2` (Spaceport) → push draw.
- `influence: { chooseOne, amounts: ALL_FOUR }` (Memocorders) → push
  influence choice.
- `water: 1` (Windtraps) → push +1 water.
- `troops: 4` (Invasion Ships) → push +4 troops.
- `intrigueCards: 1` (Sonic Snoopers) → push +1 intrigue.
- Shuttle Fleet acquire: "+inf on 2 of 4" → push two consecutive
  influence pending choices over the four factions.

### 5.4 Activate buttons

For each owned tile that has an active-window timing, render in
`TurnControls`:

```tsx
{tilesActivatableNow.map(tile => (
  <button onClick={() => dispatch({ type: 'ACTIVATE_TECH', playerId, tileId: tile.id })}>
    {tile.name} — {tile.description}
  </button>
))}
```

`tilesActivatableNow(state, player)` returns the subset:

```ts
[
  // owned and face-up
  ...player.tech.filter(t => t.faceUp).map(t => tileById(t.id)),
].filter(tile => isApplicableInCurrentWindow(state, tile))
```

`isApplicableInCurrentWindow` keys off `state.phase` and
`state.currTurn`:

- AGENT_REVEAL_ONCE_PER_ROUND: any time during own player turn,
  before Reveal completes.
- AGENT_REVEAL_ONE_TIME: any time, but only if `faceUp === true` (we
  trash on use, so it goes away).
- REVEAL: only during own Reveal turn.

---

## 6. Acceptance criteria

2. **AC2** — Dispatching `ACQUIRE_TECH` decrements spice by
   `max(0, baseCost - discount - negotiatorsReturned)` and
   `player.tech` gains the tile.
3. **AC3** — Acquire with `negotiatorsReturned > player.negotiatorsOnIx`
   is rejected (state unchanged).
4. **AC4** — Returning negotiators moves them back to `troops` and
   removes from `negotiatorsOnIx`.
5. **AC5** — When a stack runs out, its slot stays empty for the rest
   of the game (no auto refill).
6. **AC6** — Round Start: face-down tiles flip face-up, and Holtzman
   Engine fires its `drawCards: 1`, Shuttle Fleet its `+2 solari`.
7. **AC7** — Holtzman Engine endgame test: with 2 TSMF cards owned,
   +1 VP at `RESOLVE_ENDGAME`.
8. **AC8** — Artillery: revealing 3 cards that each contribute
   ≥ 1 sword adds +3 combat.
9. **AC9** — Sonic Snoopers: activate → CARD_SELECT over own intrigue
   cards → those go bottom of intrigue deck, draw same number, tile is
   trashed (removed from `player.tech`).
10. **AC10** — Time travel: any tech-activation step is fully
    reversible via `UNDO_TO_TURN`.

---

## 7. Unit tests

**Path:** `client/src/components/GameContext/__tests__/techTiles.test.ts` (new)

- [ ] `ACQUIRE_TECH happy path: spice -3, tile in player.tech`
- [ ] `ACQUIRE_TECH with discount 2 from Tech Negotiation`
- [ ] `ACQUIRE_TECH returning 2 negotiators: spice -1, troops +2`
- [ ] `ACQUIRE_TECH rejected when spice insufficient`
- [ ] `Round Start flips face-down tiles to face-up`
- [ ] `Holtzman Engine fires drawCards at Round Start`
- [ ] `Shuttle Fleet fires solari:2 at Round Start`
- [ ] `Holtzman Engine endgame +1 VP if SMF >= 2`
- [ ] `Artillery: +1 per sword-producing revealed card`
- [ ] `Restricted Ordinance: +4 combat only if hasHighCouncilSeat`
- [ ] `Spaceport: state.acquireToTopThisRound[playerId] true while owned`
- [ ] `Troop Transports: freighter step 2 reward becomes troops:3 with optional deploy`
- [ ] `Sonic Snoopers one-time activate flow`
- [ ] `Detonation Devices: pending OR choice after winning conflict with dreadnought`
- [ ] `Windtraps: +1 water on conflict win`

---

