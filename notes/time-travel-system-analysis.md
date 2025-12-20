# Time Travel System Analysis & Design

## Current System Overview

### How History Works
- `GameState.history: GameState[]` - stores snapshots of past game states
- History is pushed on `END_TURN` action when a turn completes
- Each historical entry is a complete snapshot of the game at that moment
- `TurnHistory` component displays the list but navigation is currently a no-op

### Current TurnHistory Component
- Shows list of all turns in history
- Has prev/next buttons (`onTurnChange` callback)
- Has a "Details" button showing JSON of the turn
- Navigation buttons exist but `onTurnChange={() => {}}` does nothing

---

## Time Travel System Design

### 1. Viewing Mode (Read-Only Navigation)

**Concept**: Users can navigate to any historical turn and see the game board as it was at that point, without modifying anything.

#### State Management
```typescript
interface TimeTravelState {
  // Index of the turn being viewed (null = viewing live/current state)
  viewingTurnIndex: number | null
  
  // Whether viewing historical state (derived: viewingTurnIndex !== null)
  isViewingHistory: boolean
}
```

#### Behavior
- **Navigate to historical turn**: Set `viewingTurnIndex`, render that historical state
- **Return to current**: Set `viewingTurnIndex = null`, render live `gameState`
- **While viewing history**: All action buttons disabled, clear visual indicator showing "Viewing Turn X"

#### UI Considerations
- Show "VIEWING HISTORY" banner when in history mode
- Grey out / disable all action controls
- "Return to Current" button prominently displayed
- Turn list highlights which turn is being viewed

---

### 2. Edge Cases Analysis

#### Edge Case 1: In-Progress Turn Navigation
**Scenario**: User selects card → places agent → opens history → navigates back → returns to current

**Problem**: The current turn may have partial progress (card selected, agent placed but turn not ended) that isn't yet in `history[]`.

**Solution**: 
- Store "live" game state separately from display state
- When returning to current, restore the live state INCLUDING in-progress turn data
- `currTurn`, `selectedCard`, `pendingRewards`, `canEndTurn` etc. must be preserved

**Implementation**:
```typescript
// In App or context
const [liveGameState, setLiveGameState] = useState<GameState>(gameState)
const displayState = viewingTurnIndex !== null 
  ? gameState.history[viewingTurnIndex] 
  : liveGameState
```

#### Edge Case 2: Current Turn Not in History
**Scenario**: User is mid-turn (hasn't clicked End Turn), opens history panel

**Problem**: Current in-progress turn isn't in `history[]` array yet

**Solution**:
- Show history list + a "Current Turn (in progress)" entry at the end
- This pseudo-entry represents the live state
- Selecting it returns to live mode

#### Edge Case 3: History Changes While Viewing
**Scenario**: (Future/multiplayer consideration) History changes while viewing past

**Solution**: For single-player analysis tool, not a concern. If history changes, simply re-render. Could show notification.

#### Edge Case 4: Empty History
**Scenario**: Game just started, no turns completed yet

**Solution**: 
- Disable navigation buttons when `history.length === 0`
- Show "No history yet" message

#### Edge Case 5: Combat Phase Edge Cases
**Scenario**: Viewing a historical state that was mid-combat

**Solution**: 
- Combat phase UI should render based on `displayState.phase`
- Historical combat states show the troops/strength at that point
- All combat actions disabled in viewing mode

---

### 3. Undo Functionality (Dangerous Operation)

**Concept**: User can "revert" to a historical turn, making it the new current state and discarding all future turns.

#### Risks & Breaking Points

1. **Data Loss**
   - All turns after the revert point are permanently lost
   - Any in-progress turn work is lost
   - No automatic recovery mechanism

2. **Deck State Corruption**
   - Cards that were drawn, played, trashed after revert point
   - Deck/discard pile states must match the historical snapshot
   - If deck was shuffled between revert point and current, shuffle order changes

3. **Random Elements**
   - Intrigue card draws are random
   - Imperium deck draws are random  
   - Reverting and replaying won't produce same results

4. **Derived State Issues**
   - `factionInfluence` must match historical state
   - `controlMarkers` positions
   - `combatStrength`, `combatTroops`
   - `occupiedSpaces` (agents on board)

5. **UI State Desync**
   - React component local state (e.g., popup open states)
   - Selected cards in CardSearch components
   - Voice selection mode, selective breeding mode

#### Implementation Safeguards

```typescript
// Required confirmation
interface UndoConfirmation {
  turnsToUndo: number
  targetTurnDescription: string
  permanentLoss: string[] // List what will be lost
}

// Action type
type UndoAction = { 
  type: 'UNDO_TO_TURN'
  turnIndex: number 
  confirmed: boolean // Must be explicitly true
}
```

#### Undo Process
1. User clicks "Undo to this turn" button
2. Show confirmation dialog with:
   - "This will undo X turns"
   - "You will lose: [list of actions/gains]"
   - "This cannot be reversed"
3. On confirm:
   - Copy historical state at `turnIndex`
   - Clear `history` entries after `turnIndex`
   - Set this as new current state
   - Clear all transient UI state
   - Reset `viewingTurnIndex = null`

---

### 4. Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TimeTravelProvider                      │    │
│  │  - viewingTurnIndex: number | null                  │    │
│  │  - goToTurn(index: number): void                    │    │
│  │  - returnToCurrent(): void                          │    │
│  │  - undoToTurn(index: number): void                  │    │
│  │  - isViewingHistory: boolean                        │    │
│  │  - displayState: GameState                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 GameProvider                         │    │
│  │  - gameState (live state)                           │    │
│  │  - dispatch                                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│              ┌─────────────┼─────────────┐                   │
│              ▼             ▼             ▼                   │
│         GameBoard    TurnControls   TurnHistory             │
│    (uses displayState) (disabled if   (navigation)          │
│                        viewing)                              │
└─────────────────────────────────────────────────────────────┘
```

### 5. Component Changes Required

#### TurnHistory.tsx
- Add "Jump to" buttons for each turn (replaces Details for quick nav)
- Add "Undo to here" button (with confirmation)
- Add "Current (in progress)" pseudo-entry
- Visual indicator for currently viewed turn vs current turn

#### New: TimeTravelContext.tsx
- Manages viewing state
- Provides `displayState` (historical or live)
- Provides `isViewingHistory` flag
- Provides navigation and undo functions

#### New: UndoConfirmDialog.tsx
- Modal for confirming undo action
- Shows what will be lost
- Requires explicit confirmation

#### TurnControls.tsx
- Check `isViewingHistory` and disable all controls if true
- Show "Viewing History" indicator

#### GameBoard.tsx
- Use `displayState` instead of `gameState` for rendering
- Disable interactions when viewing history

#### App.tsx
- Wrap with TimeTravelProvider
- Pass appropriate state to child components

---

### 6. UI/UX Recommendations

1. **Clear Visual Mode Indicator**
   - Fixed banner at top: "📜 VIEWING TURN 5 OF 12"
   - Different background tint for entire app when in history mode

2. **Easy Return to Current**
   - Large, obvious "Return to Current Turn" button
   - Keyboard shortcut (Escape)

3. **Undo Warning Colors**
   - Red/danger styling for undo button
   - Clear warning text in confirmation

4. **Turn Preview**
   - On hover over turn row, show key info tooltip
   - Player, card played, resources gained

---

### 7. Data Flow Summary

```
User clicks turn in history
         │
         ▼
setViewingTurnIndex(5)
         │
         ▼
displayState = history[5]
         │
         ▼
All components render history[5]
isViewingHistory = true
Controls disabled
         │
         ▼
User clicks "Return to Current"
         │
         ▼
setViewingTurnIndex(null)
         │
         ▼
displayState = gameState (live)
isViewingHistory = false
Controls enabled
```

---

### 8. Testing Considerations

1. **Navigation Tests**
   - Can navigate to any valid turn
   - Can return to current
   - Invalid indices are handled

2. **State Preservation Tests**
   - In-progress turn preserved when navigating
   - All transient state restored on return

3. **Undo Tests**
   - Confirmation required
   - History correctly truncated
   - New state matches historical snapshot
   - All derived state correct

4. **UI Tests**
   - Controls disabled in history mode
   - Visual indicators correct
   - Turn list highlights correctly

---

## Next Steps

1. Implement `TimeTravelContext`
2. Update `TurnHistory` component
3. Add history mode visual indicators
4. Implement `UndoConfirmDialog`
5. Integrate into `App.tsx`
6. Add tests
