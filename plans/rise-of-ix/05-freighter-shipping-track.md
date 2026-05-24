# Task 05 — Freighter & Shipping track

> Depends on Tasks 01, 02, 03 (the Ix board panel renders the track).
> This is a reducer + small UI task.

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
  - **Advance** one step (no-op if already at 3).
  - **Recall** to step 0 and collect **all** rewards from current step
    and every step below.
- The **Smuggling** board space gives `solari: 1` + `freighter: 1`.
- The **Interstellar Shipping** board space (requires SG influence ≥ 2)
  gives `freighter: 2`. (Two freighter actions; each one is its own
  Advance/Recall choice.)

Recall rewards by step (rulebook p. 5):

| Step | Reward |
|---|---|
| 1 | **Dividends** — +5 Solari to active player, +1 Solari to each opponent. |
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
   - k=1 → `dividends: true` → `+5 solari` to active player and
     `+1 solari` to each other player. Logged as separate
     `Gain` rows with `source: SHIPPING_TRACK`.
   - k=2 → `troops: 2` AND `influence: { chooseOne: true, amounts: [E,SG,BG,F at 1] }`.
   - k=3 → `acquireTech: { discount: 2 }`.
4. **R4 — Persistence in history.** `freighterStep` is part of the
   snapshot. Undoing a recall must restore the previous step.
5. **R5 — UI.**
   - `TurnControls`: when a freighter OR-choice is pending, render
     two buttons "Advance" / "Recall" with current step (`0–3`) shown.
   - `IxBoardPanel` (Task 03 §R5): renders per-player discs on the
     correct row using `SHIPPING_TRACK_ANCHORS`.
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
| `client/src/components/GameContext/GameContext.tsx` | Reward expansion for `freighter` and `dividends`; new `pendingChoices` for advance/recall; recall reward bundle. |
| `client/src/data/boardMarkerAnchors.ts` | `SHIPPING_TRACK_ANCHORS`. |
| `client/src/components/IxBoardPanel/IxBoardPanel.tsx` | Render the freighter strip. |
| `client/src/components/TurnControls/TurnControls.tsx` | Render the Advance / Recall choice. |
| `client/src/components/ImageBoard/ImageBoard.tsx` | Optionally also render the freighter strip on the CHOAM overlay (mirror of IxBoardPanel). |

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
  if (step >= 1) enqueueReward({ dividends: true }, source)
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

`Dividends` is **mandatory** when triggered — it is not an OR choice.

### 4.3 UI strip

The `IxBoardPanel` track renders rows 3..0 top-to-bottom with row
labels (`Tech (-2)`, `Troops + Influence`, `Dividends`, `Start`) and
per-player discs.

The `ImageBoard` may also mirror just the discs on top of the
`riseofix1.png` overlay, anchored via `SHIPPING_TRACK_ANCHORS`. This
is for at-a-glance use during play, while the panel is for clicks /
detail.

---

## 5. Acceptance criteria

1. **AC1** — A card / board space with `freighter: 1` produces a single
   Advance/Recall pending choice in `state.currTurn.pendingChoices`.
2. **AC2** — Choosing Advance increments `player.freighterStep` by 1
   (capped at 3).
3. **AC3** — Choosing Recall from step 3 enqueues exactly 3 rewards
   (Dividends, Troops+Influence, Acquire Tech (-2)) and sets
   `freighterStep = 0`.
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
- [ ] `Recall from 1 yields Dividends only`
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
