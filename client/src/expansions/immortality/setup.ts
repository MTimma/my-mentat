import type { GameState } from '../../types/GameTypes'
import { buildTleilaxuPool } from '../../catalog/runtime'
import { RESEARCH_START_NODE_ID } from './researchTrack'

/** Reclaimed Forces is a permanent reserve, never part of the purchasable row pool. */
const RECLAIMED_FORCES_NAME = 'Reclaimed Forces'

/**
 * Seed Immortality-specific state on a freshly built GameState. No randomization:
 * the Tleilaxu Row is pre-filled with the first two pool cards as a sensible
 * default; the user can swap them via the Tleilaxu Row UI (same as Imperium Row).
 */
export function seedImmortalitySetup(state: GameState): void {
  const pool = buildTleilaxuPool().filter(card => card.name !== RECLAIMED_FORCES_NAME)

  state.tleilaxuRow = pool.slice(0, 2)
  state.tleilaxuRowDeck = pool.slice(2)
  state.tleilaxuTrackBonusSpice = 2
  state.tleilaxuTrackBonusClaimed = false
  state.pendingResearchAdvance = null
  state.graftPair = null

  for (const player of state.players) {
    player.specimens = player.specimens ?? 0
    player.tleilaxuStep = player.tleilaxuStep ?? 0
    player.researchNodeId = player.researchNodeId ?? RESEARCH_START_NODE_ID
    player.familyAtomicsUsed = player.familyAtomicsUsed ?? false
  }
}
