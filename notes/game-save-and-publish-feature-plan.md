# Game Save and Publish Feature - Analysis & Implementation Plan

## Executive Summary

This document outlines the analysis and implementation plan for adding game save/load and publish functionality to the Dune: Imperium application. The feature will allow users to save games locally and publish them for community viewing, commenting, and voting.

## Current System Analysis

### Architecture Overview
- **Frontend**: React + TypeScript (Vite)
- **State Management**: React Context API with reducer pattern (`GameContext`)
- **Game State**: Complex `GameState` interface containing:
  - Player data (resources, decks, hands, etc.)
  - Board state (occupied spaces, control markers, bonus spice)
  - Deck states (Imperium Row, Intrigue, Conflicts)
  - Turn history (snapshots in `history: GameState[]`)
  - Current turn state (`currTurn`, `pendingRewards`, etc.)
- **Persistence**: Currently none - all state is in-memory
- **Backend**: None currently (notes suggest future Spring Boot integration)

### Key Data Structures

#### GameState (from GameTypes.ts)
```typescript
interface GameState {
  phase: GamePhase
  players: Player[]
  currentRound: number
  history: GameState[]  // Already stores snapshots!
  factionInfluence: Record<FactionType, Record<number, number>>
  imperiumRow: Card[]
  intrigueDeck: IntrigueCard[]
  currentConflict: ConflictCard
  // ... many more fields
}
```

#### Player
```typescript
interface Player {
  id: number
  color: PlayerColor
  leader: Leader
  troops: number
  spice: number
  water: number
  solari: number
  victoryPoints: number
  deck: Card[]
  discardPile: Card[]
  // ... more fields
}
```

### Existing Features
- ✅ Time-travel system with history snapshots
- ✅ Turn-by-turn history tracking
- ✅ Complex game state management
- ✅ No persistence layer

## Feature Requirements

### 1. Save Game Functionality
**Goal**: Allow users to save the current game state and resume it later exactly as it was.

**Requirements**:
- Save complete game state (including history)
- Save metadata (game name, date, player count, expansions)
- Load saved game and restore exact state
- List of saved games with preview info
- Delete saved games
- Auto-save option (optional)

**Data to Save**:
- Complete `GameState` object
- Game metadata:
  - Game name/title
  - Created date/time
  - Last modified date/time
  - Player count
  - Expansions used (currently only "base")
  - Current round number
  - Game phase
  - Player names/colors/leaders

**Storage Options**:
1. **LocalStorage** (immediate, no backend needed)
   - Pros: Simple, works offline, no server costs
   - Cons: Limited to ~5-10MB, browser-specific, no cross-device sync
   - Best for: MVP, personal saves

2. **IndexedDB** (better for larger data)
   - Pros: Larger storage (~50MB+), better performance
   - Cons: More complex API, still browser-specific
   - Best for: Games with extensive history

3. **Backend API** (future-proof)
   - Pros: Cross-device sync, cloud backup, unlimited storage
   - Cons: Requires backend, authentication, costs
   - Best for: Production with user accounts

**Recommendation**: Start with **LocalStorage** for MVP, design API to support backend later.

### 2. Publish Game Functionality
**Goal**: Allow users to publish completed games for community viewing, analysis, and discussion.

**Requirements**:
- Publish button (only available when game is complete)
- Set game title/description
- Mark game as published
- Generate shareable link/ID
- Unpublish option (for creator)

**Published Game Data**:
- Complete game state (read-only)
- Metadata:
  - Title
  - Description (optional)
  - Creator user ID/name
  - Published date
  - Expansions used
  - Player count
  - Turn count (from history.length)
  - Winner(s) - leader names
  - Game duration (if tracked)
  - Tags/categories (optional)

**Storage**: Requires backend API (cannot use LocalStorage for public sharing)

### 3. Published Games List View
**Goal**: Display published games in a filterable, sortable list.

**Display Fields**:
- Game title
- Creator name/avatar
- Expansions (currently only "base")
- Turn count
- Winner(s) - leader names and colors
- Published date
- View count
- Vote count/score
- Comment count
- Thumbnail/preview (optional)

**Filtering Options**:
- By expansion (base, Ix, Immortality - future)
- By player count (2, 3, 4)
- By winner leader
- By date range
- By creator
- By popularity (votes, views)

**Sorting Options**:
- Newest first
- Oldest first
- Most votes
- Most views
- Most comments
- Longest games (turn count)
- Shortest games

**UI Considerations**:
- Responsive grid/list view toggle
- Pagination or infinite scroll
- Search functionality
- Preview on hover

### 4. Game Detail View
**Goal**: View a published game in detail with replay capability.

**Features**:
- Full game board view (read-only)
- Turn-by-turn replay (reuse time-travel system!)
- Player stats summary
- Comments section
- Vote up/down buttons
- Share buttons
- Export game data (JSON)

### 5. Comments & Voting
**Goal**: Community engagement on published games.

**Comments**:
- Threaded comments
- Reply to comments
- Edit/delete own comments
- Report inappropriate comments
- Sort by: newest, oldest, most liked

**Voting**:
- Upvote/downvote (or just upvote)
- Vote count display
- User's vote status (voted up/down/none)
- Sort games by vote score

**Storage**: Requires backend with user authentication

## Analysis: Reusing Open Source List Views

### Considered Projects
1. **arkhamdb.com** - Arkham Horror LCG card database
2. **swdestinydb.com** - Star Wars Destiny card database  
3. **netrunnerdb.com** - Android Netrunner card database

### Analysis

**What These Projects Are**:
- Card database websites with deck building
- List views show **cards/decks**, not **game replays**
- Focus on card search/filtering, not game history
- Different data model (cards vs game states)

**Reusability Assessment**:
- ❌ **Low reusability** - Different domain (cards vs games)
- ❌ Different data structures (card metadata vs game state)
- ❌ Different filtering needs (card attributes vs game metadata)
- ✅ **Can learn from**: Filter UI patterns, list view layouts, search UX

**Recommendation**: 
**Create our own list view** - The requirements are different enough that adapting existing code would be more work than building fresh. However, we can:
- Study their filter UI patterns
- Borrow responsive design principles
- Learn from their search/filter UX
- Reference their pagination patterns

## Technical Architecture

### Phase 1: Local Save/Load (MVP)

#### Frontend Changes

**New Components**:
```
client/src/components/
  SaveGame/
    SaveGameDialog.tsx      # Modal for saving game
    SaveGameDialog.css
  LoadGame/
    LoadGameDialog.tsx       # Modal for loading saved games
    LoadGameList.tsx         # List of saved games
    LoadGameDialog.css
  GameMenu/
    GameMenu.tsx            # Menu bar with Save/Load/Publish
    GameMenu.css
```

**New Services**:
```
client/src/services/
  GameSaveService.ts        # LocalStorage save/load logic
  GameMetadataService.ts    # Extract metadata from GameState
```

**New Types**:
```typescript
// client/src/types/GameSaveTypes.ts
interface SavedGameMetadata {
  id: string
  name: string
  createdAt: number
  modifiedAt: number
  playerCount: number
  expansions: string[]
  currentRound: number
  phase: GamePhase
  players: {
    name?: string
    color: PlayerColor
    leader: string
  }[]
}

interface SavedGame {
  metadata: SavedGameMetadata
  gameState: GameState
}
```

**Implementation Steps**:
1. Create `GameSaveService` with LocalStorage operations
2. Add Save button to game UI (in GameMenu or TurnControls)
3. Create SaveGameDialog component
4. Add Load button and LoadGameDialog
5. Update App.tsx to support loading saved games
6. Add delete functionality
7. Add auto-save option (optional)

**Storage Format**:
```typescript
// LocalStorage key: "dune-imperium-saves"
// Value: SavedGame[]
{
  "dune-imperium-saves": [
    {
      "id": "uuid-v4",
      "metadata": { ... },
      "gameState": { ... }  // Full GameState serialized
    }
  ]
}
```

**Considerations**:
- GameState contains circular references? (history: GameState[])
- Need deep cloning for saves
- JSON serialization of Sets/Maps (combatPasses: Set<number>)
- Large game states (history array can be large)

**Serialization Strategy**:
```typescript
// Custom serialization for GameState
function serializeGameState(state: GameState): string {
  // Convert Sets to Arrays
  // Handle circular references in history
  // Ensure all data is JSON-serializable
  return JSON.stringify({
    ...state,
    combatPasses: Array.from(state.combatPasses),
    endgameDonePlayers: Array.from(state.endgameDonePlayers),
    history: state.history.map(h => ({
      ...h,
      combatPasses: Array.from(h.combatPasses),
      endgameDonePlayers: Array.from(h.endgameDonePlayers)
    }))
  })
}
```

### Phase 2: Backend API (Required for Publishing)

#### Backend Architecture

**Technology Stack** (based on notes):
- **Backend**: Spring Boot (Java)
- **Database**: PostgreSQL (recommended) or MySQL
- **API**: REST API
- **Authentication**: JWT tokens (for user accounts)

**Alternative Consideration**: 
- Node.js/Express + TypeScript (matches frontend stack)
- Easier code sharing between frontend/backend
- Faster development for small team

**Recommendation**: Start with **Node.js/Express** for faster iteration, can migrate to Spring Boot later if needed.

#### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Saved games (private)
CREATE TABLE saved_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  game_state JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  modified_at TIMESTAMP DEFAULT NOW(),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Published games (public)
CREATE TABLE published_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_game_id UUID REFERENCES saved_games(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id),
  expansions TEXT[] DEFAULT ARRAY['base'],
  player_count INTEGER NOT NULL,
  turn_count INTEGER NOT NULL,
  winners JSONB NOT NULL, -- [{playerId, leader, color}]
  view_count INTEGER DEFAULT 0,
  vote_score INTEGER DEFAULT 0,
  published_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_published_at (published_at),
  INDEX idx_vote_score (vote_score),
  INDEX idx_expansions (expansions)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES published_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threading
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP, -- Soft delete
  INDEX idx_game_id (game_id),
  INDEX idx_parent_id (parent_id)
);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES published_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 downvote, 1 upvote
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(game_id, user_id),
  INDEX idx_game_id (game_id)
);

-- Comment votes (optional)
CREATE TABLE comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
```

#### API Endpoints

**Authentication**:
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

**Saved Games** (Private):
```
GET    /api/saved-games              # List user's saved games
POST   /api/saved-games              # Save new game
GET    /api/saved-games/:id          # Get saved game
PUT    /api/saved-games/:id          # Update saved game
DELETE /api/saved-games/:id          # Delete saved game
POST   /api/saved-games/:id/publish  # Publish a saved game
```

**Published Games** (Public):
```
GET    /api/published-games          # List published games (with filters)
GET    /api/published-games/:id      # Get published game details
GET    /api/published-games/:id/replay # Get game state for replay
POST   /api/published-games/:id/view # Increment view count
```

**Comments**:
```
GET    /api/published-games/:id/comments
POST   /api/published-games/:id/comments
PUT    /api/comments/:id
DELETE /api/comments/:id
```

**Votes**:
```
POST   /api/published-games/:id/vote
DELETE /api/published-games/:id/vote
GET    /api/published-games/:id/vote-status
```

#### API Query Parameters

**Published Games List**:
```
GET /api/published-games?
  page=1&
  limit=20&
  expansions=base,ix&
  playerCount=3,4&
  winnerLeader=Paul%20Atreides&
  sortBy=newest&
  search=keyword
```

### Phase 3: Frontend Integration

#### New Components

```
client/src/components/
  PublishedGames/
    PublishedGamesList.tsx          # Main list view
    PublishedGamesList.css
    PublishedGameCard.tsx            # Individual game card
    PublishedGameCard.css
    GameFilters.tsx                  # Filter sidebar/panel
    GameFilters.css
  PublishedGameDetail/
    PublishedGameDetail.tsx          # Game detail page
    PublishedGameDetail.css
    GameReplay.tsx                   # Replay viewer (reuse TimeTravel!)
    CommentsSection.tsx
    VoteButton.tsx
  PublishGame/
    PublishGameDialog.tsx            # Publish modal
    PublishGameDialog.css
```

#### Routing

**New Routes** (if using React Router):
```
/                                    # Main game
/saved-games                         # List saved games
/published-games                     # List published games
/published-games/:id                 # View published game
```

#### State Management

**Options**:
1. **React Query** (recommended) - for server state
2. **Context API** - for UI state (filters, selected game)
3. **Zustand/Redux** - if state becomes complex

**Recommendation**: Use **React Query** for API calls and caching, Context API for UI state.

#### API Service Layer

```
client/src/services/
  api/
    authService.ts
    savedGamesService.ts
    publishedGamesService.ts
    commentsService.ts
    votesService.ts
  apiClient.ts                      # Axios/fetch wrapper
```

## Implementation Plan

### Phase 1: Local Save/Load (Week 1-2)
**Goal**: Users can save and load games locally

**Tasks**:
1. ✅ Create `GameSaveService` with LocalStorage
2. ✅ Create `SavedGameMetadata` and `SavedGame` types
3. ✅ Implement serialization/deserialization for GameState
4. ✅ Create SaveGameDialog component
5. ✅ Create LoadGameDialog component
6. ✅ Add Save/Load buttons to UI
7. ✅ Update App.tsx to support loading
8. ✅ Add delete saved game functionality
9. ✅ Test with various game states
10. ✅ Handle edge cases (localStorage full, corrupted data)

**Deliverables**:
- Save game button in game UI
- Load game dialog with list of saves
- Delete saved games
- Auto-save option (optional)

### Phase 2: Backend Setup (Week 2-3)
**Goal**: Backend API for publishing games

**Tasks**:
1. ✅ Set up Node.js/Express backend (or Spring Boot)
2. ✅ Set up database (PostgreSQL)
3. ✅ Create database schema
4. ✅ Implement authentication (JWT)
5. ✅ Implement saved games API
6. ✅ Implement published games API
7. ✅ Implement comments API
8. ✅ Implement votes API
9. ✅ Add API documentation
10. ✅ Deploy backend (Heroku/Railway/AWS)

**Deliverables**:
- Working REST API
- Database with all tables
- Authentication system
- API documentation

### Phase 3: Publish Functionality (Week 3-4)
**Goal**: Users can publish games

**Tasks**:
1. ✅ Create PublishGameDialog component
2. ✅ Integrate with backend API
3. ✅ Add publish button (only when game complete)
4. ✅ Handle publish/unpublish
5. ✅ Generate shareable links
6. ✅ Test publish flow

**Deliverables**:
- Publish button in game UI
- Publish dialog
- Published games visible in list

### Phase 4: Published Games List (Week 4-5)
**Goal**: List view with filtering

**Tasks**:
1. ✅ Create PublishedGamesList component
2. ✅ Create PublishedGameCard component
3. ✅ Implement filtering UI
4. ✅ Implement sorting
5. ✅ Implement pagination/infinite scroll
6. ✅ Add search functionality
7. ✅ Integrate with API
8. ✅ Responsive design
9. ✅ Loading states
10. ✅ Error handling

**Deliverables**:
- Published games list page
- Filtering and sorting
- Search functionality
- Responsive design

### Phase 5: Game Detail View (Week 5-6)
**Goal**: View published games with replay

**Tasks**:
1. ✅ Create PublishedGameDetail page
2. ✅ Integrate TimeTravel system for replay
3. ✅ Create game stats summary
4. ✅ Add share buttons
5. ✅ Export game data (JSON)
6. ✅ View count tracking

**Deliverables**:
- Game detail page
- Turn-by-turn replay
- Stats summary
- Share functionality

### Phase 6: Comments & Voting (Week 6-7)
**Goal**: Community engagement features

**Tasks**:
1. ✅ Create CommentsSection component
2. ✅ Implement comment threading
3. ✅ Create VoteButton component
4. ✅ Implement vote API integration
5. ✅ Add comment editing/deleting
6. ✅ Add comment voting (optional)
7. ✅ Add report functionality
8. ✅ Moderation tools (future)

**Deliverables**:
- Comments section
- Voting system
- Comment management

### Phase 7: Polish & Testing (Week 7-8)
**Goal**: Production-ready feature

**Tasks**:
1. ✅ UI/UX polish
2. ✅ Performance optimization
3. ✅ Error handling improvements
4. ✅ Loading states
5. ✅ Accessibility improvements
6. ✅ Mobile responsiveness
7. ✅ End-to-end testing
8. ✅ Security audit
9. ✅ Documentation

**Deliverables**:
- Polished UI
- Comprehensive tests
- Documentation
- Production deployment

## Technical Considerations

### GameState Serialization

**Challenges**:
- `history: GameState[]` - circular references
- `combatPasses: Set<number>` - not JSON serializable
- `endgameDonePlayers: Set<number>` - not JSON serializable
- Large state objects (history can be 100+ turns)

**Solution**:
```typescript
function serializeGameState(state: GameState): string {
  const serializable = {
    ...state,
    combatPasses: Array.from(state.combatPasses),
    endgameDonePlayers: Array.from(state.endgameDonePlayers),
    history: state.history.map(h => ({
      ...h,
      combatPasses: Array.from(h.combatPasses),
      endgameDonePlayers: Array.from(h.endgameDonePlayers),
      // Recursively handle nested history if needed
    }))
  }
  return JSON.stringify(serializable)
}

function deserializeGameState(json: string): GameState {
  const parsed = JSON.parse(json)
  return {
    ...parsed,
    combatPasses: new Set(parsed.combatPasses),
    endgameDonePlayers: new Set(parsed.endgameDonePlayers),
    history: parsed.history.map((h: any) => ({
      ...h,
      combatPasses: new Set(h.combatPasses),
      endgameDonePlayers: new Set(h.endgameDonePlayers)
    }))
  }
}
```

### Storage Size Limits

**LocalStorage**: ~5-10MB per domain
- Average game state: ~50-200KB (depending on history)
- Can store ~25-200 games locally
- **Solution**: Implement cleanup of old saves, or use IndexedDB

**Backend Database**:
- JSONB column can store large objects
- PostgreSQL handles JSONB efficiently
- Consider compression for very large games
- **Solution**: Monitor database size, implement archiving

### Performance Considerations

**Large History Arrays**:
- GameState.history can be 100+ entries
- Each entry is a full GameState snapshot
- Loading/saving can be slow

**Optimizations**:
1. **Lazy loading**: Load history on-demand for replay
2. **Compression**: Compress game state before saving
3. **Delta encoding**: Store only changes between turns (complex)
4. **Pagination**: Load history in chunks

**Recommendation**: Start with full serialization, optimize if needed.

### Security Considerations

**Client-Side**:
- LocalStorage is accessible to any script on page
- Don't store sensitive data
- Validate loaded game state

**Backend**:
- Validate all API inputs
- Sanitize user-generated content (comments)
- Rate limiting on API endpoints
- SQL injection prevention (use parameterized queries)
- XSS prevention in comments
- CSRF protection

### User Authentication

**Options**:
1. **Simple**: Username/password with JWT
2. **OAuth**: Google/GitHub login
3. **Anonymous**: Allow viewing without account, require account for publishing

**Recommendation**: Start with username/password, add OAuth later.

## UI/UX Design Considerations

### Save Game Dialog
- Game name input (required)
- Auto-generated name: "Game - Round X - [Date]"
- Player info preview
- Current round/phase display
- Save button

### Load Game Dialog
- List of saved games
- Preview: name, date, round, players
- Load button
- Delete button (with confirmation)
- Empty state: "No saved games"

### Published Games List
- Grid or list view toggle
- Filter sidebar (collapsible on mobile)
- Search bar at top
- Sort dropdown
- Game cards with:
  - Thumbnail/preview image
  - Title
  - Creator name/avatar
  - Expansions badges
  - Turn count
  - Winner(s) with leader icons
  - Vote count
  - Comment count
  - Published date

### Game Detail View
- Header with title, creator, metadata
- Replay controls (reuse TimeTravel UI)
- Stats panel
- Comments section below
- Vote buttons
- Share buttons

## Future Enhancements

1. **Game Analysis**:
   - Statistics dashboard
   - Turn-by-turn analysis
   - Resource tracking graphs
   - Win rate by leader

2. **Social Features**:
   - Follow creators
   - Game collections/favorites
   - Game tags/categories
   - Featured games

3. **Advanced Filtering**:
   - Filter by specific cards played
   - Filter by victory margin
   - Filter by game length (time)

4. **Export Options**:
   - Export to PDF
   - Export to video (animated replay)
   - Share to social media

5. **Multiplayer Integration**:
   - Publish live games
   - Spectator mode
   - Real-time comments

## Success Metrics

1. **Save/Load**:
   - Users can save games successfully
   - Load time < 1 second
   - No data loss

2. **Publishing**:
   - Users can publish games
   - Published games are viewable
   - Share links work

3. **List View**:
   - Page load time < 2 seconds
   - Filters work correctly
   - Responsive on mobile

4. **Engagement**:
   - Comments per game
   - Votes per game
   - Views per game

## Risks & Mitigations

1. **Risk**: Large game states cause performance issues
   - **Mitigation**: Implement compression, lazy loading

2. **Risk**: LocalStorage quota exceeded
   - **Mitigation**: Use IndexedDB, implement cleanup

3. **Risk**: Backend costs scale with usage
   - **Mitigation**: Implement rate limiting, consider CDN for static assets

4. **Risk**: Spam/abuse in comments
   - **Mitigation**: Rate limiting, moderation tools, report functionality

5. **Risk**: Game state corruption
   - **Mitigation**: Validation on load, versioning, migration support

## Conclusion

This feature will significantly enhance the Dune: Imperium application by allowing users to save their games and share them with the community. The implementation should be done in phases, starting with local save/load and gradually adding backend features for publishing.

The recommended approach is to:
1. Start with LocalStorage for MVP
2. Build backend API for publishing
3. Create polished UI components
4. Add social features (comments/voting)
5. Iterate based on user feedback

The time-travel system already in place provides an excellent foundation for the replay functionality needed in the published games feature.
