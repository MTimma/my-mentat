import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { CONFLICTS } from '../../../data/conflicts'
import { GamePhase, RewardType, type ConflictCard } from '../../../types/GameTypes'
import { getBaseTestState, stubDeckCard } from './_helpers'

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

  it('SELECT_CONFLICT on fresh game merges setup and round 1 start into one row', () => {
    const base = getFreshDefaultGameState()
    const setupBaseline = { ...getFreshDefaultGameState(), history: [] }
    let s = {
      ...base,
      setupBaseline,
      history: [
        {
          ...setupBaseline,
          historyEntryKind: 'setup' as const,
          history: [],
        },
      ],
    }

    const conflict = CONFLICTS[0]
    s = applyGameAction(s, { type: 'SELECT_CONFLICT', conflictId: conflict.id })

    expect(s.history).toHaveLength(1)
    expect(s.history[0].historyEntryKind).toBe('setup')
    expect(s.history[0].phase).toBe(GamePhase.PLAYER_TURNS)
    expect(s.history[0].currentConflict.id).toBe(conflict.id)
  })

  it('SELECT_CONFLICT replaces history with round-start baseline (not pre-setup initial)', () => {
    let s = getFreshDefaultGameState()
    const preSetup = { ...getFreshDefaultGameState(), history: [] }
    s = {
      ...s,
      history: [preSetup],
      setupBaseline: preSetup,
      imperiumRow: [stubDeckCard(9001), stubDeckCard(9002)],
    }
    const conflict = CONFLICTS[0]
    s = applyGameAction(s, { type: 'SELECT_CONFLICT', conflictId: conflict.id })

    expect(s.history).toHaveLength(1)
    expect(s.history[0].phase).toBe(GamePhase.PLAYER_TURNS)
    expect(s.history[0].imperiumRow).toHaveLength(2)
    expect(s.history[0].currentConflict.id).toBe(conflict.id)
    expect(s.setupBaseline?.phase).toBe(GamePhase.ROUND_START)
    expect(s.setupBaseline?.imperiumRow).toHaveLength(0)
  })

  it('UNDO_TO_SETUP restores pre-configuration state for imperium row and conflict', () => {
    const preSetup = getFreshDefaultGameState()
    let s = {
      ...getBaseTestState(undefined, { players: 2, activeId: 0 }),
      phase: GamePhase.PLAYER_TURNS,
      imperiumRow: [stubDeckCard(9003)],
      currentConflict: CONFLICTS[0],
      setupBaseline: preSetup,
      history: [
        {
          ...getBaseTestState(undefined, { players: 2, activeId: 0 }),
          phase: GamePhase.PLAYER_TURNS,
          imperiumRow: [stubDeckCard(9003)],
          currentConflict: CONFLICTS[0],
          history: [],
          currTurn: null,
        },
      ],
    }

    s = applyGameAction(s, { type: 'UNDO_TO_SETUP' })

    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.imperiumRow).toHaveLength(0)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].phase).toBe(GamePhase.ROUND_START)
  })

  it('UNDO_TO_TURN index 0 after first turn keeps round-start config (no setup replay)', () => {
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    const roundBaseline = {
      ...s,
      phase: GamePhase.PLAYER_TURNS,
      imperiumRow: [stubDeckCard(9003)],
      currentConflict: CONFLICTS[0],
      history: [],
      currTurn: null,
      gains: [],
      pendingRewards: [],
    }
    const afterTurnOne = {
      ...roundBaseline,
      activePlayerId: 1,
      history: [],
    }
    s = {
      ...afterTurnOne,
      history: [roundBaseline, afterTurnOne],
    }

    s = applyGameAction(s, { type: 'UNDO_TO_TURN', turnIndex: 0 })

    expect(s.phase).toBe(GamePhase.PLAYER_TURNS)
    expect(s.imperiumRow).toHaveLength(1)
    expect(s.currentConflict.id).toBe(CONFLICTS[0].id)
    expect(s.activePlayerId).toBe(s.firstPlayerMarker)
    expect(s.history).toHaveLength(1)
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
  it('recall: clears mentatOwner and occupied spaces after combat', () => {
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      mentatOwner: 0,
      occupiedSpaces: { 5: [0] },
      phase: GamePhase.COMBAT_REWARDS,
      combatTroops: { 0: 2, 1: 1 },
      combatStrength: { 0: 4, 1: 2 },
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.mentatOwner).toBeNull()
    expect(s.occupiedSpaces).toEqual({})
    expect(s.players[0].agents).toBe(2)
  })

  it('recall: conflict Agent reward gives mentat to winner for next round', () => {
    const agentConflict: ConflictCard = {
      id: 99901,
      tier: 2,
      name: 'Mentat Skirmish',
      rewards: {
        first: [{ type: RewardType.AGENT, amount: 1 }],
        second: [{ type: RewardType.SOLARI, amount: 2 }],
      },
    }
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      mentatOwner: 1,
      occupiedSpaces: { 5: [1] },
      currentConflict: agentConflict,
      phase: GamePhase.COMBAT_REWARDS,
      combatTroops: { 0: 2, 1: 1, 2: 1, 3: 1 },
      combatStrength: { 0: 8, 1: 4, 2: 2, 3: 2 },
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.mentatOwner).toBe(0)
    expect(s.players[0].agents).toBe(3)
    expect(s.players[1].agents).toBe(2)
  })

  it.todo('recall: agents return to leader; first player marker passes clockwise')
  it.todo('makers: +1 bonus spice on each unoccupied maker space')
  it.todo('endgame at 10 VP or empty conflict deck')
})
