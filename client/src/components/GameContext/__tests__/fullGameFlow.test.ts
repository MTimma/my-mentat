import { describe, expect, it } from 'vitest'
import { STARTING_DECK } from '../../../data/cards'
import { CONFLICTS } from '../../../data/conflicts'
import { GamePhase } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import {
  beginPlayerTurns,
  claimAllPendingRewards,
  getBaseTestState,
  makePlayer,
} from './_helpers'

describe('Full base game flow — multi-player round', () => {
  it('2p: both reveal → combat resolve → next round with recall', () => {
    const dagger = STARTING_DECK.find(c => c.name === 'Dagger')!

    let s = getBaseTestState(undefined, { players: 2 })
    const round1 = s.currentRound
    const fp0 = s.firstPlayerMarker

    s = beginPlayerTurns(s, CONFLICTS[0].id)
    s = {
      ...s,
      players: s.players.map(p => ({
        ...p,
        agents: 0,
        deck: [dagger],
        handCount: 1,
        revealed: false,
      })),
      activePlayerId: 0,
    }

    for (const pid of [0, 1]) {
      s = { ...s, activePlayerId: pid }
      s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: pid, cardIds: [dagger.id] })
      s = claimAllPendingRewards(s, pid)
      s = applyGameAction(s, { type: 'END_TURN', playerId: pid })
    }

    expect([GamePhase.COMBAT, GamePhase.COMBAT_REWARDS]).toContain(s.phase)

    if (s.phase === GamePhase.COMBAT) {
      for (let i = 0; i < 4; i++) {
        if (s.phase !== GamePhase.COMBAT) break
        s = applyGameAction(s, { type: 'PASS_COMBAT', playerId: s.activePlayerId })
      }
    }
    if (s.phase === GamePhase.COMBAT_REWARDS || s.phase === GamePhase.COMBAT) {
      s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    }

    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.currentRound).toBe(round1 + 1)
    expect(s.firstPlayerMarker).toBe((fp0 + 1) % 2)
    expect(Object.keys(s.occupiedSpaces).length).toBe(0)
    for (const p of s.players) {
      expect(p.handCount).toBe(5)
      expect(p.revealed).toBe(false)
    }
  })

  it('2p combat with troops awards conflict rewards then advances round', () => {
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: CONFLICTS[0],
      combatStrength: { 0: 4, 1: 2 },
      players: [makePlayer(0), makePlayer(1)],
    }
    const vpBefore = s.players[0].victoryPoints
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].victoryPoints).toBeGreaterThan(vpBefore)
    expect(s.phase).toBe(GamePhase.ROUND_START)
  })
})
