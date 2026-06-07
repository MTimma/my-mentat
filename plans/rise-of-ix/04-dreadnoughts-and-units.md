# Task 04 — Dreadnoughts and units

> Depends on Tasks 01, 02 and 03 (board overlay icon).
> This is a **reducer task**: it adds the dreadnought lifecycle into
> `GameContext.tsx` plus a handful of UI controls in `TurnControls` and
> `ImageBoard`.

---

## 1. Goal

Implement the dreadnought lifecycle from the Rise of Ix rulebook (p. 6):

- **Supply → Garrison** via the *Dreadnought* (commission) icon on a
  card / board space.
- **Garrison → Conflict** via deploy (manual, mirrors troops).
- **Supply → Conflict** directly when the commission icon fires on the
  same Agent turn the player sends an Agent to a **Combat space**.
- **Conflict → Garrison** when the conflict resolves and the player
  did *not* win (durable: not back to supply).
- **Conflict → Control space** when the player won a conflict in
  which at least one of their dreadnoughts participated. Choose
  Arrakeen, Carthag or Imperial Basin (and only one).
- **Control space → Garrison** at the end of the next Combat phase.

It also surfaces the "units" concept (`troop ∪ dreadnought`) in
strength calculation:

- Each dreadnought in conflict = **3 strength** (Prince Rhombur:
  4 strength — see [`07-leaders.md`](./07-leaders.md)).
- A player with **0 troops** but ≥ 1 dreadnought still has strength
  from swords and may play Combat Intrigue (the "your strength does
  not become 0" rule).
- Cap on commission: **2 dreadnoughts active at a time** per player.

---

## 2. Requirements

1. **R1 — Player state.** `Player.dreadnoughts` (Task 02 §R6) is the
   canonical store:
   `{ supply, garrison, conflict, control: ControlMarkerType[] }`.
2. **R2 — Commission action.** When a card or board-space reward
   carries `dreadnoughts: N` (Task 02 §R4) the reducer:
   - Decrement `supply` by `min(N, supply, 2 - (garrison+conflict+control.length))`.
   - If the player **placed an Agent on a Combat space this turn** and
     they still have garrison-eligible commissions, prompt the player
     (UI) to choose *garrison* or *conflict* for each commissioned
     dreadnought. Default: garrison. UI uses the same OR-choice plumbing
     already used by `Reward.deployTroops`.
   - When direct-to-conflict is chosen, `combatTroops[playerId]`
     remains unaffected (it tracks troops only); `dreadnoughts.conflict`
     captures the dreadnought count, and `combatStrength` recompute
     includes them.
3. **R3 — Strength formula.**
   The reducer's strength helper (currently inlined inside `END_TURN`
   reveal + combat-intrigue paths) becomes a helper
   `computeStrength(state, playerId)`:
   ```
   strengthFromTroops      = combatTroops[playerId] * 2
   dreadnoughtStrengthEach = leaderIsRhombur(player) ? 4 : 3
   strengthFromDreadnoughts = dreadnoughts.conflict * dreadnoughtStrengthEach
   strengthFromSwords      = swords contributed by revealed cards + intrigue this combat
   total                   = strengthFromTroops + strengthFromDreadnoughts + strengthFromSwords
   ```
   - **"Strength becomes 0 if no troops"** rule is **relaxed** when
     dreadnoughts are present: the zeroing is gated by
     `combatTroops + dreadnoughts.conflict === 0`. but only for rise of ix expansion enabled.
4. **R4 — Combat resolution.** On `RESOLVE_COMBAT`:
   - For each player, dreadnoughts in conflict:
     - If they won (placement first), they remain in `conflict` until
       the user *chooses* a control space (Arrakeen / Carthag /
       Imperial Basin), then the **first** dreadnought moves to
       `control` for that space (covering any control marker / other
       dreadnought already there). If a **second** dreadnought is in
       the same conflict, it returns to `garrison`.
     - If they did **not** win, all their dreadnoughts in conflict move
       to `garrison`.
   - **Existing dreadnoughts already on a control space**: at the end
     of the **next** Combat phase (one full round later), they return
     to the owning player's `garrison`. Implement as a
     `dreadnoughtControlReturnAtRound: number` flag on each
     `control` entry — when the round counter reaches that value during
     `RESOLVE_COMBAT`, move dreadnought back to `garrison`. Alt: store
     `control` as `Array<{ space: ControlMarkerType; placedRound: number }>`.
     **Pick the second form** because it survives `UNDO_TO_TURN`
     cleanly.
5. **R5 — Control marker covering.** When a dreadnought lands on a
   space that has someone else's control marker:
   - Do **not** clear `state.controlMarkers[space]` — the rulebook
     says the dreadnought *covers* it, and uncovers when removed.
   - Add a `dreadnoughtCover: Record<ControlMarkerType, number | null>`
     on `GameState` (player id of the dreadnought owner, or `null`).
     When non-null, the `controlBonus` lookup goes to the dreadnought
     owner; when the dreadnought returns to garrison, the bonus goes
     back to the original `controlMarkers[space]` owner.
6. **R6 — Deploy step UI.** Existing deploy step (`canDeployTroops`)
   in `TurnControls` is reused: it currently lets the player choose to
   commit troops to the Conflict. Extend it to also let them commit
   dreadnoughts from garrison when the active Agent space is a
   Combat space and they already have ≥ 1 dreadnought commissioned.
   - Add `currTurn.deployableDreadnoughts: number` mirror to the existing
     `troopLimit` / `deployTroops` mechanism (cap is the standard
     "any from this turn + up to 2 from garrison" rule, but applied to
     **units** as a whole).
7. **R7 — Recall (`Recall` phase end-of-round).** Dreadnoughts in
   `garrison` and `control` are NOT recalled. Only troops in `conflict`
   move per existing rules.
8. **R8 — Snapshots & undo.** `state.history` continues to store full
   snapshots. Confirm via tests that `dreadnoughts` deep-clones across
   `END_TURN` / `RESOLVE_COMBAT`.
9. **R9 — Logging.** Add `RewardType.DREADNOUGHT` gains:
   - `+N Dreadnought commissioned` when commissioned.
   - `+N Dreadnought deployed` when deployed to Conflict.
   - `+1 Dreadnought controls <space>` when sent to a control space.

---

## 3. Files touched

| File | Change |
|---|---|
| `client/src/components/GameContext/GameContext.tsx` | All reducer changes: commission action, deploy dreadnoughts, RESOLVE_COMBAT updates, control-cover bookkeeping, computeStrength helper. |
| `client/src/utils/units.ts` | `unitsInConflictForPlayer(state, playerId)` (already from Task 02), `dreadnoughtStrengthEach(player)`. |
| `client/src/utils/combatStrength.ts` (new) | Pure helper `computeStrength(state, playerId)`. Imported by reducer and used by tests. |
| `client/src/data/leaderAbilities/rhomburDreadnoughtStrength.ts` (new) | `dreadnoughtStrengthEach(leader: Leader): 3 \| 4` for the Rhombur override. |
| `client/src/types/GameTypes.ts` | Update `GameState.controlMarkers` semantics (unchanged shape) and add `dreadnoughtCover: Record<ControlMarkerType, number \| null>`. Also `Player.dreadnoughts.control: Array<{ space: ControlMarkerType; placedRound: number }>`. |
| `client/src/components/ImageBoard/ImageBoard.tsx` | Show dreadnought figure on covered control spaces; show conflict-row dreadnought count. |
| `client/src/components/TurnControls/TurnControls.tsx` | Deploy panel: add Dreadnought ± buttons gated by deployableDreadnoughts. |
| `client/src/components/PlayerOverviewModal/PlayerOverviewModal.tsx` | Show dreadnought zones per player. |

---

## 4. Detailed design

### 4.1 Action: `COMMISSION_DREADNOUGHT`

The card-data path uses `Reward.dreadnoughts: N`. The reducer expands
this into pending choices when there is ambiguity:

```ts
// Inside reward resolution
if (reward.dreadnoughts && reward.dreadnoughts > 0) {
  const canSend = state.currTurn?.agentSpace && spaceIsCombat(state.currTurn.agentSpace)
  if (canSend) {
    // OR choice per dreadnought
    pendingChoices.push({
      type: ChoiceType.FIXED_OPTIONS,
      id: `dreadnought-target-${uuid()}`,
      prompt: 'Commission dreadnought:',
      source: { type: GainSource.CARD, ... },
      options: [
        { reward: { custom: CustomEffect.COMMISSION_DREADNOUGHT, dreadnoughts: 1 }, costLabel: 'Garrison' },
        { reward: { custom: CustomEffect.COMMISSION_DREADNOUGHT, deployTroops: 0, dreadnoughts: 1 /* + flag */ }, costLabel: 'Deploy to Conflict' },
      ],
    })
  } else {
    // straight to garrison
    applyDreadnoughtCommission(state, playerId, 1, 'garrison')
  }
}
```

> The above is **pseudocode** for the plan; the implementing agent
> picks the cleanest expression in the existing reducer style.

### 4.2 `computeStrength` helper

```ts
// client/src/utils/combatStrength.ts
import { GameState, Player } from '../types/GameTypes'
import { dreadnoughtStrengthEach } from '../data/leaderAbilities/rhomburDreadnoughtStrength'

export function computeStrength(state: GameState, playerId: number): number {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return 0
  const troops = state.combatTroops?.[playerId] ?? 0
  const dCount = player.dreadnoughts?.conflict ?? 0
  // Sword sum lives in player.combatValue already
  const swords = player.combatValue ?? 0
  if (troops + dCount === 0) return 0
  return troops * 2 + dCount * dreadnoughtStrengthEach(player.leader) + swords
}
```

> This replaces inlined strength logic in `END_TURN` and
> `PLAY_COMBAT_INTRIGUE`.

### 4.3 Control cover

```ts
export interface GameState {
  // ...existing
  dreadnoughtCover?: Record<ControlMarkerType, number | null>
}
```

When `RESOLVE_COMBAT`’s winner has dreadnoughts in conflict and chooses
`Carthag` (say):

```ts
state.dreadnoughtCover.Carthag = winnerId
player.dreadnoughts.control.push({ space: 'Carthag', placedRound: state.currentRound })
player.dreadnoughts.conflict -= 1 // first dreadnought
// second dreadnought (if any) returns to garrison
player.dreadnoughts.garrison += player.dreadnoughts.conflict
player.dreadnoughts.conflict = 0
```

Control-bonus lookups read:

```ts
function controlBonusOwner(state, space): number | null {
  return state.dreadnoughtCover?.[space] ?? state.controlMarkers[space] ?? null
}
```

End-of-next-combat: when `RESOLVE_COMBAT` runs again next round, for
each `control` entry whose `placedRound < state.currentRound`, return
that dreadnought:

```ts
player.dreadnoughts.garrison += 1
state.dreadnoughtCover[space] = null
```

### 4.4 Deploy step UI

In `TurnControls`, the deploy panel currently shows
`+ / - Troop` buttons. Add a parallel `+ / - Dreadnought` row visible
only when `currTurn.deployableDreadnoughts > 0`:

```tsx
{currTurn.deployableDreadnoughts > 0 && (
  <div className="deploy-row">
    <img src="/icon/dreadnought.png" alt="" />
    <span>{deployedDreadnoughts}</span>
    <button onClick={() => onAddDreadnought(playerId)}>+</button>
    <button onClick={() => onRemoveDreadnought(playerId)}>-</button>
  </div>
)}
```

Backed by two new actions: `DEPLOY_DREADNOUGHT`, `RETREAT_DREADNOUGHT`.
They mirror `DEPLOY_TROOP` / `RETREAT_TROOP`.

### 4.5 Combat resolution choice for control space

After `RESOLVE_COMBAT` determines winners, if the winner has
`dreadnoughts.conflict > 0`, the reducer pushes a
`pendingConflictRewardChoices` entry with options:

```ts
{
  id: `dreadnought-control-${conflictId}-${playerId}`,
  playerId,
  placement: 'first',
  conflictId,
  conflictName,
  options: ControlMarkerType.values().map(space => ({
    reward: { custom: CustomEffect.COMMISSION_DREADNOUGHT /* re-use as marker */, dreadnoughts: 0 },
    rewardLabel: `Place dreadnought on ${space}`,
  }))
}
```

(Or use a dedicated `CustomEffect.DREADNOUGHT_CONTROL`.) The action
`RESOLVE_CONFLICT_REWARD_CHOICE` already exists; piggyback on it.

---

## 5. Acceptance criteria

1. **AC1** — Acquiring a card with `dreadnoughts: 1` on an Agent turn
   to a non-combat space increments `dreadnoughts.garrison` by 1
   (capped at 2 active).
2. **AC2** — Same as AC1 but the Agent was sent to a combat space:
   UI offers Garrison or Conflict; choosing Conflict increments
   `dreadnoughts.conflict` instead.
3. **AC3** — Cap of 2 active. With `supply: 0`, no commission happens
   and a gain row is **not** logged.
4. **AC4** — `computeStrength` returns
   `troops*2 + dreads*3 + swords` for a non-Rhombur player.
5. **AC5** — `computeStrength` returns `troops*2 + dreads*4 + swords`
   for Prince Rhombur.
6. **AC6** — With `troops=0, dreads=1, swords=2`, strength is 5 (not 0).
7. **AC7** — Winning a conflict with a dreadnought presents a
   `pendingConflictRewardChoices` entry with 3 options (Arrakeen,
   Carthag, Imperial Basin), and resolving it moves the dreadnought
   into `dreadnoughts.control[]` with the chosen space.
8. **AC8** — Covering an opponent's control marker does not clear
   `state.controlMarkers[space]`. The control bonus next round goes to
   the dreadnought owner via `dreadnoughtCover` lookup.
9. **AC9** — One full round after placement, the dreadnought returns
   to garrison and `dreadnoughtCover[space]` becomes `null`.
10. **AC10** — Losing a conflict with dreadnoughts deployed returns
    them to `garrison` (not `supply`).
11. **AC11** — Time travel: `UNDO_TO_TURN` restores
    `player.dreadnoughts`, `state.dreadnoughtCover`, exactly to the
    snapshot at that turn.

---

## 6. Unit tests

**Path:** `client/src/components/GameContext/__tests__/dreadnoughts.test.ts` (new)

- [ ] `COMMISSION reward to garrison increments dreadnoughts.garrison`
- [ ] `COMMISSION to garrison capped at 2 active`
- [ ] `COMMISSION while at combat space asks for OR choice`
- [ ] `Choosing Conflict deploys directly into dreadnoughts.conflict`
- [ ] `computeStrength sums troops*2 + dreads*3 + swords`
- [ ] `computeStrength for Rhombur uses 4 per dreadnought`
- [ ] `Strength ≥ 0 with no troops but with dreadnoughts`
- [ ] `Winning combat with dreadnoughts produces a Control-space choice`
- [ ] `Picking Imperial Basin places dreadnought in dreadnoughts.control[0]`
- [ ] `dreadnoughtCover[space] is set to winnerId after the choice`
- [ ] `End of next Combat phase: dreadnought returns to garrison, cover clears`
- [ ] `Losing combat returns dreadnoughts to garrison, not supply`

**Path:** `client/src/utils/__tests__/combatStrength.test.ts` (new)

- [ ] `troops=0, dreads=0 -> 0`
- [ ] `troops=2, dreads=0, swords=1 -> 5`
- [ ] `troops=0, dreads=1, swords=2 -> 5 (no zero rule)`
- [ ] `troops=2, dreads=2, swords=0, Rhombur -> 12`

---

## 7. Notes / open questions

- **Cap of 2 active** is enforced across `garrison + conflict + control`.
  We keep `supply` semantically separate (the reservoir).
- **Dreadnoughts in conflict with no troops** are allowed; this
  reverses the base game "0 if no troops" rule. The implementing
  agent must update both the reveal-time tally and the
  Combat-Intrigue interactions.
- **Recall phase.** The end-of-round "Recall" phase only recalls
  Agents. Dreadnoughts neither move during Recall nor block agent
  placement (they are not agents). No reducer change here, but tests
  should confirm.
- **Image board.** Section 4.5 above pushes a per-conflict choice.
  Surfacing it in the `CombatResults` panel is straightforward —
  the existing `RESOLVE_CONFLICT_REWARD_CHOICE` flow renders FIXED
  options.
- **Logging tool perspective.** The user-driven flow is preserved: a
  human still decides where to place each dreadnought; the reducer
  records the choice.
