import { Leader } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

/** Viscount Hudro Moritani — simplified: +1 intrigue at game start. */
export function getStartingIntrigue(leader: Leader): number {
  return leader.name === LEADER_NAMES.VISCOUNT_HUDRO_MORITANI ? 1 : 0
}
