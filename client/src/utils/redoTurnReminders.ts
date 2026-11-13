import { ALL_INTRIGUE_CARDS } from '../services/IntrigueDeckService'
import {
  RewardType,
  TurnType,
  normalizeExpansions,
  type GameState,
} from '../types/GameTypes'
import { getGainsForTurnState, removedCardNameFromEffectCardGainName } from './turnGainsDisplay'
import {
  getAcquiredCardsForTurn,
  getAcquiredTechTilesForTurn,
  resolveCardInSnapshot,
  resolvePlayedCardsForTurn,
} from './revealTurnStats'

/** Small card or tile shown in orange during a redo, as a reminder of the original choice. */
export interface RedoReminderThumb {
  key: string
  id: number
  name: string
  image?: string
}

export interface RedoTurnReminders {
  playedCards: RedoReminderThumb[]
  revealedCards: RedoReminderThumb[]
  agentSpaceId: number | null
  intrigue: RedoReminderThumb[]
  acquiredCards: RedoReminderThumb[]
  acquiredTech: RedoReminderThumb[]
  discarded: RedoReminderThumb[]
  trashed: RedoReminderThumb[]
}

const EMPTY: RedoTurnReminders = {
  playedCards: [],
  revealedCards: [],
  agentSpaceId: null,
  intrigue: [],
  acquiredCards: [],
  acquiredTech: [],
  discarded: [],
  trashed: [],
}

function thumb(key: string, id: number, name: string, image?: string): RedoReminderThumb {
  return { key, id, name, image }
}

export function originalTurnReminders(turn: GameState | null | undefined): RedoTurnReminders {
  const curr = turn?.currTurn
  const playerId = curr?.playerId
  if (!turn || !curr || playerId == null) return EMPTY

  const playedCards =
    curr.type === TurnType.ACTION
      ? resolvePlayedCardsForTurn(turn).map(card => thumb(`play-${card.id}`, card.id, card.name, card.image))
      : []

  const revealedCards =
    curr.type === TurnType.REVEAL
      ? (curr.revealedCardIds ?? []).flatMap(id => {
          const card = resolveCardInSnapshot(turn, playerId, id)
          return card ? [thumb(`reveal-${card.id}`, card.id, card.name, card.image)] : []
        })
      : []

  const intrigue = (curr.playedIntrigueCard ?? []).flatMap(play => {
    const card =
      turn.intrigueDiscard.find(entry => entry.id === play.cardId) ??
      turn.intrigueDeck.find(entry => entry.id === play.cardId) ??
      ALL_INTRIGUE_CARDS(normalizeExpansions(turn.expansions)).find(entry => entry.id === play.cardId)
    return card ? [thumb(`intrigue-${card.id}`, card.id, card.name, card.image)] : []
  })

  const acquiredCards = getAcquiredCardsForTurn(turn, playerId).map(card =>
    thumb(`acquire-${card.id}`, card.id, card.name, card.image)
  )
  const acquiredTech = getAcquiredTechTilesForTurn(turn, playerId).map(tile =>
    thumb(`tech-${tile.id}`, 0, tile.name, tile.image)
  )

  const discarded: RedoReminderThumb[] = []
  const trashed: RedoReminderThumb[] = []
  const seenDiscard = new Set<number>()
  const seenTrash = new Set<number>()
  for (const gain of getGainsForTurnState(turn)) {
    if (gain.type !== RewardType.DISCARD && gain.type !== RewardType.TRASH) continue
    const id = gain.cardId ?? gain.sourceId
    const seen = gain.type === RewardType.TRASH ? seenTrash : seenDiscard
    if (seen.has(id)) continue
    seen.add(id)
    const card = resolveCardInSnapshot(turn, playerId, id)
    const name = removedCardNameFromEffectCardGainName(gain.name) ?? card?.name ?? gain.name
    const item = thumb(`${gain.type}-${id}`, name, card?.image)
    if (gain.type === RewardType.TRASH) trashed.push(item)
    else discarded.push(item)
  }

  return {
    playedCards,
    revealedCards,
    agentSpaceId: curr.type === TurnType.ACTION ? curr.agentSpaceId ?? null : null,
    intrigue,
    acquiredCards,
    acquiredTech,
    discarded,
    trashed,
  }
}
