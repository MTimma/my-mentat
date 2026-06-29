import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../boardSpaces'
import {
  boardSpaceById,
  canPlayerVisitBoardSpaceOnce,
  isBoardSpaceAvailableForExpansions,
  isMentatAvailableOnBoard,
  playersEligibleForSwordmaster,
} from '../boardSpaceAvailability'
import { NO_EXPANSIONS, type Player } from '../../types/GameTypes'

const basePlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: 0,
    hasSwordmaster: false,
    hasHighCouncilSeat: false,
    ...overrides,
  }) as Player

describe('boardSpaceAvailability', () => {
  it('hides Rally Troops and Hall of Oratory when Rise of Ix is on', () => {
    const rally = BOARD_SPACES.find(s => s.name === 'Rally Troops')!
    const oratory = BOARD_SPACES.find(s => s.name === 'Hall of Oratory')!

    expect(isBoardSpaceAvailableForExpansions(rally, NO_EXPANSIONS)).toBe(true)
    expect(isBoardSpaceAvailableForExpansions(oratory, NO_EXPANSIONS)).toBe(true)
    expect(isBoardSpaceAvailableForExpansions(rally, { riseOfIx: true, riseOfIxEpic: false })).toBe(
      false
    )
    expect(
      isBoardSpaceAvailableForExpansions(oratory, { riseOfIx: true, riseOfIxEpic: false })
    ).toBe(false)
  })

  it('blocks repeat Swordmaster and High Council visits per player', () => {
    const swordmaster = BOARD_SPACES.find(s => s.name === 'Swordmaster')!
    const highCouncil = BOARD_SPACES.find(s => s.name === 'High Council')!

    expect(canPlayerVisitBoardSpaceOnce(swordmaster, basePlayer())).toBe(true)
    expect(canPlayerVisitBoardSpaceOnce(swordmaster, basePlayer({ hasSwordmaster: true }))).toBe(
      false
    )
    expect(canPlayerVisitBoardSpaceOnce(highCouncil, basePlayer())).toBe(true)
    expect(
      canPlayerVisitBoardSpaceOnce(highCouncil, basePlayer({ hasHighCouncilSeat: true }))
    ).toBe(false)
  })

  it('tracks mentat on board vs held by a player', () => {
    expect(isMentatAvailableOnBoard(null)).toBe(true)
    expect(isMentatAvailableOnBoard(0)).toBe(false)
  })

  it('lists players who have not taken Swordmaster yet', () => {
    const players = [
      basePlayer({ id: 0, hasSwordmaster: true }),
      basePlayer({ id: 1 }),
      basePlayer({ id: 2, hasSwordmaster: true }),
      basePlayer({ id: 3 }),
    ] as Player[]

    expect(playersEligibleForSwordmaster(players).map(p => p.id)).toEqual([1, 3])
  })

  it('swaps Research Station when Immortality is on', () => {
    const base = boardSpaceById(3, NO_EXPANSIONS)
    const immo = boardSpaceById(3, { ...NO_EXPANSIONS, immortality: true })
    expect(base?.effects?.[0]?.reward.drawCards).toBe(3)
    expect(base?.effects?.[0]?.reward.research).toBeUndefined()
    expect(immo?.immortality).toBe(true)
    expect(immo?.effects?.[0]?.reward.drawCards).toBe(2)
    expect(immo?.effects?.[0]?.reward.research).toBe(1)
  })
})
