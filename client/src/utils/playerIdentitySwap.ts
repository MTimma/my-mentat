import type { Leader, PlayerColor, PlayerSetup } from '../types/GameTypes'

/** Swap color with another player who already has `newColor`, or assign if unused. */
export function swapPlayerColorInSetups(
  players: PlayerSetup[],
  playerIndex: number,
  newColor: PlayerColor
): PlayerSetup[] {
  const current = players[playerIndex]
  if (!current || current.color === newColor) return players

  const swapIndex = players.findIndex((p, i) => i !== playerIndex && p.color === newColor)
  if (swapIndex === -1) {
    return players.map((p, i) => (i === playerIndex ? { ...p, color: newColor } : p))
  }

  const otherColor = current.color
  return players.map((p, i) => {
    if (i === playerIndex) return { ...p, color: newColor }
    if (i === swapIndex) return { ...p, color: otherColor }
    return p
  })
}

/** Swap leader with another player who already has `newLeader`, or assign if unused. */
export function swapPlayerLeaderInSetups(
  players: PlayerSetup[],
  playerIndex: number,
  newLeader: Leader
): PlayerSetup[] {
  const current = players[playerIndex]
  if (!current || current.leader.name === newLeader.name) return players

  const swapIndex = players.findIndex(
    (p, i) => i !== playerIndex && p.leader.name === newLeader.name
  )
  if (swapIndex === -1) {
    return players.map((p, i) => (i === playerIndex ? { ...p, leader: newLeader } : p))
  }

  const otherLeader = current.leader
  return players.map((p, i) => {
    if (i === playerIndex) return { ...p, leader: newLeader }
    if (i === swapIndex) return { ...p, leader: otherLeader }
    return p
  })
}
