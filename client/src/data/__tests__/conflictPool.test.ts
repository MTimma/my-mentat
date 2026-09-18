import { describe, expect, it } from 'vitest'
import { CONFLICTS, RISE_OF_IX_CONFLICTS, getConflictPool, isConflictInDiscard, resolveConflictsById } from '../conflicts'
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

  it('isConflictInDiscard matches by id, not object identity', () => {
    const original = CONFLICTS[0]
    const clone = { ...original }
    expect(isConflictInDiscard([clone], original.id)).toBe(true)
    expect(isConflictInDiscard([], original.id)).toBe(false)
  })

  it('resolveConflictsById preserves order and rejects unknown or duplicate ids', () => {
    const pool = getConflictPool(NO_EXPANSIONS)
    const resolved = resolveConflictsById(pool, [CONFLICTS[2].id, CONFLICTS[0].id])
    expect(resolved?.map(c => c.id)).toEqual([CONFLICTS[2].id, CONFLICTS[0].id])
    expect(resolveConflictsById(pool, [CONFLICTS[0].id, 99999])).toBeNull()
    expect(resolveConflictsById(pool, [CONFLICTS[0].id, CONFLICTS[0].id])).toBeNull()
  })
})
