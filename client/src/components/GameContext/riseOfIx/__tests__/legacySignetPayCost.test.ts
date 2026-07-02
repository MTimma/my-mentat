import { describe, expect, it } from 'vitest'
import { GamePhase } from '../../../../types/GameTypes'
import {
  legacySignetOptionIndexFromEffectOccurrence,
  parseCardEffectLegacyId,
} from '../legacySignetPayCost'
import { buildRhomburSignetChoice } from '../boardSpaceChoices'
import { getFreshDefaultGameState } from '../../GameContext'
import { makePlayer } from '../../__tests__/_helpers'

describe('legacySignetPayCost', () => {
  it('parses card effect legacy ids', () => {
    expect(parseCardEffectLegacyId('card-10-EFFECT')).toEqual({ cardId: 10, occurrence: 0 })
    expect(parseCardEffectLegacyId('card-10-EFFECT-1')).toEqual({ cardId: 10, occurrence: 1 })
    expect(parseCardEffectLegacyId('card-7-EFFECT-2')).toEqual({ cardId: 7, occurrence: 2 })
    expect(parseCardEffectLegacyId('board-space-24-EFFECT')).toBeNull()
  })

  it('maps legacy occurrence 0 to acquire tech and 1 to negotiator', () => {
    const state = {
      ...getFreshDefaultGameState(),
      phase: GamePhase.PLAYER_TURNS,
      players: [makePlayer(0, { troopSupply: 5 })],
      ixBoard: { stacks: [['spaceport'], ['windtraps'], ['holoprojectors']], nextFaceUpRevealed: {} },
    }
    const choice = buildRhomburSignetChoice(state, 0, 10, [])
    expect(legacySignetOptionIndexFromEffectOccurrence(0, choice)).toBe(
      choice.options.findIndex(o => o.reward.acquireTech !== undefined)
    )
    expect(legacySignetOptionIndexFromEffectOccurrence(1, choice)).toBe(
      choice.options.findIndex(o => o.reward.techNegotiator === 1)
    )
  })
})
