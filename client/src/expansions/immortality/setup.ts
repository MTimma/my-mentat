import type { GameState } from '../../types/GameTypes'
import { buildTleilaxuPool } from '../../catalog/runtime'
import { RESEARCH_START_NODE_ID } from './researchTrack'

/** Reclaimed Forces is a permanent reserve, never part of the purchasable row pool. */
const RECLAIMED_FORCES_NAME = 'Reclaimed Forces'

/** Purchasable Tleilaxu Row slots chosen during sandbox setup. Reclaimed Forces is separate. */
export const TLEILAXU_PURCHASABLE_SLOT_COUNT = 2

/**
 * Seed Immortality-specific state on a freshly built GameState.
 * Sandbox setup leaves the two purchasable slots empty so the user picks them
 * (same idea as the Imperium Row). Other games keep the first two pool cards,
 * because this app does not shuffle.
 */
export function seedImmortalitySetup(state: GameState): void {
  const pool = buildTleilaxuPool().filter(card => card.name !== RECLAIMED_FORCES_NAME)

  if (state.sandboxSetup) {
    state.tleilaxuRow = []
    state.tleilaxuRowDeck = pool
  } else {
    state.tleilaxuRow = pool.slice(0, TLEILAXU_PURCHASABLE_SLOT_COUNT)
    state.tleilaxuRowDeck = pool.slice(TLEILAXU_PURCHASABLE_SLOT_COUNT)
  }
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
