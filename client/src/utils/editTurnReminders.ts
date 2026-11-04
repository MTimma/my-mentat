import { ALL_INTRIGUE_CARDS } from '../services/IntrigueDeckService'
import { TurnType, normalizeExpansions, type GameState } from '../types/GameTypes'
import { resolveCardInSnapshot, resolvePlayedCardsForTurn } from './revealTurnStats'

/** Small card shown in orange during a redo, as a reminder of the original choice. */
export interface EditReminderThumb {
  key: string
  id: number
  name: string
  image?: string
}

export interface EditTurnReminders {
  /** Cards played on the original agent turn. */
  playedCards: EditReminderThumb[]
  /** Cards revealed on the original reveal turn. */
  revealedCards: EditReminderThumb[]
  /** Board space the original agent was placed on. */
  agentSpaceId: number | null
  /** Intrigue played on the original turn. */
  intrigue: EditReminderThumb[]
}

const EMPTY: EditTurnReminders = {
  playedCards: [],
  revealedCards: [],
  agentSpaceId: null,
  intrigue: [],
}

function thumb(key: string, id: number, name: string, image?: string): EditReminderThumb {
  return { key, id, name, image }
}

/**
 * What the original turn did, shown while that turn is being replayed after an
 * edit. Only the choices the player must make again are surfaced: the board
 * space visited, the card played, cards revealed, and intrigue played.
 */
export function originalTurnReminders(turn: GameState | null | undefined): EditTurnReminders {
  const curr = turn?.currTurn
  const playerId = curr?.playerId
  if (!turn || !curr || playerId == null) return EMPTY

  const playedCards =
    curr.type === TurnType.ACTION
      ? resolvePlayedCardsForTurn(turn).map(card =>
          thumb(`play-${card.id}`, card.id, card.name, card.image)
        )
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
      ALL_INTRIGUE_CARDS(normalizeExpansions(turn.expansions)).find(
        entry => entry.id === play.cardId
      )
    return card ? [thumb(`intrigue-${card.id}`, card.id, card.name, card.image)] : []
  })

  return {
    playedCards,
    revealedCards,
    agentSpaceId: curr.type === TurnType.ACTION ? curr.agentSpaceId ?? null : null,
    intrigue,
  }
}
