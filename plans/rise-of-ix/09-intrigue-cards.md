# Task 09 — Rise of Ix intrigue cards

> Depends on Tasks 01, 02, 04, 06.
> Mirrors the structure of [`08-imperium-row-cards.md`](./08-imperium-row-cards.md)
> for the 17 new RoI intrigue cards.

> ✦ 2026-06-10 — adjustments since this plan was written:
>
> 1. **Base intrigue count confirmed at 32** (`intrigueCards` in
>    `IntrigueDeckService.ts`) — AC1/AC2 math (32 + 17 = 49) holds.
>    `ALL_INTRIGUE_CARDS(expansions)` does not exist yet (Task 01 R6);
>    when adding it, also update `getFreshDefaultGameState`'s
>    `intrigueDeck`, the `IntrigueDeckService` constructor, and
>    `__tests__/_helpers.ts` (`getBaseTestState`).
> 2. **Reference implementations now in code** (copy these patterns):
>    - phase-gated hybrid intrigues: Tiebreaker / Master Tactician
>      (`phase: GamePhase.COMBAT` + `END_GAME`);
>    - win-conditional combat reward (Strategic Push):
>      `CustomEffect.TO_THE_VICTOR` + `pendingVictorSpiceThisCombat`
>      on `GameState`;
>    - garrison deploy intrigue (Second Wave): `MOBILIZE_GARRISON` /
>      `CustomEffect.RAPID_MOBILIZATION` (implemented and tested);
>    - endgame VP evaluators: `CORNER_THE_MARKET`, `PLANS_WITHIN_PLANS`.
> 3. **Action names**: deploy undo is `UNDEPLOY_TROOP`; new dreadnought
>    actions are `DEPLOY_DREADNOUGHT` / `UNDEPLOY_DREADNOUGHT` (Task 04).
>    Cannon Turrets auto-retreat should follow the existing
>    `RETREAT_TROOP` effect-retreat pattern.
> 4. **Grand Conspiracy** condition 1 depends on the
>    `Player.dreadnoughts.control` shape from Task 02
>    (`Array<{ space; placedRound }>`) — `control.length` still works.
> 5. **§5.1 field name**: use `troopsDeployedToConflict` (+ a new
>    dreadnought counter), not `troopsDeployedThisTurn`.
> 6. **Handlers "outside the base reducer"** (§4 table) — new pattern;
>    align with Task 06's `riseOfIxReducer.ts` module so there is one
>    RoI reducer file, not several.

---

## 1. Goal

Add the 17 new Rise of Ix intrigue cards.

When `expansions.riseOfIx === true`, they are appended to the base
`intrigueCards` array used by `IntrigueDeckService` and the initial
`state.intrigueDeck`.

For each card we determine:

1. Its type — `COMBAT`, `PLOT`, or `ENDGAME` (or hybrid).
2. Its `playEffect` declarative shape.
3. Whether a new `CustomEffect` is needed.

---

## 2. Requirements

1. **R1 — Data file.** New
   `client/src/services/intrigueRiseOfIx.ts` exports
   `RISE_OF_IX_INTRIGUE_CARDS: IntrigueCard[]`.
2. **R2 — Image paths.** Each card image points to
   `/intrigue/rise_of_ix/<slug>.png`.
3. **R3 — Hybrid (Combat or Plot / Combat or Endgame) cards.** Use
   per-effect `phase: GamePhase[]` to gate effects (existing pattern,
   see Master Tactician / Tiebreaker in base).
4. **R4 — Per-card handlers** wired in `GameContext.tsx` for the
   `CustomEffect` rows.

---

## 3. Per-card table

| Slug | Name | Type | Description | playEffect (proposed) | Cat. |
|---|---|---|---|---|---|
| `blackmail.png` | Blackmail | COMBAT | Combat. Lose 1 influence (choose) → +5 swords. | `[{ phase: COMBAT, cost: { influence: { chooseOne: true, amounts: ALL4_AT_1 } }, reward: { combat: 5 } }]` | **A** |
| `cannon_turrets.png` | Cannon Turrets | COMBAT | Combat. +2 swords AND each opp retreats 1 dreadnought. | `[{ phase: COMBAT, reward: { combat: 2, custom: CANNON_TURRETS } }]` where `CANNON_TURRETS` retreats 1 dreadnought per opponent. | **B** |
| `strategic_push.png` | Strategic Push | COMBAT | Combat: +2 swords; if you win: +2 solari. | `[{ phase: COMBAT, reward: { combat: 2 } }, { phase: COMBAT, reward: { custom: STRATEGIC_PUSH }/* +2 solari if win, neeed handling for extra reward on win condition */ }]` | **B** | #
| `second_wave.png` | Second Wave | COMBAT | +2 swords, deploy up to 2 units from garrison. | `[{ phase: COMBAT, reward: { combat: 2 } }, { phase: COMBAT, reward: { custom: SECOND_WAVE /* unit deploy up to 2, there should be similar functionality handled alraady in base */ } }]` | **B** |
| `war_chest.png` | War Chest | COMBAT or ENDGAME | (Combat) -2 Solari → +4 swords. (Endgame) If solari ≥ 10: +1 VP. | `[ { phase: COMBAT, cost: { solari: 2 }, reward: { combat: 4 } }, { phase: END_GAME, reward: { custom: WAR_CHEST } } ], /* handling for multiple phases */` | **B** |
| `finesse.png` | Finesse | COMBAT or PLOT | (Combat) +2 swords. (Plot) -1 influence (choose) → +1 influence (choose). | `[ { phase: COMBAT, reward: { combat: 2 } }, { phase: PLAYER_TURNS, cost: { influence: ALL4 /* choose one */ }, reward: { influence: ALL4 /* choose one */ } } ]` | **B** |
| `advanced_weaponry.png` | Advanced Weaponry | COMBAT or PLOT | (Combat) +4 swords if you have 3 tech. (Plot) -3 solari → +1 dreadnought. | `[ { phase: COMBAT, reward: { custom: ADVANCED_WEAPONRY_COMBAT } /* +4 swords if tech≥3 */ }, { phase: PLAYER_TURNS, cost: { solari: 3 }, reward: { dreadnoughts: 1 } } ]` | **B** |
| `grand_conspiracy.png` | Grand Conspiracy | ENDGAME | If you have ≥ 2 dreadnoughts, ≥ 1 SMF, ≥ 4 inf on ≥2 tracks, High Council seat: 3 of these → 1 VP; all 4 → 2 VP. | `[{ phase: END_GAME, reward: { custom: GRAND_CONSPIRACY } }]` | **B** |
| `strongarm.png` | Strongarm | PLOT | Lose a troop → +1 influence on track where you placed an agent this turn. | `[{ cost: { troops: 1 }, reward: { custom: STRONGARM } /* playable only after placing agent */ }]` | **B** |
| `ixian_probe.png` | Ixian Probe | PLOT | Discard 2 cards → draw 2 cards. | `[{ cost: { discard: 2 }, reward: { drawCards: 2 } }]` | **A** |
| `cull.png` | Cull | PLOT | -1 Solari → 1 trash. | `[{ cost: { solari: 1 }, reward: { trash: 1 } }]` | **A** |
| `secret_forces.png` | Secret Forces | PLOT | +2 troops if you have a seat on High Council. | `[{ requirement: { highCouncil: true }, reward: { troops: 2 } }]` | **A** |
| `quid_pro_quo.png` | Quid Pro Quo | PLOT | -2 Spice → +1 influence on each faction track where you currently have an agent. | `[{ cost: { spice: 2 }, reward: { custom: QUID_PRO_QUO } }]` | **B** |
| `glimpse_the_path.png` | Glimpse the Path | PLOT | -1 Spice → +1 water + draw 1. | `[{ cost: { spice: 1 }, reward: { water: 1, drawCards: 1 } }]` | **A** |
| `diversion.png` | Diversion | PLOT | +1 freighter when you deploy 4 units to conflict in 1 turn. | `[{ reward: { custom: DIVERSION /* defers to onDeploy hook */ } /* handle case where intrigue is played, but troops are reduced with ui (intrigue goes back into deck and freighter is reverted, as welll as rewards gained from that freighter are reverted, if chose to go down, need to somehow link , because we can play this one, then expedite, then reduce troop count)*/ }]` | **B** |
| `expedite.png` | Expedite | PLOT | -1 Spice → +1 freighter. | `[{ cost: { spice: 1 }, reward: { freighter: 1 } }]` | **A** |
| `machine_culture.png` | Machine Culture | PLOT or ENDGAME | (Plot) +1 Tech. (Endgame) If you have 3 tech: +1 VP. | `[ { phase: PLAYER_TURNS, reward: { acquireTech: {/* 1? */} } }, { phase: END_GAME, reward: { custom: MACHINE_CULTURE } } ]` | **B** |

> **Total: 17 cards.** Matches rulebook ("17 Intrigue cards").

---

## 4. Files touched

| File | Change |
|---|---|
| `client/src/services/intrigueRiseOfIx.ts` (new) | 17 entries. |
| `client/src/services/IntrigueDeckService.ts` | Read `ALL_INTRIGUE_CARDS(expansions)` instead of importing `intrigueCards` directly when building the deck. |
| `client/src/components/GameContext/GameContext.tsx` | Handlers for category-B custom effects. handlers should live outside the base reducer (possibly different class), and be used only when flag is enabled and the card is from this expansion |
| `client/src/data/effectTexts.ts` | Text strings for the new custom effects. |

---

## 5. Detailed design

### 5.1 `Diversion` deferred hook

Diversion sets a per-turn flag `state.currTurn.diversionActive = true`.
Inside `DEPLOY_TROOP` / `DEPLOY_DREADNOUGHT`, if the cumulative
`troopsDeployedToConflict + dreadnoughtsDeployedToConflict >= 4`
(✦ actual/new field names) and `diversionActive`, the reducer fires
`+1 freighter` once and clears the flag. The revert path
(`UNDEPLOY_TROOP` / `UNDEPLOY_DREADNOUGHT` dropping below 4) must
unwind the freighter gain — see inline note below.
/* defers to onDeploy hook */ } /* handle case where intrigue is played, but troops are reduced with ui (intrigue goes back into deck and freighter is reverted, as welll as rewards gained from that freighter are reverted, if chose to go down, need to somehow link , because we can play this one, then expedite, then reduce troop count)*/

### 5.2 `Strongarm`

After dispatch, the reducer needs the set of factions where the player
has an agent **this turn**. Use `state.occupiedSpaces` for spaces
currently held by the player and look up each space's `influence?.faction`. Only this turn.
Push a `pendingChoice` with one option per qualifying faction. if only one (the usual situation) then no choice.

### 5.3 `Quid Pro Quo`

Same lookup as Strongarm but apply +1 influence to **every** track
that has at least one agent — no choice. agent from the player. not only this turn.

### 5.4 `Cannon Turrets`

After +2 swords, each opponent retrats 1 dreagnought back to their garrison if they had deployed in battle.

### 5.5 `Grand Conspiracy` (endgame)

```ts
function evaluateGrandConspiracy(state, playerId): number {
  const p = state.players.find(x => x.id === playerId)!
  const cond1 = (p.dreadnoughts?.garrison ?? 0)
              + (p.dreadnoughts?.control?.length ?? 0) >= 2
  const cond2 = countSpiceMustFlowCards(p) >= 1
  const cond3 = Object.values(FactionType).filter(f =>
    (state.factionInfluence[f]?.[playerId] ?? 0) >= 4
  ).length >= 2
  const cond4 = p.hasHighCouncilSeat
  const trueCount = [cond1, cond2, cond3, cond4].filter(Boolean).length
  if (trueCount >= 4) return 2
  if (trueCount >= 3) return 1
  return 0
}
```

### 5.6 `Machine Culture` endgame

Add +1 VP if `player.tech.length >= 3` at `RESOLVE_ENDGAME`.

---

## 6. Acceptance criteria

1. **AC1** — `ALL_INTRIGUE_CARDS({ riseOfIx: true }).length === 49`.
2. **AC2** — `ALL_INTRIGUE_CARDS({ riseOfIx: false }).length === 32`.
3. **AC3** — Each category-A card resolves via the standard reward
   pipeline.
4. **AC4** — Each category-B card has a passing test in §7.

---

## 7. Unit tests

**Path:** `client/src/components/GameContext/__tests__/riseOfIxIntrigue.test.ts` (new)

- [ ] `Blackmail: combat phase, costs 1 influence, +5 combat`
- [ ] `Cannon Turrets: +2 combat, opponents retreat 1 dreadnought from battle to garrison. currplayer does not.`
- [ ] `Strategic Push: combat +2; +2 solari only if player wins the combat`
- [ ] `Second Wave: +2 combat; deploy up to 2 from garrison (units = troop or dreadnaught)`
- [ ] `War Chest: combat -2 solari → +4 combat; endgame +1 VP if solari≥10`
- [ ] `Finesse: combat +2; plot -1 influence → +1 influence`
- [ ] `Advanced Weaponry: combat +4 only if tech≥3; plot -3 solari → +1 dreadnought`
- [ ] `Grand Conspiracy: tier-1/2 evaluator`
- [ ] `Strongarm: lose troop, choose among player's agent factions this turn`
- [ ] `Ixian Probe: discard 2 → draw 2`
- [ ] `Cull: solari -1 → trash`
- [ ] `Secret Forces: troops:2 requires highCouncil`
- [ ] `Quid Pro Quo: spice -2 → +1 inf per agent-faction`
- [ ] `Glimpse the Path: spice -1 → water +1 + draw 1`
- [ ] `Diversion: deploy 4 units triggers +1 freighter`
- [ ] `Expedite: spice -1 → +1 freighter`
- [ ] `Machine Culture: plot acquireTech; endgame +1 VP if tech≥3`

---

## 8. Notes / paraphrase risk

- **War Chest endgame** — paraphrase says "+1 VP if you have 10 Solari".
  Confirm whether the threshold is 10 or some other number. CONFIRMING - IT IS 10 OR MORE as per IMAGE
- **Cannon Turrets** — confirm "each opp retreats 1 Dreadnought" means
  only opponents who **have** a dreadnought in the Conflict; we don't
  force the choice when there's nothing to retreat. CLARIFICATION = THERE SHOULD BE NO CHOICE, IF HAVE DREADNOUGHT, NEED TO RETREAT IT automatically
- **Strongarm phrasing** — "where you placed an agent this turn"
  applies only to **the current turn**, not to all agents currently on
  the board.
- **Grand Conspiracy condition list** — confirm the exact 4 criteria
  from the printed card. The user's table is paraphrased. CONFIRMING - LOOKS CORRECT
