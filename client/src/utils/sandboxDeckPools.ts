import { Card } from '../types/GameTypes'

export type SandboxCardPool = 'imperium' | 'arrakisLiaison' | 'spiceMustFlow' | 'foldspace'

export interface SandboxDeckPools {
  imperiumRowDeck: Card[]
  arrakisLiaisonDeck: Card[]
  spiceMustFlowDeck: Card[]
  foldspaceDeck: Card[]
}

export function sandboxCardPoolForId(cardId: number): SandboxCardPool {
  if (cardId >= 201 && cardId <= 299) return 'arrakisLiaison'
  if (cardId >= 301 && cardId <= 399) return 'spiceMustFlow'
  if (cardId >= 401 && cardId <= 499) return 'foldspace'
  return 'imperium'
}

function countCardIds(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>()
  cards.forEach(card => counts.set(card.id, (counts.get(card.id) ?? 0) + 1))
  return counts
}

/** Split a card pool into a selected pile (discard/trash) and the remainder (deck). */
export function splitCardPool(
  pool: Card[],
  selected: Card[]
): { inPile: Card[]; remainder: Card[] } {
  const selectedCounts = countCardIds(selected)
  const inPile: Card[] = []
  const remainder: Card[] = []
  for (const card of pool) {
    const remaining = selectedCounts.get(card.id) ?? 0
    if (remaining > 0) {
      inPile.push(card)
      selectedCounts.set(card.id, remaining - 1)
    } else {
      remainder.push(card)
    }
  }
  return { inPile, remainder }
}

export function playerOwnedCards(player: {
  deck: Card[]
  discardPile: Card[]
  trash: Card[]
}): Card[] {
  return [...player.deck, ...player.discardPile, ...player.trash]
}

/** Move cards between a player deck and the shared sandbox pools (imperium + reserve decks). */
export function applySandboxDeckEdit(
  pools: SandboxDeckPools,
  oldDeck: Card[],
  newDeck: Card[]
): SandboxDeckPools {
  const next: Record<SandboxCardPool, Card[]> = {
    imperium: [...pools.imperiumRowDeck],
    arrakisLiaison: [...pools.arrakisLiaisonDeck],
    spiceMustFlow: [...pools.spiceMustFlowDeck],
    foldspace: [...pools.foldspaceDeck],
  }

  const oldCounts = countCardIds(oldDeck)
  const newCounts = countCardIds(newDeck)

  const removed: Card[] = []
  oldDeck.forEach(card => {
    const surplus = (oldCounts.get(card.id) ?? 0) - (newCounts.get(card.id) ?? 0)
    if (surplus > 0 && removed.filter(r => r.id === card.id).length < surplus) {
      removed.push(card)
    }
  })

  newDeck.forEach(card => {
    const added = (newCounts.get(card.id) ?? 0) - (oldCounts.get(card.id) ?? 0)
    for (let i = 0; i < added; i++) {
      const poolName = sandboxCardPoolForId(card.id)
      const idx = next[poolName].findIndex(poolCard => poolCard.id === card.id)
      if (idx >= 0) next[poolName].splice(idx, 1)
    }
  })

  removed.forEach(card => {
    next[sandboxCardPoolForId(card.id)].push(card)
  })

  return {
    imperiumRowDeck: next.imperium,
    arrakisLiaisonDeck: next.arrakisLiaison,
    spiceMustFlowDeck: next.spiceMustFlow,
    foldspaceDeck: next.foldspace,
  }
}
