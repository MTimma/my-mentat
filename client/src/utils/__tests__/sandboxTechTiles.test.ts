import { describe, expect, it } from 'vitest'
import { TechTileId } from '../../data/techTiles'
import { makePlayer } from '../../components/GameContext/__tests__/_helpers'
import {
  allowedEmptyStacks,
  canConfirmSandboxStackTops,
  isSandboxIxBoardReady,
  isSandboxStackTopsValid,
  ixBoardTechTileIds,
  normalizeSandboxStackTops,
  requiredFilledStacks,
  sandboxBlockedTechIdsForPlayer,
  tilesAvailableForBoard,
} from '../sandboxTechTiles'
import { buildIxBoardFromSandboxStackTops } from '../../components/GameContext/riseOfIxReducer'

describe('sandboxTechTiles', () => {
  it('tracks how many stacks can be empty as player tech grows', () => {
    expect(requiredFilledStacks(18)).toBe(3)
    expect(allowedEmptyStacks(18)).toBe(0)

    expect(requiredFilledStacks(12)).toBe(2)
    expect(allowedEmptyStacks(12)).toBe(1)

    expect(requiredFilledStacks(6)).toBe(1)
    expect(allowedEmptyStacks(6)).toBe(2)

    expect(requiredFilledStacks(0)).toBe(0)
    expect(allowedEmptyStacks(0)).toBe(3)
  })

  it('validates stack tops against the remaining pool', () => {
    const players = [
      {
        ...makePlayer(0),
        tech: Array.from({ length: 6 }, (_, index) => ({
          id: [
            TechTileId.CHAUMURKY,
            TechTileId.DETONATION_DEVICES,
            TechTileId.DISPOSAL_FACILITY,
            TechTileId.HOLOPROJECTORS,
            TechTileId.HOLTZMAN_ENGINE,
            TechTileId.INVASION_SHIPS,
          ][index],
          faceUp: true,
        })),
      },
    ]

    expect(tilesAvailableForBoard(players)).toBe(12)
    expect(
      isSandboxStackTopsValid(players, [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, null])
    ).toBe(true)
    expect(
      isSandboxStackTopsValid(players, [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, TechTileId.FLAGSHIP])
    ).toBe(false)
    expect(
      isSandboxStackTopsValid(players, [TechTileId.CHAUMURKY, TechTileId.WINDTRAPS, null])
    ).toBe(false)
  })

  it('marks the board ready for all-empty stacks when every tile is with players', () => {
    const allTiles = Object.values(TechTileId)
    const players = [
      {
        ...makePlayer(0),
        tech: allTiles.slice(0, 10).map(id => ({ id, faceUp: true })),
      },
      {
        ...makePlayer(1),
        tech: allTiles.slice(10).map(id => ({ id, faceUp: true })),
      },
    ]

    expect(
      isSandboxIxBoardReady(players, buildIxBoardFromSandboxStackTops([null, null, null], allTiles))
    ).toBe(true)
  })

  it('allows confirm with unset slots treated as empty when pool rules match', () => {
    const players = [
      {
        ...makePlayer(0),
        tech: Array.from({ length: 6 }, (_, index) => ({
          id: [
            TechTileId.CHAUMURKY,
            TechTileId.DETONATION_DEVICES,
            TechTileId.DISPOSAL_FACILITY,
            TechTileId.HOLOPROJECTORS,
            TechTileId.HOLTZMAN_ENGINE,
            TechTileId.INVASION_SHIPS,
          ][index],
          faceUp: true,
        })),
      },
    ]

    const draft = [TechTileId.ARTILLERY, TechTileId.WINDTRAPS, undefined]
    expect(canConfirmSandboxStackTops(players, draft)).toBe(true)
    expect(normalizeSandboxStackTops(draft)).toEqual([
      TechTileId.ARTILLERY,
      TechTileId.WINDTRAPS,
      null,
    ])
    expect(isSandboxStackTopsValid(players, normalizeSandboxStackTops(draft))).toBe(true)
  })

  it('blocks other players and ix board tiles when editing one player tech', () => {
    const players = [
      {
        ...makePlayer(0),
        tech: [{ id: TechTileId.ARTILLERY, faceUp: true }],
      },
      {
        ...makePlayer(1),
        tech: [{ id: TechTileId.WINDTRAPS, faceUp: true }],
      },
    ]
    const ixBoard = buildIxBoardFromSandboxStackTops(
      [TechTileId.FLAGSHIP, null, null],
      [TechTileId.ARTILLERY, TechTileId.WINDTRAPS],
      () => 0
    )

    expect(ixBoardTechTileIds(ixBoard)).toContain(TechTileId.FLAGSHIP)
    expect(sandboxBlockedTechIdsForPlayer(players, 0, ixBoard)).toEqual(
      expect.arrayContaining([TechTileId.WINDTRAPS, TechTileId.FLAGSHIP])
    )
    expect(sandboxBlockedTechIdsForPlayer(players, 0, ixBoard)).not.toContain(TechTileId.ARTILLERY)
  })
})
