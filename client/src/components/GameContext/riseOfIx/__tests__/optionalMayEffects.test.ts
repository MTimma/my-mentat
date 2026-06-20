import { describe, expect, it } from 'vitest'
import { TechTileId } from '../../../../data/techTiles'
import { GainSource, NO_EXPANSIONS } from '../../../../types/GameTypes'
import { getFreshDefaultGameState } from '../../GameContext'
import { makePlayer } from '../../__tests__/_helpers'
import {
  buildMayOptionalEffect,
  canUseMayOptionalEffect,
  effectIsOptional,
  isMayOptionalReward,
} from '../optionalMayEffects'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

describe('optionalMayEffects', () => {
  it('detects acquireTech and techNegotiator as may-optional rewards', () => {
    expect(isMayOptionalReward({ acquireTech: {} })).toBe(true)
    expect(isMayOptionalReward({ techNegotiator: 1 })).toBe(true)
    expect(isMayOptionalReward({ troops: 1 })).toBe(false)
  })

  it('effectIsOptional respects explicit optional flag', () => {
    expect(effectIsOptional({ reward: { troops: 1 }, optional: true })).toBe(true)
    expect(effectIsOptional({ reward: { acquireTech: {} }, optional: false })).toBe(false)
    expect(effectIsOptional({ reward: { acquireTech: {} } })).toBe(true)
  })

  it('canUseMayOptionalEffect requires tech in market and troop supply for negotiator', () => {
    const state = {
      ...getFreshDefaultGameState(),
      expansions: RISE_OF_IX,
      players: [makePlayer(0, { troopSupply: 0 })],
      ixBoard: {
        stacks: [[TechTileId.MINIMIC_FILM], [], []] as const,
        nextFaceUpRevealed: {},
      },
    }
    expect(
      canUseMayOptionalEffect(state, 0, { reward: { acquireTech: {} } })
    ).toBe(true)
    expect(
      canUseMayOptionalEffect(state, 0, { reward: { techNegotiator: 1 } })
    ).toBe(false)
  })

  it('buildMayOptionalEffect mints an OptionalEffect with board-space source', () => {
    const state = {
      ...getFreshDefaultGameState(),
      expansions: RISE_OF_IX,
      players: [makePlayer(0, { troopSupply: 5 })],
      ixBoard: {
        stacks: [[TechTileId.MINIMIC_FILM], [], []] as const,
        nextFaceUpRevealed: {},
      },
    }
    const source = { type: GainSource.BOARD_SPACE, id: 24, name: 'Tech Negotiation' }
    const effect = buildMayOptionalEffect(
      state,
      0,
      source,
      { reward: { acquireTech: { discount: 1 } }, optional: true },
      []
    )
    expect(effect).toMatchObject({
      source,
      reward: { acquireTech: { discount: 1 } },
      cost: {},
    })
    expect(effect?.id).toBeTruthy()
  })
})
