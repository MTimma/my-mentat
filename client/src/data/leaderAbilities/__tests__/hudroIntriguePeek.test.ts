import { describe, expect, it } from 'vitest'
import { Leader } from '../../../types/GameTypes'
import { LEADER_NAMES } from '../../leaders'
import {
  applyHudroStartingIntrigue,
  consumeHudroPeek,
  hudroPeekAvailable,
  isHudroLeader,
} from '../hudroIntriguePeek'
import { makePlayer } from '../../../components/GameContext/__tests__/_helpers'

describe('Hudro Moritani — intrigue peek (simplified)', () => {
  const hudroLeader = new Leader(
    LEADER_NAMES.VISCOUNT_HUDRO_MORITANI,
    { name: 'Intelligence', description: 'Peek once.' },
    'Signet',
    1
  )

  it('isHudroLeader identifies Viscount Hudro Moritani', () => {
    expect(isHudroLeader(hudroLeader)).toBe(true)
    expect(isHudroLeader(new Leader('Other', { name: 'A', description: 'B' }, 'S', 1))).toBe(false)
  })

  it('hudroPeekAvailable is true until consumed', () => {
    expect(hudroPeekAvailable(hudroLeader)).toBe(true)
    expect(hudroPeekAvailable(consumeHudroPeek(hudroLeader))).toBe(false)
  })

  it('applyHudroStartingIntrigue grants +1 intrigue once', () => {
    const player = makePlayer(0, { leader: hudroLeader, intrigueCount: 0 })
    const after = applyHudroStartingIntrigue(player)
    expect(after.intrigueCount).toBe(1)
    expect(after.leader.hudroPeekUsed).toBe(true)

    const again = applyHudroStartingIntrigue(after)
    expect(again.intrigueCount).toBe(1)
  })

  it('non-Hudro player unchanged', () => {
    const player = makePlayer(0, { intrigueCount: 2 })
    expect(applyHudroStartingIntrigue(player)).toBe(player)
  })
})
