import { describe, expect, it } from 'vitest'
import { Leader } from '../../../types/GameTypes'
import { LEADER_NAMES } from '../../leaders'
import {
  applyYunaSolariBonus,
  getStartingWater,
  isYunaLeader,
  shouldGrantYunaSolariBonus,
} from '../yunaSolariBonus'
import { getRoiTestState, makePlayer } from '../../../components/GameContext/__tests__/_helpers'

describe('Yuna Moritani — solari bonus & setup', () => {
  const yuna = new Leader(
    LEADER_NAMES.PRINCESS_YUNA_MORITANI,
    { name: 'Spice Royalty', description: '+1 solari on own turn.' },
    'Signet',
    2
  )
  const other = new Leader('Paul Atreides', { name: 'A', description: 'B' }, 'S', 1)

  it('Yuna starts with 0 water', () => {
    expect(getStartingWater(yuna)).toBe(0)
    expect(getStartingWater(other)).toBe(1)
  })

  it('shouldGrantYunaSolariBonus on active player with solari reward', () => {
    const s = getRoiTestState({
      playerOverrides: { leader: yuna },
      activeId: 0,
    })
    expect(shouldGrantYunaSolariBonus(s, s.players[0], { solari: 3 })).toBe(true)
    expect(shouldGrantYunaSolariBonus(s, s.players[0], { spice: 1 })).toBe(false)
  })

  it('no bonus when not active player', () => {
    const s = getRoiTestState({ players: 2, activeId: 1 })
    const yunaPlayer = { ...s.players[0], leader: yuna }
    expect(shouldGrantYunaSolariBonus(s, yunaPlayer, { solari: 2 })).toBe(false)
  })

  it('no bonus for non-Yuna leader', () => {
    const s = getRoiTestState()
    expect(shouldGrantYunaSolariBonus(s, s.players[0], { solari: 2 })).toBe(false)
  })

  it('applyYunaSolariBonus adds exactly +1', () => {
    expect(applyYunaSolariBonus(4)).toBe(5)
    expect(applyYunaSolariBonus(1)).toBe(2)
  })

  it('isYunaLeader', () => {
    expect(isYunaLeader(yuna)).toBe(true)
    expect(isYunaLeader(other)).toBe(false)
  })
})
