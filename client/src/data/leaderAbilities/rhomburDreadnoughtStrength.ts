import type { Leader } from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'

/** Dreadnought strength per unit (Rhombur: 4, default: 3). */
export function dreadnoughtStrengthEach(leader: Leader): 3 | 4 {
  return leader.name === LEADER_NAMES.PRINCE_RHOMBUR_VERNIUS ? 4 : 3
}
