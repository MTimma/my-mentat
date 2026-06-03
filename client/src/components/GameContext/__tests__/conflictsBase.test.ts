import { describe, expect, it } from 'vitest'
import { CONFLICTS } from '../../../data/conflicts'
import { RewardType, ControlMarkerType, GamePhase } from '../../../types/GameTypes'
import { baseGameManifest } from '../../../test-fixtures/baseGameManifest'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, makePlayer } from './_helpers'

describe('Base conflicts — data', () => {
  it('tier 1 skirmishes exist with VP or resource rewards', () => {
    const tier1 = CONFLICTS.filter(c => c.tier === 1)
    expect(tier1.length).toBeGreaterThanOrEqual(3)
    expect(tier1.some(c => c.name === 'Skirmish')).toBe(true)
  })

  it('tier 2 control conflicts grant control marker type', () => {
    const sieges = CONFLICTS.filter(c => c.controlSpace != null)
    expect(sieges.some(c => c.controlSpace === ControlMarkerType.ARRAKIN)).toBe(true)
    expect(sieges.some(c => c.controlSpace === ControlMarkerType.CARTHAG)).toBe(true)
    expect(sieges.some(c => c.controlSpace === ControlMarkerType.IMPERIAL_BASIN)).toBe(true)
  })

  it('manifest conflicts that exist in code have valid reward types', () => {
    const byName = new Map(CONFLICTS.map(c => [c.name, c]))
    for (const entry of baseGameManifest.conflicts) {
      const card = byName.get(entry.codeName)
      if (!card) continue
      for (const tier of ['first', 'second', 'third'] as const) {
        for (const reward of card.rewards[tier]) {
          expect(Object.values(RewardType)).toContain(reward.type)
        }
      }
    }
  })
})

describe('Base conflicts — resolution', () => {
  const skirmish = CONFLICTS.find(c => c.id === 901)!

  it('3p: first place wins top reward; second gets second reward (no third payout)', () => {
    let s = getBaseTestState(undefined, { players: 3 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: skirmish,
      combatTroops: { 0: 2, 1: 1 },
      combatStrength: { 0: 6, 1: 2, 2: 0 },
      players: [makePlayer(0), makePlayer(1), makePlayer(2)],
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].victoryPoints).toBe(1)
    expect(s.players[1].water).toBeGreaterThanOrEqual(1)
    expect(s.players[2].victoryPoints).toBe(0)
  })

  it('3p tie for first: no VP winner; tied players share second reward', () => {
    let s = getBaseTestState(undefined, { players: 3 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: skirmish,
      combatStrength: { 0: 4, 1: 4, 2: 0 },
      players: [makePlayer(0), makePlayer(1), makePlayer(2)],
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].victoryPoints).toBe(0)
    expect(s.players[1].victoryPoints).toBe(0)
    expect(s.players[0].water).toBeGreaterThanOrEqual(1)
    expect(s.players[1].water).toBeGreaterThanOrEqual(1)
  })

  it('4p tie for second: both tied players receive third reward', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: skirmish,
      combatStrength: { 0: 8, 1: 2, 2: 2, 3: 0 },
      players: [makePlayer(0), makePlayer(1), makePlayer(2), makePlayer(3)],
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].victoryPoints).toBe(1)
    expect(s.players[1].spice).toBeGreaterThanOrEqual(1)
    expect(s.players[2].spice).toBeGreaterThanOrEqual(1)
  })

  it('0 strength receives no conflict reward', () => {
    let s = getBaseTestState(undefined, { players: 3 })
    const vpBefore = s.players[2].victoryPoints
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: skirmish,
      combatStrength: { 0: 2, 1: 0, 2: 0 },
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[2].victoryPoints).toBe(vpBefore)
  })

  it('after combat, conflict troops and strength markers reset', () => {
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      currentConflict: skirmish,
      combatTroops: { 0: 2, 1: 1 },
      combatStrength: { 0: 4, 1: 2 },
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.combatTroops[0] ?? 0).toBe(0)
    expect(s.combatStrength[0] ?? 0).toBe(0)
    expect(s.phase).toBe(GamePhase.ROUND_START)
  })

  it('RESOLVE_COMBAT moves to ROUND_START and clears conflict troops', () => {
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
      combatTroops: { 0: 2, 1: 1 },
      combatStrength: { 0: 4, 1: 2 },
      currentConflict: skirmish,
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.combatTroops[0] ?? 0).toBe(0)
    expect(s.combatTroops[1] ?? 0).toBe(0)
  })
})
