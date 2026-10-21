import type { GameState, Player } from '../types/GameTypes'
import { getOpponentDiscardableCards } from './playAreaDisplay'

/** Whether this opponent can discard a card or lose a deployed troop. */
export function testOfHumanityOptions(
  state: Pick<GameState, 'combatTroops'>,
  player: Player
): { canDiscard: boolean; canLose: boolean } {
  return {
    canDiscard: getOpponentDiscardableCards(player).length > 0,
    canLose: (state.combatTroops[player.id] ?? 0) > 0,
  }
}

/** Skip leaders who can do neither. */
export function opponentCanFaceTestOfHumanity(
  state: Pick<GameState, 'combatTroops'>,
  player: Player
): boolean {
  const options = testOfHumanityOptions(state, player)
  return options.canDiscard || options.canLose
}
