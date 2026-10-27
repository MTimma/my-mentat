import {
  ChoiceType,
  type FixedOptionsChoice,
  type PendingChoice,
} from '../types/GameTypes'

/** Fixed-options recall choices resolved by clicking occupied spaces on the image board. */
export function isAgentRecallBoardChoice(choice: FixedOptionsChoice): boolean {
  return (
    choice.type === ChoiceType.FIXED_OPTIONS &&
    choice.options.length > 0 &&
    choice.options.every(option => typeof option.reward.recallSpaceId === 'number')
  )
}

export function findAgentRecallBoardChoice(
  choices: PendingChoice[] | undefined
): FixedOptionsChoice | null {
  const found = choices?.find(
    choice =>
      choice.type === ChoiceType.FIXED_OPTIONS &&
      !choice.disabled &&
      isAgentRecallBoardChoice(choice)
  )
  return found?.type === ChoiceType.FIXED_OPTIONS ? found : null
}

export function agentRecallSpaceIds(choice: FixedOptionsChoice): number[] {
  return choice.options.flatMap(option =>
    typeof option.reward.recallSpaceId === 'number' ? [option.reward.recallSpaceId] : []
  )
}

export function agentRecallOptionIndex(choice: FixedOptionsChoice, spaceId: number): number {
  return choice.options.findIndex(option => option.reward.recallSpaceId === spaceId)
}
