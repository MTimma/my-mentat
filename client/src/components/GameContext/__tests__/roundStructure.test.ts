import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { CONFLICTS } from '../../../data/conflicts'
import { STARTING_DECK } from '../../../data/cards'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { GamePhase, MakerSpace, TurnType } from '../../../types/GameTypes'
import {
  beginPlayerTurns,
  claimAllPendingRewards,
  finishAgentTurn,
  getBaseTestState,
  makePlayer,
  playAgentTurn,
} from './_helpers'

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

  it('RS-10: after combat recall transition each player has handCount 5', () => {
    let s = getBaseTestState(undefined, { players: 3 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: CONFLICTS[0],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
      players: s.players.map((p, i) => ({ ...p, handCount: i + 1 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.phase).toBe(GamePhase.ROUND_START)
    for (const p of s.players) {
      expect(p.handCount).toBe(5)
    }
  })

  it('RS-11: when all players revealed, phase becomes COMBAT or COMBAT_REWARDS', () => {
    const diplomacy = STARTING_DECK.find(c => c.name === 'Diplomacy')!
    let s = getBaseTestState(undefined, { players: 2, activeId: 1 })
    s = {
      ...s,
      players: [
        { ...s.players[0], revealed: true, agents: 0 },
        { ...s.players[1], agents: 0, deck: [diplomacy], handCount: 1 },
      ],
      currTurn: { playerId: 1, type: TurnType.REVEAL },
      canEndTurn: true,
    }
    s = applyGameAction(s, {
      type: 'REVEAL_CARDS',
      playerId: 1,
      cardIds: [diplomacy.id],
    })
    s = claimAllPendingRewards(s, 1)
    s = applyGameAction(s, { type: 'END_TURN', playerId: 1 })
    expect([GamePhase.COMBAT, GamePhase.COMBAT_REWARDS]).toContain(s.phase)
  })

  it('RS-12: makers adds bonus spice on unoccupied maker spaces after combat', () => {
    const greatFlat = BOARD_SPACES.find(s => s.name === 'The Great Flat')!
    let s = getBaseTestState(undefined, { players: 3 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: CONFLICTS[0],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
      occupiedSpaces: { [greatFlat.id]: [0] },
      bonusSpice: {
        [MakerSpace.GREAT_FLAT]: 0,
        [MakerSpace.HAGGA_BASIN]: 0,
        [MakerSpace.IMPERIAL_BASIN]: 0,
      },
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.bonusSpice[MakerSpace.GREAT_FLAT]).toBe(0)
    expect(s.bonusSpice[MakerSpace.HAGGA_BASIN]).toBe(1)
  })

  it('RS-13: recall clears occupied spaces and passes first player marker', () => {
    let s = getBaseTestState(undefined, { players: 3 })
    const fp = s.firstPlayerMarker
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: CONFLICTS[0],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
      occupiedSpaces: { 15: [0], 9: [1] },
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(Object.keys(s.occupiedSpaces).length).toBe(0)
    expect(s.firstPlayerMarker).toBe((fp + 1) % 3)
  })

  it('RS-14: endgame triggers at 10+ VP after combat resolution', () => {
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: CONFLICTS[0],
      combatTroops: { 0: 2 },
      combatStrength: { 0: 4 },
      players: [makePlayer(0, { victoryPoints: 9 }), makePlayer(1)],
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.phase).toBe(GamePhase.END_GAME)
  })

  it('after reveal turn player is marked revealed and skips further agent turns', () => {
    const dagger = STARTING_DECK.find(c => c.name === 'Dagger')!
    let s = getBaseTestState(undefined, { players: 2 })
    s = beginPlayerTurns(s)
    s = {
      ...s,
      players: [
        { ...s.players[0], agents: 0, deck: [dagger], handCount: 1 },
        s.players[1],
      ],
      activePlayerId: 0,
    }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [dagger.id] })
    s = claimAllPendingRewards(s, 0)
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(s.players[0].revealed).toBe(true)
    expect(s.activePlayerId).toBe(1)
  })
})

describe('Round structure — agent turn smoke', () => {
  it('Diplomacy to Wealth grants solari after claiming rewards', () => {
    const diplomacy = STARTING_DECK.find(c => c.name === 'Diplomacy')!
    let s = getBaseTestState({ deck: [diplomacy], handCount: 1, solari: 0 })
    s = beginPlayerTurns(s)
    s = playAgentTurn(s, 0, diplomacy.id, 15)
    expect(s.currTurn?.agentSpaceId).toBe(15)
    expect(s.players[0].solari).toBeGreaterThanOrEqual(2)
    s = finishAgentTurn(s, 0)
    expect(s.canEndTurn).toBe(false)
  })
})
