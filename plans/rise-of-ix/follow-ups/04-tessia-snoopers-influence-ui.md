# Follow-up 04 — Tessia Vernius snooper tokens (influence UI)

> **Gate:** `state.expansions.riseOfIx === true` only, and only when a
> player has selected **Tessia Vernius** (or for sandbox editing when
> RoI is on). Depends on [Task 07](../07-leaders.md).

---

## 1. Goal

Complete the **visual and interactive** snooper-token experience for
Tessia Vernius. Reducer/signet logic exists in
`client/src/data/leaderAbilities/tessiaSnoopers.ts`; this task is
mostly **board + leader-sheet presentation** and milestone parking UX.

When RoI is off, or the leader is not Tessia, render **nothing** snooper-specific.

---

## 2. Current state (minimal implementation)

- **Setup:** `seedTessiaSnoopers` places one snooper per faction track
  (`player.snoopers[faction] = true`).
- **Signet:** spend 1 influence → gain 1 on a snoopered faction (choice).
- **Milestone:** `parkTessiaSnooperOnMilestone` moves snooper from track
  to `leader.tessiaSnoopers` when Tessia reaches 2nd influence on that
  faction (reducer hook exists).
- **Missing:**
  - Snooper markers on `ImageBoard` influence columns
  - Leader image modal showing parked snoopers
  - Rulebook-accurate initial placement (specific step values, not
    “one per track” simplification)
  - Reward ladder when opponents pass snooper steps (if in scope)

---

## 3. Requirements

1. **R1 — Board markers.** On `ImageBoard`, when `riseOfIx` and player
   is Tessia, render snooper tokens on `INFLUENCE_TRACKS` lanes at the
   correct step positions. Use a distinct asset (reuse small dot or add
   `/icon/snooper.svg`). Tune with `?markerDebug=1`.
2. **R2 — Parked snoopers.** Tokens moved to `leader.tessiaSnoopers`
   render on Tessia's leader sheet (`LeaderImageModal` or equivalent).
3. **R3 — Opponent visibility.** Other players' snoopers (if any future
   rule adds them) stay hidden — Tessia-only for now.
4. **R4 — Setup accuracy.** Replace “one per track at step 1” with
   printed start positions from the rulebook / `.cursor/rise_of_ix`
   (document chosen mapping in code comments). Only runs when Tessia is
   picked and `riseOfIx`.
5. **R5 — Sandbox.** `SandboxPlayerEditor` may toggle snoopers per
   faction for Tessia test setups (optional; behind RoI + Tessia check).
6. **R6 — No base-game impact.** Non-Tessia games with RoI on show no
   snooper chrome.

---

## 4. Files touched (expected)

| File | Change |
|------|--------|
| `client/src/data/boardMarkerAnchors.ts` | `SNOOPER_TOKEN_ANCHORS` per faction/step |
| `client/src/components/ImageBoard/ImageBoard.tsx` | Render snoopers on tracks |
| `client/src/components/LeaderImageModal/` | Parked snoopers display |
| `client/src/data/leaderAbilities/tessiaSnoopers.ts` | Accurate seed positions |
| `client/src/components/SandboxPlayerEditor/` | Optional snooper toggles |

---

## 5. Acceptance criteria

1. **AC1** — Base game / RoI off: no snooper markers.
2. **AC2** — RoI on, Tessia selected: four snoopers visible on influence
   art at documented steps.
3. **AC3** — Tessia reaches 2 influence on a snoopered faction: token
   moves from track to leader sheet in UI.
4. **AC4** — Signet still works with snoopered factions only.
5. **AC5** — `UNDO_TO_TURN` restores snooper positions.

---

## 6. Unit tests

**Path:** `client/src/data/__tests__/tessiaSnoopers.test.ts` or
`GameContext/__tests__/tessiaSnoopers.test.ts`

- [ ] `seedTessiaSnoopers only when riseOfIx and Tessia leader`
- [ ] `parkTessiaSnooperOnMilestone clears track flag sets leader flag`
- [ ] `factionsWithSnooper returns correct list`

Component tests for `ImageBoard` snooper rendering → park in
`client/src/__tests__/deferred/` until jsdom deps land (see
[Task 11](../11-tests-overview.md)).

---

## 7. Notes

- Tessia is **complexity 4** — ensure leader picker shows four icons.
- Full opponent-interaction rewards on snooper steps may remain **manual**
  with a UI hint if automation is unclear; log in this file if deferred
  again.
- Coordinate with `INFLUENCE_TRACK_AREAS` click targets so snoopers don't
  block influence selection.
