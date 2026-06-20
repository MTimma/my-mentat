import { describe, expect, it } from 'vitest'
import { CONFLICTS } from '../../../data/conflicts'
import { ControlMarkerType, GainSource, RewardType, GamePhase } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState } from './_helpers'

function conflictGainKeys(gains: { playerId: number; name: string; type: RewardType; amount: number }[]) {
  return gains.map(g => `${g.playerId}|${g.name}|${g.type}|${g.amount}`)
}

const skirmish902 = CONFLICTS.find(c => c.id === 902)!
const siege905 = CONFLICTS.find(c => c.id === 905)!
const battle915 = CONFLICTS.find(c => c.id === 915)!
const battle916 = CONFLICTS.find(c => c.id === 916)!

function resolveCombat(
  strength: Record<number, number>,
  conflict: (typeof CONFLICTS)[number]
) {
  let s = getBaseTestState(undefined, { players: 4 })
  s = {
    ...s,
    currentConflict: conflict,
    phase: GamePhase.COMBAT_REWARDS,
    combatStrength: strength,
    players: s.players.map(p => ({
      ...p,
      spice: 0,
      water: 0,
      victoryPoints: 0,
      solari: 0,
      intrigueCount: 0,
    })),
  }
  return applyGameAction(s, { type: 'RESOLVE_COMBAT' })
}

describe('combat reward duplication', () => {
  it('902 clear ranks: 2nd gets only 2nd rewards, 3rd gets only 3rd rewards', () => {
    const s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, skirmish902)
    expect(s.players[1].solari).toBe(2)
    expect(s.players[2].solari).toBe(2)
    expect(s.players[1].intrigueCount).toBe(1)

    const combat = s.history.find(h => h.historyEntryKind === 'combat')
    const p1Solari =
      combat?.gains?.filter(g => g.playerId === 1 && g.type === RewardType.SOLARI) ?? []
    expect(p1Solari).toHaveLength(1)
    expect(p1Solari[0]?.amount).toBe(2)
    expect(p1Solari[0]?.name).toContain('2nd')
  })

  it('905 siege: 2nd gets 4 solari only, 3rd gets spice only', () => {
    const s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, siege905)
    expect(s.players[1].solari).toBe(4)
    expect(s.players[2].spice).toBe(2)
    expect(s.players[2].solari).toBe(0)
  })

  it('915 Battle for Imperial Basin: 2 VP + control, 5 spice 2nd, 3 spice 3rd', () => {
    const s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, battle915)
    expect(battle915.name).toBe('Battle for Imperial Basin')
    expect(s.players[0].victoryPoints).toBe(2)
    expect(s.controlMarkers[ControlMarkerType.IMPERIAL_BASIN]).toBe(0)
    expect(s.players[1].spice).toBe(5)
    expect(s.players[2].spice).toBe(3)

    const combat = s.history.find(h => h.historyEntryKind === 'combat')
    const p1Gain = combat?.gains?.find(g => g.playerId === 1 && g.type === RewardType.SPICE)
    expect(p1Gain?.name).toContain('Battle for Imperial Basin')
    expect(p1Gain?.amount).toBe(5)
  })

  it('916 Battle for Arrakeen: defers 2nd-place choice; 3rd intrigue + solari', () => {
    const s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, battle916)
    expect(s.players[0].victoryPoints).toBe(2)
    expect(s.controlMarkers[ControlMarkerType.ARRAKIN]).toBe(0)
    expect(s.pendingConflictRewardChoices?.some(c => c.placement === '2nd place' && c.playerId === 1)).toBe(true)
    expect(s.players[2].intrigueCount).toBe(1)
    expect(s.players[2].solari).toBe(2)
  })

  it('double RESOLVE_COMBAT does not re-apply solari after immediate rewards were applied', () => {
    const s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, skirmish902)
    expect(s.players[1].solari).toBe(2)
    const solariAfterFirst = s.players[1].solari
    const s2 = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s2.players[1].solari).toBe(solariAfterFirst)
  })

  it('double RESOLVE_COMBAT does not re-apply solari while conflict choices are pending', () => {
    const machinations909 = CONFLICTS.find(c => c.id === 909)!
    let s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, machinations909)
    // First resolve defers first-place influence; second and third apply immediately
    expect(s.pendingConflictRewardChoices?.length).toBeGreaterThan(0)
    const solariAfterFirst = s.players[1].solari
    const spiceAfterFirst = s.players[2].spice
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[1].solari).toBe(solariAfterFirst)
    expect(s.players[2].spice).toBe(spiceAfterFirst)
  })

  it('no player receives two conflict solari gains at different placements', () => {
    const s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, skirmish902)
    const combat = s.history.find(h => h.historyEntryKind === 'combat')
    const byPlayer = new Map<number, string[]>()
    for (const gain of combat?.gains ?? []) {
      if (gain.type !== RewardType.SOLARI) continue
      const list = byPlayer.get(gain.playerId) ?? []
      list.push(gain.name)
      byPlayer.set(gain.playerId, list)
    }
    for (const [, names] of byPlayer) {
      expect(names).toHaveLength(1)
    }
  })

  it('combat history has no duplicate conflict gain records per placement', () => {
    const s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, skirmish902)
    const combat = s.history.find(h => h.historyEntryKind === 'combat')
    const conflictGains = (combat?.gains ?? []).filter(g => g.source === GainSource.CONFLICT)
    expect(conflictGainKeys(conflictGains)).toEqual([...new Set(conflictGainKeys(conflictGains))])
    expect(conflictGains.find(g => g.playerId === 0 && g.type === RewardType.VICTORY_POINTS)?.amount).toBe(1)
    expect(conflictGains.find(g => g.playerId === 1 && g.type === RewardType.SOLARI)?.amount).toBe(2)
    expect(conflictGains.find(g => g.playerId === 2 && g.type === RewardType.SOLARI)?.amount).toBe(2)
  })

  it('combat history snapshot is post-transition (not re-confirmable)', () => {
    const s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, skirmish902)
    const combat = s.history.find(h => h.historyEntryKind === 'combat')
    expect(combat?.phase).toBe(GamePhase.ROUND_START)
    expect(s.phase).toBe(GamePhase.ROUND_START)
  })

  it('deferred first-place choice does not duplicate immediate placement gains in history', () => {
    const machinations909 = CONFLICTS.find(c => c.id === 909)!
    let s = resolveCombat({ 0: 10, 1: 8, 2: 6, 3: 2 }, machinations909)
    const choice = s.pendingConflictRewardChoices?.[0]
    expect(choice).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CONFLICT_REWARD_CHOICE',
      choiceId: choice!.id,
      reward: choice!.options[0].reward,
    })
    const combat = s.history.find(h => h.historyEntryKind === 'combat')
    const conflictGains = (combat?.gains ?? []).filter(g => g.source === GainSource.CONFLICT)
    expect(conflictGainKeys(conflictGains)).toEqual([...new Set(conflictGainKeys(conflictGains))])
    expect(s.players[1].solari).toBe(3)
    expect(conflictGains.filter(g => g.playerId === 1 && g.type === RewardType.SOLARI)).toHaveLength(1)
  })
})
