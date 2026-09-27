import { describe, expect, it } from 'vitest'
import { createUnassignedLeader, LEADER_NAMES, LEADERS } from '../../data/leaders'
import {
  defaultSavedPlayerName,
  displayPlayerName,
  PLAYER_NAME_MAX_LENGTH,
  savedPlayerName,
  storedPlayerName,
} from '../playerName'

describe('saved player name', () => {
  const leader = LEADERS[0]

  it('uses the leader name when no custom name is set', () => {
    const player = { id: 0, leader }
    expect(defaultSavedPlayerName(player)).toBe(leader.name)
    expect(savedPlayerName(player)).toBe(leader.name)
  })

  it('uses Player N while the leader is unassigned', () => {
    const player = { id: 2, leader: createUnassignedLeader() }
    expect(savedPlayerName(player)).toBe('Player 3')
  })

  it('keeps a custom name and drops text that matches the current default', () => {
    const player = { id: 0, leader, name: 'Ada' }
    expect(savedPlayerName(player)).toBe('Ada')
    expect(storedPlayerName('  Ada  ', player)).toBe('Ada')
    expect(storedPlayerName(leader.name, player)).toBe('')
    expect(storedPlayerName('   ', player)).toBe('')
    expect(savedPlayerName({ ...player, name: '' })).toBe(leader.name)
  })

  it('uses title case for the old all-caps Baron name', () => {
    const player = { id: 0, leader: { name: 'BARON VLADIMIR HARKONNEN' } }
    expect(savedPlayerName(player)).toBe(LEADER_NAMES.BARON_VLADIMIR)
    expect(LEADER_NAMES.BARON_VLADIMIR).toBe('Baron Vladimir Harkonnen')
  })

  it('stores at most 20 characters and keeps the full name for the list label', () => {
    expect(PLAYER_NAME_MAX_LENGTH).toBe(20)
    expect(displayPlayerName('Ada')).toBe('Ada')
    expect(displayPlayerName(LEADER_NAMES.BEAST_RABBAN)).toBe(LEADER_NAMES.BEAST_RABBAN)
    expect(storedPlayerName('A'.repeat(30), { id: 0, leader })).toBe('A'.repeat(20))
    expect(storedPlayerName(leader.name, { id: 0, leader })).toBe('')
  })
})
