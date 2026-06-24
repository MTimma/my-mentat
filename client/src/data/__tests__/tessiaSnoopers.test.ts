import { describe, expect, it } from 'vitest'
import { FactionType, GameState, GainSource, Leader, PlayerColor, RewardType } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'
import {
  factionsWithSnooper,
  hasOnTrackSnooper,
  isTessiaLeader,
  parkTessiaSnooperOnMilestone,
  seedTessiaSnoopers,
  recalculateTessiaSnooperRewardSlot,
  skipTessiaRewardSlot,
  tryTessiaSnooperClaim,
  getTessiaNextRewardSlot,
  isTessiaRewardSlotConsumed,
  TESSIA_SNOOPER_START_INFLUENCE,
  TESSIA_SNOOPER_START_STEPS,
  snooperTokenPoint,
} from '../leaderAbilities/tessiaSnoopers'
import { INFLUENCE_TRACKS } from '../boardMarkerAnchors'

function tessiaPlayer(overrides: Partial<import('../../types/GameTypes').Player> = {}) {
  const leader = new Leader(
    LEADER_NAMES.TESSIA_VERNIUS,
    { name: 'Subtle Subterfuge', description: 'Place snooper tokens on influence tracks.' },
    'Signet',
    4
  )
  return {
    id: 0,
    color: PlayerColor.RED,
    leader,
    troops: 3,
    spice: 0,
    water: 0,
    solari: 0,
    victoryPoints: 1,
    agents: 2,
    persuasion: 0,
    combatValue: 0,
    hasSwordmaster: false,
    hasHighCouncilSeat: false,
    handCount: 5,
    revealed: false,
    intrigueCount: 0,
    deck: [],
    discardPile: [],
    playArea: [],
    trash: [],
    ...overrides,
  }
}

describe('seedTessiaSnoopers', () => {
  it('only seeds when riseOfIx and Tessia leader', () => {
    const tessia = tessiaPlayer()
    const other = tessiaPlayer({
      leader: new Leader('Paul Atreides', { name: 'A', description: 'B' }, 'S', 1),
    })

    expect(seedTessiaSnoopers(tessia, false)).toBe(tessia)
    expect(seedTessiaSnoopers(tessia, false).snoopers).toBeUndefined()

    expect(seedTessiaSnoopers(other, true)).toBe(other)
    expect(seedTessiaSnoopers(other, true).snoopers).toBeUndefined()

    const seeded = seedTessiaSnoopers(tessia, true)
    expect(isTessiaLeader(seeded.leader)).toBe(true)
    expect(seeded.snoopers).toEqual({
      [FactionType.EMPEROR]: true,
      [FactionType.SPACING_GUILD]: true,
      [FactionType.BENE_GESSERIT]: true,
      [FactionType.FREMEN]: true,
    })
    expect(seeded.leader.tessiaSnoopers).toEqual({})
    expect(seeded.leader.tessiaSnooperRewardSlot).toBe(1)
  })

  it('preserves sandbox reward slot and snooper layout when re-seeding', () => {
    const leader = new Leader(
      LEADER_NAMES.TESSIA_VERNIUS,
      { name: 'Subtle Subterfuge', description: '' },
      'Signet',
      4
    )
    leader.tessiaSnooperRewardSlot = 2
    const seeded = seedTessiaSnoopers(
      tessiaPlayer({
        leader,
        snoopers: {
          [FactionType.EMPEROR]: false,
          [FactionType.SPACING_GUILD]: true,
          [FactionType.BENE_GESSERIT]: true,
          [FactionType.FREMEN]: true,
        },
      }),
      true
    )
    expect(seeded.leader.tessiaSnooperRewardSlot).toBe(2)
    expect(seeded.snoopers?.[FactionType.EMPEROR]).toBe(false)
  })

  it('uses 2 Influence on every faction track', () => {
    expect(TESSIA_SNOOPER_START_INFLUENCE).toBe(2)
    for (const faction of Object.values(FactionType)) {
      expect(TESSIA_SNOOPER_START_STEPS[faction]).toBe(2)
    }
  })

  it('clears snoopers when leader is not Tessia', () => {
    const tessia = seedTessiaSnoopers(tessiaPlayer(), true)
    const other = tessiaPlayer({
      leader: new Leader('Paul Atreides', { name: 'A', description: 'B' }, 'S', 1),
      snoopers: tessia.snoopers,
    })
    const cleared = seedTessiaSnoopers(other, true)
    expect(cleared.snoopers).toBeUndefined()
    expect(cleared.leader.tessiaSnoopers).toBeUndefined()
  })
})

describe('parkTessiaSnooperOnMilestone', () => {
  it('clears track flag and sets leader flag when crossing influence 2', () => {
    const player = tessiaPlayer({
      snoopers: {
        [FactionType.EMPEROR]: true,
        [FactionType.SPACING_GUILD]: true,
        [FactionType.BENE_GESSERIT]: false,
        [FactionType.FREMEN]: true,
      },
      leader: new Leader(
        LEADER_NAMES.TESSIA_VERNIUS,
        { name: 'Subtle Subterfuge', description: '' },
        'Signet',
        4,
        false
      ),
    })

    const parked = parkTessiaSnooperOnMilestone(
      player,
      FactionType.EMPEROR,
      1,
      2
    )
    expect(parked.snoopers?.[FactionType.EMPEROR]).toBe(false)
    expect(parked.leader.tessiaSnoopers?.[FactionType.EMPEROR]).toBe(true)

    const catchUp = parkTessiaSnooperOnMilestone(player, FactionType.EMPEROR, 2, 3)
    expect(catchUp.snoopers?.[FactionType.EMPEROR]).toBe(false)
    expect(catchUp.leader.tessiaSnoopers?.[FactionType.EMPEROR]).toBe(true)

    const unchanged = parkTessiaSnooperOnMilestone(player, FactionType.EMPEROR, 2, 2)
    expect(unchanged).toBe(player)

    const noSnooper = parkTessiaSnooperOnMilestone(
      player,
      FactionType.BENE_GESSERIT,
      1,
      2
    )
    expect(noSnooper).toBe(player)
  })
})

describe('tryTessiaSnooperClaim', () => {
  function baseState(player: ReturnType<typeof tessiaPlayer>): GameState {
    return {
      expansions: { riseOfIx: true },
      currentRound: 1,
      gains: [],
      players: [player],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 1 },
        [FactionType.SPACING_GUILD]: { 0: 0 },
        [FactionType.BENE_GESSERIT]: { 0: 0 },
        [FactionType.FREMEN]: { 0: 0 },
      },
      factionAlliances: {
        [FactionType.EMPEROR]: null,
        [FactionType.SPACING_GUILD]: null,
        [FactionType.BENE_GESSERIT]: null,
        [FactionType.FREMEN]: null,
      },
    } as unknown as GameState
  }

  it('grants slot-1 choice on first claim', () => {
    const player = seedTessiaSnoopers(tessiaPlayer(), true)
    const state = baseState(player)
    const claim = tryTessiaSnooperClaim(state, player, FactionType.EMPEROR, 1, 2)
    expect(claim).not.toBeNull()
    expect(claim!.player.snoopers?.[FactionType.EMPEROR]).toBe(false)
    expect(claim!.player.leader.tessiaSnoopers?.[FactionType.EMPEROR]).toBe(true)
    expect(claim!.player.leader.tessiaSnooperRewardSlot).toBe(2)
    expect(claim!.pendingChoices).toHaveLength(1)
    expect(claim!.pendingChoices[0].prompt).toContain('discard')
  })

  it('uses slot 2 (faction bonus) when sandbox skipped slot 1', () => {
    const leader = new Leader(
      LEADER_NAMES.TESSIA_VERNIUS,
      { name: 'Subtle Subterfuge', description: '' },
      'Signet',
      4
    )
    leader.tessiaSnooperRewardSlot = 2
    const player = tessiaPlayer({ leader, troopSupply: 9 })
    player.snoopers = {
      [FactionType.EMPEROR]: true,
      [FactionType.SPACING_GUILD]: true,
      [FactionType.BENE_GESSERIT]: true,
      [FactionType.FREMEN]: true,
    }
    const state = baseState(player)
    const claim = tryTessiaSnooperClaim(state, player, FactionType.EMPEROR, 1, 2)
    expect(claim!.pendingChoices).toHaveLength(0)
    expect(claim!.player.troops).toBe(5)
    expect(claim!.player.leader.tessiaSnooperRewardSlot).toBe(3)
  })

  it('grants +1 influence on slot 3', () => {
    const leader = new Leader(
      LEADER_NAMES.TESSIA_VERNIUS,
      { name: 'Subtle Subterfuge', description: '' },
      'Signet',
      4
    )
    leader.tessiaSnooperRewardSlot = 3
    const player = tessiaPlayer({ leader, troopSupply: 9 })
    player.snoopers = {
      [FactionType.EMPEROR]: true,
      [FactionType.SPACING_GUILD]: true,
      [FactionType.BENE_GESSERIT]: true,
      [FactionType.FREMEN]: true,
    }
    const state = baseState(player)
    state.factionInfluence[FactionType.EMPEROR][0] = 2
    const claim = tryTessiaSnooperClaim(state, player, FactionType.EMPEROR, 1, 2)
    expect(claim!.state.factionInfluence[FactionType.EMPEROR][0]).toBe(3)
    expect(claim!.player.leader.tessiaSnooperRewardSlot).toBe(4)
    const influenceGain = claim!.state.gains.find(
      g =>
        g.type === RewardType.INFLUENCE &&
        g.source === GainSource.TESSIA_SNOOPER &&
        g.playerId === player.id
    )
    expect(influenceGain).toMatchObject({
      sourceId: 1,
      name: FactionType.EMPEROR,
      amount: 1,
    })
  })
})

describe('skipTessiaRewardSlot', () => {
  it('advances the next reward slot', () => {
    const leader = new Leader(LEADER_NAMES.TESSIA_VERNIUS, { name: 'A', description: 'B' }, 'S', 4)
    leader.tessiaSnooperRewardSlot = 1
    expect(skipTessiaRewardSlot(leader).tessiaSnooperRewardSlot).toBe(2)
  })
})

describe('recalculateTessiaSnooperRewardSlot', () => {
  it('matches off-track snooper count after sandbox toggles', () => {
    const leader = new Leader(LEADER_NAMES.TESSIA_VERNIUS, { name: 'A', description: 'B' }, 'S', 4)
    leader.tessiaSnooperRewardSlot = 5

    const allOff = tessiaPlayer({
      leader,
      snoopers: {
        [FactionType.EMPEROR]: false,
        [FactionType.SPACING_GUILD]: false,
        [FactionType.BENE_GESSERIT]: false,
        [FactionType.FREMEN]: false,
      },
    })
    expect(recalculateTessiaSnooperRewardSlot(leader, allOff).tessiaSnooperRewardSlot).toBe(5)

    const twoOnTrack = tessiaPlayer({
      leader,
      snoopers: {
        [FactionType.EMPEROR]: true,
        [FactionType.SPACING_GUILD]: true,
        [FactionType.BENE_GESSERIT]: false,
        [FactionType.FREMEN]: false,
      },
    })
    expect(recalculateTessiaSnooperRewardSlot(leader, twoOnTrack).tessiaSnooperRewardSlot).toBe(3)

    const allOnTrack = seedTessiaSnoopers(tessiaPlayer(), true)
    expect(
      recalculateTessiaSnooperRewardSlot(allOnTrack.leader, allOnTrack).tessiaSnooperRewardSlot
    ).toBe(1)
  })
})

describe('isTessiaRewardSlotConsumed', () => {
  it('marks slots below the next reward slot as consumed', () => {
    const leader = new Leader(LEADER_NAMES.TESSIA_VERNIUS, { name: 'A', description: 'B' }, 'S', 4)
    expect(isTessiaRewardSlotConsumed(leader, 1)).toBe(false)
    leader.tessiaSnooperRewardSlot = 3
    expect(isTessiaRewardSlotConsumed(leader, 1)).toBe(true)
    expect(isTessiaRewardSlotConsumed(leader, 2)).toBe(true)
    expect(isTessiaRewardSlotConsumed(leader, 3)).toBe(false)
    expect(isTessiaRewardSlotConsumed(leader, 4)).toBe(false)
  })
})

describe('hasOnTrackSnooper', () => {
  it('defaults to all four on-track when snoopers are unset', () => {
    const player = tessiaPlayer()
    for (const faction of Object.values(FactionType)) {
      expect(hasOnTrackSnooper(player, faction)).toBe(true)
    }
    expect(factionsWithSnooper(player)).toEqual(Object.values(FactionType))
  })
})

describe('factionsWithSnooper', () => {
  it('returns factions with an on-track snooper', () => {
    const player = tessiaPlayer({
      snoopers: {
        [FactionType.EMPEROR]: true,
        [FactionType.SPACING_GUILD]: false,
        [FactionType.BENE_GESSERIT]: true,
        [FactionType.FREMEN]: false,
      },
    })
    expect(factionsWithSnooper(player)).toEqual([
      FactionType.EMPEROR,
      FactionType.BENE_GESSERIT,
    ])
  })
})

describe('snooperTokenPoint', () => {
  it('anchors X to the left-most influence lane regardless of player seat', () => {
    const emperor = snooperTokenPoint(FactionType.EMPEROR, INFLUENCE_TRACKS)
    expect(emperor.x).toBe(INFLUENCE_TRACKS[FactionType.EMPEROR].laneCenterX[0] - 1.7)
    expect(emperor.y).toBe(
      INFLUENCE_TRACKS[FactionType.EMPEROR].baselineY +
        INFLUENCE_TRACKS[FactionType.EMPEROR].stepY * TESSIA_SNOOPER_START_INFLUENCE -
        0.5
    )
  })
})
