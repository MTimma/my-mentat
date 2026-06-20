import { describe, expect, it } from 'vitest'
import { RISE_OF_IX_CONFLICTS } from '../../../data/conflicts'
import { TechTileId } from '../../../data/techTiles'
import {
  ChoiceType,
  CustomEffect,
  FixedOptionsChoice,
  GamePhase,
  NO_EXPANSIONS,
  RewardType,
} from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, makePlayer } from './_helpers'

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

  it('Economy Supremacy TECH choice enqueues acquireTech', () => {
    let s = resolveCombat(economySupremacy)
    expect(s.players[0].victoryPoints).toBe(1)

    const vpChoice = s.pendingConflictRewardChoices?.find(c =>
      c.options.some(opt => opt.reward.acquireTech !== undefined)
    )
    expect(vpChoice).toBeDefined()
    const techIndex = vpChoice!.options.findIndex(opt => opt.reward.acquireTech !== undefined)
    s = applyGameAction(s, {
      type: 'RESOLVE_CONFLICT_REWARD_CHOICE',
      choiceId: vpChoice!.id,
      optionIndex: techIndex,
    })
    expect(s.pendingRewards.some(r => r.reward.acquireTech !== undefined)).toBe(true)
  })

  it('no freighter/tech handlers when riseOfIx false', () => {
    const s = resolveCombat(skirmishIv, { 0: 10, 1: 8, 2: 6, 3: 2 }, NO_EXPANSIONS)
    expect(s.players[0].troops).toBe(1)
    expect(freighterConflictChoices(s)).toHaveLength(0)
    expect(s.pendingRewards.some(r => r.reward.acquireTech !== undefined)).toBe(false)
  })
})
