import { describe, expect, it } from 'vitest'
import { Leader } from '../../../types/GameTypes'
import { LEADER_NAMES } from '../../leaders'
import { applyLeaderStartingResourceDelta } from '../beastSetup'

describe('applyLeaderStartingResourceDelta', () => {
  const genericLeader = new Leader('Other', { name: 'A', description: 'B' }, 'S', 1)
  const hudro = new Leader(
    LEADER_NAMES.VISCOUNT_HUDRO_MORITANI,
    { name: 'Intelligence', description: 'Peek once.' },
    'Signet',
    1
  )

  it('grants +1 intrigue when swapping to Hudro in sandbox', () => {
    const adjusted = applyLeaderStartingResourceDelta(
      { spice: 0, solari: 0, water: 1, intrigueCount: 0, leader: genericLeader },
      hudro
    )
    expect(adjusted.intrigueCount).toBe(1)
  })

  it('removes Hudro intrigue bonus when swapping away', () => {
    const adjusted = applyLeaderStartingResourceDelta(
      { spice: 0, solari: 0, water: 1, intrigueCount: 1, leader: hudro },
      genericLeader
    )
    expect(adjusted.intrigueCount).toBe(0)
  })
})
