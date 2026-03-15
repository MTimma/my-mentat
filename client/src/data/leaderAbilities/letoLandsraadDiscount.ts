import { SpaceProps, Player, AgentIcon } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function getEffectiveSolariCost(space: SpaceProps, player: Player): number {
  if (
    space.agentIcon === AgentIcon.LANDSRAAD &&
    space.cost?.solari &&
    player.leader.name === LEADER_NAMES.DUKE_LETO
  ) {
    return Math.max(0, space.cost.solari - 1)
  }
  return space.cost?.solari ?? 0
}
