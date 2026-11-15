import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { CONFLICTS } from '../../../data/conflicts'
import { TECH_TILES, TechTileId } from '../../../data/techTiles'
import {
  applyAfterConflictTechEffects,
  applyEndgameTechScoring,
  applyRevealTechEffects,
  applyRoundStartTech,
  applyTroopTransportsToFreighterReward,
  detonationDevicesOption,
  handleAcquireTech,
  refreshArtillerySwords,
  syncSpaceportAcquireToTop,
} from '../riseOfIxReducer'
import { buildDreadnoughtControlChoices } from '../../../utils/dreadnoughtLifecycle'
import { compareEndgameStanding } from '../../../utils/endgameResolution'
import {
  ChoiceType,
  CustomEffect,
  GamePhase,
  FactionType,
  GainSource,
  NO_EXPANSIONS,
  RewardType,
  TurnType,
  type GameState,
} from '../../../types/GameTypes'
import { makePlayer, stubDeckCard } from './_helpers'
import { DEFAULT_DREADNOUGHTS } from '../../../utils/dreadnoughts'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

/** Card-source gain for player 0 in round 1 (the default `roiState` round). */
function cardGain(sourceId: number, amount: number, type: RewardType) {
  return {
    round: 1,
    playerId: 0,
    sourceId,
    name: `card-${sourceId}`,
    amount,
    type,
    source: GainSource.CARD,
  }
}

const cardCombatGain = (sourceId: number, amount: number) =>
  cardGain(sourceId, amount, RewardType.COMBAT)

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

  it('ACQUIRE_TECH auto-reveals when only one tile remains in the pool', () => {
    const remainingId = TechTileId.WINDTRAPS
    const ownedIds = TECH_TILES.map(tile => tile.id).filter(
      id => id !== TechTileId.MINIMIC_FILM && id !== remainingId
    )
    const before = roiState({
      players: [
        makePlayer(0, {
          spice: 10,
          tech: ownedIds.map(id => ({ id, faceUp: true })),
        }),
        makePlayer(1),
      ],
      ixBoard: {
        stacks: [[TechTileId.MINIMIC_FILM], [], []],
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
    expect(after.ixBoard?.stacks[0]).toEqual([remainingId])
  })

  it('ACQUIRE_TECH rejected when multiple tiles available and no nextFaceUpTileId', () => {
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
      nextFaceUpTileId: TechTileId.ARTILLERY,
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
      nextFaceUpTileId: TechTileId.ARTILLERY,
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

  it('Shuttle Fleet: acquire offers two influence picks on different tracks', () => {
    let s = roiState({
      players: [makePlayer(0, { spice: 10, tech: [] }), makePlayer(1)],
      currTurn: { playerId: 0, type: TurnType.ACTION },
      ixBoard: {
        stacks: [[TechTileId.SHUTTLE_FLEET, TechTileId.ARTILLERY], [TechTileId.WINDTRAPS], []],
        nextFaceUpRevealed: {},
      },
    })
    s = applyGameAction(s, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.SHUTTLE_FLEET,
      stackIndex: 0,
      negotiatorsReturned: 0,
      discount: 0,
      nextFaceUpTileId: TechTileId.ARTILLERY,
    })
    const first = s.currTurn?.pendingChoices?.find(c => c.type === ChoiceType.FIXED_OPTIONS)
    expect(first).toBeTruthy()
    expect(first?.options).toHaveLength(4)

    const emperorIndex = first!.options.findIndex(
      o => o.reward.influence?.amounts[0]?.faction === FactionType.EMPEROR
    )
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: first!.id,
      optionIndex: emperorIndex,
    })
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)

    const second = s.currTurn?.pendingChoices?.find(c => c.type === ChoiceType.FIXED_OPTIONS)
    expect(second).toBeTruthy()
    expect(second?.options).toHaveLength(3)
    expect(
      second?.options.some(o => o.reward.influence?.amounts[0]?.faction === FactionType.EMPEROR)
    ).toBe(false)
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

  it('Artillery: +1 per revealed card that actually provided swords', () => {
    const swordCard = stubDeckCard(10, { revealEffect: [{ reward: { combat: 2 } }] })
    const oneSwordCard = stubDeckCard(11, { revealEffect: [{ reward: { combat: 1 } }] })
    const persuasionCard = stubDeckCard(12, { revealEffect: [{ reward: { persuasion: 2 } }] })
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.ARTILLERY, faceUp: true }],
        }),
      ],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
      gains: [
        cardCombatGain(10, 2),
        cardCombatGain(11, 1),
        // Printed swords that never resolved (Bene Gesserit Sister choosing persuasion).
        cardGain(12, 2, RewardType.PERSUASION),
      ],
    })
    const result = applyRevealTechEffects(
      before,
      0,
      [swordCard, oneSwordCard, persuasionCard],
      0,
      0
    )
    expect(result.swordCount).toBe(2)
    expect(result.state.combatStrength[0]).toBe(4)
  })

  it('Artillery: pools swords with no units in conflict', () => {
    const swordCard = stubDeckCard(10, { revealEffect: [{ reward: { combat: 2 } }] })
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.ARTILLERY, faceUp: true }],
        }),
      ],
      combatTroops: {},
      combatStrength: {},
      gains: [cardCombatGain(10, 2)],
    })
    const result = applyRevealTechEffects(before, 0, [swordCard], 0, 0)
    expect(result.swordCount).toBe(1)
  })

  it('Artillery: re-evaluates when a reveal choice resolves later', () => {
    const bgs = stubDeckCard(20, {
      revealEffect: [
        { choiceOpt: true, reward: { persuasion: 2 } },
        { choiceOpt: true, reward: { combat: 2 } },
      ],
    })
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.ARTILLERY, faceUp: true }],
        }),
      ],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
      currTurn: {
        playerId: 0,
        type: TurnType.REVEAL,
        revealedCardIds: [bgs.id],
        artilleryFired: true,
      },
    })
    // The Sister's swords are still an unresolved choice, so Artillery counts nothing yet.
    const revealed = applyRevealTechEffects(before, 0, [bgs], 0, 0)
    expect(revealed.swordCount).toBe(0)

    // She chooses 2 swords → Artillery now counts her.
    const withChoice = {
      ...revealed.state,
      gains: [...revealed.state.gains, cardCombatGain(bgs.id, 2)],
    }
    const refreshed = refreshArtillerySwords(withChoice, 0)
    expect(refreshed.gains).toContainEqual(
      expect.objectContaining({ name: 'Artillery', type: RewardType.COMBAT, amount: 1 })
    )
    expect(refreshed.combatStrength[0]).toBe(3)
  })

  it('Artillery: does not fire when the tile was acquired mid-reveal', () => {
    const bgs = stubDeckCard(20, {
      revealEffect: [
        { choiceOpt: true, reward: { persuasion: 2 } },
        { choiceOpt: true, reward: { combat: 2 } },
      ],
    })
    // Artillery is owned now, but the reveal turn started before it was acquired (no
    // `artilleryFired` marker), so resolving the Sister's swords must not grant its bonus.
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.ARTILLERY, faceUp: true }],
        }),
      ],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 4 },
      gains: [cardCombatGain(bgs.id, 2)],
      currTurn: { playerId: 0, type: TurnType.REVEAL, revealedCardIds: [bgs.id] },
    })
    const refreshed = refreshArtillerySwords(before, 0)
    expect(refreshed).toBe(before)
    expect(refreshed.gains.some(g => g.name === 'Artillery')).toBe(false)
  })

  it('Artillery: counts a reveal choice resolved after the reveal (applyGameAction)', () => {
    const bgs = stubDeckCard(20, {
      revealEffect: [
        { choiceOpt: true, reward: { persuasion: 2 } },
        { choiceOpt: true, reward: { combat: 2 } },
      ],
    })
    let s: GameState = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.ARTILLERY, faceUp: true }],
          deck: [bgs],
          handCount: 1,
        }),
        makePlayer(1),
      ],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
    })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [bgs.id] })
    // No resolved swords yet — the Sister's reveal box is still a choice.
    expect(s.gains.some(g => g.name === 'Artillery')).toBe(false)

    const choice = s.currTurn?.pendingChoices?.find(c => c.id === `card-${bgs.id}-OR`)
    expect(choice).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice!.id,
      optionIndex: 1,
      source: { type: 'card', id: bgs.id, name: bgs.name },
    })
    // 2 pooled + 2 Sister swords + 1 Artillery.
    expect(s.gains).toContainEqual(
      expect.objectContaining({ name: 'Artillery', type: RewardType.COMBAT, amount: 1 })
    )
    expect(s.combatStrength[0]).toBe(5)
  })

  it('Artillery: acquired after the reveal does not fire retroactively', () => {
    const bgs = stubDeckCard(20, {
      revealEffect: [
        { choiceOpt: true, reward: { persuasion: 2 } },
        { choiceOpt: true, reward: { combat: 2 } },
      ],
    })
    let s: GameState = roiState({
      players: [makePlayer(0, { deck: [bgs], handCount: 1 }), makePlayer(1)],
      combatTroops: { 0: 1 },
      combatStrength: { 0: 2 },
    })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [bgs.id] })
    expect(s.currTurn?.artilleryFired).toBe(false)

    // Acquire Artillery mid-reveal (e.g. Machine Culture), then resolve the Sister's choice.
    s = {
      ...s,
      players: s.players.map(p =>
        p.id === 0 ? { ...p, tech: [{ id: TechTileId.ARTILLERY, faceUp: true }] } : p
      ),
    }
    const choice = s.currTurn?.pendingChoices?.find(c => c.id === `card-${bgs.id}-OR`)
    expect(choice).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice!.id,
      optionIndex: 1,
      source: { type: 'card', id: bgs.id, name: bgs.name },
    })
    // 2 pooled + 2 Sister swords — the tile was not owned during the reveal, so no bonus.
    expect(s.gains.some(g => g.name === 'Artillery')).toBe(false)
    expect(s.combatStrength[0]).toBe(4)
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

  it('Spaceport: syncSpaceportAcquireToTop re-asserts the flag after the reveal-turn clear', () => {
    const before = roiState({
      players: [
        makePlayer(0, { tech: [{ id: TechTileId.SPACEPORT, faceUp: true }] }),
        makePlayer(1),
      ],
      acquireToTopThisRound: { 0: false },
    })
    const after = syncSpaceportAcquireToTop(before)
    expect(after.acquireToTopThisRound[0]).toBe(true)
  })

  it('Minimic Film adds persuasion on reveal when owned', () => {
    const before = roiState({
      players: [makePlayer(0, { tech: [{ id: TechTileId.MINIMIC_FILM, faceUp: true }] })],
    })
    const result = applyRevealTechEffects(before, 0, [], 0, 0)
    expect(result.persuasionCount).toBe(1)
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

  it('Detonation Devices: option is offered on the dreadnought-control choice', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.DETONATION_DEVICES, faceUp: true }],
          dreadnoughts: { ...DEFAULT_DREADNOUGHTS, conflict: 1, supply: 1 },
        }),
      ],
    })
    const option = detonationDevicesOption(before, 0)
    // The VP is applied atomically with the dreadnought return in the reducer, so the
    // reward carries only the marker (no `victoryPoints` to double-count).
    expect(option?.reward).toEqual({ custom: CustomEffect.DETONATION_DEVICES })

    const choices = buildDreadnoughtControlChoices(
      before,
      0,
      1,
      'Test Conflict',
      [],
      option ? [option] : []
    )
    expect(choices).toHaveLength(1)
    // Three control spaces plus the Detonation option.
    expect(choices[0].options).toHaveLength(4)
    expect(choices[0].options.at(-1)?.reward.custom).toBe(CustomEffect.DETONATION_DEVICES)
  })

  it('Detonation Devices: no option when the winner has no dreadnought in the conflict', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.DETONATION_DEVICES, faceUp: true }],
          dreadnoughts: { ...DEFAULT_DREADNOUGHTS, conflict: 0, supply: 2 },
        }),
      ],
    })
    expect(detonationDevicesOption(before, 0)).toBeUndefined()
  })

  it('Detonation Devices: end-to-end — choosing it returns the dreadnought and grants +1 VP', () => {
    let s = roiState({
      phase: GamePhase.COMBAT_REWARDS,
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.DETONATION_DEVICES, faceUp: true }],
          dreadnoughts: { ...DEFAULT_DREADNOUGHTS, conflict: 1, supply: 0 },
        }),
        makePlayer(1),
        makePlayer(2),
        makePlayer(3),
      ],
      combatTroops: { 0: 1, 1: 0, 2: 0, 3: 0 },
      combatStrength: { 0: 6, 1: 0, 2: 0, 3: 0 },
    })
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    const choice = (s.pendingConflictRewardChoices ?? []).find(c =>
      c.id.startsWith('dreadnought-control')
    )
    expect(choice).toBeTruthy()
    const detonationIndex = choice!.options.findIndex(
      o => o.reward.custom === CustomEffect.DETONATION_DEVICES
    )
    expect(detonationIndex).toBeGreaterThanOrEqual(0)

    s = applyGameAction(s, {
      type: 'RESOLVE_CONFLICT_REWARD_CHOICE',
      choiceId: choice!.id,
      optionIndex: detonationIndex,
    })
    // Atomic: exactly one VP and exactly one dreadnought returned to supply.
    expect(s.players[0].victoryPoints).toBe(1)
    expect(s.players[0].dreadnoughts?.supply).toBe(1)
    expect(s.players[0].dreadnoughts?.conflict).toBe(0)
    expect(s.players[0].dreadnoughts?.control).toHaveLength(0)
    expect(
      s.gains.filter(g => g.type === RewardType.VICTORY_POINTS && g.amount === 1)
    ).toHaveLength(1)
    expect(
      s.gains.filter(g => g.type === RewardType.DREADNOUGHT && g.amount === -1)
    ).toHaveLength(1)
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

  it('Disposal Facility: optional trash when persuasion ≥ 6 on reveal', () => {
    const before = roiState({
      players: [makePlayer(0, { tech: [{ id: TechTileId.DISPOSAL_FACILITY, faceUp: true }] })],
    })
    const withEnough = applyRevealTechEffects(before, 0, [], 6, 0)
    expect(withEnough.state.pendingRewards).toContainEqual(
      expect.objectContaining({ reward: { trash: 1 }, isTrash: true })
    )

    const withTooLittle = applyRevealTechEffects(before, 0, [], 5, 0)
    expect(withTooLittle.state.pendingRewards ?? []).toHaveLength(0)
  })

  it('Disposal Facility: enqueues the trash reward through REVEAL_CARDS', () => {
    const persuasionCard = (id: number) =>
      stubDeckCard(id, { revealEffect: [{ reward: { persuasion: 2 } }] })
    const cards = [persuasionCard(7001), persuasionCard(7002), persuasionCard(7003)]
    let s = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.DISPOSAL_FACILITY, faceUp: true }],
          deck: cards,
          handCount: 3,
        }),
        makePlayer(1),
      ],
      currTurn: { playerId: 0, type: TurnType.ACTION },
    })
    s = applyGameAction(s, {
      type: 'REVEAL_CARDS',
      playerId: 0,
      cardIds: cards.map(c => c.id),
    })
    expect(s.pendingRewards.some(r => r.reward.trash === 1)).toBe(true)
  })

  it('Disposal Facility: uses the final persuasion (Minimic Film acquired later still counts)', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [
            { id: TechTileId.DISPOSAL_FACILITY, faceUp: true },
            { id: TechTileId.MINIMIC_FILM, faceUp: true },
          ],
        }),
      ],
    })
    const result = applyRevealTechEffects(before, 0, [], 5, 0)
    expect(result.persuasionCount).toBe(6)
    expect(result.state.pendingRewards).toContainEqual(
      expect.objectContaining({ reward: { trash: 1 }, isTrash: true })
    )
  })

  it('Memocorders endgame: +1 VP when influence ≥ 3 on all four tracks', () => {
    const before = roiState({
      phase: GamePhase.END_GAME,
      players: [makePlayer(0, { tech: [{ id: TechTileId.MEMOCORDERS, faceUp: true }], victoryPoints: 4 })],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 3 },
        [FactionType.SPACING_GUILD]: { 0: 4 },
        [FactionType.BENE_GESSERIT]: { 0: 3 },
        [FactionType.FREMEN]: { 0: 3 },
      },
    })
    const after = applyEndgameTechScoring(before)
    expect(after.players[0].victoryPoints).toBe(5)
  })

  it('Memocorders endgame: no VP when any track below 3', () => {
    const before = roiState({
      phase: GamePhase.END_GAME,
      players: [makePlayer(0, { tech: [{ id: TechTileId.MEMOCORDERS, faceUp: true }], victoryPoints: 4 })],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 3 },
        [FactionType.SPACING_GUILD]: { 0: 2 },
        [FactionType.BENE_GESSERIT]: { 0: 3 },
        [FactionType.FREMEN]: { 0: 3 },
      },
    })
    const after = applyEndgameTechScoring(before)
    expect(after.players[0].victoryPoints).toBe(4)
  })

  it('Chaumurky endgame: owner wins the VP tiebreaker without inflating spice', () => {
    const before = roiState({
      phase: GamePhase.END_GAME,
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.CHAUMURKY, faceUp: true }],
          victoryPoints: 5,
          spice: 0,
        }),
        makePlayer(1, { victoryPoints: 5, spice: 10 }),
      ],
    })
    const after = applyEndgameTechScoring(before)
    expect(after.endgameTiebreakerSpice?.[0] ?? 0).toBe(0)
    expect(compareEndgameStanding(after, after.players[0], after.players[1])).toBeLessThan(0)
  })

  it('Spy Satellites endgame: +1 VP per faction with ≤1 influence', () => {
    const before = roiState({
      phase: GamePhase.END_GAME,
      players: [makePlayer(0, { tech: [{ id: TechTileId.SPY_SATELLITES, faceUp: true }], victoryPoints: 2 })],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 0 },
        [FactionType.SPACING_GUILD]: { 0: 1 },
        [FactionType.BENE_GESSERIT]: { 0: 4 },
        [FactionType.FREMEN]: { 0: 0 },
      },
    })
    const after = applyEndgameTechScoring(before)
    expect(after.players[0].victoryPoints).toBe(5) // 2 + 3 low-influence factions
  })
})
