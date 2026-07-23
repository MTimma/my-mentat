import type { FixedOptionsChoice } from '../../types/GameTypes'
import { isKwisatzAgentSourceChoice } from '../../utils/kwisatzHaderach'
import { isFreighterPendingChoice } from '../GameContext/riseOfIx/freighter'

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

  if (isFreighterPendingChoice(choice)) {
    return {
      title: choice.prompt,
      lead: 'Advance your freighter on the Shipping track, or recall it to collect rewards from spaces you pass.',
      allowCancel: true,
    }
  }

  return {
    title: choice.prompt || 'Choose one option',
    allowCancel: true,
  }
}
