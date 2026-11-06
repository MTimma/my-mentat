import { describe, expect, it } from 'vitest'
import { CONFLICTS } from '../../../data/conflicts'
import { GamePhase } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { continueAllConflictRewards, getBaseTestState } from './_helpers'
import { endgameRevealIncomplete } from '../../../utils/endgameResolution'

const skirmish902 = CONFLICTS.find(c => c.id === 902)!

describe('endgame flow repro', () => {
  it('triggers endgame at end of combat and reveals every player before finishing', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      currentConflict: skirmish902,
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 10, 1: 8, 2: 6, 3: 0 },
      players: s.players.map((p, i) => ({
        ...p,
        solari: 0,
        victoryPoints: i === 0 ? 10 : 0,
        intrigueCount: 1,
      })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    s = continueAllConflictRewards(s)

    expect(s.phase).toBe(GamePhase.END_GAME)
    expect(s.endgameWinners).toBeNull()

    const revealOrder: number[] = []
    let guard = 0
    while (endgameRevealIncomplete(s) && guard++ < 10) {
      const active = s.players.find(p => p.id === s.activePlayerId)!
      revealOrder.push(active.id)
      const cardIds = s.intrigueDeck.slice(0, active.intrigueCount).map(c => c.id)
      s = applyGameAction(s, { type: 'REVEAL_ENDGAME_INTRIGUE', playerId: active.id, cardIds })
    }

    expect(revealOrder).toEqual([1, 2, 3, 0])
    expect(s.endgameWinners).toEqual([0])
  })
})
