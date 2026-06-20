import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { CONFLICTS } from '../../../data/conflicts'
import { LEADERS } from '../../../data/leaders'
import { TechTileId } from '../../../data/techTiles'
import { buildIxBoardFromFaceUpTiles, buildIxBoardFromSandboxStackTops } from '../riseOfIxReducer'
import { ControlMarkerType, FactionType, GamePhase, NO_EXPANSIONS, type GameState } from '../../../types/GameTypes'
import { makePlayer, stubDeckCard } from './_helpers'

function getSandboxSetupState(): GameState {
  const s = getFreshDefaultGameState()
  return {
    ...s,
    sandboxSetup: true,
    phase: GamePhase.ROUND_START,
    players: [makePlayer(0), makePlayer(1)],
    imperiumRow: [],
    imperiumRowDeck: [
      stubDeckCard(9001),
      stubDeckCard(9002),
      stubDeckCard(9003),
      stubDeckCard(9004),
      stubDeckCard(9005),
      stubDeckCard(9006),
    ],
    history: [{ ...s, history: [], historyEntryKind: 'setup' }],
  }
}

describe('Sandbox setup turn', () => {
  it('SANDBOX_SET_IMPERIUM_ROW picks from deck and keeps a single setup history row', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IMPERIUM_ROW',
      cardIds: [9001, 9002, 9003, 9004, 9005],
    })

    expect(s.imperiumRow.map(c => c.id)).toEqual([9001, 9002, 9003, 9004, 9005])
    expect(s.imperiumRowDeck.map(c => c.id)).toEqual([9006])
    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.sandboxSetup).toBe(true)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].historyEntryKind).toBe('setup')
    expect(s.history[0].imperiumRow).toHaveLength(5)
  })

  it('SANDBOX_SET_IMPERIUM_ROW returns previously picked row cards to the pool', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IMPERIUM_ROW',
      cardIds: [9001, 9002, 9003, 9004, 9005],
    })
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IMPERIUM_ROW',
      cardIds: [9006, 9002, 9003, 9004, 9005],
    })

    expect(s.imperiumRow.map(c => c.id)).toEqual([9006, 9002, 9003, 9004, 9005])
    expect(s.imperiumRowDeck.map(c => c.id)).toEqual([9001])
  })

  it('SANDBOX_SET_CONFLICT sets the conflict without starting player turns', () => {
    let s = getSandboxSetupState()
    const conflict = CONFLICTS[2]
    s = applyGameAction(s, { type: 'SANDBOX_SET_CONFLICT', conflictId: conflict.id })

    expect(s.currentConflict.id).toBe(conflict.id)
    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.sandboxSetup).toBe(true)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].currentConflict.id).toBe(conflict.id)
  })

  it('SANDBOX_UPDATE_PLAYER patches resources and leader', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 1,
      patch: { spice: 7, water: 0, victoryPoints: 4 },
    })

    expect(s.players[1].spice).toBe(7)
    expect(s.players[1].water).toBe(0)
    expect(s.players[1].victoryPoints).toBe(4)
    expect(s.players[0].spice).toBe(10)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].players[1].spice).toBe(7)
  })

  it('SANDBOX_UPDATE_PLAYER swaps Beast starting spice/solari when leader changes', () => {
    const beast = LEADERS.find(l => l.name.includes('Beast'))!
    const other = LEADERS.find(l => !l.name.includes('Beast'))!
    let s = getSandboxSetupState()
    s = {
      ...s,
      players: [
        makePlayer(0, { leader: beast, spice: 1, solari: 1 }),
        makePlayer(1),
      ],
    }

    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 0,
      patch: { leader: other },
    })
    expect(s.players[0].leader.name).toBe(other.name)
    expect(s.players[0].spice).toBe(0)
    expect(s.players[0].solari).toBe(0)

    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 0,
      patch: { leader: beast },
    })
    expect(s.players[0].spice).toBe(1)
    expect(s.players[0].solari).toBe(1)
  })

  it('SANDBOX_UPDATE_PLAYER leader change includes explicit spice/solari without double-adjusting', () => {
    const beast = LEADERS.find(l => l.name.includes('Beast'))!
    const other = LEADERS.find(l => !l.name.includes('Beast'))!
    let s = getSandboxSetupState()
    s = {
      ...s,
      players: [makePlayer(0, { leader: beast, spice: 1, solari: 1 })],
    }

    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 0,
      patch: { leader: other, spice: 0, solari: 0 },
    })
    expect(s.players[0].spice).toBe(0)
    expect(s.players[0].solari).toBe(0)
  })

  it('SANDBOX_UPDATE_PLAYER deck edits swap cards with the imperium deck pool', () => {
    let s = getSandboxSetupState()
    const oldCard = s.players[0].deck[0]
    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 0,
      patch: { deck: [stubDeckCard(9001)] },
    })

    expect(s.players[0].deck.map(c => c.id)).toEqual([9001])
    expect(s.imperiumRowDeck.some(c => c.id === 9001)).toBe(false)
    expect(s.imperiumRowDeck.some(c => c.id === oldCard.id)).toBe(true)
  })

  it('SANDBOX_UPDATE_PLAYER moving cards to discard does not return them to the imperium pool', () => {
    let s = getSandboxSetupState()
    const deck = s.players[0].deck
    const toDiscard = deck[0]
    const remaining = deck.slice(1)
    const poolSizeBefore = s.imperiumRowDeck.length

    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 0,
      patch: { deck: remaining, discardPile: [toDiscard] },
    })

    expect(s.players[0].deck.map(c => c.id)).toEqual(remaining.map(c => c.id))
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([toDiscard.id])
    expect(s.imperiumRowDeck).toHaveLength(poolSizeBefore)
    expect(s.imperiumRowDeck.some(c => c.id === toDiscard.id)).toBe(false)
  })

  it('SANDBOX_UPDATE_PLAYER toggles high council seat and seat order', () => {
    let s = getSandboxSetupState()

    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 1,
      patch: { hasHighCouncilSeat: true },
    })
    expect(s.players[1].hasHighCouncilSeat).toBe(true)
    expect(s.highCouncilSeatOrder).toEqual([1])

    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 1,
      patch: { hasHighCouncilSeat: false },
    })
    expect(s.players[1].hasHighCouncilSeat).toBe(false)
    expect(s.highCouncilSeatOrder).toEqual([])
  })

  it('SANDBOX_COMMIT_SETUP starts player turns with a single setup row', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IMPERIUM_ROW',
      cardIds: [9001, 9002, 9003, 9004, 9005],
    })
    s = applyGameAction(s, { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[0].id })
    s = applyGameAction(s, { type: 'SANDBOX_COMMIT_SETUP' })

    expect(s.sandboxSetup).toBe(false)
    expect(s.phase).toBe(GamePhase.PLAYER_TURNS)
    expect(s.activePlayerId).toBe(s.firstPlayerMarker)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].historyEntryKind).toBe('setup')
    expect(s.history[0].imperiumRow).toHaveLength(5)
    expect(s.history[0].currentConflict.id).toBe(CONFLICTS[0].id)
  })

  it('UNDO_TO_SETUP after commit reopens sandbox setup with the committed configuration', () => {
    const baseline = { ...getSandboxSetupState(), history: [] }
    let s = applyGameAction(
      { ...getSandboxSetupState(), setupBaseline: baseline },
      { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[0].id }
    )
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IMPERIUM_ROW',
      cardIds: [9001, 9002, 9003, 9004, 9005],
    })
    s = applyGameAction(s, { type: 'SANDBOX_COMMIT_SETUP' })
    s = applyGameAction(s, { type: 'UNDO_TO_SETUP' })

    expect(s.sandboxSetup).toBe(true)
    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.imperiumRow.map(c => c.id)).toEqual([9001, 9002, 9003, 9004, 9005])
    expect(s.currentConflict.id).toBe(CONFLICTS[0].id)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].imperiumRow).toHaveLength(5)
  })

  it('UNDO_TO_SETUP after commit preserves sandbox round/turn position', () => {
    const baseline = { ...getSandboxSetupState(), history: [] }
    let s = applyGameAction(
      { ...getSandboxSetupState(), setupBaseline: baseline },
      {
        type: 'SANDBOX_SET_IMPERIUM_ROW',
        cardIds: [9001, 9002, 9003, 9004, 9005],
      }
    )
    s = applyGameAction(s, { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[0].id })
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_POSITION',
      round: 4,
      playerTurn: 7,
    })
    s = applyGameAction(s, { type: 'SANDBOX_COMMIT_SETUP' })
    s = applyGameAction(s, { type: 'UNDO_TO_SETUP' })

    expect(s.sandboxSetupPosition).toEqual({ round: 4, playerTurn: 7 })
  })

  it('UNDO_TO_TURN index 0 after commit reopens sandbox setup editing', () => {
    const baseline = { ...getSandboxSetupState(), history: [] }
    let s = applyGameAction(
      { ...getSandboxSetupState(), setupBaseline: baseline },
      {
        type: 'SANDBOX_SET_IMPERIUM_ROW',
        cardIds: [9001, 9002, 9003, 9004, 9005],
      }
    )
    s = applyGameAction(s, { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[0].id })
    s = applyGameAction(s, { type: 'SANDBOX_COMMIT_SETUP' })
    s = applyGameAction(s, { type: 'UNDO_TO_TURN', turnIndex: 0 })

    expect(s.sandboxSetup).toBe(true)
    expect(s.imperiumRow.map(c => c.id)).toEqual([9001, 9002, 9003, 9004, 9005])
    expect(s.currentConflict.id).toBe(CONFLICTS[0].id)
  })

  it('SANDBOX_SET_PLAYER_INFLUENCE patches faction influence for one player', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_PLAYER_INFLUENCE',
      playerId: 1,
      faction: FactionType.EMPEROR,
      value: 3,
    })

    expect(s.factionInfluence[FactionType.EMPEROR][1]).toBe(3)
    expect(s.factionInfluence[FactionType.EMPEROR][0] ?? 0).toBe(0)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].factionInfluence[FactionType.EMPEROR][1]).toBe(3)
  })

  it('SANDBOX_SET_PLAYER_INFLUENCE clamps influence to the game maximum of 6', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_PLAYER_INFLUENCE',
      playerId: 0,
      faction: FactionType.FREMEN,
      value: 14,
    })

    expect(s.factionInfluence[FactionType.FREMEN][0]).toBe(6)
  })

  it('SANDBOX_SET_CONTROL_MARKER assigns conquerable space control', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_CONTROL_MARKER',
      space: ControlMarkerType.ARRAKIN,
      playerId: 1,
    })

    expect(s.controlMarkers[ControlMarkerType.ARRAKIN]).toBe(1)
    expect(s.controlMarkers[ControlMarkerType.CARTHAG]).toBeNull()
    expect(s.history[0].controlMarkers[ControlMarkerType.ARRAKIN]).toBe(1)
  })

  it('SANDBOX_SET_MENTAT_OWNER assigns mentat to one player', () => {
    let s = getSandboxSetupState()

    s = applyGameAction(s, { type: 'SANDBOX_SET_MENTAT_OWNER', playerId: 1 })
    expect(s.mentatOwner).toBe(1)

    s = applyGameAction(s, { type: 'SANDBOX_SET_MENTAT_OWNER', playerId: 0 })
    expect(s.mentatOwner).toBe(0)

    s = applyGameAction(s, { type: 'SANDBOX_SET_MENTAT_OWNER', playerId: null })
    expect(s.mentatOwner).toBeNull()
  })

  it('SANDBOX_SET_POSITION stores round and turn for commit', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_POSITION',
      round: 4,
      playerTurn: 7,
    })

    expect(s.sandboxSetupPosition).toEqual({ round: 4, playerTurn: 7 })
    expect(s.history[0].sandboxSetupPosition).toEqual({ round: 4, playerTurn: 7 })
  })

  it('SANDBOX_COMMIT_SETUP applies position and imaginary round when cleared', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IMPERIUM_ROW',
      cardIds: [9001, 9002, 9003, 9004, 9005],
    })
    s = applyGameAction(s, { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[0].id })
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_POSITION',
      round: null,
      playerTurn: 5,
    })
    s = applyGameAction(s, { type: 'SANDBOX_COMMIT_SETUP' })

    expect(s.hideRoundLabel).toBe(true)
    expect(s.currentRound).toBe(1)
    expect(s.playerTurnNumberOffset).toBe(4)
    expect(s.sandboxSetupPosition).toBeUndefined()
  })

  it('SANDBOX_COMMIT_SETUP applies configured round label', () => {
    let s = getSandboxSetupState()
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IMPERIUM_ROW',
      cardIds: [9001, 9002, 9003, 9004, 9005],
    })
    s = applyGameAction(s, { type: 'SANDBOX_SET_CONFLICT', conflictId: CONFLICTS[0].id })
    s = applyGameAction(s, {
      type: 'SANDBOX_SET_POSITION',
      round: 3,
      playerTurn: null,
    })
    s = applyGameAction(s, { type: 'SANDBOX_COMMIT_SETUP' })

    expect(s.hideRoundLabel).toBe(false)
    expect(s.currentRound).toBe(3)
    expect(s.playerTurnNumberOffset).toBe(0)
  })

  it('PLAY_CARD is blocked until SANDBOX_COMMIT_SETUP', () => {
    let s = getSandboxSetupState()
    const cardId = s.players[0].deck[0]?.id
    expect(cardId).toBeDefined()
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: cardId! })

    expect(s.currTurn).toBeNull()
    expect(s.selectedCard).toBeNull()
    expect(s.sandboxSetup).toBe(true)
    expect(s.phase).toBe(GamePhase.ROUND_START)
  })

  it('sandbox actions are ignored outside the setup turn', () => {
    const s = { ...getSandboxSetupState(), sandboxSetup: false }
    const afterRow = applyGameAction(s, {
      type: 'SANDBOX_SET_IMPERIUM_ROW',
      cardIds: [9001, 9002, 9003, 9004, 9005],
    })
    const afterConflict = applyGameAction(s, {
      type: 'SANDBOX_SET_CONFLICT',
      conflictId: CONFLICTS[0].id,
    })
    const afterCommit = applyGameAction(s, { type: 'SANDBOX_COMMIT_SETUP' })

    expect(afterRow).toBe(s)
    expect(afterConflict).toBe(s)
    expect(afterCommit).toBe(s)
  })

  it('SANDBOX_SET_IX_BOARD_TOP builds three stacks with chosen face-up tiles', () => {
    let s = {
      ...getSandboxSetupState(),
      expansions: { ...NO_EXPANSIONS, riseOfIx: true },
      ixBoard: undefined,
    }
    const faceUp = [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, TechTileId.FLAGSHIP] as const

    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IX_BOARD_TOP',
      stackTops: [...faceUp],
    })

    expect(s.ixBoard?.stacks).toHaveLength(3)
    expect(s.ixBoard?.stacks.map(stack => stack[0])).toEqual([...faceUp])
    expect(s.ixBoard?.stacks.every(stack => stack.length === 6)).toBe(true)
    expect(s.sandboxSetup).toBe(true)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].ixBoard?.stacks.map(stack => stack[0])).toEqual([...faceUp])
  })

  it('SANDBOX_SET_IX_BOARD_TOP supports one empty stack when six tiles are with players', () => {
    let s = {
      ...getSandboxSetupState(),
      expansions: { ...NO_EXPANSIONS, riseOfIx: true },
      players: [
        {
          ...makePlayer(0),
          tech: [
            { id: TechTileId.CHAUMURKY, faceUp: true },
            { id: TechTileId.DETONATION_DEVICES, faceUp: true },
            { id: TechTileId.DISPOSAL_FACILITY, faceUp: true },
            { id: TechTileId.HOLOPROJECTORS, faceUp: true },
            { id: TechTileId.HOLTZMAN_ENGINE, faceUp: true },
            { id: TechTileId.INVASION_SHIPS, faceUp: true },
          ],
        },
        makePlayer(1),
      ],
    }

    s = applyGameAction(s, {
      type: 'SANDBOX_SET_IX_BOARD_TOP',
      stackTops: [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, null],
    })

    expect(s.ixBoard?.stacks.map(stack => stack[0] ?? null)).toEqual([
      TechTileId.ARTILLERY,
      TechTileId.WINDTRAPS,
      null,
    ])
    expect(s.ixBoard?.stacks[2]).toEqual([])
    expect(s.ixBoard?.stacks[0]).toHaveLength(6)
    expect(s.ixBoard?.stacks[1]).toHaveLength(6)
  })

  it('SANDBOX_SET_IX_BOARD_TOP auto-clears the board when player tech invalidates setup', () => {
    let s = {
      ...getSandboxSetupState(),
      expansions: { ...NO_EXPANSIONS, riseOfIx: true },
      ixBoard: buildIxBoardFromFaceUpTiles(
        [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, TechTileId.FLAGSHIP],
        undefined,
        () => 0
      ),
    }

    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 0,
      patch: {
        tech: Array.from({ length: 6 }, (_, index) => ({
          id: [
            TechTileId.CHAUMURKY,
            TechTileId.DETONATION_DEVICES,
            TechTileId.DISPOSAL_FACILITY,
            TechTileId.HOLOPROJECTORS,
            TechTileId.HOLTZMAN_ENGINE,
            TechTileId.INVASION_SHIPS,
          ][index],
          faceUp: true,
        })),
      },
    })

    expect(s.ixBoard).toBeUndefined()
  })

  it('SANDBOX_UPDATE_PLAYER auto-empties the board when all 18 tiles are with players', () => {
    const allTiles = Object.values(TechTileId)
    let s = {
      ...getSandboxSetupState(),
      expansions: { ...NO_EXPANSIONS, riseOfIx: true },
      players: [makePlayer(0), makePlayer(1)],
    }

    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 0,
      patch: {
        tech: allTiles.slice(0, 10).map(id => ({ id, faceUp: true })),
      },
    })
    s = applyGameAction(s, {
      type: 'SANDBOX_UPDATE_PLAYER',
      playerId: 1,
      patch: {
        tech: allTiles.slice(10).map(id => ({ id, faceUp: true })),
      },
    })

    expect(s.ixBoard?.stacks).toEqual([[], [], []])
  })

  it('SANDBOX_SET_IX_BOARD_TOP is ignored when riseOfIx is off', () => {
    const s = getSandboxSetupState()
    const after = applyGameAction(s, {
      type: 'SANDBOX_SET_IX_BOARD_TOP',
      stackTops: [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, TechTileId.FLAGSHIP],
    })
    expect(after).toBe(s)
    expect(after.ixBoard).toBeUndefined()
  })

  it('buildIxBoardFromSandboxStackTops places remaining tiles face-down per filled stack', () => {
    const board = buildIxBoardFromSandboxStackTops(
      [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, null],
      [TechTileId.CHAUMURKY, TechTileId.DETONATION_DEVICES, TechTileId.DISPOSAL_FACILITY, TechTileId.HOLOPROJECTORS, TechTileId.HOLTZMAN_ENGINE, TechTileId.INVASION_SHIPS],
      () => 0
    )
    expect(board.stacks[2]).toEqual([])
    expect(board.stacks[0]).toHaveLength(6)
    expect(board.stacks[1]).toHaveLength(6)
    const allIds = board.stacks.flat()
    expect(allIds).toHaveLength(12)
    expect(new Set(allIds).size).toBe(12)
  })

  it('buildIxBoardFromFaceUpTiles places remaining tiles face-down per stack', () => {
    const board = buildIxBoardFromFaceUpTiles(
      [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, TechTileId.FLAGSHIP],
      undefined,
      () => 0
    )
    const allIds = board.stacks.flat()
    expect(allIds).toHaveLength(18)
    expect(new Set(allIds).size).toBe(18)
  })
})
