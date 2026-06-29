import type { GameState, Player, Reward } from '../../types/GameTypes'
import { GainSource, RewardType } from '../../types/GameTypes'
import {
  geneLevelForNode,
  isResearchComplete,
  nextResearchNodes,
  researchNode,
  RESEARCH_NODES,
} from './researchTrack'
import { clampTleilaxuStep, tleilaxuSpace, TLEILAXU_TRACK_MAX_STEP } from './tleilaxuTrack'
import type { GeneLevel } from './types'

const IMMORTALITY_SOURCE = {
  research: { type: GainSource.RESEARCH_TRACK, id: 0, name: 'Research track' },
  tleilaxu: { type: GainSource.TLEILAXU_TRACK, id: 0, name: 'Tleilaxu track' },
}

/** Apply one player update immutably into the players array. */
function withPlayer(state: GameState, playerId: number, update: (p: Player) => Player): GameState {
  return {
    ...state,
    players: state.players.map(p => (p.id === playerId ? update({ ...p }) : p)),
  }
}

function pushGain(state: GameState, playerId: number, amount: number, type: RewardType, name: string): void {
  if (!amount) return
  state.gains.push({
    playerId,
    round: state.currentRound,
    source: GainSource.CARD,
    sourceId: 0,
    name,
    amount,
    type,
  })
}

/** Genetic-marker level a player has reached. */
export function playerGeneLevel(player: Player): GeneLevel {
  return geneLevelForNode(player.researchNodeId)
}

/** Add N specimens to the Axolotl tanks. */
export function applySpecimenReward(state: GameState, playerId: number, count: number): GameState {
  if (!count) return state
  const next = withPlayer(state, playerId, p => ({ ...p, specimens: (p.specimens ?? 0) + count }))
  pushGain(next, playerId, count, RewardType.SPECIMEN, 'Specimen')
  return next
}

/** Spend N specimens (clamped at 0). */
export function spendSpecimens(state: GameState, playerId: number, count: number): GameState {
  if (!count) return state
  return withPlayer(state, playerId, p => ({
    ...p,
    specimens: Math.max(0, (p.specimens ?? 0) - count),
  }))
}

type ApplyReward = (state: GameState, reward: Reward, playerId: number, source?: { type: GainSource; id: number; name: string }) => GameState

/**
 * Advance the linear Tleilaxu track by `count`, applying each entered space's
 * bonus via the provided reward applier. Claims the first-player VP-space spice.
 */
export function advanceTleilaxuTrack(
  state: GameState,
  playerId: number,
  count: number,
  applyReward: ApplyReward
): GameState {
  if (!count) return state
  let next = state
  const player = next.players.find(p => p.id === playerId)
  if (!player) return state
  let step = player.tleilaxuStep ?? 0

  for (let i = 0; i < count && step < TLEILAXU_TRACK_MAX_STEP; i++) {
    step = clampTleilaxuStep(step + 1)
    next = withPlayer(next, playerId, p => ({ ...p, tleilaxuStep: step }))
    pushGain(next, playerId, 1, RewardType.TLEILAXU, 'Tleilaxu track')

    const space = tleilaxuSpace(step)
    // First player to reach the VP space takes the 2 setup spice bonus.
    if (space?.victoryPoint && !next.tleilaxuTrackBonusClaimed && (next.tleilaxuTrackBonusSpice ?? 0) > 0) {
      const bonus = next.tleilaxuTrackBonusSpice ?? 0
      next = { ...next, tleilaxuTrackBonusClaimed: true, tleilaxuTrackBonusSpice: 0 }
      next = applyReward(next, { spice: bonus }, playerId, IMMORTALITY_SOURCE.tleilaxu)
    }
    if (space?.bonus) {
      next = applyReward(next, space.bonus, playerId, IMMORTALITY_SOURCE.tleilaxu)
    }
  }
  return next
}

/**
 * Advance the research token by `count`. Moves automatically through single
 * branches (applying node bonuses); when a branch fork is reached, records a
 * `pendingResearchAdvance` for the UI to resolve via ADVANCE_RESEARCH. Once the
 * track is complete, each further advance draws a card (gene-unlock 2 rule).
 */
export function advanceResearch(
  state: GameState,
  playerId: number,
  count: number,
  applyReward: ApplyReward
): GameState {
  if (!count) return state
  let next = state
  let remaining = count

  while (remaining > 0) {
    const player = next.players.find(p => p.id === playerId)
    if (!player) break
    const nodeId = player.researchNodeId

    if (isResearchComplete(nodeId)) {
      // Gene unlock 2: Research draws a card instead of advancing.
      next = applyReward(next, { drawCards: 1 }, playerId, IMMORTALITY_SOURCE.research)
      remaining -= 1
      continue
    }

    const options = nextResearchNodes(nodeId)
    if (options.length > 1) {
      // Defer to the UI to pick the branch; carry remaining advances.
      return { ...next, pendingResearchAdvance: { playerId, remaining } }
    }

    const targetId = options[0]
    next = withPlayer(next, playerId, p => ({ ...p, researchNodeId: targetId }))
    pushGain(next, playerId, 1, RewardType.RESEARCH, 'Research track')
    const bonus = researchNode(targetId).bonus
    if (bonus) next = applyReward(next, bonus, playerId, IMMORTALITY_SOURCE.research)
    remaining -= 1
  }

  return { ...next, pendingResearchAdvance: null }
}

/** Manual logging — set research node directly (no track bonuses). */
export function setResearchNode(state: GameState, playerId: number, nodeId: string): GameState {
  if (!RESEARCH_NODES[nodeId]) return state
  return withPlayer(state, playerId, p => ({ ...p, researchNodeId: nodeId }))
}

/** Manual logging — set Tleilaxu step directly (no track bonuses). */
export function setTleilaxuStep(state: GameState, playerId: number, step: number): GameState {
  return withPlayer(state, playerId, p => ({ ...p, tleilaxuStep: clampTleilaxuStep(step) }))
}

/** Resolve a pending research branch choice, then continue any remaining advances. */
export function resolveResearchBranch(
  state: GameState,
  playerId: number,
  chosenNodeId: string,
  applyReward: ApplyReward
): GameState {
  const pending = state.pendingResearchAdvance
  if (!pending || pending.playerId !== playerId) return state
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state
  if (!nextResearchNodes(player.researchNodeId).includes(chosenNodeId)) return state

  let next = withPlayer(state, playerId, p => ({ ...p, researchNodeId: chosenNodeId }))
  pushGain(next, playerId, 1, RewardType.RESEARCH, 'Research track')
  const bonus = researchNode(chosenNodeId).bonus
  if (bonus) next = applyReward(next, bonus, playerId, IMMORTALITY_SOURCE.research)
  next = { ...next, pendingResearchAdvance: null }

  const remaining = pending.remaining - 1
  if (remaining > 0) {
    next = advanceResearch(next, playerId, remaining, applyReward)
  }
  return next
}
