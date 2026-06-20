import {
  ChoiceType,
  type FixedOptionsChoice,
  type GameState,
  GainSource,
} from '../../../types/GameTypes'
import { nextSemanticId } from '../../../utils/semanticIds'
import { hasAvailableTechTile } from './freighter'

export const TECH_NEGOTIATION_SPACE_ID = 24

/** Tech Negotiation: acquire tech (−1) OR place one negotiator on Ix — not both. */
export function buildTechNegotiationChoice(
  state: GameState,
  spaceName: string,
  playerId: number,
  existingChoiceIds: string[]
): FixedOptionsChoice {
  const source = { type: GainSource.BOARD_SPACE, id: TECH_NEGOTIATION_SPACE_ID, name: spaceName }
  const choiceId = nextSemanticId(source, 'OR', existingChoiceIds)
  const hasTech = hasAvailableTechTile(state)
  const player = state.players.find(p => p.id === playerId)
  const canNegotiate = (player?.troopSupply ?? 0) >= 1

  return {
    id: choiceId,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Tech Negotiation',
    source,
    options: [
      {
        reward: { acquireTech: { discount: 1 } },
        disabled: !hasTech,
      },
      {
        reward: { techNegotiator: 1 },
        disabled: !canNegotiate,
      },
    ],
  }
}
