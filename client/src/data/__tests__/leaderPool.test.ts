import { describe, expect, it } from 'vitest'
import { LEADERS, RISE_OF_IX_LEADERS, getLeaderPool, LEADER_NAMES } from '../leaders'
import { NO_EXPANSIONS } from '../../types/GameTypes'

describe('getLeaderPool', () => {
  it('getLeaderPool({ riseOfIx: false }).length === 8', () => {
    expect(getLeaderPool(NO_EXPANSIONS)).toHaveLength(8)
    expect(LEADERS).toHaveLength(8)
  })

  it('getLeaderPool({ riseOfIx: true }).length === 14', () => {
    expect(getLeaderPool({ riseOfIx: true, riseOfIxEpic: false })).toHaveLength(14)
  })

  it('with riseOfIx on, length includes RoI leaders', () => {
    const pool = getLeaderPool({ riseOfIx: true, riseOfIxEpic: false })
    expect(pool).toHaveLength(LEADERS.length + RISE_OF_IX_LEADERS.length)
    expect(RISE_OF_IX_LEADERS).toHaveLength(6)
  })

  it('includes all six RoI leader names', () => {
    const pool = getLeaderPool({ riseOfIx: true, riseOfIxEpic: false })
    const names = pool.map(l => l.name)
    expect(names).toContain(LEADER_NAMES.PRINCE_RHOMBUR_VERNIUS)
    expect(names).toContain(LEADER_NAMES.VISCOUNT_HUDRO_MORITANI)
    expect(names).toContain(LEADER_NAMES.PRINCESS_YUNA_MORITANI)
    expect(names).toContain(LEADER_NAMES.ARCHDUKE_ARMAND_ECAZ)
    expect(names).toContain(LEADER_NAMES.ILESA_ECAZ)
    expect(names).toContain(LEADER_NAMES.TESSIA_VERNIUS)
  })
})
