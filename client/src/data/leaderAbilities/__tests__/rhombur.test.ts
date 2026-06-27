import { describe, expect, it } from 'vitest'
import { Leader } from '../../../types/GameTypes'
import { LEADER_NAMES } from '../../leaders'
import { dreadnoughtStrengthEach } from '../rhomburDreadnoughtStrength'

describe('Rhombur Vernius — dreadnought strength', () => {
  const rhombur = new Leader(
    LEADER_NAMES.PRINCE_RHOMBUR_VERNIUS,
    { name: 'Ixian Royalty', description: 'Dreadnoughts strength 4.' },
    'Signet',
    1
  )
  const other = new Leader('Paul Atreides', { name: 'A', description: 'B' }, 'S', 1)

  it('returns 4 for Prince Rhombur Vernius', () => {
    expect(dreadnoughtStrengthEach(rhombur)).toBe(4)
  })

  it('returns 3 for all other leaders', () => {
    expect(dreadnoughtStrengthEach(other)).toBe(3)
  })
})
