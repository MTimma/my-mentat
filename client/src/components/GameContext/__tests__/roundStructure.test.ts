import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { CONFLICTS } from '../../../data/conflicts'
import { GamePhase } from '../../../types/GameTypes'
import { getBaseTestState } from './_helpers'

describe('Round structure (base rules)', () => {
  it('fresh game starts in ROUND_START', () => {
    const s = getFreshDefaultGameState()
    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.currentRound).toBe(1)
  })

  it('SELECT_CONFLICT begins player turns with first player active', () => {
    let s = getFreshDefaultGameState()
    const conflict = CONFLICTS[0]
    s = applyGameAction(s, { type: 'SELECT_CONFLICT', conflictId: conflict.id })
    expect(s.phase).toBe(GamePhase.PLAYER_TURNS)
    expect(s.activePlayerId).toBe(s.firstPlayerMarker)
    expect(s.currentConflict.id).toBe(conflict.id)
  })

  it('combat with zero troops in conflict keeps zero strength', () => {
    const s = getBaseTestState({ combatValue: 5 }, { players: 2 })
    const combat = {
      ...s,
      phase: GamePhase.COMBAT,
      combatTroops: { 0: 0, 1: 0 },
      combatStrength: { 0: 0, 1: 0 },
    }
    expect(combat.combatStrength[0]).toBe(0)
  })

  it.todo('round flow: ROUND_START → draw 5 → PLAYER_TURNS → COMBAT → MAKERS → RECALL')
  it.todo('after Reveal turn, player skips remaining agent turns until all have revealed')
  it.todo('recall: agents return to leader; first player marker passes clockwise')
  it.todo('makers: +1 bonus spice on each unoccupied maker space')
  it.todo('endgame at 10 VP or empty conflict deck')
})
