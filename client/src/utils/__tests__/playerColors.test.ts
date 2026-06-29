import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYER_COLORS, playerColorClass, playerColorHex, resolvePlayerColor } from '../playerColors'
import { PlayerColor } from '../../types/GameTypes'

describe('playerColors', () => {
  it('DEFAULT_PLAYER_COLORS matches classic seat defaults', () => {
    expect(DEFAULT_PLAYER_COLORS).toEqual([
      PlayerColor.RED,
      PlayerColor.GREEN,
      PlayerColor.YELLOW,
      PlayerColor.BLUE,
    ])
  })

  it('playerColorHex maps each player color', () => {
    expect(playerColorHex(PlayerColor.RED)).toBe('#d32f2f')
    expect(playerColorHex(PlayerColor.GREEN)).toBe('#388e3c')
    expect(playerColorHex(PlayerColor.YELLOW)).toBe('#e6b800')
    expect(playerColorHex(PlayerColor.BLUE)).toBe('#1976d2')
  })

  it('resolvePlayerColor prefers explicit color over seat default', () => {
    expect(resolvePlayerColor(0, PlayerColor.BLUE)).toBe(PlayerColor.BLUE)
    expect(resolvePlayerColor(0)).toBe(PlayerColor.RED)
  })

  it('playerColorClass uses assigned color not player id', () => {
    expect(playerColorClass(0, PlayerColor.BLUE)).toBe('player-blue')
    expect(playerColorClass(3, PlayerColor.RED)).toBe('player-red')
  })
})
