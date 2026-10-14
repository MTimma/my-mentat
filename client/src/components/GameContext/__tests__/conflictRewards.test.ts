import { describe, expect, it } from 'vitest'
import { CONFLICTS, RISE_OF_IX_CONFLICTS } from '../../../data/conflicts'
import { TechTileId } from '../../../data/techTiles'
import {
  ChoiceType,
  CustomEffect,
  FixedOptionsChoice,
  GamePhase,
  NO_EXPANSIONS,
  RewardType,
} from '../../../types/GameTypes'
import { applyGameAction, applyRecordedAction } from '../GameContext'
import { continueAllConflictRewards, getBaseTestState, makePlayer } from './_helpers'

const ROI_EXPANSIONS = { ...NO_EXPANSIONS, riseOfIx: true, riseOfIxEpic: false }

const skirmishIv = RISE_OF_IX_CONFLICTS.find(c => c.id === 919)!
const economySupremacy = RISE_OF_IX_CONFLICTS.find(c => c.id === 921)!
const tradeMonopoly = RISE_OF_IX_CONFLICTS.find(c => c.id === 922)!

function ixBoard() {
  return {
    stacks: [[TechTileId.MINIMIC_FILM, TechTileId.ARTILLERY], [TechTileId.WINDTRAPS], []],
    nextFaceUpRevealed: {},
  }
}

function resolveCombat(
  conflict: (typeof RISE_OF_IX_CONFLICTS)[number],
  strength: Record<number, number> = { 0: 10, 1: 8, 2: 6, 3: 2 },
  expansions = ROI_EXPANSIONS
) {
  let s = getBaseTestState(undefined, { players: 4 })
  s = {
    ...s,
    expansions,
    ixBoard: expansions.riseOfIx ? ixBoard() : undefined,
    currentConflict: conflict,
    phase: GamePhase.COMBAT_REWARDS,
    combatStrength: strength,
    players: s.players.map(p => ({
      ...p,
      troops: 0,
      freighterStep: 0,
      victoryPoints: 0,
    })),
  }
  return applyGameAction(s, { type: 'RESOLVE_COMBAT' })
}

function freighterConflictChoices(state: ReturnType<typeof resolveCombat>) {
  return (state.pendingConflictRewardChoices ?? []).filter(choice =>
    choice.options.some(
      opt =>
        opt.reward.custom === CustomEffect.FREIGHTER_ADVANCE ||
        opt.reward.custom === CustomEffect.FREIGHTER_RECALL
    )
  )
}

describe('RoI conflict rewards — FREIGHTER & TECH', () => {
  it('Skirmish IV first place grants troops and freighter choice', () => {
    const s = resolveCombat(skirmishIv)
    expect(s.players[0].troops).toBe(1)
    const freighterChoices = freighterConflictChoices(s)
    expect(freighterChoices).toHaveLength(1)
    expect(freighterChoices[0].options).toHaveLength(2)
    expect(freighterChoices[0].options[0].reward.custom).toBe(CustomEffect.FREIGHTER_ADVANCE)
  })

  it('Trade Monopoly first place grants two freighter choices', () => {
    const s = resolveCombat(tradeMonopoly)
    expect(s.players[0].troops).toBe(1)
    expect(freighterConflictChoices(s)).toHaveLength(2)
  })

  it('Economic Supremacy first place grants VP and defers the remaining choice', () => {
    const s = resolveCombat(economySupremacy)
    expect(s.players[0].victoryPoints).toBe(1)
    expect((s.pendingConflictRewardChoices ?? []).length).toBeGreaterThan(0)
    expect(s.phase).toBe(GamePhase.COMBAT_REWARDS)
  })

  it('no freighter/tech handlers when riseOfIx false', () => {
    const s = resolveCombat(skirmishIv, { 0: 10, 1: 8, 2: 6, 3: 2 }, NO_EXPANSIONS)
    expect(s.players[0].troops).toBe(1)
    expect(freighterConflictChoices(s)).toHaveLength(0)
    expect(s.pendingRewards.some(r => r.reward.acquireTech !== undefined)).toBe(false)
  })
})

const terriblePurpose = CONFLICTS.find(c => c.id === 914)!
const skirmish902 = CONFLICTS.find(c => c.id === 902)!

describe('conflict reward sequential Continue', () => {
  it('Terrible Purpose first place enqueues optional trash for the winner', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      currentConflict: terriblePurpose,
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 10, 1: 8, 2: 6, 3: 0 },
      players: s.players.map(p => ({ ...p, spice: 0, water: 0, victoryPoints: 0 })),
    }
    const gainsBefore = s.gains
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(gainsBefore).toHaveLength(0)
    expect(s.phase).toBe(GamePhase.COMBAT_REWARDS)
    expect(s.players[0].victoryPoints).toBe(1)
    expect(s.gains.filter(g => g.playerId === 0 && g.type === RewardType.VICTORY_POINTS)).toHaveLength(1)
    const trash = s.pendingRewards.find(r => r.isTrash && r.playerId === 0)
    expect(trash?.reward).toEqual({ trash: 1 })
    expect(s.gains.some(g => g.playerId === 0 && g.type === RewardType.TRASH)).toBe(false)
    expect(s.conflictRewardResolveQueue?.[0]).toBe(s.firstPlayerMarker)
  })

  it('starts the Continue circle at firstPlayerMarker, not the winner', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      firstPlayerMarker: 2,
      currentConflict: skirmish902,
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 10, 1: 8, 2: 6, 3: 0 },
      players: s.players.map(p => ({ ...p, solari: 0, victoryPoints: 0 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.phase).toBe(GamePhase.COMBAT_REWARDS)
    expect(s.activePlayerId).toBe(2)
    expect(s.conflictRewardResolveQueue).toEqual([2, 0, 1])

    s = applyGameAction(s, { type: 'PASS_COMBAT', playerId: 2 })
    expect(s.activePlayerId).toBe(0)
    expect(s.phase).toBe(GamePhase.COMBAT_REWARDS)

    s = applyGameAction(s, { type: 'PASS_COMBAT', playerId: 0 })
    expect(s.activePlayerId).toBe(1)
    expect(s.phase).toBe(GamePhase.COMBAT_REWARDS)

    s = applyGameAction(s, { type: 'PASS_COMBAT', playerId: 1 })
    expect(s.phase).toBe(GamePhase.ROUND_START)
  })

  it('Continue skips unused optional trash and finishes the round', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      currentConflict: terriblePurpose,
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 10, 1: 4, 2: 2, 3: 0 },
      players: s.players.map(p => ({ ...p, spice: 0, water: 0, victoryPoints: 0 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.pendingRewards.some(r => r.isTrash && r.playerId === 0)).toBe(true)
    s = continueAllConflictRewards(s)
    expect(s.phase).toBe(GamePhase.ROUND_START)
    expect(s.pendingRewards.some(r => r.isTrash)).toBe(false)
    expect(s.players[0].victoryPoints).toBe(1)
  })

  it('Continue is a no-op while the active seat has a mandatory conflict choice', () => {
    const machinations909 = CONFLICTS.find(c => c.id === 909)!
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      currentConflict: machinations909,
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 10, 1: 8, 2: 6, 3: 0 },
      players: s.players.map(p => ({ ...p, solari: 0, victoryPoints: 0 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.activePlayerId).toBe(0)
    expect((s.pendingConflictRewardChoices ?? []).some(c => c.playerId === 0)).toBe(true)
    const blocked = applyGameAction(s, { type: 'PASS_COMBAT', playerId: 0 })
    expect(blocked.activePlayerId).toBe(0)
    expect(blocked.phase).toBe(GamePhase.COMBAT_REWARDS)
    expect(blocked.conflictRewardResolveQueue).toEqual(s.conflictRewardResolveQueue)
  })

  it('a later recorded action finishes leftover Continues and starts the next round', () => {
    let s = getBaseTestState(undefined, { players: 4 })
    s = {
      ...s,
      currentConflict: skirmish902,
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 10, 1: 8, 2: 6, 3: 0 },
      players: s.players.map(p => ({ ...p, solari: 0, victoryPoints: 0 })),
    }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.phase).toBe(GamePhase.COMBAT_REWARDS)
    s = applyRecordedAction(s, { type: 'SELECT_CONFLICT', conflictId: 909 }).state
    expect(s.phase).toBe(GamePhase.PLAYER_TURNS)
    expect(s.currentRound).toBe(2)
    expect(s.currentConflict.id).toBe(909)
  })
})
