import { describe, expect, it } from 'vitest'
import { ChoiceType } from '../../../../types/GameTypes'
import {
  filterAcquireTechFromChoices,
  filterAcquireTechOptionalEffects,
  isAcquireTechOnlyChoiceOption,
  isAcquireTechOnlyOptional,
} from '../techTurnControlsUi'

describe('techTurnControlsUi', () => {
  it('filters acquire-tech-only optional effects', () => {
    const effects = [
      {
        id: 'acquire-only',
        cost: {},
        reward: { acquireTech: { discount: 2 } },
        source: { type: 'BOARD', id: 1, name: 'Dreadnought' },
      },
      {
        id: 'negotiator',
        cost: {},
        reward: { techNegotiator: 1 },
        source: { type: 'BOARD', id: 24, name: 'Tech Negotiation' },
      },
    ]
    expect(isAcquireTechOnlyOptional(effects[0])).toBe(true)
    expect(isAcquireTechOnlyOptional(effects[1])).toBe(false)
    expect(filterAcquireTechOptionalEffects(effects)).toEqual([effects[1]])
  })

  it('filters acquire-tech branch from OR choices but keeps negotiator', () => {
    const choice = {
      id: 'tech-neg',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Choose one option',
      options: [
        { reward: { techNegotiator: 2 } },
        { reward: { acquireTech: { discount: 0 } } },
      ],
      source: { type: 'BOARD', id: 24, name: 'Tech Negotiation' },
    }
    expect(isAcquireTechOnlyChoiceOption(choice.options[1])).toBe(true)
    const filtered = filterAcquireTechFromChoices([choice])
    expect(filtered).toHaveLength(1)
    expect(filtered[0].options).toHaveLength(1)
    expect(filtered[0].options[0].reward.techNegotiator).toBe(2)
  })
})
