import type { GameState, IntrigueCard, Player } from '../types/GameTypes'
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

/** Spice counted at endgame: held spice plus tiebreaker spice (intrigue, Chaumurky). */
function endgameSpice(state: GameState, player: Player): number {
  return player.spice + (state.endgameTiebreakerSpice?.[player.id] || 0)
}

/**
 * Endgame standing. Negative when `a` ranks ahead of `b`.
 * Order: total VP, spice, Solari, water, garrison troops.
 * Returns 0 when those all match (seat order is left to the caller).
 */
export function compareEndgameStanding(state: GameState, a: Player, b: Player): number {
  const byVp = getTotalVictoryPoints(b, state) - getTotalVictoryPoints(a, state)
  if (byVp !== 0) return byVp
  const bySpice = endgameSpice(state, b) - endgameSpice(state, a)
  if (bySpice !== 0) return bySpice
  if (b.solari !== a.solari) return b.solari - a.solari
  if (b.water !== a.water) return b.water - a.water
  return b.troops - a.troops
}

export function resolveEndgameWinners(state: GameState): number[] {
  if (state.players.length === 0) return []
  const ranked = [...state.players].sort((a, b) => compareEndgameStanding(state, a, b))
  const best = ranked[0]
  return ranked.filter(p => compareEndgameStanding(state, p, best) === 0).map(p => p.id)
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
