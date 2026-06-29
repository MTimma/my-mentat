import { Player, PlayerColor } from '../types/GameTypes'

/** Default seat color per player id (0-based). Initial setup only — seat layout stays by id. */
export const DEFAULT_PLAYER_COLORS: PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.GREEN,
  PlayerColor.YELLOW,
  PlayerColor.BLUE,
]

export function playerColorHex(color: PlayerColor): string {
  switch (color) {
    case PlayerColor.RED:
      return '#d32f2f'
    case PlayerColor.GREEN:
      return '#388e3c'
    case PlayerColor.YELLOW:
      return '#e6b800'
    case PlayerColor.BLUE:
      return '#1976d2'
    default:
      return '#888'
  }
}

export function playerMarkerHex(player: Pick<Player, 'color'>): string {
  return playerColorHex(player.color)
}

/** Resolve display color: explicit `color`, else default seat color for `playerId`. */
export function resolvePlayerColor(playerId: number, color?: PlayerColor): PlayerColor {
  return color ?? DEFAULT_PLAYER_COLORS[playerId] ?? PlayerColor.RED
}

/** CSS class suffix for player-tinted components (e.g. `player-red`). */
export function playerColorClass(playerId: number, color?: PlayerColor): string {
  return `player-${resolvePlayerColor(playerId, color)}`
}
