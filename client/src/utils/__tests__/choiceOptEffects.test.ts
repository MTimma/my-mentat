import { describe, expect, it } from 'vitest'
import { normalizeChoiceOptEffects } from '../choiceOptEffects'

describe('normalizeChoiceOptEffects', () => {
  it('splits compound choiceOpt persuasion/combat into separate effects', () => {
    const normalized = normalizeChoiceOptEffects([
      { choiceOpt: true, reward: { persuasion: 2, combat: 2 } },
    ])
    expect(normalized).toEqual([
      { choiceOpt: true, reward: { persuasion: 2 } },
      { choiceOpt: true, reward: { combat: 2 } },
    ])
  })

  it('leaves separate choiceOpt effects unchanged', () => {
    const input = [
      { choiceOpt: true, reward: { spice: 1 } },
      { choiceOpt: true, reward: { water: 1 } },
    ]
    expect(normalizeChoiceOptEffects(input)).toEqual(input)
  })
})
