import { describe, expect, it } from 'vitest'
import { FactionType, Leader, PlayerColor } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'
import {
  factionsWithSnooper,
  isTessiaLeader,
  parkTessiaSnooperOnMilestone,
  seedTessiaSnoopers,
  TESSIA_SNOOPER_START_STEPS,
} from '../leaderAbilities/tessiaSnoopers'

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
  })

  it('uses documented start steps per faction', () => {
    expect(TESSIA_SNOOPER_START_STEPS[FactionType.EMPEROR]).toBeGreaterThan(0)
    expect(TESSIA_SNOOPER_START_STEPS[FactionType.SPACING_GUILD]).toBeGreaterThan(0)
    expect(TESSIA_SNOOPER_START_STEPS[FactionType.BENE_GESSERIT]).toBeGreaterThan(0)
    expect(TESSIA_SNOOPER_START_STEPS[FactionType.FREMEN]).toBeGreaterThan(0)
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

    const unchanged = parkTessiaSnooperOnMilestone(player, FactionType.EMPEROR, 2, 3)
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

describe('factionsWithSnooper', () => {
  it('returns factions with an on-track snooper', () => {
    const player = tessiaPlayer({
      snoopers: {
        [FactionType.EMPEROR]: true,
        [FactionType.SPACING_GUILD]: false,
        [FactionType.BENE_GESSERIT]: true,
        [FactionType.FREMEN]: undefined,
      },
    })
    expect(factionsWithSnooper(player)).toEqual([
      FactionType.EMPEROR,
      FactionType.BENE_GESSERIT,
    ])
  })
})
