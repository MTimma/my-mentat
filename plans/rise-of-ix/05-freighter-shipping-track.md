# Task 05 — Freighter & Shipping track

> Depends on Tasks 01, 02, 03 (`riseofix2` overlay + optional freighter modal).
> This is a reducer + small UI task.

> ✦ 2026-06-10 — adjustments since this plan was written:
>
> 1. **Freighter status modal** (R5) must use the new board-modal
>    portal pattern: `usePlayBoardModalPortal` + `PlayBoardModalContext`
>    + overlay classes in `client/src/styles/playBoardModal.css`
>    (reference: `CombatResults`, `PlayerOverviewModal`).
> 2. **TurnControls** still renders generic `pendingChoices`
>    (FIXED_OPTIONS) — the Advance/Recall buttons plug into that
>    existing flow; no deploy-style custom panel needed there.
> 3. **Blocked on Task 03 artifacts**: `SHIPPING_TRACK_ANCHORS`,
>    the `riseofix2` overlay, and board spaces 25–26 do not exist yet
>    (`boardSpaces.ts` currently ends at id 22; ids are free).
> 4. **Step-1 reward contradiction resolved**: §2 R3 / §4.2 said
>    Dividends is mandatory; §7 says step 1 is *Dividends OR +2 spice*.
>    **§7 wins** — step 1 of a Recall enqueues an OR-choice
>    (`{ dividends: true }` vs `{ spice: 2 }`); the `dividends: true`
>    expansion itself (§4.2) is then mandatory once chosen.
>    Verify against rulebook p. 5 before merging.
> 5. **`Reward.dividends` / `forOpponents`** shapes don't exist yet —
>    added by Task 02 (see its R4 note for the modeling decision).

---

## 1. Goal

Implement the CHOAM Shipping track from the Rise of Ix rulebook (p. 5):

- Each player has a **Freighter disc** on the Shipping track. Start at
  step 0 (bottom).
- The track has **4 positions** (0–3). Steps 1, 2 and 3 each carry a
  recall reward (collectively earned when the player **recalls**
  their freighter back to step 0).
- The **Freighter icon** on a card or board space lets the player
  choose between two moves:
  - **Advance** one step (no-op if already at 3). Cannot be chosen
  - **Recall** to step 0 and collect **all** rewards from current step
    and every step below.
- The **Smuggling** board space gives `solari: 1` + `freighter: 1`.
- The **Interstellar Shipping** board space (requires SG influence ≥ 2)
  gives `freighter: 2`. (Two freighter actions; each one is its own
  Advance/Recall choice.)

Recall rewards by step (rulebook p. 5):

| Step | Reward |
|---|---|
| 1 | **Dividends** — +5 Solari to active player, +1 Solari to each opponent. | Re-reading: yes, step 1
  *does* offer a choice: Dividends OR +2 spice.
| 2 | **Troops & Influence** — +2 troops AND +1 influence (player chooses faction). |
| 3 | **Acquire Tech (-2)** — Acquire one tech tile with a 2-spice discount. |

---

## 2. Requirements

1. **R1 — Player state.** `Player.freighterStep: 0 \| 1 \| 2 \| 3`.
   Default `0`; seeded by `GameStateSetup` only when
   `expansions.riseOfIx === true`.
2. **R2 — Freighter action handling.** Reward field
   `freighter: number \| 'recall'` (Task 02 §R4) handled in
   `applyRewardToPlayer` (or its successor pure helper):
   - If `freighter` is a number `N`:
     - Reducer pushes an OR-choice (per icon, i.e. **N times** when N>1)
       offering **Advance** vs **Recall**:
       - Advance: `freighterStep = min(3, freighterStep + 1)`.
       - Recall: compute the recall reward bundle (see R3) and **enqueue
         it** as PendingRewards, then set `freighterStep = 0`.
3. **R3 — Recall reward bundle.** For each step `k` where
   `1 ≤ k ≤ currentStep`, enqueue:
   - k=1 → ✦ **OR-choice**: `{ dividends: true }` (+5 solari to active
     player, +1 solari to each opponent) **or** `{ spice: 2 }` (see
     §7 / header note 4). Logged as separate `Gain` rows with
     `source: SHIPPING_TRACK`.
   - k=2 → `troops: 2` AND `influence: { chooseOne: true, amounts: [E,SG,BG,F at 1] }`.
   - k=3 → `acquireTech: { discount: 2 }`.
4. **R4 — Persistence in history.** `freighterStep` is part of the
   snapshot. Undoing a recall must restore the previous step.
5. **R5 — UI.**
   - 'UI of freighter status should be a modal, opened by the button next tot he fields in image board ( placed in empty space in top left space of board)
     > ✦ implement with `usePlayBoardModalPortal` (board-scoped
     > overlay); add its overlay class to `playBoardModal.css`.
   - `TurnControls`: when a freighter OR-choice is pending, render
     two buttons "Advance" / "Recall" with current step (`0–3`) shown
     (✦ via the existing generic `pendingChoices` FIXED_OPTIONS
     rendering — no bespoke panel).
   - `ImageBoard` on `riseofix2` (Task 03 §R9): per-player discs on the
     shipping track via `SHIPPING_TRACK_ANCHORS`; optional freighter
     status modal (Task 05 §R5 first bullet).
6. **R6 — Recall when at step 0.** A recall at step 0 yields **no
   rewards** but still consumes the freighter action (per rulebook this
   is a wasted choice — game allows it but no benefit). We do not
   require the user to pick Advance instead; we let them choose, and
   if they choose Recall with step 0 we log a gain row of `amount: 0`.
7. **R7 — Acquire Tech (-2) at step 3.** Triggers the same code path as
   `acquireTech: { discount: 2 }` (see [`06-tech-tiles.md`](./06-tech-tiles.md)).
   - If there are no tech tiles available (Ix board empty), reward is
     skipped silently with a `gain` row indicating "no tile available".
8. **R8 — `RewardType.FREIGHTER`** logged for each Advance and each
   Recall, so the Time Travel diff shows what happened.

---

## 3. Files touched

| File | Change |
|---|---|
| `client/src/types/GameTypes.ts` | Add `freighterStep` to `Player`; `RewardType.FREIGHTER`. (Already covered by Task 02; verify.) |
| `client/src/components/GameContext/GameContext.tsx` | Reward expansion for `freighter` and `dividends`; new `pendingChoices` for advance/recall; recall reward bundle. place rise of ix logic in separate module/file from base reducer logic.|
| `client/src/data/boardMarkerAnchors.ts` | `SHIPPING_TRACK_ANCHORS`. |
| `client/src/components/TurnControls/TurnControls.tsx` | Render the Advance / Recall choice. |
| `client/src/components/ImageBoard/ImageBoard.tsx` | Freighter discs on `riseofix2`; optional freighter modal trigger. |

---

## 4. Detailed design

### 4.1 Reward expansion

In the reducer code path that walks an effect's `Reward`:

```ts
if (reward.freighter === 'recall') {
  enqueueRecallBundle(state, playerId)
} else if (typeof reward.freighter === 'number' && reward.freighter > 0) {
  for (let i = 0; i < reward.freighter; i++) {
    pushFreighterChoice(state, playerId, source)
  }
}
```

Where `pushFreighterChoice` creates a single OR `FixedOptionsChoice`:

```ts
{
  type: ChoiceType.FIXED_OPTIONS,
  id: `freighter-${uuid()}`,
  prompt: `Freighter (now at ${player.freighterStep}/3)`,
  source,
  options: [
    { reward: { custom: CustomEffect.FREIGHTER_ADVANCE }, rewardLabel: 'Advance' },
    { reward: { custom: CustomEffect.FREIGHTER_RECALL  }, rewardLabel: 'Recall' },
  ]
}
```

Then `RESOLVE_CHOICE` handles the custom effect:

```ts
case CustomEffect.FREIGHTER_ADVANCE:
  updatePlayer(state, playerId, p => ({ ...p, freighterStep: Math.min(3, (p.freighterStep ?? 0) + 1) }))
  pushGain(state, playerId, source, RewardType.FREIGHTER, +1, 'Advance')
  break

case CustomEffect.FREIGHTER_RECALL: {
  const step = player.freighterStep ?? 0
  pushGain(state, playerId, source, RewardType.FREIGHTER, -step, 'Recall')
  // enqueue stepwise pending rewards (k = 1..step)
  if (step >= 1) enqueueStep1Choice(source) // ✦ OR-choice: { dividends: true } vs { spice: 2 }
  if (step >= 2) enqueueReward({ troops: 2, influence: { chooseOne: true, amounts: ALL_FOUR } }, source)
  if (step >= 3) enqueueReward({ acquireTech: { discount: 2 } }, source)
  updatePlayer(state, playerId, p => ({ ...p, freighterStep: 0 }))
  break
}
```

### 4.2 `dividends: true` expansion

```ts
case 'reward.dividends': {
  // Active player +5; everyone else +1
  for (const p of state.players) {
    const amt = p.id === playerId ? 5 : 1
    updatePlayer(state, p.id, x => ({ ...x, solari: x.solari + amt }))
    pushGain(state, p.id, source, RewardType.SOLARI, amt, 'Dividends')
  }
  break
}
```

`Dividends` is **mandatory once chosen** — but reaching it from a
step-1 Recall goes through the Dividends-vs-2-spice OR-choice first
(✦ see header note 4 / §7).

### 4.3 UI strip

Freighter discs on `ImageBoard` sit on the `riseofix2.png` overlay,
anchored via `SHIPPING_TRACK_ANCHORS` (rows 3..0). An optional modal
(next to CHOAM fields) can show row labels (`Tech (-2)`, `Troops +
Influence`, `Dividends`, `Start`) for detail during Advance/Recall.

---

## 5. Acceptance criteria

1. **AC1** — A card / board space with `freighter: 1` produces a single
   Advance/Recall pending choice in `state.currTurn.pendingChoices`.
2. **AC2** — Choosing Advance increments `player.freighterStep` by 1
   (capped at 3).
3. **AC3** — Choosing Recall from step 3 enqueues exactly 3 reward
   steps (✦ step-1 Dividends-vs-2-spice OR-choice, Troops+Influence,
   Acquire Tech (-2)) and sets `freighterStep = 0`.
4. **AC4** — Dividends increments active player solari by 5 and each
   other player solari by 1.
5. **AC5** — Recall from step 0 enqueues no rewards and logs a `-0`
   `RewardType.FREIGHTER` gain.
6. **AC6** — Smuggling (board space id 25) presents `solari: 1` (auto)
   + 1 freighter choice. Interstellar Shipping (id 26) presents 2
   freighter choices.
7. **AC7** — `freighterStep` persists through `END_TURN` and through
   `RESOLVE_COMBAT` (recall does not happen on phase change).
8. **AC8** — Time travel: `UNDO_TO_TURN` restores `freighterStep` and
   any partially consumed Dividends gains correctly.

---

## 6. Unit tests

**Path:** `client/src/components/GameContext/__tests__/freighter.test.ts` (new)

- [ ] `Advance from 0 -> 1`
- [ ] `Advance from 3 stays at 3`
- [ ] `Recall from 0 yields no rewards`
- [ ] `Recall from 1 yields the step-1 OR-choice (Dividends vs +2 spice) only`
- [ ] `Recall from 2 yields Dividends + (troops + influence-OR)`
- [ ] `Recall from 3 yields all three rewards`
- [ ] `Dividends pays +5 to active and +1 to each other player`
- [ ] `Two freighter icons -> two pending choices`
- [ ] `freighterStep persists across END_TURN`
- [ ] `UNDO_TO_TURN restores prior freighterStep`

---

## 7. Notes / paraphrase risk

- **Recall reward at step 1**: rulebook explicitly calls it "Dividends"
  with the active-player-only choice between Dividends (+5 to self, +1
  to each opponent) **or** "Gain 2 spice". Re-reading: yes, step 1
  *does* offer a choice: Dividends OR +2 spice. Our model:
  - Add `step1Choice: ChoiceOption[]` with two options
    `{ dividends: true }` and `{ spice: 2 }`.
  - Update R3 above accordingly: step 1 is an OR-choice, not a
    mandatory Dividends.
  - Update §4.1 enqueue accordingly. **Implementing agent: please
    cross-check page 5 wording and confirm before merging.**
- **Acquire Tech (-2) when Ix board empty**: rulebook says "you may
  Acquire Tech". If no tile is available, simply skip with a log row.
- **Recall at step 0**: per Bodie's example in the rulebook, the
  player who's at the top can still recall. There is no language that
  forbids recalling from 0; allow it but it gives nothing.
