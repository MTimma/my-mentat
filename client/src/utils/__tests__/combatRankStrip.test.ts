import { describe, expect, it } from 'vitest'
import { PlayerColor, type Player } from '../../types/GameTypes'
import { buildCombatRankEntries, buildCombatRankSlots } from '../combatRankStrip'

function stubPlayer(
  id: number,
  overrides: Partial<Player> & { dreadConflict?: number } = {}
): Player {
  const { dreadConflict, ...rest } = overrides
  return {
    id,
    color: [PlayerColor.RED, PlayerColor.GREEN, PlayerColor.YELLOW, PlayerColor.BLUE][id] ?? PlayerColor.RED,
    leader: { name: `Leader ${id}` } as Player['leader'],
    spice: 0,
    solari: 0,
    water: 0,
    agents: 0,
    troops: 0,
    handCount: 0,
    intrigueCount: 0,
    dreadnoughts:
      dreadConflict != null
        ? { supply: 0, garrison: 0, conflict: dreadConflict, control: [] }
        : undefined,
    ...rest,
  } as Player
}

describe('buildCombatRankEntries', () => {
  it('returns empty when nobody has troops or dreadnoughts in conflict', () => {
    const entries = buildCombatRankEntries({
      players: [stubPlayer(0), stubPlayer(1)],
      troops: { 0: 0, 1: 0 },
      strength: { 0: 4, 1: 2 },
    })
    expect(entries).toEqual([])
  })

  it('sorts strength ascending so place 1 is rightmost', () => {
    const entries = buildCombatRankEntries({
      players: [stubPlayer(0), stubPlayer(1), stubPlayer(2)],
      troops: { 0: 2, 1: 1, 2: 3 },
      strength: { 0: 6, 1: 10, 2: 4 },
    })
    expect(entries.map(e => e.player.id)).toEqual([2, 0, 1])
    expect(entries.map(e => e.place)).toEqual([3, 2, 1])
    expect(entries[entries.length - 1]?.place).toBe(1)
  })

  it('includes RoI dread-only combatants and exposes dread counts', () => {
    const entries = buildCombatRankEntries({
      players: [stubPlayer(0, { dreadConflict: 1 }), stubPlayer(1)],
      troops: { 0: 0, 1: 2 },
      strength: { 0: 3, 1: 4 },
      riseOfIx: true,
    })
    expect(entries.map(e => e.player.id)).toEqual([0, 1])
    expect(entries[0]?.dreadnoughts).toBe(1)
    expect(entries[1]?.troops).toBe(2)
    expect(entries[1]?.place).toBe(1)
  })

  it('ignores dreadnoughts when riseOfIx is false', () => {
    const entries = buildCombatRankEntries({
      players: [stubPlayer(0, { dreadConflict: 2 })],
      troops: { 0: 0 },
      strength: { 0: 6 },
      riseOfIx: false,
    })
    expect(entries).toEqual([])
  })

  it('drops tied players one reward place and orders by player id left to right', () => {
    const entries = buildCombatRankEntries({
      players: [stubPlayer(0), stubPlayer(1), stubPlayer(2)],
      troops: { 0: 1, 1: 1, 2: 1 },
      strength: { 0: 8, 1: 8, 2: 4 },
    })
    expect(entries.map(e => e.player.id)).toEqual([2, 0, 1])
    expect(entries.map(e => e.place)).toEqual([3, 2, 2])
  })
})

function idsIn(slots: ReturnType<typeof buildCombatRankSlots>): number[][] {
  return slots.map(slot => slot.entries.map(entry => entry.player.id))
}

describe('buildCombatRankSlots', () => {
  it('always returns 4 positional slots, place 1 last in the array', () => {
    const slots = buildCombatRankSlots({
      players: [stubPlayer(0), stubPlayer(1)],
      troops: { 0: 2, 1: 1 },
      strength: { 0: 6, 1: 10 },
    })
    expect(slots.map(s => s.slotPlace)).toEqual([4, 3, 2, 1])
    expect(idsIn(slots)).toEqual([[], [], [0], [1]])
    expect(slots[3]?.entries[0]?.place).toBe(1)
    expect(slots[2]?.entries[0]?.place).toBe(2)
  })

  it('keeps empty shadow slots when fewer than 4 are in combat', () => {
    const slots = buildCombatRankSlots({
      players: [stubPlayer(0)],
      troops: { 0: 1 },
      strength: { 0: 4 },
    })
    expect(slots.filter(s => s.entries.length === 0).map(s => s.slotPlace)).toEqual([4, 3, 2])
    expect(slots[3]?.entries[0]?.player.id).toBe(0)
  })

  it('returns 4 empty slots when nobody is in combat', () => {
    const slots = buildCombatRankSlots({
      players: [stubPlayer(0)],
      troops: { 0: 0 },
      strength: { 0: 0 },
    })
    expect(slots).toHaveLength(4)
    expect(slots.every(s => s.entries.length === 0)).toBe(true)
  })

  it('puts a first-place tie together in the 2nd box and leaves 1st empty', () => {
    const slots = buildCombatRankSlots({
      players: [stubPlayer(0), stubPlayer(1)],
      troops: { 0: 1, 1: 1 },
      strength: { 0: 8, 1: 8 },
    })
    expect(slots.map(s => s.slotPlace)).toEqual([4, 3, 2, 1])
    expect(idsIn(slots)).toEqual([[], [], [0, 1], []])
    expect(slots[2]?.entries.map(e => e.place)).toEqual([2, 2])
  })

  it('keeps the empty 1st box when two tie for first and a third sits in 3rd', () => {
    const slots = buildCombatRankSlots({
      players: [stubPlayer(0), stubPlayer(1), stubPlayer(2)],
      troops: { 0: 1, 1: 1, 2: 1 },
      strength: { 0: 8, 1: 8, 2: 4 },
    })
    expect(slots.map(s => s.slotPlace)).toEqual([4, 3, 2, 1])
    expect(idsIn(slots)).toEqual([[], [2], [0, 1], []])
    expect(slots[1]?.entries[0]?.place).toBe(3)
    expect(slots[2]?.entries.map(e => e.place)).toEqual([2, 2])
  })

  it('puts a 2nd-place tie together in 3rd and leaves 2nd empty', () => {
    const slots = buildCombatRankSlots({
      players: [stubPlayer(0), stubPlayer(1), stubPlayer(2)],
      troops: { 0: 1, 1: 1, 2: 1 },
      strength: { 0: 8, 1: 4, 2: 4 },
    })
    expect(idsIn(slots)).toEqual([[], [1, 2], [], [0]])
    expect(slots[1]?.entries.map(e => e.place)).toEqual([3, 3])
    expect(slots[3]?.entries[0]?.place).toBe(1)
  })

  it('packs a first-place tie into 2nd; remaining 3rd-place tie into 4th', () => {
    const slots = buildCombatRankSlots({
      players: [stubPlayer(0), stubPlayer(1), stubPlayer(2), stubPlayer(3)],
      troops: { 0: 1, 1: 1, 2: 1, 3: 1 },
      strength: { 0: 8, 1: 8, 2: 4, 3: 4 },
    })
    expect(idsIn(slots)).toEqual([[2, 3], [], [0, 1], []])
    expect(slots[2]?.entries.map(e => e.place)).toEqual([2, 2])
    expect(slots[0]?.entries.map(e => e.place)).toEqual([4, 4])
  })

  it('puts a 3rd-place tie into 4th and leaves 3rd empty', () => {
    const slots = buildCombatRankSlots({
      players: [stubPlayer(0), stubPlayer(1), stubPlayer(2), stubPlayer(3)],
      troops: { 0: 1, 1: 1, 2: 1, 3: 1 },
      strength: { 0: 10, 1: 6, 2: 2, 3: 2 },
    })
    expect(idsIn(slots)).toEqual([[2, 3], [], [1], [0]])
    expect(slots[0]?.entries.map(e => e.place)).toEqual([4, 4])
    expect(slots[2]?.entries[0]?.place).toBe(2)
    expect(slots[3]?.entries[0]?.place).toBe(1)
  })
})
