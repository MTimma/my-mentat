import {
  AgentIcon,
  Card,
  CardPile,
  CardSelectChoice,
  ChoiceType,
  GameState,
  GainSource,
  Leader,
  Player,
} from '../../types/GameTypes'
import { BOARD_SPACES } from '../boardSpaces'
import { LEADER_NAMES } from '../leaders'
import { nextSemanticId } from '../../utils/semanticIds'

const ARMAND_QUALIFYING_ICONS = new Set<AgentIcon>([
  AgentIcon.CITY,
  AgentIcon.SPICE_TRADE,
  AgentIcon.LANDSRAAD,
])

export function isArmandLeader(leader: Leader): boolean {
  return leader.name === LEADER_NAMES.ARCHDUKE_ARMAND_ECAZ
}

export function countArmandQualifyingAgents(state: GameState, playerId: number): number {
  return Object.entries(state.occupiedSpaces).filter(([spaceId, occupants]) => {
    if (!occupants.includes(playerId)) return false
    const space = BOARD_SPACES.find(s => s.id === Number(spaceId))
    return Boolean(space && ARMAND_QUALIFYING_ICONS.has(space.agentIcon))
  }).length
}

export function shouldOfferArmandTrashChoice(state: GameState, player: Player): boolean {
  if (!isArmandLeader(player.leader)) return false
  if (player.playArea.length === 0) return false
  return countArmandQualifyingAgents(state, player.id) >= 2
}

export function buildArmandTrashChoice(
  state: GameState,
  player: Player,
  existingChoiceIds: Iterable<string> = []
): CardSelectChoice {
  const source = { type: GainSource.LEADER_ABILITY as const, id: 0, name: "Houses' Confidence" }
  return {
    id: nextSemanticId(source, 'TRASH', existingChoiceIds),
    type: ChoiceType.CARD_SELECT,
    prompt: "Trash 1 card in play (Armand)",
    piles: [CardPile.PLAY_AREA],
    selectionCount: 1,
    disabled: player.playArea.length === 0,
    onResolve: (cardIds: number[]) => ({
      type: 'TRASH_CARD',
      playerId: player.id,
      cardId: cardIds[0],
    }),
    source,
  }
}

export function buildArmandSignetAcquireChoice(
  state: GameState,
  playerId: number,
  card: Card,
  existingChoiceIds: Iterable<string> = []
): CardSelectChoice {
  const source = { type: GainSource.CARD as const, id: card.id, name: 'Signet Ring' }
  return {
    id: nextSemanticId(source, 'ACQUIRE', existingChoiceIds),
    type: ChoiceType.CARD_SELECT,
    prompt: 'Acquire a card costing 3 or less (free)',
    piles: [],
    cards: state.imperiumRow,
    filter: (c: Card) => (c.cost ?? 0) <= 3,
    selectionCount: 1,
    disabled: !state.imperiumRow.some(c => (c.cost ?? 0) <= 3),
    onResolve: (cardIds: number[]) => ({
      type: 'ACQUIRE_CARD',
      playerId,
      cardId: cardIds[0],
      freeAcquire: true,
    }),
    source,
  }
}
