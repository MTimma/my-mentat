import type { GameState, IntrigueCard } from '../types/GameTypes'
import { GamePhase, IntrigueCardType } from '../types/GameTypes'
import { getTotalVictoryPoints } from './influenceVictoryPoints'

export interface EndgameApplyItem {
  playerId: number
  cardId: number
}

export function intrigueCardHasEndgameEffect(card: IntrigueCard): boolean {
  return Boolean(
    card.playEffect?.some(effect => {
      if (!effect.reward) return false
      if (effect.phase) {
        const phases = Array.isArray(effect.phase) ? effect.phase : [effect.phase]
        return phases.includes(GamePhase.END_GAME)
      }
      return card.type === IntrigueCardType.ENDGAME
    })
  )
}

/** Draw from the top of the intrigue deck (stored with top at end of the array). */
export function drawIntrigueCardsFromDeck(
  deck: IntrigueCard[],
  count: number
): { drawn: IntrigueCard[]; remaining: IntrigueCard[] } {
  if (count <= 0) return { drawn: [], remaining: deck }
  const drawn = deck.slice(-count)
  const remaining = deck.slice(0, Math.max(0, deck.length - count))
  return { drawn, remaining }
}

export function resolveEndgameWinners(state: GameState): number[] {
  const maxVp = Math.max(...state.players.map(p => getTotalVictoryPoints(p, state)))
  let contenders = state.players.filter(p => getTotalVictoryPoints(p, state) === maxVp)
  if (contenders.length <= 1) return contenders.map(p => p.id)

  const spiceWithBonus = (p: (typeof contenders)[number]) =>
    p.spice + (state.endgameTiebreakerSpice?.[p.id] || 0)
  const maxSpice = Math.max(...contenders.map(spiceWithBonus))
  contenders = contenders.filter(p => spiceWithBonus(p) === maxSpice)
  if (contenders.length <= 1) return contenders.map(p => p.id)

  const maxSolari = Math.max(...contenders.map(p => p.solari))
  contenders = contenders.filter(p => p.solari === maxSolari)
  if (contenders.length <= 1) return contenders.map(p => p.id)

  const maxWater = Math.max(...contenders.map(p => p.water))
  contenders = contenders.filter(p => p.water === maxWater)
  if (contenders.length <= 1) return contenders.map(p => p.id)

  const maxTroops = Math.max(...contenders.map(p => p.troops))
  contenders = contenders.filter(p => p.troops === maxTroops)
  return contenders.map(p => p.id)
}

export function endgameRevealIncomplete(state: GameState): boolean {
  if (state.phase !== GamePhase.END_GAME || state.endgameWinners) return false
  const done = state.endgameRevealDonePlayers ?? new Set<number>()
  return !state.players.every(p => done.has(p.id))
}

export function getNextEndgameRevealPlayerId(
  state: GameState,
  afterPlayerId: number
): number | null {
  const { players } = state
  const done = state.endgameRevealDonePlayers ?? new Set<number>()
  const startIdx = players.findIndex(p => p.id === afterPlayerId)
  if (startIdx < 0) return null

  for (let i = 1; i <= players.length; i++) {
    const idx = (startIdx + i) % players.length
    const player = players[idx]
    if (!done.has(player.id)) return player.id
  }
  return null
}

/**
 * Apply a player's manual endgame intrigue reveal selection.
 * Non-endgame cards are discarded; endgame-effect cards are queued for application.
 */
export function revealEndgameIntrigueSelection(
  state: GameState,
  playerId: number,
  selectedCards: IntrigueCard[]
): {
  state: GameState
  applyQueue: EndgameApplyItem[]
} {
  const player = state.players.find(p => p.id === playerId)
  if (!player || selectedCards.length !== player.intrigueCount) {
    return { state, applyQueue: [] }
  }

  const selectedIds = new Set(selectedCards.map(c => c.id))
  const intrigueDeck = state.intrigueDeck.filter(c => !selectedIds.has(c.id))
  let intrigueDiscard = [...state.intrigueDiscard]
  const applyQueue: EndgameApplyItem[] = []

  for (const card of selectedCards) {
    if (intrigueCardHasEndgameEffect(card)) {
      applyQueue.push({ playerId, cardId: card.id })
    } else {
      intrigueDiscard = [...intrigueDiscard, card]
    }
  }

  const players = state.players.map(p =>
    p.id === playerId ? { ...p, intrigueCount: 0 } : p
  )

  return {
    state: {
      ...state,
      players,
      intrigueDeck,
      intrigueDiscard,
      endgameRevealedIntrigue: {
        ...(state.endgameRevealedIntrigue ?? {}),
        [playerId]: selectedCards,
      },
    },
    applyQueue,
  }
}

/**
 * Reveal every intrigue still held at endgame. Non-endgame cards are discarded immediately;
 * endgame-effect cards are queued for application (may require player choices).
 * @deprecated Prefer manual reveal via REVEAL_ENDGAME_INTRIGUE during play.
 */
export function revealAllEndgameIntrigue(state: GameState): {
  state: GameState
  revealedByPlayer: Record<number, IntrigueCard[]>
  applyQueue: EndgameApplyItem[]
} {
  let intrigueDeck = [...state.intrigueDeck]
  let intrigueDiscard = [...state.intrigueDiscard]
  const revealedByPlayer: Record<number, IntrigueCard[]> = {}
  const applyQueue: EndgameApplyItem[] = []
  let players = state.players.map(p => ({ ...p }))

  const playerIds = state.players.map(
    (_, index) => state.players[(state.firstPlayerMarker + index) % state.players.length].id
  )

  for (const playerId of playerIds) {
    const player = players.find(p => p.id === playerId)
    if (!player || player.intrigueCount < 1) continue

    const { drawn, remaining } = drawIntrigueCardsFromDeck(intrigueDeck, player.intrigueCount)
    intrigueDeck = remaining
    revealedByPlayer[playerId] = drawn

    for (const card of drawn) {
      if (intrigueCardHasEndgameEffect(card)) {
        applyQueue.push({ playerId, cardId: card.id })
      } else {
        intrigueDiscard = [...intrigueDiscard, card]
      }
    }

    players = players.map(p => (p.id === playerId ? { ...p, intrigueCount: 0 } : p))
  }

  return {
    state: {
      ...state,
      phase: GamePhase.END_GAME,
      players,
      intrigueDeck,
      intrigueDiscard,
    },
    revealedByPlayer,
    applyQueue,
  }
}

export function findRevealedEndgameCard(
  state: GameState,
  playerId: number,
  cardId: number
): IntrigueCard | undefined {
  return state.endgameRevealedIntrigue?.[playerId]?.find(c => c.id === cardId)
}

export function endgameHasPendingWork(state: GameState): boolean {
  if (state.phase !== GamePhase.END_GAME || state.endgameWinners) return false
  if (endgameRevealIncomplete(state)) return false
  if ((state.endgameApplyQueue?.length ?? 0) > 0) return true
  if ((state.currTurn?.pendingChoices?.length ?? 0) > 0) return true
  return state.pendingRewards.some(r => !r.disabled)
}
