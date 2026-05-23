import { Card, GameState, Player, TurnType } from '../types/GameTypes'

/** Find card objects by id across a player's in-round piles (play area, deck, discard, trash). */
export function findPlayerCardsByIds(player: Player, ids: number[]): Card[] {
  const piles: Card[] = [
    ...(player.playArea ?? []),
    ...(player.deck ?? []),
    ...(player.discardPile ?? []),
    ...(player.trash ?? []),
  ]
  const byId = new Map<number, Card>()
  for (const card of piles) {
    byId.set(card.id, card)
  }
  const result: Card[] = []
  const seen = new Set<number>()
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    const card = byId.get(id)
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

  const resolved = findPlayerCardsByIds(player, [...ids])
  return resolved.length > 0 ? resolved : fromPlayArea
}
