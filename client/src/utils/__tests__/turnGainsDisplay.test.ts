import { describe, expect, it } from 'vitest'
import { FactionType, GainSource, RewardType, TurnType } from '../../types/GameTypes'
import {
  groupGainsBySource,
  groupGainsForDisplay,
  INLINE_DISCARDS_GROUP_KEY,
  splitGainsByCostAndReward,
  aggregateResourceGains,
  aggregateInfluenceGains,
  computeTurnGainTotals,
  getGainsForTurnState,
  getOtherPlayersGainsForTurnState,
  getTroopsDeployedToConflict,
  getTroopsRetreatedFromConflict,
  getEffectRetreatRemaining,
  getRepeatedIconDisplay,
  getAcquireEffectGainsForCard,
  excludeAcquireEffectGains,
} from '../turnGainsDisplay'

describe('turnGainsDisplay', () => {
  it('groups gains by source and splits paid vs gained', () => {
    const gains = [
      {
        playerId: 0,
        source: GainSource.INTRIGUE,
        sourceId: 30,
        round: 1,
        name: 'Water of Life',
        amount: -1,
        type: RewardType.WATER,
      },
      {
        playerId: 0,
        source: GainSource.INTRIGUE,
        sourceId: 30,
        round: 1,
        name: 'Water of Life',
        amount: -1,
        type: RewardType.SPICE,
      },
      {
        playerId: 0,
        source: GainSource.INTRIGUE,
        sourceId: 30,
        round: 1,
        name: 'Water of Life',
        amount: 3,
        type: RewardType.DRAW,
      },
    ]

    const groups = groupGainsBySource(gains)
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('Water of Life')

    const { costs, rewards } = splitGainsByCostAndReward(groups[0].gains)
    expect(aggregateResourceGains(costs).map(g => ({ type: g.type, amount: g.amount }))).toEqual(
      expect.arrayContaining([
        { type: RewardType.WATER, amount: 1 },
        { type: RewardType.SPICE, amount: 1 },
      ])
    )
    expect(aggregateResourceGains(rewards)).toEqual([{ type: RewardType.DRAW, amount: 3, name: undefined }])
  })

  it('keeps signet ring cost and reward in one group', () => {
    const gains = [
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: 10,
        round: 1,
        name: 'Signet Ring',
        amount: -1,
        type: RewardType.SOLARI,
      },
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: 10,
        round: 1,
        name: 'Signet Ring',
        amount: 1,
        type: RewardType.INTRIGUE,
      },
    ]

    const groups = groupGainsBySource(gains)
    expect(groups).toHaveLength(1)
    const { costs, rewards } = splitGainsByCostAndReward(groups[0].gains)
    expect(aggregateResourceGains(costs)[0]).toMatchObject({ type: RewardType.SOLARI, amount: 1 })
    expect(aggregateResourceGains(rewards)[0]).toMatchObject({ type: RewardType.INTRIGUE, amount: 1 })
  })

  it('groups RoI gain sources with readable titles', () => {
    const groups = groupGainsBySource([
      {
        playerId: 0,
        source: GainSource.TECH,
        sourceId: 0,
        round: 1,
        name: 'Flagship',
        amount: 3,
        type: RewardType.TROOPS,
      },
      {
        playerId: 0,
        source: GainSource.SHIPPING_TRACK,
        sourceId: 0,
        round: 1,
        name: 'Recall step 1',
        amount: 2,
        type: RewardType.SPICE,
      },
      {
        playerId: 0,
        source: GainSource.IX_BOARD,
        sourceId: 0,
        round: 1,
        name: 'Tech Negotiation',
        amount: -1,
        type: RewardType.TROOPS,
      },
    ])
    expect(groups.map(g => g.title)).toEqual([
      'Tech: Flagship',
      'Shipping track',
      'Ix board',
    ])
  })

  it('groups RoI gain sources with readable titles', () => {
    const groups = groupGainsBySource([
      {
        playerId: 0,
        source: GainSource.TECH,
        sourceId: 0,
        round: 1,
        name: 'Flagship',
        amount: 3,
        type: RewardType.TROOPS,
      },
      {
        playerId: 0,
        source: GainSource.SHIPPING_TRACK,
        sourceId: 0,
        round: 1,
        name: 'Recall step 1',
        amount: 2,
        type: RewardType.SPICE,
      },
      {
        playerId: 0,
        source: GainSource.IX_BOARD,
        sourceId: 0,
        round: 1,
        name: 'Tech Negotiation',
        amount: -1,
        type: RewardType.TROOPS,
      },
    ])
    expect(groups.map(g => g.title)).toEqual([
      'Tech: Flagship',
      'Shipping track',
      'Ix board',
    ])
  })

  it('groups Tessia snooper spice separately from 2nd-influence VP', () => {
    const gains = [
      {
        playerId: 0,
        source: GainSource.FIELD,
        sourceId: 0,
        round: 1,
        name: 'emperor 2nd Influence',
        amount: 1,
        type: RewardType.VICTORY_POINTS,
      },
      {
        playerId: 0,
        source: GainSource.TESSIA_SNOOPER,
        sourceId: 1,
        round: 1,
        name: 'Tessia snooper (emperor)',
        amount: 1,
        type: RewardType.SPICE,
      },
    ]

    const groups = groupGainsBySource(gains)
    expect(groups).toHaveLength(2)
    expect(groups[0].title).toBe('emperor 2nd Influence')
    expect(groups[1].title).toBe('Tessia snooper')
  })

  it('groups Tessia snooper influence bump with faction milestone under Tessia snooper', () => {
    const gains = [
      {
        playerId: 0,
        source: GainSource.FIELD,
        sourceId: 0,
        round: 1,
        name: 'fremen 2nd Influence',
        amount: 1,
        type: RewardType.VICTORY_POINTS,
      },
      {
        playerId: 0,
        source: GainSource.TESSIA_SNOOPER,
        sourceId: 4,
        round: 1,
        name: 'Tessia snooper (fremen)',
        amount: 1,
        type: RewardType.WATER,
      },
      {
        playerId: 0,
        source: GainSource.TESSIA_SNOOPER,
        sourceId: 4,
        round: 1,
        name: FactionType.FREMEN,
        amount: 1,
        type: RewardType.INFLUENCE,
      },
    ]

    const groups = groupGainsBySource(gains)
    expect(groups).toHaveLength(2)
    expect(groups[0].title).toBe('fremen 2nd Influence')
    expect(groups[1].title).toBe('Tessia snooper')
    expect(aggregateInfluenceGains(groups[1].gains)).toEqual([
      { name: FactionType.FREMEN, amount: 1 },
    ])
  })

  it('groups mandatory board-space rewards under the space name (Foldspace card + influence)', () => {
    const gains = [
      {
        playerId: 0,
        source: GainSource.BOARD_SPACE,
        sourceId: 16,
        round: 1,
        name: 'Foldspace',
        amount: 1,
        type: RewardType.CARD,
      },
      {
        playerId: 0,
        source: GainSource.BOARD_SPACE,
        sourceId: 16,
        round: 1,
        name: 'spacing-guild',
        amount: 1,
        type: RewardType.INFLUENCE,
      },
    ]

    const groups = groupGainsBySource(gains)
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('Foldspace')
    expect(groups[0].gains).toHaveLength(2)
  })

  it('groups Masterstroke influence under ability name, not faction id', () => {
    const gains = [
      {
        playerId: 0,
        source: GainSource.MASTERSTROKE,
        sourceId: 0,
        round: 1,
        name: 'spacing-guild',
        amount: 1,
        type: RewardType.INFLUENCE,
      },
      {
        playerId: 0,
        source: GainSource.MASTERSTROKE,
        sourceId: 0,
        round: 1,
        name: 'emperor',
        amount: 1,
        type: RewardType.INFLUENCE,
      },
    ]

    const groups = groupGainsBySource(gains)
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('Masterstroke')
  })

  it('getTroopsDeployedToConflict uses removable troops in conflict', () => {
    expect(
      getTroopsDeployedToConflict({
        currTurn: {
          playerId: 0,
          type: TurnType.ACTION,
          removableTroops: 2,
          troopsRetreatedFromConflict: 1,
        },
      } as Parameters<typeof getTroopsDeployedToConflict>[0])
    ).toBe(2)
  })

  it('getTroopsDeployedToConflict returns 0 when no deploy activity', () => {
    expect(
      getTroopsDeployedToConflict({
        currTurn: { playerId: 0, type: TurnType.ACTION },
      } as Parameters<typeof getTroopsDeployedToConflict>[0])
    ).toBe(0)
  })

  it('getTroopsRetreatedFromConflict reads troopsRetreatedFromConflict from currTurn', () => {
    expect(
      getTroopsRetreatedFromConflict({
        currTurn: {
          playerId: 0,
          type: TurnType.ACTION,
          canDeployTroops: true,
          troopLimit: 2,
          removableTroops: 0,
          troopsRetreatedFromConflict: 2,
        },
      } as Parameters<typeof getTroopsRetreatedFromConflict>[0])
    ).toBe(2)
  })

  it('getTroopsRetreatedFromConflict caps stale accumulated retreat counts', () => {
    expect(
      getTroopsRetreatedFromConflict({
        currTurn: {
          playerId: 0,
          type: TurnType.ACTION,
          canDeployTroops: true,
          troopLimit: 2,
          removableTroops: 2,
          troopsRetreatedFromConflict: 10,
        },
      } as Parameters<typeof getTroopsRetreatedFromConflict>[0])
    ).toBe(0)
    expect(
      getTroopsRetreatedFromConflict({
        currTurn: {
          playerId: 0,
          type: TurnType.ACTION,
          canDeployTroops: true,
          troopLimit: 2,
          removableTroops: 0,
          troopsRetreatedFromConflict: 10,
        },
      } as Parameters<typeof getTroopsRetreatedFromConflict>[0])
    ).toBe(2)
    expect(
      getTroopsRetreatedFromConflict({
        currTurn: {
          playerId: 0,
          type: TurnType.ACTION,
          canDeployTroops: true,
          troopLimit: 2,
          removableTroops: 2,
          troopsRetreatedFromConflict: 2,
        },
      } as Parameters<typeof getTroopsRetreatedFromConflict>[0])
    ).toBe(2)
  })

  it('getEffectRetreatRemaining subtracts used from allowance', () => {
    expect(
      getEffectRetreatRemaining({
        playerId: 0,
        type: TurnType.ACTION,
        effectRetreatAllowance: 2,
        effectRetreatsUsed: 1,
      })
    ).toBe(1)
    expect(getEffectRetreatRemaining(null)).toBe(0)
  })

  it('getRepeatedIconDisplay caps icons at 3 and shows multiplier for larger amounts', () => {
    expect(getRepeatedIconDisplay(2)).toEqual({ iconCount: 2, showTotalMultiplier: false })
    expect(getRepeatedIconDisplay(3)).toEqual({ iconCount: 3, showTotalMultiplier: false })
    expect(getRepeatedIconDisplay(5)).toEqual({ iconCount: 3, showTotalMultiplier: true })
  })

  it('computeTurnGainTotals nets resources and splits gained vs spent', () => {
    const gains = [
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: 10,
        round: 1,
        name: 'Signet Ring',
        amount: -1,
        type: RewardType.SOLARI,
      },
      {
        playerId: 0,
        source: GainSource.INTRIGUE,
        sourceId: 30,
        round: 1,
        name: 'Water of Life',
        amount: -1,
        type: RewardType.WATER,
      },
      {
        playerId: 0,
        source: GainSource.INTRIGUE,
        sourceId: 30,
        round: 1,
        name: 'Water of Life',
        amount: 3,
        type: RewardType.DRAW,
      },
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: 99,
        round: 1,
        name: 'Dune Trooper',
        amount: 1,
        type: RewardType.CARD,
      },
    ]

    const totals = computeTurnGainTotals(gains)
    expect(totals.resources).toEqual(
      expect.arrayContaining([
        { type: RewardType.SOLARI, net: -1, gained: 0, spent: 1 },
        { type: RewardType.WATER, net: -1, gained: 0, spent: 1 },
        { type: RewardType.DRAW, net: 3, gained: 3, spent: 0 },
      ])
    )
    expect(totals.cards).toEqual([{ cardId: 99, name: 'Dune Trooper', count: 1 }])
  })

  it('getGainsForTurnState only includes gains since gainsStartIndex', () => {
    const state = {
      currTurn: { playerId: 0, type: TurnType.ACTION, gainsStartIndex: 2 },
      gains: [
        { playerId: 0, round: 1, sourceId: 1, name: 'Old', amount: 1, type: RewardType.SPICE, source: GainSource.CARD },
        { playerId: 0, round: 1, sourceId: 2, name: 'Old2', amount: 1, type: RewardType.WATER, source: GainSource.CARD },
        { playerId: 0, round: 1, sourceId: 3, name: 'New', amount: 2, type: RewardType.SOLARI, source: GainSource.CARD },
        { playerId: 1, round: 1, sourceId: 4, name: 'Other', amount: 1, type: RewardType.SPICE, source: GainSource.CARD },
      ],
    } as Parameters<typeof getGainsForTurnState>[0]

    expect(getGainsForTurnState(state).map(g => g.name)).toEqual(['New'])
  })

  it('getGainsForTurnState omits combat gains when player has no troops in conflict', () => {
    const combatGain = {
      playerId: 0,
      round: 1,
      sourceId: 10,
      name: 'Stilgar',
      amount: 3,
      type: RewardType.COMBAT,
      source: GainSource.CARD,
    }
    const persuasionGain = {
      playerId: 0,
      round: 1,
      sourceId: 11,
      name: 'Convincing Argument',
      amount: 2,
      type: RewardType.PERSUASION,
      source: GainSource.CARD,
    }
    const base = {
      currTurn: { playerId: 0, type: TurnType.REVEAL, gainsStartIndex: 0 },
      gains: [persuasionGain, combatGain],
      combatTroops: {},
    } as Parameters<typeof getGainsForTurnState>[0]

    expect(getGainsForTurnState(base).map(g => g.type)).toEqual([RewardType.PERSUASION])

    const withTroops = { ...base, combatTroops: { 0: 2 } }
    expect(getGainsForTurnState(withTroops).map(g => g.type)).toEqual([
      RewardType.PERSUASION,
      RewardType.COMBAT,
    ])
  })

  it('getOtherPlayersGainsForTurnState groups gains for non-turn players', () => {
    const state = {
      currTurn: { playerId: 0, type: TurnType.ACTION, gainsStartIndex: 1 },
      gains: [
        { playerId: 0, round: 1, sourceId: 1, name: 'Old', amount: 1, type: RewardType.SPICE, source: GainSource.CARD },
        { playerId: 0, round: 1, sourceId: 2, name: 'Active', amount: 2, type: RewardType.WATER, source: GainSource.CARD },
        {
          playerId: 1,
          round: 1,
          sourceId: 3,
          name: 'Carthag Control Bonus',
          amount: 1,
          type: RewardType.SOLARI,
          source: GainSource.CONTROL,
        },
        {
          playerId: 2,
          round: 1,
          sourceId: 4,
          name: 'Gun Thopter',
          amount: -1,
          type: RewardType.TROOPS,
          source: GainSource.CARD,
        },
      ],
    } as Parameters<typeof getOtherPlayersGainsForTurnState>[0]

    expect(getOtherPlayersGainsForTurnState(state)).toEqual([
      {
        playerId: 1,
        gains: [
          expect.objectContaining({ name: 'Carthag Control Bonus', amount: 1, type: RewardType.SOLARI }),
        ],
      },
      {
        playerId: 2,
        gains: [expect.objectContaining({ name: 'Gun Thopter', amount: -1, type: RewardType.TROOPS })],
      },
    ])
  })

  it('groupGainsForDisplay merges discards into one inline group', () => {
    const gains = [
      {
        playerId: 1,
        source: GainSource.CARD,
        sourceId: 10,
        round: 1,
        name: 'Power Play',
        amount: -1,
        type: RewardType.DISCARD,
      },
      {
        playerId: 1,
        source: GainSource.CARD,
        sourceId: 11,
        round: 1,
        name: 'Reverend Mother Mohiam',
        amount: -1,
        type: RewardType.DISCARD,
      },
    ] as Parameters<typeof groupGainsForDisplay>[0]

    const groups = groupGainsForDisplay(gains, { inlineDiscards: true })
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe(INLINE_DISCARDS_GROUP_KEY)
    expect(groups[0].title).toBe('')
    expect(groups[0].gains).toHaveLength(2)
  })

  it('aggregateResourceGains groups CARD gains by card id', () => {
    const gains = [
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: 42,
        round: 1,
        name: 'Spy',
        amount: 1,
        type: RewardType.CARD,
      },
    ]
    expect(aggregateResourceGains(gains)[0]).toMatchObject({
      type: RewardType.CARD,
      amount: 1,
      cardId: 42,
      name: 'Spy',
    })
  })

  it('extracts acquire-effect gains per card and excludes them from totals list', () => {
    const cardId = 1033
    const gains = [
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: cardId,
        round: 1,
        name: 'Lady Jessica',
        amount: 1,
        type: RewardType.CARD,
      },
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: cardId,
        round: 1,
        name: 'Bene Gesserit Acquire',
        amount: 1,
        type: RewardType.INFLUENCE,
      },
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: 99,
        round: 1,
        name: 'Stilgar',
        amount: 3,
        type: RewardType.PERSUASION,
      },
    ]
    expect(getAcquireEffectGainsForCard(gains, cardId)).toHaveLength(1)
    expect(excludeAcquireEffectGains(gains, [cardId])).toHaveLength(1)
  })

  it('attributes acquire-trash gains to the acquired card source id', () => {
    const acquiredId = 7001
    const trashedId = 7002
    const gains = [
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: acquiredId,
        round: 1,
        name: 'Shai-Hulud',
        amount: 1,
        type: RewardType.CARD,
      },
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: acquiredId,
        round: 1,
        name: 'Treachery',
        amount: -1,
        type: RewardType.TRASH,
      },
    ]
    expect(getAcquireEffectGainsForCard(gains, acquiredId)).toContainEqual(
      expect.objectContaining({ type: RewardType.TRASH, name: 'Treachery', sourceId: acquiredId })
    )
    expect(getAcquireEffectGainsForCard(gains, trashedId)).toHaveLength(0)
  })
})
