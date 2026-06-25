import { describe, expect, it } from 'vitest'
import { ChoiceType, CustomEffect } from '../../../types/GameTypes'
import { getFixedChoiceModalMeta } from '../fixedChoiceModalMeta'

describe('getFixedChoiceModalMeta', () => {
  it('uses Kwisatz copy for agent-source choices', () => {
    const meta = getFixedChoiceModalMeta({
      id: 'card-1031-KWISATZ-AGENT-SOURCE',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'ignored',
      options: [
        { reward: { custom: CustomEffect.KWISATZ_FROM_SUPPLY }, rewardLabel: 'Agent from supply' },
        { reward: { custom: CustomEffect.KWISATZ_RECALL_AGENT }, rewardLabel: 'Recall from board' },
      ],
    })
    expect(meta.title).toBe('Kwisatz Haderach')
    expect(meta.lead).toContain('supply')
    expect(meta.allowCancel).toBe(false)
  })

  it('falls back to choice prompt for generic fixed options', () => {
    const meta = getFixedChoiceModalMeta({
      id: 'card-1-OR-0',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Choose one reward',
      options: [{ reward: { troops: 1 } }],
    })
    expect(meta.title).toBe('Choose one reward')
    expect(meta.allowCancel).toBe(true)
  })
})
