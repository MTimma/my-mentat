import { describe, expect, it } from 'vitest'
import { FactionType } from '../../types/GameTypes'
import {
  applyDistinctChoiceExclusion,
  applyDistinctFactionExclusion,
  distinctFactionGroupKey,
  filterConflictChoiceOptions,
  filterConflictInfluenceOptions,
  isBlockedDistinctChoiceGroup,
  isBlockedDistinctFactionChoice,
  originalChoiceOptionIndex,
} from '../conflictDistinctFactions'
import type { ConflictRewardChoice } from '../influenceBoardChoice'

function influenceChoice(id: string, group?: string): ConflictRewardChoice {
  const factions = [
    FactionType.EMPEROR,
    FactionType.SPACING_GUILD,
    FactionType.BENE_GESSERIT,
    FactionType.FREMEN,
  ]
  return {
    id,
    playerId: 0,
    placement: '1st place',
    conflictId: 909,
    conflictName: 'Machinations',
    distinctFactionGroup: group,
    excludedFactions: [],
    options: factions.map(faction => ({
      reward: { influence: { amounts: [{ faction, amount: 1 }] } },
    })),
  }
}

describe('conflictDistinctFactions', () => {
  it('distinctFactionGroupKey is stable per conflict placement and player', () => {
    expect(distinctFactionGroupKey(909, '1st place', 0)).toBe('909:1st place:p0')
  })

  it('filterConflictInfluenceOptions removes excluded factions', () => {
    const choice = influenceChoice('a')
    const filtered = filterConflictInfluenceOptions(choice.options, [FactionType.EMPEROR])
    expect(filtered).toHaveLength(3)
    expect(filtered.some(opt => opt.reward.influence?.amounts[0].faction === FactionType.EMPEROR)).toBe(
      false
    )
  })

  it('isBlockedDistinctFactionChoice blocks later picks in the same group', () => {
    const group = distinctFactionGroupKey(909, '1st place', 0)
    const pending = [influenceChoice('first', group), influenceChoice('second', group)]
    expect(isBlockedDistinctFactionChoice(pending[0], pending)).toBe(false)
    expect(isBlockedDistinctFactionChoice(pending[1], pending)).toBe(true)
  })

  it('applyDistinctFactionExclusion updates sibling choices after a pick', () => {
    const group = distinctFactionGroupKey(909, '1st place', 0)
    const pending = [influenceChoice('first', group), influenceChoice('second', group)]
    const updated = applyDistinctFactionExclusion(pending, pending[0], FactionType.FREMEN)
    const second = updated.find(c => c.id === 'second')!
    expect(second.excludedFactions).toEqual([FactionType.FREMEN])
    expect(second.options).toHaveLength(3)
    expect(
      second.options.some(opt => opt.reward.influence?.amounts[0].faction === FactionType.FREMEN)
    ).toBe(false)
  })

  it('filterConflictChoiceOptions removes excluded indices', () => {
    const options = [
      { reward: { intrigueCards: 1 } },
      { reward: { spice: 2 } },
      { reward: { solari: 3 } },
    ]
    expect(filterConflictChoiceOptions(options, [1])).toHaveLength(2)
    expect(filterConflictChoiceOptions(options, [1])[1].reward.solari).toBe(3)
  })

  it('isBlockedDistinctChoiceGroup blocks later picks in the same group', () => {
    const group = '916:2nd place:p1'
    const pending = [
      { ...influenceChoice('first'), distinctChoiceGroup: group },
      { ...influenceChoice('second'), distinctChoiceGroup: group },
    ]
    expect(isBlockedDistinctChoiceGroup(pending[0], pending)).toBe(false)
    expect(isBlockedDistinctChoiceGroup(pending[1], pending)).toBe(true)
  })

  it('applyDistinctChoiceExclusion removes picked option from sibling choices', () => {
    const group = '916:2nd place:p1'
    const fullOptions = [
      { reward: { intrigueCards: 1 } },
      { reward: { spice: 2 } },
      { reward: { solari: 3 } },
    ]
    const pending = [
      {
        ...influenceChoice('first'),
        distinctChoiceGroup: group,
        fullOptions,
        options: fullOptions,
        excludedChoiceIndices: [],
      },
      {
        ...influenceChoice('second'),
        distinctChoiceGroup: group,
        fullOptions,
        options: fullOptions,
        excludedChoiceIndices: [],
      },
    ]
    const updated = applyDistinctChoiceExclusion(pending, pending[0], 1)
    const second = updated.find(c => c.id === 'second')!
    expect(second.excludedChoiceIndices).toEqual([1])
    expect(second.options).toHaveLength(2)
    expect(second.options.some(opt => opt.reward.spice === 2)).toBe(false)
  })

  it('originalChoiceOptionIndex maps visible index through exclusions', () => {
    const choice = {
      ...influenceChoice('pick'),
      fullOptions: [
        { reward: { intrigueCards: 1 } },
        { reward: { spice: 2 } },
        { reward: { solari: 3 } },
      ],
      options: [
        { reward: { intrigueCards: 1 } },
        { reward: { solari: 3 } },
      ],
      excludedChoiceIndices: [1],
    }
    expect(originalChoiceOptionIndex(choice, 0)).toBe(0)
    expect(originalChoiceOptionIndex(choice, 1)).toBe(2)
  })
})
