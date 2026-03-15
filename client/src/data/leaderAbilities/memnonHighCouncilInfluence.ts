import { Player, PendingReward, GainSource } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function shouldGrantMemnonInfluence(player: Player): boolean {
  return player.leader.name === LEADER_NAMES.EARL_MEMNON_THORVALD
}

export function buildMemnonInfluenceReward(spaceId: number): PendingReward {
  return {
    id: `memnon-high-council-${crypto.randomUUID()}`,
    source: { type: GainSource.MEMNON_HIGH_COUNCIL, id: spaceId, name: 'Memnon: High Council' },
    reward: { influence: { amounts: [] } },
    isTrash: false,
  }
}
