import { describe, expect, it } from 'vitest'
import { FactionType } from '../../types/GameTypes'
import {
  applyDistinctFactionExclusion,
  distinctFactionGroupKey,
  filterConflictInfluenceOptions,
  isBlockedDistinctFactionChoice,
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
})
