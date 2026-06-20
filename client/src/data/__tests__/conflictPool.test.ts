import { describe, expect, it } from 'vitest'
import { CONFLICTS, RISE_OF_IX_CONFLICTS, getConflictPool } from '../conflicts'
import { NO_EXPANSIONS } from '../../types/GameTypes'

describe('getConflictPool', () => {
  it('getConflictPool({ riseOfIx: false }).length === 18', () => {
    expect(getConflictPool(NO_EXPANSIONS)).toHaveLength(18)
    expect(CONFLICTS).toHaveLength(18)
  })

  it('getConflictPool({ riseOfIx: true }).length === 22', () => {
    expect(getConflictPool({ riseOfIx: true, riseOfIxEpic: false })).toHaveLength(22)
  })

  it('tier counts match the data (base 4 / 10 / 4 + RoI additions)', () => {
    const pool = getConflictPool({ riseOfIx: true, riseOfIxEpic: false })
    expect(pool.filter(c => c.tier === 1)).toHaveLength(6)
    expect(pool.filter(c => c.tier === 2)).toHaveLength(11)
    expect(pool.filter(c => c.tier === 3)).toHaveLength(5)
  })
})
