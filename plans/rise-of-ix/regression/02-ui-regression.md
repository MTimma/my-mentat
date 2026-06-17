# Rise of Ix UI regression

Manual UI regression checklist for clicking through multiple game styles. Run it
after automated tests pass and after the app is started with `npm run dev` from
`client/`.

## Success criteria

- Base-game workflows remain usable when Rise of Ix is disabled.
- Rise of Ix setup, overlays, cards, conflict deck, tech board, dreadnoughts,
  shipping, and prompts are visible and usable when implemented.
- History, undo, save/debug output, and sandbox setup preserve the same public
  game state the user entered.
- Any Rise of Ix feature that is not exposed yet is recorded as a regression gap
  rather than marked as passed.

## Game A: standard base game guardrail

Use this game to prove that Rise of Ix changes are isolated.

| ID | Click-through | Expected result |
|----|---------------|-----------------|
| UI-A01 | Open app, leave Rise of Ix disabled, choose 3 players with different leaders/colors, click `Start Game`. | Setup advances without Ix-only fields. |
| UI-A02 | In game-state setup, change starting round/resources, open JSON preview, open starter deck and Imperium deck editors, then click `Start Game`. | Edits persist; no Rise of Ix cards/tech/dreadnought fields are required. |
| UI-A03 | Select five Imperium row cards and a base conflict. | Board enters player turns with base board only. |
| UI-A04 | Play an Agent turn, choose a legal board space, resolve gains, deploy/undo troops on a combat space, then end turn. | Agent marker, resources, combat troops, and turn history update correctly. |
| UI-A05 | Reveal for a player, acquire from Imperium row/reserve, replace the row card, then end turn. | Persuasion spend, discard, replacement card, and reveal history are correct. |
| UI-A06 | Finish the round through combat, pass/play combat intrigue if available, confirm results, and advance to next round. | Combat rewards, troop return, maker spice, recall, first-player rotation, and next conflict selection work. |
| UI-A07 | Open turn history, navigate previous turns, return live, undo the latest turn, and continue. | State rewinds without layout or resource drift. |

## Game B: Rise of Ix normal setup

Run once the expansion flag is implemented. If the setup toggle is absent, mark
UI-B01 as blocked and stop this game.

| ID | Click-through | Expected result |
|----|---------------|-----------------|
| UI-B01 | Start a new game and enable Rise of Ix. | Expansion flag is visible, selected state is obvious, and setup preview/export includes the flag. |
| UI-B02 | Choose at least one Rise of Ix leader and one base leader. Complete any leader setup choices. | Leader abilities/signets display; base leaders remain valid; no duplicate Baron entry appears. |
| UI-B03 | Start player turns. | CHOAM overlay and Ix board panel are visible; base spaces covered by the overlay are not clickable; new spaces are clickable when legal. |
| UI-B04 | Open the Tech Stacks UI from the Ix board panel. | Three tech stacks show face-up tiles, costs, acquire controls, and owned/discount state. |
| UI-B05 | Play a card to `Dreadnought`; commission a dreadnought and optionally deploy it if the turn reaches a combat space. | Player supply/garrison/conflict dreadnought counts update; combat strength includes dreadnought strength. |
| UI-B06 | Play or manually apply a shipping gain, move the freighter, then recall for each reward branch across repeated turns or sandbox edits. | Freighter position and selected reward are recorded and undoable. |
| UI-B07 | Use `Tech Negotiation`, place negotiators, then acquire a tech. | Negotiators reduce cost, clear when spent, and do not expose hidden information. |
| UI-B08 | Play an Infiltration card on an occupied enemy space. | Occupied-space gating allows the infiltrating card and rejects a non-infiltrating card. |
| UI-B09 | Trigger an Unload card by reveal, discard, and trash in separate turns or sandbox setups. | Prompt/effect fires in all valid timing windows and is recorded once per trigger. |
| UI-B10 | Resolve a conflict involving troops plus dreadnoughts, including retreat if possible. | Rankings, rewards, control placement/replacement, and post-conflict unit destinations match the rule prompt. |

## Game C: Rise of Ix sandbox and edge-state setup

Run once the expansion fields are available in sandbox.

| ID | Click-through | Expected result |
|----|---------------|-----------------|
| UI-C01 | From the landing screen click `Sandbox Mode`. | Sandbox setup opens without creating a turn history entry. |
| UI-C02 | Pick a Rise of Ix conflict, include Rise of Ix cards in the Imperium row, and assign one player an Ix leader. | Selected expansion data renders with correct art and names. |
| UI-C03 | Edit each player: resources, influence, troops, combat troops, dreadnoughts, freighter position, tech tiles, negotiators, and snoopers. | State preview/export reflects all public edits. |
| UI-C04 | Begin turns from a mid-round state with occupied spaces and combat units. | Board markers, turn controls, legal-space gating, and combat area match the sandbox state. |
| UI-C05 | Force an endgame-relevant state with tech/endgame intrigue effects and confirm endgame. | Endgame overlay includes base VP, tech/intrigue VP, and tiebreaker effects. |

## Game D: save/history regression

Run on either a base or Rise of Ix game; prefer Rise of Ix once available.

| ID | Click-through | Expected result |
|----|---------------|-----------------|
| UI-D01 | Open the turn-history/debug details panel and inspect runtime state and save document. | Export includes only public tracked state; no secrets or environment values appear. |
| UI-D02 | Navigate to old turns and back to live state after several Agent, Reveal, combat, and recall actions. | Board, player panels, turn controls, Imperium row, conflict, and Ix widgets all match the selected turn. |
| UI-D03 | Undo after a Rise of Ix action, after a card acquire, and after combat confirmation. | Later history is truncated and all affected state is restored. |

## Known gap template

Use this format in PR/test notes until the feature exists:

```text
Gap: <feature or UI ID>
Observed: <what the UI currently does>
Expected when implemented: <expected regression behavior>
Blocking implementation task: plans/rise-of-ix/<task-file>
```
