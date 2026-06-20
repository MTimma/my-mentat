import { describe, expect, it } from 'vitest'
import { RISE_OF_IX_IMPERIUM_DECK } from '../../../data/cardsRiseOfIx'
import {
  ChoiceType,
  CustomEffect,
  GamePhase,
  GainSource,
  RewardType,
  TurnType,
  type Card,
} from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, makePlayer } from './_helpers'

const ROI_EXPANSIONS = { riseOfIx: true, riseOfIxEpic: false }

function roiCard(name: string): Card {
  const card = RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === name)
  if (!card) throw new Error(`${name} not found in RISE_OF_IX_IMPERIUM_DECK`)
  return structuredClone(card)
}

function roiState(overrides?: Parameters<typeof getBaseTestState>[1]) {
  return {
    ...getBaseTestState(undefined, overrides),
    expansions: ROI_EXPANSIONS,
    currTurn: { playerId: 0, type: TurnType.ACTION },
  }
}

function discardViaIxianProbe(state: ReturnType<typeof roiState>, cardIds: number[]) {
  return applyGameAction(state, {
    type: 'CUSTOM_EFFECT',
    playerId: 0,
    customEffect: CustomEffect.IXIAN_PROBE,
    data: { cardIds, drawCards: 0, sourceCardId: 0 },
  })
}

describe('Unload (discard / trash)', () => {
  it('no unload when riseOfIx false', () => {
    const waterPeddler = roiCard('Water Peddler')
    waterPeddler.id = 99001
    let s = getBaseTestState({
      deck: [waterPeddler],
      handCount: 1,
      water: 3,
    })
    s = {
      ...s,
      expansions: { riseOfIx: false, riseOfIxEpic: false },
      currTurn: { playerId: 0, type: TurnType.ACTION },
    }
    s = discardViaIxianProbe(s, [waterPeddler.id])

    expect(s.players[0].water).toBe(3)
    expect(s.gains.filter(g => g.name?.includes('(Unload)'))).toHaveLength(0)
    expect(s.pendingRewards.filter(r => r.source.name.includes('(Unload)'))).toHaveLength(0)
  })

  it('discard Water Peddler triggers unload water gain', () => {
    const waterPeddler = roiCard('Water Peddler')
    waterPeddler.id = 99002
    let s = roiState()
    s = {
      ...s,
      players: [makePlayer(0, { deck: [waterPeddler], handCount: 1, water: 3 })],
    }
    s = discardViaIxianProbe(s, [waterPeddler.id])

    expect(s.pendingRewards).toContainEqual(
      expect.objectContaining({
        source: expect.objectContaining({ name: 'Water Peddler (Unload)' }),
        reward: { water: 1 },
      })
    )

    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(s.players[0].water).toBe(4)
    expect(s.gains).toContainEqual(
      expect.objectContaining({
        name: 'Water Peddler (Unload)',
        type: RewardType.WATER,
        amount: 1,
        source: GainSource.CARD,
      })
    )
  })

  it('unload Freighter Fleet enqueues freighter choice', () => {
    const freighterFleet = roiCard('Freighter Fleet')
    freighterFleet.id = 99003
    let s = roiState()
    s = {
      ...s,
      players: [makePlayer(0, { deck: [freighterFleet], handCount: 1, freighterStep: 0 })],
    }
    s = discardViaIxianProbe(s, [freighterFleet.id])

    const freighterChoice = s.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt.startsWith('Freighter')
    )
    expect(freighterChoice).toBeDefined()
    expect(freighterChoice?.source).toEqual(
      expect.objectContaining({ name: 'Freighter Fleet (Unload)' })
    )
  })

  it('no unload on reveal turn for same card', () => {
    const waterPeddler = roiCard('Water Peddler')
    waterPeddler.id = 99004
    let s = roiState()
    s = {
      ...s,
      phase: GamePhase.PLAYER_TURNS,
      activePlayerId: 0,
      players: [makePlayer(0, { deck: [waterPeddler], handCount: 1, water: 3 })],
    }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [waterPeddler.id] })

    const unloadGainsAfterReveal = s.gains.filter(g => g.name?.includes('(Unload)'))
    expect(unloadGainsAfterReveal).toHaveLength(0)

    const waterGains = s.gains.filter(
      g => g.type === RewardType.WATER && g.sourceId === waterPeddler.id
    )
    expect(waterGains).toHaveLength(0)
    expect(s.pendingRewards).toContainEqual(
      expect.objectContaining({
        source: expect.objectContaining({ name: waterPeddler.name }),
        reward: { water: 1 },
      })
    )

    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    const waterGainCount = s.gains.filter(
      g => g.type === RewardType.WATER && g.sourceId === waterPeddler.id
    ).length
    expect(waterGainCount).toBe(1)
    expect(s.gains.filter(g => g.name?.includes('(Unload)'))).toHaveLength(0)

    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(s.players[0].discardPile.some(c => c.id === waterPeddler.id)).toBe(true)
    expect(
      s.gains.filter(g => g.name?.includes('(Unload)') && g.type === RewardType.WATER)
    ).toHaveLength(0)
    expect(s.players[0].water).toBe(4)
  })
})
