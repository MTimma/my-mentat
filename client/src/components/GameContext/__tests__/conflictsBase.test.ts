import { describe, expect, it } from 'vitest'
import { CONFLICTS } from '../../../data/conflicts'
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
  it.todo('tie for first: no winner; tied players share second reward')
  it.todo('tie for second: both get third reward (4p)')
  it.todo('0 strength receives no reward')
  it.todo('after combat, troops return to supply and combat markers reset')

  it('RESOLVE_COMBAT moves to ROUND_START and clears conflict troops', () => {
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      phase: GamePhase.COMBAT,
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
})
