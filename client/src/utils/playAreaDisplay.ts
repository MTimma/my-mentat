import {
  AUTO_APPLIED_CUSTOM_EFFECTS,
  Card,
  GainSource,
  GameState,
  Player,
  TurnType,
  type IntrigueCard,
  type PendingReward,
  type Reward,
} from '../types/GameTypes'
import { resolveGraftCards } from '../expansions/immortality/graft'

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
 * Play-area cards for turn history. Reveal-turn snapshots keep agent cards in
 * playArea (under the revealed hand). If playArea was already cleared, restore
 * from currTurn.cardId / revealedCardIds found in discard.
 */
export function getPlayAreaCardsForTurnView(gameState: GameState, player: Player): Card[] {
  const fromPlayArea = player.playArea ?? []
  const currTurn = gameState.currTurn
  if (!currTurn || currTurn.playerId !== player.id) {
    return fromPlayArea
  }

  const revealedIds = currTurn.type === TurnType.REVEAL ? currTurn.revealedCardIds ?? [] : []
  const ids = new Set(fromPlayArea.map(c => c.id))
  if (currTurn.cardId) ids.add(currTurn.cardId)
  if (gameState.graftPair?.cardIds) {
    for (const id of gameState.graftPair.cardIds) {
      ids.add(id)
    }
  }
  for (const id of revealedIds) {
    ids.add(id)
  }

  if (ids.size === 0) return fromPlayArea

  const trashedIds = new Set((player.trash ?? []).map(c => c.id))
  const idsToResolve = [...ids].filter(id => !trashedIds.has(id))
  if (idsToResolve.length === 0) return fromPlayArea.filter(c => !trashedIds.has(c.id))

  const resolved = findPlayerCardsByIds(player, idsToResolve)
  const cards = resolved.length > 0 ? resolved : fromPlayArea.filter(c => !trashedIds.has(c.id))
  return orderPlayAreaCardsForRevealView(cards, revealedIds)
}

/** Agent-turn cards first, then revealed-hand cards in reveal order. */
function orderPlayAreaCardsForRevealView(cards: Card[], revealedIds: number[]): Card[] {
  if (revealedIds.length === 0) return cards
  const revealedSet = new Set(revealedIds)
  const agentCards = cards.filter(card => !revealedSet.has(card.id))
  const revealedById = new Map(
    cards.filter(card => revealedSet.has(card.id)).map(card => [card.id, card])
  )
  const revealedCards: Card[] = []
  const seen = new Set<number>()
  for (const id of revealedIds) {
    const card = revealedById.get(id)
    if (!card || seen.has(id)) continue
    seen.add(id)
    revealedCards.push(card)
  }
  return [...agentCards, ...revealedCards]
}

function rewardNeedsInteractionHighlight(reward: Reward): boolean {
  if (reward.custom) {
    return !AUTO_APPLIED_CUSTOM_EFFECTS.includes(reward.custom)
  }
  if (reward.mentat || reward.acquire) return true
  if (reward.influence?.chooseOne) return true
  return false
}

function pendingRewardNeedsPlayerInput(reward: PendingReward): boolean {
  if (reward.disabled) return false
  if (reward.isTrash) return true
  if (reward.source.type === GainSource.MASTERSTROKE) return true
  if (reward.source.type === GainSource.MEMNON_HIGH_COUNCIL) return true
  return rewardNeedsInteractionHighlight(reward.reward)
}

/**
 * Play-area card ids that still need a player choice (OR, optional, interactive reward).
 * Same highlight gate as TurnControls `turn-card-frame--has-effects`.
 *
 * Ids are catalog ids, not per-player instance ids — every Signet Ring is `10`.
 * Only apply the ring on the current-turn seat (see `playAreaCardHasPendingEffectHighlight`).
 */
function playAreaSourceIdsWithPendingEffectChoice(
  gameState: GameState | undefined,
  sourceType: GainSource,
  options?: { isHistoryView?: boolean }
): Set<number> {
  const ids = new Set<number>()
  if (!gameState || options?.isHistoryView) return ids

  const addMatchingSource = (source: { type: GainSource; id: number } | undefined) => {
    if (source?.type === sourceType) ids.add(source.id)
  }

  for (const choice of gameState.currTurn?.pendingChoices ?? []) {
    if (!choice.disabled) addMatchingSource(choice.source)
  }
  for (const effect of gameState.currTurn?.optionalEffects ?? []) {
    addMatchingSource(effect.source)
  }
  for (const reward of gameState.pendingRewards ?? []) {
    if (pendingRewardNeedsPlayerInput(reward)) addMatchingSource(reward.source)
  }
  return ids
}

export function playAreaCardIdsWithPendingEffectChoice(
  gameState: GameState | undefined,
  options?: { isHistoryView?: boolean }
): Set<number> {
  return playAreaSourceIdsWithPendingEffectChoice(gameState, GainSource.CARD, options)
}

/** Intrigue catalog ids that still need a player choice. Separate from cards — ids overlap. */
export function playAreaIntrigueIdsWithPendingEffectChoice(
  gameState: GameState | undefined,
  options?: { isHistoryView?: boolean }
): Set<number> {
  return playAreaSourceIdsWithPendingEffectChoice(gameState, GainSource.INTRIGUE, options)
}

/**
 * Yellow pending-effect ring for a play-area card. Off on inactive seats so
 * other players' copies of the same catalog id (starter Signet Ring, etc.) stay unhighlighted.
 */
export function playAreaCardHasPendingEffectHighlight(
  cardId: number,
  pendingEffectCardIds: ReadonlySet<number> | undefined,
  isActiveSeat: boolean
): boolean {
  return Boolean(isActiveSeat && pendingEffectCardIds?.has(cardId))
}

function resolveIntrigueCardForTurnView(
  gameState: GameState,
  cardId: number,
  extraPiles: IntrigueCard[] = []
): IntrigueCard | undefined {
  return (
    extraPiles.find(card => card.id === cardId) ??
    gameState.intrigueDiscard?.find(card => card.id === cardId) ??
    gameState.intrigueDeck?.find(card => card.id === cardId)
  )
}

/** Active-this-round intrigues that stay in this player's play area until recall. */
export function getActiveIntrigueCardsForTurnView(
  gameState: GameState | undefined,
  player: Player
): IntrigueCard[] {
  if (!gameState) return []
  return gameState.activeIntrigueThisRound?.[player.id] ?? []
}

/**
 * Played intrigues for this player's current turn, excluding ones still marked active.
 * Same split as TurnControls `playedIntrigueStripCards`.
 */
export function getPlayedIntrigueCardsForTurnView(
  gameState: GameState | undefined,
  player: Player
): IntrigueCard[] {
  if (!gameState) return []
  const currTurn = gameState.currTurn
  if (!currTurn || currTurn.playerId !== player.id) return []

  const active = getActiveIntrigueCardsForTurnView(gameState, player)
  const activeIds = new Set(active.map(card => card.id))
  return (currTurn.playedIntrigueCard ?? [])
    .map(play => resolveIntrigueCardForTurnView(gameState, play.cardId, active))
    .filter((card): card is IntrigueCard => Boolean(card) && !activeIds.has(card.id))
}

/** Revealed-hand ids for this player's current reveal turn (empty otherwise). */
export function getRevealedCardIdsForTurnView(
  gameState: GameState | undefined,
  player: Player
): number[] {
  const currTurn = gameState?.currTurn
  if (!currTurn || currTurn.playerId !== player.id || currTurn.type !== TurnType.REVEAL) {
    return []
  }
  return currTurn.revealedCardIds ?? []
}

/**
 * Agent-turn cards to show in the play strip: full graft pair while choosing a space or after placement.
 */
export function getAgentTurnCardsForDisplay(
  gameState: GameState | undefined,
  player: Player,
  selectedCard: Card | null,
  options?: { isRevealTurn?: boolean }
): Card[] {
  if (options?.isRevealTurn || player.revealed) {
    return selectedCard ? [selectedCard] : []
  }

  if (gameState?.expansions?.immortality && gameState.graftPair?.cardIds?.length) {
    const graftCards = resolveGraftCards(gameState, player)
    if (graftCards.length > 0) return graftCards
    return findPlayerCardsByIds(player, gameState.graftPair.cardIds)
  }

  return selectedCard ? [selectedCard] : []
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

/** True when the player can pay a discard cost from hand. */
export function canPayDiscardCost(player: Player, discardCount: number): boolean {
  return player.handCount >= discardCount
}

export function validateDiscardCostSelection(
  player: Player,
  discardCount: number,
  cardIds: number[]
): boolean {
  if (player.handCount < discardCount) return false
  if (cardIds.length !== discardCount) return false
  if (new Set(cardIds).size !== cardIds.length) return false
  return true
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
      return { playable: false, reason: '' }
    }
    return { playable: true }
  }
}
