import { SpaceProps, Player } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function shouldGrantIlbanSolariDraw(space: SpaceProps, player: Player): boolean {
  return Boolean(space.cost?.solari && player.leader.name === LEADER_NAMES.COUNT_ILBAN_RICHESE)
}
