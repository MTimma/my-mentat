import { Card, FactionType, GameState, PlayEffect, RevealEffect, IntriguePlayEffect, IntrigueCard } from '../../types/GameTypes'
import { geneLevelForNode } from '../../expansions/immortality/researchTrack'

/**
 * Immortality requirement gates shared by play/reveal/intrigue effects:
 * - `researchLevel` ⇒ the player must have reached that genetic-marker level.
 * - `grafted` ⇒ the card must be one of the two cards in the current graft pair.
 * Both no-op when the expansion is off so base behaviour is unchanged.
 */
function immortalityRequirementSatisfied(
  req: { researchLevel?: number; grafted?: boolean },
  currCard: Card | IntrigueCard,
  state: GameState,
  playerId: number
): boolean {
  if (!state.expansions?.immortality) return true
  if (req.researchLevel) {
    const player = state.players.find(p => p.id === playerId)
    if (geneLevelForNode(player?.researchNodeId) < req.researchLevel) return false
  }
  if (req.grafted) {
    if (!state.graftPair?.cardIds.includes(currCard.id)) return false
  }
  return true
}

export function playRequirementSatisfied(
  effect: PlayEffect,
  currCard: Card,
  state: GameState,
  playerId: number
): boolean {
  const req = effect?.requirement
  if (!req) return true

  const satisfiesDirect = (): boolean => {
    if (req.influence) {
      const factionType = req.influence.faction
      const factionAmount = req.influence.amount
      const have = state.factionInfluence[factionType]?.[playerId] || 0
      if (have < factionAmount) return false
    }
    if (req.alliance) {
      if (state.factionAlliances[req.alliance] !== playerId) return false
    }
    if (req.inPlay) {
      const hasFactionInPlay = Boolean(
        state.playArea[playerId]?.find(card => currCard.id !== card.id && card.faction?.includes(req.inPlay as FactionType))
      )
      if (!hasFactionInPlay) return false
    }
    if (!immortalityRequirementSatisfied(req, currCard, state, playerId)) return false
    return true
  }

  const satisfiesOrGroup = (): boolean => {
    if (!req.or || req.or.length === 0) return true
    return req.or.some(subReq =>
      playRequirementSatisfied(
        { ...effect, requirement: subReq },
        currCard,
        state,
        playerId
      )
    )
  }

  return satisfiesDirect() && satisfiesOrGroup()
}

export function revealRequirementSatisfied(
  effect: RevealEffect,
  currCard: Card,
  state: GameState,
  playerId: number,
  revealedCards: Card[]
): boolean {
  const req = effect?.requirement
  if (!req) return true

  const satisfiesDirect = (): boolean => {
    if (req.influence) {
      const factionType = req.influence.faction
      const factionAmount = req.influence.amount
      const have = state.factionInfluence[factionType]?.[playerId] || 0
      if (have < factionAmount) return false
    }
    if (req.alliance) {
      if (state.factionAlliances[req.alliance] !== playerId) return false
    }
    if (req.bond) {
      const faction = req.bond
      const hasBond =
        Boolean(state.playArea[playerId]?.find(card => currCard.id !== card.id && card.faction?.includes(faction))) ||
        Boolean(revealedCards.find(card => currCard.id !== card.id && card.faction?.includes(faction)))
      if (!hasBond) return false
    }
    if (!immortalityRequirementSatisfied(req, currCard, state, playerId)) return false
    return true
  }

  const satisfiesOrGroup = (): boolean => {
    if (!req.or || req.or.length === 0) return true
    return req.or.some(subReq =>
      revealRequirementSatisfied(
        { ...effect, requirement: subReq },
        currCard,
        state,
        playerId,
        revealedCards
      )
    )
  }

  return satisfiesDirect() && satisfiesOrGroup()
}

export function intrigueRequirementSatisfied(
  effect: IntriguePlayEffect,
  currCard: IntrigueCard,
  state: GameState,
  playerId: number
): boolean {
  // Mentat-only rewards must run even when the effect has no `requirement` object (e.g. Calculated Hire).
  if (effect.reward?.mentat === true) {
    const hasOtherRewards = Object.keys(effect.reward).some(key => key !== 'mentat')
    if (!hasOtherRewards && state.mentatOwner !== null) {
      return false
    }
  }

  const req = effect?.requirement
  if (!req) return true
  const satisfiesDirect = (): boolean => {
    if (req.influence) {
      const factionType = req.influence.faction
      const factionAmount = req.influence.amount
      const have = state.factionInfluence[factionType]?.[playerId] || 0
      if (have < factionAmount) return false
    }
    if (req.alliance) {
      if (state.factionAlliances[req.alliance] !== playerId) return false
    }
    if (req.highCouncil !== undefined) {
      const player = state.players.find(p => p.id === playerId)
      if (!player) return false
      if (req.highCouncil && !player.hasHighCouncilSeat) return false
      if (!req.highCouncil && player.hasHighCouncilSeat) return false
    }
    if (!immortalityRequirementSatisfied(req, currCard, state, playerId)) return false
    return true
  }

  const satisfiesOrGroup = (): boolean => {
    if (!req.or || req.or.length === 0) return true
    return req.or.some(subReq =>
      intrigueRequirementSatisfied(
        { ...effect, requirement: subReq },
        currCard,
        state,
        playerId
      )
    )
  }

  return satisfiesDirect() && satisfiesOrGroup()
}