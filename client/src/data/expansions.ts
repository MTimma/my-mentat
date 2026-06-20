export {
  type Expansions,
  NO_EXPANSIONS,
  normalizeExpansions,
} from '../types/GameTypes'

import type { Expansions } from '../types/GameTypes'

/** Run `when` only when Rise of Ix is enabled on `state`. */
export function withRiseOfIx<T extends { expansions: Expansions }>(
  state: T,
  when: () => T
): T {
  return state.expansions.riseOfIx ? when() : state
}
