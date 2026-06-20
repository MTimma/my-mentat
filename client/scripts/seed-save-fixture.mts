/** One-off script: regenerate agent-reveal-two-turns.json fixture. */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyGameAction } from '../src/components/GameContext/GameContext'
import type { GameAction } from '../src/components/GameContext/GameContext'
import { buildInitialState } from '../src/save/buildInitialState'
import { GameRecorder } from '../src/save/replay'
import type { SetupBlock } from '../src/save/types'
import { GamePhase, PlayerColor } from '../src/types/GameTypes'

const STARTING_DECK_IDS = [
  'starting/the-voice',
  'starting/reverend-mother-mohiam',
  'starting/power-play',
  'starting/other-memory',
  'starting/kwisatz-haderach',
  'starting/fremen-camp',
  'starting/gurney-halleck',
  'starting/liet-kynes',
  'starting/scout',
  'starting/shifting-allegiances',
]

const setup: SetupBlock = {
  firstPlayer: 0,
  players: [
    { id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: STARTING_DECK_IDS },
    { id: 1, leaderId: 'ilban', color: PlayerColor.BLUE, deckCardIds: STARTING_DECK_IDS },
  ],
  initialConflictId: 901,
}

let live = buildInitialState(setup)
live = { ...live, phase: GamePhase.PLAYER_TURNS }
const recorder = new GameRecorder(setup, {
  id: 'fixture-agent-reveal',
  title: 'Agent + reveal two turns',
})

const script: GameAction[] = [
  { type: 'PLAY_CARD', playerId: 0, cardId: live.players[0].deck[5].id },
  { type: 'PLACE_AGENT', playerId: 0, spaceId: 12 },
  { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
  { type: 'END_TURN', playerId: 0 },
  { type: 'PLAY_CARD', playerId: 1, cardId: live.players[1].deck[0].id },
  { type: 'PLACE_AGENT', playerId: 1, spaceId: 15 },
  { type: 'CLAIM_ALL_REWARDS', playerId: 1 },
  { type: 'END_TURN', playerId: 1 },
]

for (const action of script) {
  live = applyGameAction(live, action)
  recorder.record(action, live)
}

const doc = recorder.toSaveDoc()
const out = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/test-fixtures/saves/agent-reveal-two-turns.json'
)
writeFileSync(out, JSON.stringify(doc, null, 2))
console.log('Wrote', out, 'with', doc.events.length, 'events')
