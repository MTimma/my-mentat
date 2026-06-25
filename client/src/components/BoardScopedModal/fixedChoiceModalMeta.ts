import type { FixedOptionsChoice } from '../../types/GameTypes'
import { isKwisatzAgentSourceChoice } from '../../utils/kwisatzHaderach'

export interface FixedChoiceModalMeta {
  title: string
  lead?: string
  allowCancel: boolean
}

export function getFixedChoiceModalMeta(choice: FixedOptionsChoice): FixedChoiceModalMeta {
  if (isKwisatzAgentSourceChoice(choice.id)) {
    return {
      title: 'Kwisatz Haderach',
      lead:
        'Send an Agent from your supply (you get the space\'s effects and pay its costs) or recall one already on the board (no effects at the new space; costs still apply).',
      allowCancel: false,
    }
  }

  return {
    title: choice.prompt || 'Choose one option',
    allowCancel: true,
  }
}
