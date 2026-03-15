import { Leader } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

export function getStartingSpice(leader: Leader): number {
  return leader.name === LEADER_NAMES.BEAST_RABBAN ? 1 : 0
}

export function getStartingSolari(leader: Leader): number {
  return leader.name === LEADER_NAMES.BEAST_RABBAN ? 1 : 0
}
