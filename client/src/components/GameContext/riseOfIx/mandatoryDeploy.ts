import type { Card, Gain, GameState, Player, Reward } from '../../../types/GameTypes'
import { GainSource, RewardType } from '../../../types/GameTypes'
import { recruitTroopsToGarrison } from '../../../utils/troops'

/** Treachery reveal/unload: recruit N troops and must deploy all of them to the Conflict. */
export function isMandatoryRecruitAndDeployEffect(
  card: Card,
  reward: Pick<Reward, 'troops' | 'deployTroops'> | undefined
): boolean {
  return (
    card.name === 'Treachery' &&
    (reward?.troops ?? 0) > 0 &&
    (reward?.deployTroops ?? 0) > 0
  )
}

export function applyImmediateTroopRecruit(
  player: Player,
  amount: number,
  gains: Gain[],
  state: GameState,
  playerId: number,
  sourceId: number,
  sourceName: string
): Player {
  if (amount <= 0) return player
  const recruited = recruitTroopsToGarrison(player, amount)
  if (recruited.recruited > 0) {
    gains.push({
      round: state.currentRound,
      playerId,
      sourceId,
      name: sourceName,
      amount: recruited.recruited,
      type: RewardType.TROOPS,
      source: GainSource.CARD,
    })
  }
  return recruited.player
}
