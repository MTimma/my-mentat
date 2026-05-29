import { ALL_IMPERIUM_ROW_CARDS } from '../data/cards'
import { Card, GameState, GainSource, RewardType, TurnType } from '../types/GameTypes'

export interface RevealTurnStats {
  acquiredCards: Card[]
}

function resolveCardInSnapshot(
  state: GameState,
  playerId: number,
  cardId: number
): Card | undefined {
  const fromTurn = state.currTurn?.acquiredCards?.find(c => c.id === cardId)
  if (fromTurn) return fromTurn

  const player = state.players.find(p => p.id === playerId)
  if (player) {
    const piles = [...player.deck, ...player.discardPile, ...player.playArea, ...player.trash]
    const fromPile = piles.find(c => c.id === cardId)
    if (fromPile) return fromPile
  }

  const fromRow = state.imperiumRow.find(c => c.id === cardId)
  if (fromRow) return fromRow

  return ALL_IMPERIUM_ROW_CARDS.find(c => c.id === cardId)
}

function deriveAcquiredCardsFromGains(state: GameState, playerId: number): Card[] {
  const round = state.currentRound
  const seen = new Set<number>()
  const cards: Card[] = []

  const pushResolvedCard = (cardId: number, fallbackName: string) => {
    if (seen.has(cardId)) return
    seen.add(cardId)
    const card =
      resolveCardInSnapshot(state, playerId, cardId) ??
      ({
        id: cardId,
        name: fallbackName,
        image: '',
        agentIcons: [],
      } satisfies Card)
    cards.push(card)
  }

  for (const gain of state.gains ?? []) {
    if (gain.playerId !== playerId || gain.round !== round) continue
    if (gain.source !== GainSource.CARD) continue

    if (gain.type === RewardType.CARD && !gain.name.endsWith(' Acquire')) {
      pushResolvedCard(gain.sourceId, gain.name)
      continue
    }

    // Reserve buys (SMF / AL) used to only log "… Acquire Effect" VP gains, not CARD gains.
    if (gain.name.endsWith(' Acquire Effect')) {
      const baseName = gain.name.replace(/ Acquire Effect$/, '')
      pushResolvedCard(gain.sourceId, baseName)
    }
  }

  return cards
}

export function getRevealTurnStats(state: GameState, playerId: number): RevealTurnStats | null {
  const currTurn = state.currTurn
  if (!currTurn || currTurn.playerId !== playerId || currTurn.type !== TurnType.REVEAL) {
    return null
  }

  const fromTurn = currTurn.acquiredCards ?? []
  const fromGains = deriveAcquiredCardsFromGains(state, playerId)
  const merged = new Map<number, Card>()
  for (const card of [...fromTurn, ...fromGains]) {
    merged.set(card.id, card)
  }

  return {
    acquiredCards: [...merged.values()],
  }
}
