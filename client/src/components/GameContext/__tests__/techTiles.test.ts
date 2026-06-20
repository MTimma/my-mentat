import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { CONFLICTS } from '../../../data/conflicts'
import { TechTileId } from '../../../data/techTiles'
import {
  applyAfterConflictTechEffects,
  applyEndgameTechScoring,
  applyRevealTechEffects,
  applyRoundStartTech,
  applyTroopTransportsToFreighterReward,
  handleAcquireTech,
} from '../riseOfIxReducer'
import { GamePhase, NO_EXPANSIONS, TurnType } from '../../../types/GameTypes'
import { makePlayer, stubDeckCard } from './_helpers'
import { DEFAULT_DREADNOUGHTS } from '../../../utils/dreadnoughts'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

function roiState(overrides: Record<string, unknown> = {}) {
  const base = getFreshDefaultGameState()
  const p0 = makePlayer(0, {
    spice: 10,
    troops: 5,
    troopSupply: 5,
    negotiatorsOnIx: 2,
    tech: [],
    dreadnoughts: { ...DEFAULT_DREADNOUGHTS },
  })
  return {
    ...base,
    expansions: RISE_OF_IX,
    players: [p0, makePlayer(1)],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    ixBoard: {
      stacks: [
        [TechTileId.MINIMIC_FILM, TechTileId.ARTILLERY],
        [TechTileId.WINDTRAPS],
        [],
      ],
      nextFaceUpRevealed: {},
    },
    combatTroops: { 0: 2 },
    combatStrength: { 0: 4 },
    ...overrides,
  }
}

describe('tech tiles reducer', () => {
  it('ACQUIRE_TECH happy path: spice -2, tile in player.tech', () => {
    const before = roiState()
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 0,
      nextFaceUpTileId: TechTileId.ARTILLERY,
    })
    expect(after.players[0].spice).toBe(8)
    expect(after.players[0].tech).toEqual([{ id: TechTileId.MINIMIC_FILM, faceUp: true }])
    expect(after.ixBoard?.stacks[0]).toEqual([TechTileId.ARTILLERY])
  })

  it('ACQUIRE_TECH with one face-down tile auto-reveals it without nextFaceUpTileId', () => {
    const before = roiState({
      ixBoard: {
        stacks: [[TechTileId.MINIMIC_FILM, TechTileId.WINDTRAPS]],
        nextFaceUpRevealed: {},
      },
    })
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 0,
      nextFaceUpTileId: TechTileId.ARTILLERY,
    })
    expect(after.ixBoard?.stacks[0]).toEqual([TechTileId.WINDTRAPS])
  })

  it('ACQUIRE_TECH rejected when multiple face-down and no nextFaceUpTileId', () => {
    const before = roiState({
      ixBoard: {
        stacks: [
          [TechTileId.MINIMIC_FILM, TechTileId.ARTILLERY, TechTileId.WINDTRAPS],
          [TechTileId.HOLTZMAN_ENGINE],
          [],
        ],
        nextFaceUpRevealed: {},
      },
    })
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 0,
    })
    expect(after).toBe(before)
  })

  it('ACQUIRE_TECH places chosen next face-up tile on stack', () => {
    const before = roiState()
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 0,
      nextFaceUpTileId: TechTileId.ARTILLERY,
    })
    expect(after.ixBoard?.stacks[0][0]).toBe(TechTileId.ARTILLERY)
    expect(after.ixBoard?.stacks[0]).not.toContain(TechTileId.MINIMIC_FILM)
  })

  it('ACQUIRE_TECH with discount 2 from Tech Negotiation', () => {
    const before = roiState({
      ixBoard: {
        stacks: [[TechTileId.HOLTZMAN_ENGINE]],
        nextFaceUpRevealed: {},
      },
    })
    before.players[0].spice = 5
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.HOLTZMAN_ENGINE,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 2,
    })
    expect(after.players[0].spice).toBe(5 - 4)
    expect(after.players[0].tech?.[0]?.id).toBe(TechTileId.HOLTZMAN_ENGINE)
  })

  it('ACQUIRE_TECH returning 2 negotiators: spice -1, troops +2', () => {
    const before = roiState({
      ixBoard: {
        stacks: [[TechTileId.DISPOSAL_FACILITY]],
        nextFaceUpRevealed: {},
      },
    })
    before.players[0].spice = 3
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.DISPOSAL_FACILITY,
      stackIndex: 0,
      negotiatorsReturned: 2,
      discount: 0,
    })
    expect(after.players[0].spice).toBe(2)
    expect(after.players[0].negotiatorsOnIx).toBe(0)
    expect(after.players[0].troops).toBe(5)
    expect(after.players[0].troopSupply).toBe(7)
  })

  it('ACQUIRE_TECH rejected when spice insufficient', () => {
    const before = roiState()
    before.players[0].spice = 0
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 0,
      nextFaceUpTileId: TechTileId.ARTILLERY,
    })
    expect(after).toBe(before)
  })

  it('ACQUIRE_TECH rejected when negotiatorsReturned exceeds on Ix', () => {
    const before = roiState()
    before.players[0].negotiatorsOnIx = 1
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 2,
      discount: 0,
    })
    expect(after).toBe(before)
  })

  it('Round Start flips face-down tiles to face-up', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [
            { id: TechTileId.FLAGSHIP, faceUp: false },
            { id: TechTileId.TRAINING_DRONES, faceUp: false },
          ],
        }),
      ],
    })
    const after = applyRoundStartTech(before)
    expect(after.players[0].tech?.every(t => t.faceUp)).toBe(true)
  })

  it('Holtzman Engine fires drawCards at Round Start', () => {
    const before = roiState({
      players: [makePlayer(0, { tech: [{ id: TechTileId.HOLTZMAN_ENGINE, faceUp: false }], handCount: 3 })],
    })
    const after = applyRoundStartTech(before)
    expect(after.players[0].handCount).toBe(4)
  })

  it('Shuttle Fleet fires solari:2 at Round Start', () => {
    const before = roiState({
      players: [makePlayer(0, { tech: [{ id: TechTileId.SHUTTLE_FLEET, faceUp: true }], solari: 5 })],
    })
    const after = applyRoundStartTech(before)
    expect(after.players[0].solari).toBe(7)
  })

  it('Holtzman Engine endgame +1 VP if SMF >= 2', () => {
    const smf = stubDeckCard(301, { name: 'Spice Must Flow' })
    const before = roiState({
      phase: GamePhase.END_GAME,
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLTZMAN_ENGINE, faceUp: true }],
          victoryPoints: 5,
          deck: [smf, smf, stubDeckCard(2)],
        }),
      ],
    })
    const after = applyEndgameTechScoring(before)
    expect(after.players[0].victoryPoints).toBe(6)
  })

  it('Artillery: +1 per sword-producing revealed card', () => {
    const swordCard = stubDeckCard(10, {
      revealEffect: [{ reward: { combat: 2 } }],
    })
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.ARTILLERY, faceUp: true }],
        }),
      ],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
    })
    const result = applyRevealTechEffects(before, 0, [swordCard, swordCard, swordCard], 0, 0)
    expect(result.swordCount).toBe(3)
    expect(result.state.combatStrength[0]).toBe(5)
  })

  it('Restricted Ordinance: +4 combat only if hasHighCouncilSeat', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.RESTRICTED_ORDINANCE, faceUp: true }],
          hasHighCouncilSeat: true,
        }),
      ],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
    })
    const withSeat = applyRevealTechEffects(before, 0, [], 0, 0)
    expect(withSeat.swordCount).toBe(4)

    const noSeat = applyRevealTechEffects(
      { ...before, players: [{ ...before.players[0], hasHighCouncilSeat: false }] },
      0,
      [],
      0,
      0
    )
    expect(noSeat.swordCount).toBe(0)
  })

  it('Spaceport: state.acquireToTopThisRound[playerId] true while owned', () => {
    const before = roiState({
      players: [makePlayer(0, { tech: [{ id: TechTileId.SPACEPORT, faceUp: true }] })],
      acquireToTopThisRound: {},
    })
    const after = handleAcquireTech(before, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 0,
      nextFaceUpTileId: TechTileId.ARTILLERY,
    })
    expect(after.acquireToTopThisRound[0]).toBe(true)
  })

  it('Troop Transports: freighter step 2 reward becomes troops:3 with optional deploy', () => {
    const before = roiState({
      players: [makePlayer(0, { tech: [{ id: TechTileId.TROOP_TRANSPORTS, faceUp: true }] })],
    })
    const reward = applyTroopTransportsToFreighterReward(before, 0, 2)
    expect(reward).toEqual({ troops: 3, deployTroops: 3 })
  })

  it('Windtraps: +1 water on conflict win', () => {
    const before = roiState({
      players: [makePlayer(0, { tech: [{ id: TechTileId.WINDTRAPS, faceUp: true }], water: 2 })],
    })
    const after = applyAfterConflictTechEffects(before, [0])
    expect(after.players[0].water).toBe(3)
  })

  it('Detonation Devices: pending OR choice after winning conflict with dreadnought', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.DETONATION_DEVICES, faceUp: true }],
          dreadnoughts: { ...DEFAULT_DREADNOUGHTS, conflict: 1, supply: 1 },
        }),
      ],
    })
    const after = applyAfterConflictTechEffects(before, [0])
    expect(after.pendingConflictRewardChoices?.length).toBe(1)
    expect(after.pendingConflictRewardChoices?.[0].options).toHaveLength(2)
  })

  it('SELECT_CONFLICT applies round-start tech flip', () => {
    let s = roiState({
      phase: GamePhase.ROUND_START,
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.TRAINING_DRONES, faceUp: false }],
        }),
        makePlayer(1),
      ],
    })
    s = applyGameAction(s, { type: 'SELECT_CONFLICT', conflictId: CONFLICTS[0].id })
    expect(s.players[0].tech?.[0]?.faceUp).toBe(true)
  })

  it('ACQUIRE_TECH via applyGameAction is recorded path', () => {
    let s = roiState()
    s = applyGameAction(s, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 0,
      nextFaceUpTileId: TechTileId.ARTILLERY,
    })
    expect(s.players[0].tech?.length).toBe(1)
  })
})
