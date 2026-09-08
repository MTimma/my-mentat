import { describe, expect, it } from 'vitest'
import { LEADERS, RISE_OF_IX_LEADERS, getLeaderPool, LEADER_NAMES, areAllLeadersAssigned, createUnassignedLeader, isUnassignedLeader } from '../leaders'
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

describe('unassigned sandbox leaders', () => {
  it('areAllLeadersAssigned is false until every seat has a real leader', () => {
    const empty = createUnassignedLeader()
    const paul = LEADERS.find(l => l.name === LEADER_NAMES.PAUL_ATREIDES)!
    expect(areAllLeadersAssigned([{ leader: empty }, { leader: empty }])).toBe(false)
    expect(areAllLeadersAssigned([{ leader: paul }, { leader: empty }])).toBe(false)
    expect(areAllLeadersAssigned([{ leader: paul }, { leader: paul }])).toBe(true)
  })

  it('isUnassignedLeader matches the placeholder name', () => {
    expect(isUnassignedLeader(createUnassignedLeader())).toBe(true)
    expect(isUnassignedLeader(LEADERS[0])).toBe(false)
  })
})
