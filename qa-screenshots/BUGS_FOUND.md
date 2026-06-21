# Bugs Found - Dune Imperium QA Testing
**Date:** June 15, 2026
**URL:** http://localhost:5173/

## Critical/High Priority Bugs
*None found*

## Medium Priority Bugs

### BUG-001: Player Count Dropdown Not Responding to Clicks
- **Component:** Setup screen, PLAYERS dropdown
- **Severity:** Medium
- **Reproducibility:** Consistent
- **Steps to reproduce:**
  1. Load http://localhost:5173/
  2. Click PLAYERS dropdown (shows 4 as default)
  3. Attempt to select "2" or "3" players from dropdown
  4. Observe selection doesn't change
- **Expected:** Dropdown should update to selected player count
- **Actual:** Dropdown opens but clicks on options don't register/update the value
- **Impact:** Users cannot change player count from default 4 players
- **Screenshot:** `01-game-setup-screen.webp`

## Low Priority Bugs/Warnings

### BUG-002: React fetchPriority Prop Warning
- **Component:** Multiple components (img elements)
- **Severity:** Low (Development warning)
- **Type:** Console warning
- **Message:** "Warning: React does not recognize the `fetchPriority` prop on a DOM element."
- **Affected components:** TurnControls, PlayBoardModalProvider, GameContent, TimeTravelProvider
- **Impact:** Development console noise, no user-facing impact
- **Fix:** Remove fetchPriority from React components or use proper HTML attributes

### BUG-003: Component Update Warning During Render
- **Component:** ImperiumRowSelect / CardSearch  
- **Severity:** Low
- **Type:** Console warning
- **Message:** "Cannot update a component (`ImperiumRowSelect`) while rendering a different component (`CardSearch`)"
- **Impact:** Potential state management issue, may cause future bugs
- **Fix:** Review useEffect dependencies and state updates in CardSearch

### BUG-004: Text Truncation/Display Issue
- **Component:** Customize Game State screen, "Open card creator" button
- **Severity:** Low (Visual)
- **Details:** Button text appears truncated or has line break, showing "Open ca<break>d creator"
- **Impact:** Minor visual issue, button still functional
- **Screenshot:** `02-customize-state-screen.webp`

### BUG-005: Missing Favicon (404)
- **Component:** Browser resource loading
- **Severity:** Very Low
- **Details:** Server returns 404 for `/.5173/favicon.ico-1`
- **Impact:** Browser tab shows no custom icon
- **Fix:** Add favicon.ico file to public directory

## Features Working Correctly ✅

1. Game setup flow and initial screen
2. Leader selection dropdowns
3. Start Game button
4. Card selection (Imperium Row and Conflict cards)
5. Main game board rendering
6. Player areas with resources display
7. VP score markers
8. Combat strength track
9. PLAY button and card selection overlay
10. Agent placement on board spaces
11. Card display in play area
12. End Turn button (with loading state)
13. UI responsiveness and layout

## Not Fully Tested ⚠️

Due to time constraints, the following were not comprehensively tested:
- Reveal turn flow and Persuasion/Acquire mechanics
- Combat phase resolution
- Makers and Recall phases
- Turn history and undo functionality
- Resource tracking (gains/losses during effects)
- Footer height stability during turns with effects (UI-04)
- Debug URLs (?markerDebug=1, ?hotspotDebug=1)
- Multiple rounds (only completed partial Round 1)
- Multi-player turn rotation

## Recommendations

1. **Immediate:** Fix player count dropdown (BUG-001) - blocks user experience
2. **Short-term:** Clean up React warnings (BUG-002, BUG-003)
3. **When convenient:** Fix text display issue (BUG-004), add favicon (BUG-005)
4. **Testing:** Complete full multi-round playthrough test to verify remaining features
