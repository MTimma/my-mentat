# UI regression (Rise of Ix) — hosted app scenarios

My Mentat is a **manual logging tracker**. These scenarios are for **cloud agents** (or humans) clicking through a **hosted build** or local `npm run dev`. Steps are intentionally **approximate** — use visible labels, roles, and text content, not exact coordinates.

## Preconditions

| Item | Value |
|------|-------|
| App | My Mentat play view (`/play` or main game route after setup) |
| Expansion | **Rise of Ix** checked on setup screen |
| Players | 2 players minimum for combat/dividends scenarios; 1 player OK for shipping/tech smoke |
| Mode | **Sandbox** preferred — faster deck/board seeding |
| Debug | Optional `?hotspotDebug=1` to confirm spaces 23–26 exist |

## General interaction patterns

| Pattern | How to find it |
|---------|----------------|
| Start game | Complete setup → "Start" / "Begin" style button |
| Agent turn | Select card from hand → click **unoccupied** board hotspot → confirm costs → **End Turn** |
| Pending choice | Footer **Turn Controls** — buttons for Advance/Recall, faction pick, OR options |
| Freighter modal | May appear from board overlay or status control near shipping track |
| Tech Stacks | Button near Ix / Landsraad overlay (`riseofix1`) — opens modal with 3 stacks |
| Turn History | Side panel or docked history — lists turns with space names and gain chips |
| Undo | **Undo** / step back in history navigator |
| Combat | After all reveals → combat phase → deploy strip in combat area → set strength → resolve |

## Pass/fail rubric

Each scenario lists **Expected** checks. **Pass** if all observable expectations hold; **Fail** if state, history, or UI contradicts (missing gains, wrong freighter step, choice stuck, layout broken).

---

## Setup & flag

### UI-SETUP-01 — Enable Rise of Ix

**Goal:** Confirm expansion UI gates RoI content.

**Steps:**
1. Open app landing / setup.
2. Locate checkbox labeled **Rise of Ix** (near other setup fields).
3. Enable it.
4. Start a 1-player sandbox game with any leader.

**Expected:**
- Board shows CHOAM overlay region (extra art top-right) OR hotspots 23–26 clickable with debug.
- **Sell Melange** / **Secure Contract** not available as agent destinations.
- Player overview or stats show `freighter` at step **0** (if exposed in UI).

---

## Board spaces

### UI-BOARD-01 — Smuggling → freighter choice

**Goal:** Space 25 triggers shipping choice; history logs solari.

**Setup (sandbox):** Give active player a card with **Spice Trade** agent icon; ensure **Smuggling** unoccupied.

**Steps:**
1. Play agent turn to **Smuggling**.
2. Confirm **+1 Solari** applied (adjust in sandbox if auto-gain).
3. In turn controls, find **Freighter** prompt (Advance vs Recall).
4. Choose **Advance**.
5. End turn.
6. Open **Turn History** for this turn.

**Expected:**
- `freighterStep` becomes **1** (player panel or freighter modal).
- History row label includes **Smuggling**.
- Gains include **Solari** (+1).
- After resolve, no stuck pending choice blocking End Turn.

### UI-BOARD-02 — Interstellar Shipping (gated)

**Goal:** SG influence requirement + two freighter icons.

**Setup:** Active player SG influence ≥ 2; Spice Trade card; **Interstellar Shipping** empty.

**Steps:**
1. Agent to **Interstellar Shipping**.
2. Resolve **first** freighter choice (Advance).
3. Resolve **second** freighter choice (Advance).
4. End turn.

**Expected:**
- `freighterStep` is **2** (started 0, advanced twice).
- Two separate Freighter prompts appeared sequentially.
- History shows space name **Interstellar Shipping**.

**Negative (optional):** With SG influence 0–1, space should not be selectable or shows requirement message.

### UI-BOARD-03 — Tech Negotiation + acquire

**Goal:** Discount acquire and negotiator placement.

**Setup:** Sandbox — set face-up tile on stack 0 (e.g. Minimic Film, cost 2); player spice ≥ 2; Landsraad card.

**Steps:**
1. Agent to **Tech Negotiation**.
2. Complete acquire-tech flow (modal or pending reward).
3. Pay discounted cost; take tile.
4. End turn.

**Expected:**
- Player **tech** count +1 in overview.
- Ix stack top card replaced (next tile visible in Tech Stacks modal).
- History gains: spice spent, tech acquired (`IX_BOARD` or tech label).

### UI-BOARD-04 — Dreadnought commission

**Setup:** Player solari ≥ 3; Landsraad card; space empty.

**Steps:**
1. Agent to **Dreadnought**; pay 3 solari.
2. Resolve commission (garrison unless combat deploy choice offered).
3. End turn.

**Expected:**
- Dreadnought count in garrison or conflict per choice.
- Acquire-tech prompt may appear (resolve or skip per UI).
- History mentions **Dreadnought**.

---

## Freighter & shipping

### UI-SHIP-01 — Recall from step 2 (full bundle)

**Setup:** Sandbox — set `freighterStep` to **2** OR reach step 2 via double Advance from Smuggling + card effect.

**Steps:**
1. Trigger any **freighter** icon (Smuggling or plot **Expedite** if seeded).
2. Choose **Recall** (not Advance).
3. Resolve step-1 OR: pick **Dividends** OR **+2 spice**.
4. Resolve influence choice for step 2 if prompted.
5. End turn.

**Expected:**
- `freighterStep` returns to **0**.
- Solari/spice/troops/influence per rulebook bundle.
- If Dividends: active +5 solari, opponent +1 each (2p: opponent gets +1).
- History lists multiple gains with shipping/freighter context.

### UI-SHIP-02 — Dividends vs spice branch

**Setup:** `freighterStep` ≥ 1.

**Steps:**
1. Recall; at step-1 OR choose **+2 spice** (not Dividends).
2. End turn.

**Expected:**
- Active player **+2 spice** only (no +5 solari bundle).
- Opponents do **not** gain solari from this branch.

### UI-SHIP-03 — Turn history gain labels

**Steps:** Complete UI-SHIP-01 or UI-BOARD-01.

**Expected:**
- Turn history **gains row** visible (not empty) for freighter turns.
- Navigating to earlier turn does not corrupt labels (smoke).

---

## Tech tiles

### UI-TECH-01 — Tech Stacks modal acquire

**Steps:**
1. Click **Tech Stacks** (Ix board button).
2. Modal shows **3 stacks** with face-up top tiles.
3. Click **Acquire** on a affordable tile.
4. Confirm payment / negotiator return if prompted.
5. Close modal; end turn.

**Expected:**
- Modal lists stack names/images.
- Player tech inventory updates.
- Spice decreases by effective cost.

### UI-TECH-01b — Ix board afford preview (no acquire reward)

**Setup:** Rise of Ix on; active player has **no** pending Acquire Tech reward; face-up tiles visible on Ix board.

**Steps:**
1. Note active player's spice (e.g. 3).
2. Observe face-up tech tiles on the Ix board overlay.

**Expected:**
- Tiles the player **can** afford (effective cost ≤ spice, including negotiators on Ix) render **fully opaque**.
- Tiles the player **cannot** afford render **dimmed** (reduced opacity).
- Dimming does **not** depend on having an Acquire Tech reward — it is spice-only preview so the player can plan before earning a reward.

### UI-TECH-02 — Flagship activation (once per round)

**Setup:** Player owns Flagship face-up; ≥4 solari; agent turn.

**Steps:**
1. Find activate control for Flagship (player overview or tech UI).
2. Activate — pay 4 solari.
3. End turn.

**Expected:**
- +3 troops.
- Tile shows **face-down** / used state until next round start.

### UI-TECH-03 — Round start flip

**Setup:** Flagship used (face-down). Advance phase to **round start** (new round).

**Expected:**
- Owned tiles flip **face-up** again (smoke — may need sandbox phase jump).

---

## Combat & conflicts

### UI-COMBAT-01 — Dreadnought deploy + strength

**Setup:** 2 players; conflict round; player has garrison dreadnought + troops; combat space agent earlier or sandbox deploy.

**Steps:**
1. Enter combat phase.
2. Use deploy strip — deploy **1 troop** and **1 dreadnought** to conflict.
3. Set combat strength (reveal swords or manual strength control).
4. Note strength value.

**Expected:**
- Strength includes troop×2 + dread×3 (or ×4 Rhombur).
- Combat area shows dreadnought icon/count distinct from troops.

### UI-COMBAT-02 — RoI combat intrigue

**Setup:** Combat phase; player has **Blackmail** or **Cannon Turrets** in intrigue; troops in conflict.

**Steps:**
1. Play combat intrigue from hand/intrigue UI.
2. Resolve influence cost or confirm effect.
3. Check strength marker updated.

**Expected:**
- Blackmail: −1 influence, +5 strength.
- Cannon Turrets: +2 strength; opponent dreadnought retreats if applicable.

### UI-COMBAT-03 — Skirmish IV rewards

**Setup:** Sandbox — set current conflict to **Skirmish IV**; win combat as P0.

**Steps:**
1. Resolve combat with P0 highest strength.
2. Resolve **freighter** conflict reward choice.
3. End combat phase.

**Expected:**
- Winner gains **1 troop**.
- Freighter Advance/Recall choice appears.
- History / combat summary shows conflict name.

### UI-COMBAT-04 — Economy Supremacy tech path

**Setup:** Conflict **Economy Supremacy**; winner has spice/solari for optional VP branches.

**Steps:**
1. Win as P0.
2. At first-place reward, choose **Acquire Tech** branch (not paid VP).
3. Complete `ACQUIRE_TECH` if prompted.

**Expected:**
- +1 VP from base reward still applied.
- Tech acquire flow enqueued; tile added to player.

---

## Intrigue (plot)

### UI-INTRIGUE-01 — Expedite (freighter)

**Setup:** Player holds **Expedite** plot; ≥1 spice; own agent turn.

**Steps:**
1. Play **Expedite** intrigue.
2. Pay spice cost if prompted.
3. Resolve freighter Advance/Recall.
4. End turn.

**Expected:**
- Spice decreases.
- Freighter choice resolved; step changes accordingly.

### UI-INTRIGUE-02 — Ixian Probe (discard / draw)

**Steps:**
1. Play **Ixian Probe** on agent turn.
2. Select 2 cards to discard if UI prompts.
3. Draw 2.
4. End turn.

**Expected:**
- Hand/deck counts change; history shows intrigue play.
- If discarded card has **Unload**, unload effect fires (smoke — see UI-CARD-01).

### UI-INTRIGUE-03 — Machine Culture (acquire tech plot)

**Steps:**
1. Play **Machine Culture** during agent turn.
2. Confirm acquire-tech enqueue.
3. Complete or cancel acquire per UI.

**Expected:**
- `pendingAcquireTech` cleared after resolve.
- No block on end turn after completion.

---

## Imperium & unload

### UI-CARD-01 — Unload on discard

**Setup:** RoI card with Unload in reveal box on top of deck; reveal turn or probe discard.

**Steps:**
1. Put card in play then **discard** it (not merely clean up play area).
2. Observe unload reward.

**Expected:**
- Unload text effect applies once.
- History shows discard-driven gain.

---

## Logging & undo

### UI-LOG-01 — Full turn paper trail

**Steps:**
1. Run UI-BOARD-01 (Smuggling advance).
2. Open turn history — select that turn.
3. Click **Undo** (or navigate back one turn).

**Expected:**
- Before undo: history shows Smuggling + solari + freighter result.
- After undo: `freighterStep` reverts; gains removed from current state.

### UI-LOG-02 — Choice blocks end turn

**Steps:**
1. Trigger freighter choice but do **not** resolve.
2. Attempt **End Turn**.

**Expected:**
- End turn blocked OR warning shown (`endTurnGating` behavior).
- After resolve, end turn succeeds.

### UI-LOG-03 — Expansion flag in saved game (if export exists)

**Steps:**
1. Start RoI game; play one turn.
2. Export / save JSON (if feature available).

**Expected:**
- `setup.expansions.riseOfIx === true` or equivalent in save blob.
- Events array non-empty after actions.

---

## Layout smoke (RoI chrome)

| ID | Check |
|----|-------|
| UI-LAY-01 | Enabling RoI does not collapse play board footer |
| UI-LAY-02 | Tech Stacks modal opens over board without scrolling page off-screen |
| UI-LAY-03 | Freighter status modal (if present) dismisses cleanly |
| UI-LAY-04 | Ix overlay images load (no broken image icons for `riseofix1` / `riseofix2`) |

Base layout rules: [base 06-ui-regression](../../base-game/regression-test/06-ui-regression.md).

---

## Scenario priority for cloud agents

Run in order for maximum coverage per minute:

1. UI-SETUP-01
2. UI-BOARD-01
3. UI-SHIP-01
4. UI-TECH-01
5. UI-COMBAT-01
6. UI-LOG-01
7. UI-COMBAT-03
8. UI-INTRIGUE-01

## Future Playwright mapping

When `e2e/` lands, map each `UI-*` id to a `test(...)` with:

```ts
// Pseudocode — not in repo yet
test('UI-BOARD-01 Smuggling freighter', async ({ page }) => {
  await setupRoiSandbox(page)
  await playAgentToSpace(page, 'Smuggling')
  await page.getByRole('button', { name: /Advance/i }).click()
  await expect(page.getByText(/Smuggling/)).toBeVisible()
  await expect(page.getByText(/Solari/)).toBeVisible()
})
```

Until then, cloud agents execute steps manually via browser MCP tools using this document as the script.
