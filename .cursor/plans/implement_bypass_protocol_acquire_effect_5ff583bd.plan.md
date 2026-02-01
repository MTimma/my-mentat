---
name: Implement Bypass Protocol Acquire Effect
overview: Implement the acquire effect for the Bypass Protocol intrigue card, allowing players to choose and acquire a card from the Imperium Row (matching or below the cost limit) when playing the card during any turn type where PLOT cards can be played.
todos:
  - id: "1"
    content: Add acquire field to Reward interface in GameTypes.ts with limit property
    status: completed
  - id: "2"
    content: Add freeAcquire flag to ACQUIRE_CARD action type and update action handler to skip persuasion cost when true
    status: completed
  - id: "3"
    content: Modify handleIntrigueEffect to detect acquire effects and return them for processing in PLAY_INTRIGUE
    status: completed
  - id: "4"
    content: Update PLAY_INTRIGUE case to create FixedOptionsChoice for Bypass Protocol with two acquire options
    status: completed
  - id: "5"
    content: Create helper function to build CardSelectChoice for Imperium Row acquisition with cost filtering and unaffordable cost filtering
    status: completed
  - id: "6"
    content: "Handle choice resolution: pay costs for option 2, set acquireToTopThisRound flag, create card selection"
    status: completed
  - id: "7"
    content: Ensure CardSearch component works with Imperium Row cards passed directly via cards prop
    status: completed
---

# Implement Bypass Protocol Acquire Effect

## Overview

The Bypass Protocol intrigue card allows players to acquire a card from the Imperium Row with a cost limit. This needs to be implemented as a card selection choice that appears when the card is played.

## Changes Required

### 1. Update Reward Type Definition

**File**: `client/src/types/GameTypes.ts`

- Add `acquire` field to the `Reward` interface:
  ```typescript
  acquire?: {
    limit: number
  }
  ```

- This allows effects to specify an acquire action with a cost limit.

### 2. Update ACQUIRE_CARD Action

**File**: `client/src/components/GameContext/GameContext.tsx`

- Add optional `freeAcquire?: boolean` field to `ACQUIRE_CARD` action type
- Modify the `ACQUIRE_CARD` case to skip persuasion cost check when `freeAcquire` is true
- When `freeAcquire` is true, don't deduct persuasion from the player
- Still handle `acquireToTopThisRound` flag for placing cards on top of deck

### 3. Modify handleIntrigueEffect Function

**File**: `client/src/components/GameContext/GameContext.tsx`

- In `handleIntrigueEffect`, when processing effects with `reward.acquire`:
  - Don't apply the reward immediately
  - Instead, return information about the acquire effect so it can be handled in the PLAY_INTRIGUE case
- For effects with `choiceOpt: true` and `reward.acquire`, we need to create choices

### 4. Update PLAY_INTRIGUE Case

**File**: `client/src/components/GameContext/GameContext.tsx`

- After calling `handleIntrigueEffect`, check if the intrigue card has acquire effects
- For Bypass Protocol specifically:
  - If there are multiple choice options (two options with `choiceOpt: true`):
    - Create a `FixedOptionsChoice` with both options
    - When the first option (limit 3, no cost) is selected, create a `CardSelectChoice` for Imperium Row
    - When the second option (limit 5, cost 2 spice, acquireToTopThisRound) is selected:
      - First check if player can pay the cost (2 spice)
      - If yes, create a `CardSelectChoice` for Imperium Row with the limit
      - Store the `acquireToTopThisRound` flag in the choice data
- The `CardSelectChoice` should:
  - Use `CardPile` enum (though we'll pass cards directly)
  - Filter Imperium Row cards by cost (matching or below the limit)
  - Still show these Imperum row cards in their positions even if they cost is below limit, but disabled/greyed out if below cost
  - When resolved, dispatch `ACQUIRE_CARD` with `freeAcquire: true`
  - Handle `acquireToTopThisRound` by setting the flag in game state before acquisition

### 5. Create Card Selection for Imperium Row

**File**: `client/src/components/GameContext/GameContext.tsx`

- Create a helper function to build `CardSelectChoice` for Imperium Row acquisition:
  - Accept: limit, acquireToTop flag, intrigue card info
  - Return: `CardSelectChoice` with:
    - `piles: []` (we'll pass cards directly via CardSearch)
    - `filter`: function that filters `state.imperiumRow` by cost <= limit
    - `onResolve`: returns `ACQUIRE_CARD` action with `freeAcquire: true`
- Since `CardSearch` accepts `cards` prop directly, we can pass `state.imperiumRow` filtered by the limit

### 6. Update CardSearch Component (if needed)

**File**: `client/src/components/CardSearch/CardSearch.tsx`

- Verify that `CardSearch` can handle being passed cards directly (it already does via `cards` prop)
- Ensure it works when `piles` is empty but `cards` is provided

### 7. Handle Choice Resolution Flow

**File**: `client/src/components/GameContext/GameContext.tsx`

- When a FixedOptionsChoice option with acquire is selected:
  - If it has a cost, check if player can pay it first
  - If cost is payable, deduct it immediately
  - Then create and add the CardSelectChoice to `currTurn.pendingChoices`
  - Set `acquireToTopThisRound` flag if the option specifies it
- When CardSelectChoice is resolved:
  - The `onResolve` callback returns `ACQUIRE_CARD` with `freeAcquire: true`
  - This triggers the acquisition without persuasion cost

## Implementation Details

### Choice Flow for Bypass Protocol:

1. Player plays Bypass Protocol intrigue card
2. System detects two choice options with `choiceOpt: true`
3. Creates `FixedOptionsChoice` with both options displayed
4. Player selects an option:

   - **Option 1**: "Acquire a card that costs 3 or less"
     - Creates `CardSelectChoice` showing Imperium Row cards with cost <= 3
   - **Option 2**: "Pay 2 spice to acquire a card that costs 5 or less to the top of your deck"
     - Checks if player has 2 spice
     - If yes, deducts 2 spice, sets `acquireToTopThisRound` flag
     - Creates `CardSelectChoice` showing Imperium Row cards with cost <= 5

5. Player selects a card from Imperium Row
6. Card is acquired (free, no persuasion cost) and placed in discard or on top of deck based on flag

### Key Considerations:

- The acquire effect should work during any turn type where PLOT cards can be played (Agent turns and Reveal turns)
- Cards must be filtered by cost (matching or below the limit), and disable cards that are above the limit
- The second option requires paying 2 spice before the card selection
- The `acquireToTopThisRound` flag should be set before acquisition and cleared after
- Imperium Row replacement should still work after free acquisition