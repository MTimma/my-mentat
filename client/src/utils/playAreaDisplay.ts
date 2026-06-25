import { Card, GameState, Player, TurnType } from '../types/GameTypes'

/** Find card objects by id across a player's in-round piles (play area, deck, discard; optionally trash). */
export function findPlayerCardsByIds(
  player: Player,
  ids: number[],
  options?: { includeTrash?: boolean }
): Card[] {
  const pileGroups: Card[][] = [
    player.playArea ?? [],
    player.deck ?? [],
    player.discardPile ?? [],
    ...(options?.includeTrash ? [player.trash ?? []] : []),
  ]
  const result: Card[] = []
  const seen = new Set<number>()
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    let card: Card | undefined
    for (const pile of pileGroups) {
      card = pile.find(c => c.id === id)
      if (card) break
    }
    if (card) result.push(card)
  }
  return result
}

/**
 * Play-area cards for turn history: END_TURN snapshots clear playArea into discard
 * but keep currTurn (including revealedCardIds) on the stored state reference.
 */
export function getPlayAreaCardsForTurnView(gameState: GameState, player: Player): Card[] {
  const fromPlayArea = player.playArea ?? []
  const currTurn = gameState.currTurn
  if (!currTurn || currTurn.playerId !== player.id) {
    return fromPlayArea
  }

  const ids = new Set(fromPlayArea.map(c => c.id))
  if (currTurn.cardId) ids.add(currTurn.cardId)
  if (currTurn.type === TurnType.REVEAL) {
    for (const id of currTurn.revealedCardIds ?? []) {
      ids.add(id)
    }
  }

  if (ids.size === 0) return fromPlayArea

  const trashedIds = new Set((player.trash ?? []).map(c => c.id))
  const idsToResolve = [...ids].filter(id => !trashedIds.has(id))
  if (idsToResolve.length === 0) return fromPlayArea

  const resolved = findPlayerCardsByIds(player, idsToResolve)
  return resolved.length > 0 ? resolved : fromPlayArea.filter(c => !trashedIds.has(c.id))
}

/**
 * Cards eligible when an effect says “from hand” (or otherwise picks from the draw pile).
 * Hand identities are hidden — only `handCount` is tracked — so the picker lists `deck`.
 * Play area, discard, and trash are separate piles; played cards are removed from `deck`.
 */
export function getSelectableDeckCards(player: Player): Card[] {
  return player.deck ?? []
}

/** Cards an opponent may discard (their deck — played cards are not in deck). */
export function getOpponentDiscardableCards(player: Player): Card[] {
  return getSelectableDeckCards(player)
}

/** Whether a deck card is in the player's hand (first `handCount` entries of `deck`). */
export function isCardInHand(player: Player, cardId: number): boolean {
  const idx = (player.deck ?? []).findIndex(c => c.id === cardId)
  return idx >= 0 && idx < player.handCount
}

/** True when the player can pay a discard cost from hand. */
export function canPayDiscardCost(player: Player, discardCount: number): boolean {
  return player.handCount >= discardCount
}

/** Validates discard-cost selections: all cards must come from hand. */
export function validateDiscardCostSelection(
  player: Player,
  discardCount: number,
  cardIds: number[]
): boolean {
  if (player.handCount < discardCount) return false
  if (cardIds.length !== discardCount) return false
  if (new Set(cardIds).size !== cardIds.length) return false
  return cardIds.every(id => isCardInHand(player, id))
}

/** Card picker rules for discard costs: hand cards only. */
export function getDiscardCostPlayability(
  player: Player,
  discardCount: number,
  selectedCards: Card[]
): (card: Card) => { playable: boolean; reason?: string } {
  return (card: Card) => {
    if (selectedCards.some(c => c.id === card.id)) {
      return { playable: true }
    }
    if (selectedCards.length >= discardCount) {
      return { playable: false, reason: 'Selection full' }
    }
    if (!isCardInHand(player, card.id)) {
      return { playable: false, reason: 'Not in hand' }
    }
    return { playable: true }
  }
}
