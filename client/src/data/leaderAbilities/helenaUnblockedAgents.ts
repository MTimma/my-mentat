import { SpaceProps, Player, AgentIcon } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function canPlaceDespiteOccupancy(space: SpaceProps, player: Player): boolean {
  return (
    player.leader.name === LEADER_NAMES.HELENA_RICHESE &&
    (space.agentIcon === AgentIcon.LANDSRAAD || space.agentIcon === AgentIcon.CITY)
  )
}
