import { Card, FactionType, GameState, PlayEffect, RevealEffect } from '../../types/GameTypes'

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


