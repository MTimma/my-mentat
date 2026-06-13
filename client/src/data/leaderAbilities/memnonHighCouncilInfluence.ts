import { Player, PendingReward, GainSource } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function shouldGrantMemnonInfluence(player: Player): boolean {
  return player.leader.name === LEADER_NAMES.EARL_MEMNON_THORVALD
}

export function buildMemnonInfluenceReward(spaceId: number): PendingReward {
  return {
    // One Memnon High Council reward can be pending at a time → base id suffices.
    id: `memnon-high-council-${spaceId}-REWARD`,
    source: { type: GainSource.MEMNON_HIGH_COUNCIL, id: spaceId, name: 'Memnon: High Council' },
    reward: { influence: { amounts: [] } },
    isTrash: false,
  }
}
