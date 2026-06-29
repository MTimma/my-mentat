import { describe, expect, it } from 'vitest'
import { LEADERS } from '../../data/leaders'
import { PlayerColor, type PlayerSetup } from '../../types/GameTypes'
import { swapPlayerColorInSetups, swapPlayerLeaderInSetups } from '../playerIdentitySwap'

function makeSetup(
  playerNumber: number,
  color: PlayerColor,
  leaderIndex: number
): PlayerSetup {
  return {
    playerNumber,
    color,
    leader: LEADERS[leaderIndex],
    deck: [],
    startingHand: [],
  }
}

describe('swapPlayerColorInSetups', () => {
  const players = [
    makeSetup(1, PlayerColor.RED, 0),
    makeSetup(2, PlayerColor.GREEN, 1),
    makeSetup(3, PlayerColor.YELLOW, 2),
  ]

  it('swaps colors when picking another player color', () => {
    const next = swapPlayerColorInSetups(players, 0, PlayerColor.GREEN)
    expect(next[0].color).toBe(PlayerColor.GREEN)
    expect(next[1].color).toBe(PlayerColor.RED)
    expect(next[2].color).toBe(PlayerColor.YELLOW)
  })

  it('assigns unused color without swapping', () => {
    const next = swapPlayerColorInSetups(players, 0, PlayerColor.BLUE)
    expect(next[0].color).toBe(PlayerColor.BLUE)
    expect(next[1].color).toBe(PlayerColor.GREEN)
  })

  it('no-ops when color unchanged', () => {
    expect(swapPlayerColorInSetups(players, 0, PlayerColor.RED)).toBe(players)
  })
})

describe('swapPlayerLeaderInSetups', () => {
  const players = [
    makeSetup(1, PlayerColor.RED, 0),
    makeSetup(2, PlayerColor.GREEN, 1),
    makeSetup(3, PlayerColor.YELLOW, 2),
  ]

  it('swaps leaders when picking another player leader', () => {
    const next = swapPlayerLeaderInSetups(players, 0, LEADERS[1])
    expect(next[0].leader.name).toBe(LEADERS[1].name)
    expect(next[1].leader.name).toBe(LEADERS[0].name)
    expect(next[2].leader.name).toBe(LEADERS[2].name)
  })

  it('assigns unused leader without swapping', () => {
    const next = swapPlayerLeaderInSetups(players, 0, LEADERS[3])
    expect(next[0].leader.name).toBe(LEADERS[3].name)
    expect(next[1].leader.name).toBe(LEADERS[1].name)
  })

  it('no-ops when leader unchanged', () => {
    expect(swapPlayerLeaderInSetups(players, 0, LEADERS[0])).toBe(players)
  })
})
