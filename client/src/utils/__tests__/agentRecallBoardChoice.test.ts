import { describe, expect, it } from 'vitest'
import { ChoiceType, GainSource, type FixedOptionsChoice } from '../../types/GameTypes'
import {
  agentRecallOptionIndex,
  agentRecallSpaceIds,
  findAgentRecallBoardChoice,
  isAgentRecallBoardChoice,
} from '../agentRecallBoardChoice'

function recallChoice(): FixedOptionsChoice {
  return {
    id: 'urgent',
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Recall one of your Agents from a space',
    source: { type: GainSource.INTRIGUE, id: 29, name: 'Urgent Mission' },
    options: [
      { reward: { recallSpaceId: 10 }, rewardLabel: 'Mentat' },
      { reward: { recallSpaceId: 26 }, rewardLabel: 'Interstellar Shipping' },
    ],
  }
}

describe('agent recall board choice', () => {
  it('recognizes Urgent Mission space options', () => {
    const choice = recallChoice()
    expect(isAgentRecallBoardChoice(choice)).toBe(true)
    expect(agentRecallSpaceIds(choice)).toEqual([10, 26])
    expect(agentRecallOptionIndex(choice, 26)).toBe(1)
    expect(agentRecallOptionIndex(choice, 3)).toBe(-1)
  })

  it('ignores other fixed options', () => {
    const choice: FixedOptionsChoice = {
      ...recallChoice(),
      options: [
        { reward: { spice: 1 }, rewardLabel: 'Spice' },
        { reward: { solari: 1 }, rewardLabel: 'Solari' },
      ],
    }
    expect(isAgentRecallBoardChoice(choice)).toBe(false)
    expect(findAgentRecallBoardChoice([choice, recallChoice()])?.id).toBe('urgent')
  })
})
