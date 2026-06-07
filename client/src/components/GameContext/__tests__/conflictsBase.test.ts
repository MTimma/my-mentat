import { describe, expect, it } from 'vitest'
import { CONFLICTS } from '../../../data/conflicts'

const skirmish901 = CONFLICTS.find(c => c.id === 901)!
import { RewardType, ControlMarkerType } from '../../../types/GameTypes'
import { baseGameManifest } from '../../../test-fixtures/baseGameManifest'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, makePlayer } from './_helpers'
import { GamePhase } from '../../../types/GameTypes'

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
  it.todo('first place wins top reward; second gets second reward (3p: no third)')
  it('tie for first: no winner; tied players share second reward', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      currentConflict: skirmish901,
      phase: GamePhase.COMBAT_REWARDS,
      combatTroops: { 0: 2, 1: 2, 2: 1, 3: 1 },
      combatStrength: { 0: 8, 1: 8, 2: 4, 3: 2 },
      players: s.players.map(p => ({ ...p, spice: 0, water: 0, victoryPoints: 0 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].victoryPoints).toBe(0)
    expect(s.players[1].victoryPoints).toBe(0)
    expect(s.players[0].water).toBe(1)
    expect(s.players[1].water).toBe(1)
    expect(s.players[2].water).toBe(0)
    expect(s.players[2].spice).toBe(1)
    expect(s.players[3].spice).toBe(0)
  })

  it('tie for second after clear winner: tied players share third reward (4p)', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      currentConflict: skirmish901,
      phase: GamePhase.COMBAT_REWARDS,
      combatTroops: { 0: 3, 1: 2, 2: 2, 3: 1 },
      combatStrength: { 0: 10, 1: 6, 2: 6, 3: 2 },
      players: s.players.map(p => ({ ...p, spice: 0, water: 0, victoryPoints: 0 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].victoryPoints).toBe(1)
    expect(s.players[1].spice).toBe(1)
    expect(s.players[2].spice).toBe(1)
    expect(s.players[3].spice).toBe(0)
  })

  it('tie for first then tie for second: third-place players share third reward', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      currentConflict: skirmish901,
      phase: GamePhase.COMBAT_REWARDS,
      combatTroops: { 0: 2, 1: 2, 2: 1, 3: 1 },
      combatStrength: { 0: 8, 1: 8, 2: 4, 3: 4 },
      players: s.players.map(p => ({ ...p, spice: 0, water: 0, victoryPoints: 0 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].victoryPoints).toBe(0)
    expect(s.players[1].victoryPoints).toBe(0)
    expect(s.players[0].water).toBe(1)
    expect(s.players[1].water).toBe(1)
    expect(s.players[2].spice).toBe(1)
    expect(s.players[3].spice).toBe(1)
  })
  it.todo('0 strength receives no reward')
  it.todo('after combat, troops return to supply and combat markers reset')

  it('RESOLVE_COMBAT moves to ROUND_START and clears conflict troops', () => {
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      phase: GamePhase.COMBAT_REWARDS,
      combatTroops: { 0: 2, 1: 1 },
      combatStrength: { 0: 4, 1: 2 },
      players: [
        makePlayer(0, { combatValue: 4 }),
        makePlayer(1, { combatValue: 2 }),
      ],
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.combatTroops[0] ?? 0).toBe(0)
    expect(s.combatTroops[1] ?? 0).toBe(0)
  })

  it('RESOLVE_COMBAT appends a combat history entry and does not double-apply VP', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    const historyLength = s.history.length
    s = {
      ...s,
      currentConflict: skirmish901,
      phase: GamePhase.COMBAT_REWARDS,
      combatTroops: { 0: 2, 1: 1, 2: 1, 3: 1 },
      combatStrength: { 0: 4, 1: 2, 2: 2, 3: 2 },
      players: s.players.map(p => ({ ...p, victoryPoints: 0 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.history.length).toBe(historyLength + 1)
    expect(s.history[s.history.length - 1].historyEntryKind).toBe('combat')
    expect(s.players[0].victoryPoints).toBe(1)
    const vpAfterFirst = s.players[0].victoryPoints
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].victoryPoints).toBe(vpAfterFirst)
  })
})
