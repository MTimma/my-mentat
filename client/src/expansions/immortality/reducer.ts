import type { GameState, OptionalEffect, Player, Reward } from '../../types/GameTypes'
import { GainSource, RewardType } from '../../types/GameTypes'
import { nextSemanticId } from '../../utils/semanticIds'
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
 * Grant a research node's bonus. A node with a `cost` is an optional purchase:
 * the player still moves onto the node, but the bonus is offered as an optional
 * effect they may pay for. Nodes without a cost grant their bonus immediately.
 *
 * If there is no active turn to attach the optional effect to, the costed bonus
 * is simply not gained (the player could not have paid it anyway).
 */
function applyResearchNodeBonus(
  state: GameState,
  playerId: number,
  nodeId: string,
  applyReward: ApplyReward
): GameState {
  const node = researchNode(nodeId)
  const bonus = node.bonus
  if (!bonus) return state
  if (!node.cost) {
    return applyReward(state, bonus, playerId, IMMORTALITY_SOURCE.research)
  }
  if (!state.currTurn) return state

  const existing = state.currTurn.optionalEffects ?? []
  const effect: OptionalEffect = {
    id: nextSemanticId(IMMORTALITY_SOURCE.research, 'EFFECT', existing.map(e => e.id)),
    cost: node.cost,
    reward: bonus,
    source: IMMORTALITY_SOURCE.research,
  }
  return {
    ...state,
    currTurn: { ...state.currTurn, optionalEffects: [...existing, effect] },
  }
}

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
 * Pull a `pendingResearchAdvance` set deeper in the reward chain (e.g. a node
 * bonus that itself granted Research and stopped at a fork) out of the state so
 * the caller can fold its advances into the ones it still owes.
 */
function takePendingResearchAdvance(
  state: GameState,
  playerId: number
): { state: GameState; owed: number } {
  const pending = state.pendingResearchAdvance
  if (!pending || pending.playerId !== playerId) return { state, owed: 0 }
  return { state: { ...state, pendingResearchAdvance: null }, owed: pending.remaining }
}

/** Advances already owed to this player at the fork they are sitting on. */
function pendingResearchOwed(state: GameState, playerId: number): number {
  const pending = state.pendingResearchAdvance
  return pending && pending.playerId === playerId ? pending.remaining : 0
}

/**
 * Advance the research token by `count`. Moves automatically through single
 * branches (applying node bonuses); when a branch fork is reached, records a
 * `pendingResearchAdvance` for the UI to resolve via ADVANCE_RESEARCH. Once the
 * token is on a gene level 2 node, each further advance draws a card.
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
      // Gene level 2: Research draws a card instead of advancing.
      next = applyReward(next, { drawCards: 1 }, playerId, IMMORTALITY_SOURCE.research)
      remaining -= 1
      continue
    }

    const options = nextResearchNodes(nodeId)
    if (options.length > 1) {
      // Defer to the UI to pick the branch; carry remaining advances, plus any
      // decision this player already owes (several research rewards can land
      // before the choice is made).
      return {
        ...next,
        pendingResearchAdvance: { playerId, remaining: pendingResearchOwed(next, playerId) + remaining },
      }
    }

    const targetId = options[0]
    next = withPlayer(next, playerId, p => ({ ...p, researchNodeId: targetId }))
    pushGain(next, playerId, 1, RewardType.RESEARCH, 'Research track')
    next = applyResearchNodeBonus(next, playerId, targetId, applyReward)
    // A node bonus can itself grant Research (e.g. r4c) and stop at a fork;
    // fold those owed advances back into this loop instead of dropping them.
    const nested = takePendingResearchAdvance(next, playerId)
    next = nested.state
    remaining = remaining - 1 + nested.owed
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

/**
 * Rewind the snapshot history to `turnIndex` so the player can replay that turn.
 * The recorded event log is truncated separately (see `GameProvider`); this only
 * restores the in-memory state and clears any previous redo conflict.
 */
export function redoFromTurn(state: GameState, turnIndex: number): GameState {
  if (turnIndex < 0 || turnIndex >= state.history.length) return state

  const target = state.history[turnIndex]
  return {
    ...target,
    // Preserve current configuration metadata.
    expansions: state.expansions,
    boardSet: state.boardSet,
    // Keep the fork turn in history so it can be undone to again.
    history: state.history.slice(0, turnIndex + 1),
    redoConflict: null,
  }
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
  next = { ...next, pendingResearchAdvance: null }
  pushGain(next, playerId, 1, RewardType.RESEARCH, 'Research track')
  next = applyResearchNodeBonus(next, playerId, chosenNodeId, applyReward)
  // The chosen node's bonus may grant more Research (r3a, r4c, r5a). Keep the
  // advances it still owes instead of clearing them with this decision.
  const nested = takePendingResearchAdvance(next, playerId)
  next = nested.state

  const remaining = pending.remaining - 1 + nested.owed
  if (remaining > 0) {
    next = advanceResearch(next, playerId, remaining, applyReward)
  }
  return next
}
