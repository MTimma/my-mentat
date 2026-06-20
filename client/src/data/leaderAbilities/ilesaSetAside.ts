import {
  Card,
  CardPile,
  CardSelectChoice,
  ChoiceType,
  CustomEffect,
  GameState,
  GainSource,
  Leader,
  Player,
  Reward,
  TurnType,
} from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'
import { nextSemanticId } from '../../utils/semanticIds'

export function isIlesaLeader(leader: Leader): boolean {
  return leader.name === LEADER_NAMES.ILESA_ECAZ
}

export function buildIlesaSetAsideChoice(
  state: GameState,
  player: Player,
  existingChoiceIds: Iterable<string> = []
): CardSelectChoice | null {
  if (!isIlesaLeader(player.leader)) return null
  if (player.deck.length === 0) return null
  const source = { type: GainSource.LEADER_ABILITY as const, id: 0, name: 'Hidden Pact' }
  return {
    id: nextSemanticId(source, 'SET-ASIDE', existingChoiceIds),
    type: ChoiceType.CARD_SELECT,
    prompt: 'Set a card aside for this round (Ilesa)',
    piles: [CardPile.DECK],
    selectionCount: 1,
    onResolve: (cardIds: number[]) => ({
      type: 'CUSTOM_EFFECT',
      playerId: player.id,
      customEffect: CustomEffect.ILESA_SET_ASIDE,
      data: { cardId: cardIds[0] },
    }),
    source,
  }
}

export function resolveIlesaSetAside(player: Player, cardId: number): Player {
  const cardIndex = player.deck.findIndex(c => c.id === cardId)
  if (cardIndex < 0) return player
  const card = player.deck[cardIndex]
  const deck = player.deck.filter(c => c.id !== cardId)
  const handCount =
    cardIndex < player.handCount ? Math.max(0, player.handCount - 1) : player.handCount
  return {
    ...player,
    deck,
    handCount,
    setAsideCard: card,
    ilesaSetAsidePending: false,
  }
}

export function shouldGrantIlesaPlayBonus(
  player: Player,
  card: Card | undefined,
  agentTurnsThisRound: number
): boolean {
  if (!isIlesaLeader(player.leader)) return false
  if (!player.setAsideCard || !card) return false
  if (card.id !== player.setAsideCard.id) return false
  return agentTurnsThisRound === 1
}

export function buildIlesaPlayBonusReward(card: Card): Reward {
  const agentIcons = card.agentIcons?.length ?? 0
  return agentIcons === 1 ? { spice: 1 } : { solari: 1 }
}

export function clearIlesaSetAside(player: Player): Player {
  return { ...player, setAsideCard: null }
}

export function prepareIlesaPlayersForRound(players: Player[]): Player[] {
  return players.map(p =>
    isIlesaLeader(p.leader)
      ? {
          ...p,
          setAsideCard: null,
          agentTurnsThisRound: 0,
          ilesaSetAsidePending: true,
        }
      : { ...p, agentTurnsThisRound: 0 }
  )
}

export function prepareIlesaSecondTurnCard(player: Player): Player {
  if (!isIlesaLeader(player.leader)) return player
  if (!player.setAsideCard) return player
  if ((player.agentTurnsThisRound ?? 0) !== 1) return player
  if (player.deck.some(c => c.id === player.setAsideCard!.id)) return player
  return {
    ...player,
    deck: [...player.deck, player.setAsideCard],
    handCount: player.handCount + 1,
  }
}

export function beginIlesaSetAsideTurn(state: GameState, playerId: number): GameTurn | null {
  const player = state.players.find(p => p.id === playerId)
  if (!player?.ilesaSetAsidePending) return null
  const choice = buildIlesaSetAsideChoice(state, player)
  if (!choice) return null
  return {
    playerId,
    type: TurnType.ACTION,
    canDeployTroops: false,
    troopLimit: 0,
    removableTroops: 0,
    removableDreadnoughts: 0,
    dreadnoughtsDeployedToConflict: 0,
    troopsRetreatedFromConflict: 0,
    gainsStartIndex: state.gains.length,
    persuasionCount: 0,
    gainedEffects: [],
    acquiredCards: [],
    pendingChoices: [choice],
  }
}
