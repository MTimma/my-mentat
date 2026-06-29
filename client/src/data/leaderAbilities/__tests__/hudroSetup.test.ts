import { describe, expect, it } from 'vitest'
import { Leader } from '../../../types/GameTypes'
import { LEADER_NAMES } from '../../leaders'
import { getStartingIntrigue } from '../hudroSetup'

describe('Hudro Moritani — starting intrigue', () => {
  const hudroLeader = new Leader(
    LEADER_NAMES.VISCOUNT_HUDRO_MORITANI,
    { name: 'Intelligence', description: 'Peek once.' },
    'Signet',
    1
  )

  it('grants 1 intrigue for Viscount Hudro Moritani', () => {
    expect(getStartingIntrigue(hudroLeader)).toBe(1)
  })

  it('grants 0 intrigue for other leaders', () => {
    expect(getStartingIntrigue(new Leader('Other', { name: 'A', description: 'B' }, 'S', 1))).toBe(0)
  })
})
