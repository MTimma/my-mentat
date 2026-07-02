import { describe, expect, it } from 'vitest'
import { ChoiceType, GamePhase, GainSource, NO_EXPANSIONS, TurnType } from '../../../../types/GameTypes'
import { TechTileId } from '../../../../data/techTiles'
import { getFreshDefaultGameState } from '../../GameContext'
import { makePlayer } from '../../__tests__/_helpers'
import {
  filterAcquireTechFromChoices,
  filterAcquireTechOptionalEffects,
  findOriginalOptionIndex,
  findTechAcquireOptionForEffectSource,
  canAffordAnyFaceUpTech,
  isAcquireTechOnlyChoiceOption,
  isAcquireTechOnlyOptional,
} from '../techTurnControlsUi'
import { buildRhomburSignetChoice } from '../boardSpaceChoices'

describe('techTurnControlsUi', () => {
  it('filters acquire-tech-only optional effects', () => {
    const effects = [
      {
        id: 'acquire-only',
        cost: {},
        reward: { acquireTech: { discount: 2 } },
        source: { type: 'BOARD', id: 1, name: 'Dreadnought' },
      },
      {
        id: 'negotiator',
        cost: {},
        reward: { techNegotiator: 1 },
        source: { type: 'BOARD', id: 24, name: 'Tech Negotiation' },
      },
    ]
    expect(isAcquireTechOnlyOptional(effects[0])).toBe(true)
    expect(isAcquireTechOnlyOptional(effects[1])).toBe(false)
    expect(filterAcquireTechOptionalEffects(effects)).toEqual([effects[1]])
  })

  it('filters acquire-tech branch from OR choices but keeps negotiator', () => {
    const choice = {
      id: 'tech-neg',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Choose one option',
      options: [
        { reward: { techNegotiator: 2 } },
        { reward: { acquireTech: { discount: 0 } } },
      ],
      source: { type: 'BOARD', id: 24, name: 'Tech Negotiation' },
    }
    expect(isAcquireTechOnlyChoiceOption(choice.options[1])).toBe(true)
    const filtered = filterAcquireTechFromChoices([choice])
    expect(filtered).toHaveLength(1)
    expect(filtered[0].options).toHaveLength(1)
    expect(filtered[0].options[0].reward.techNegotiator).toBe(2)
  })

  it('maps filtered negotiator option back to original OR index', () => {
    const choice = {
      id: 'tech-neg',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Tech Negotiation',
      options: [
        { reward: { acquireTech: { discount: 1 } } },
        { reward: { techNegotiator: 1 } },
      ],
      source: { type: 'BOARD', id: 24, name: 'Tech Negotiation' },
    }
    const filtered = filterAcquireTechFromChoices([choice])[0] as typeof choice
    expect(findOriginalOptionIndex(choice.options, filtered.options[0])).toBe(1)
  })

  it('maps Rhombur signet negotiator option back to original OR index', () => {
    const base = getFreshDefaultGameState()
    const state = {
      ...base,
      expansions: { ...NO_EXPANSIONS, riseOfIx: true },
      players: [makePlayer(0, { spice: 10, troopSupply: 5 })],
      phase: GamePhase.PLAYER_TURNS,
      ixBoard: {
        stacks: [[TechTileId.SPACEPORT], [TechTileId.WINDTRAPS], [TechTileId.HOLTZMAN_ENGINE]],
        nextFaceUpRevealed: {},
      },
    }
    const choice = buildRhomburSignetChoice(state, 0, 9301, [])
    const filtered = filterAcquireTechFromChoices([choice])[0] as typeof choice
    expect(filtered.options).toHaveLength(1)
    expect(filtered.options[0].reward.techNegotiator).toBe(1)
    expect(findOriginalOptionIndex(choice.options, filtered.options[0])).toBe(1)
  })

  it('finds signet-ring tech acquire option for signet effect source', () => {
    const base = getFreshDefaultGameState()
    const ixBoard = {
      stacks: [[TechTileId.SPACEPORT], [TechTileId.WINDTRAPS], [TechTileId.HOLTZMAN_ENGINE]],
      nextFaceUpRevealed: {},
    }
    const partialState = {
      ...base,
      expansions: { ...NO_EXPANSIONS, riseOfIx: true },
      players: [makePlayer(0, { spice: 10, troopSupply: 5 })],
      phase: GamePhase.PLAYER_TURNS,
      activePlayerId: 0,
      ixBoard,
    }
    const state = {
      ...partialState,
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        pendingChoices: [buildRhomburSignetChoice(partialState, 0, 9301, [])],
      },
    }
    const option = findTechAcquireOptionForEffectSource(state, 0, {
      type: GainSource.CARD,
      id: 9301,
      name: 'Signet Ring',
    })
    expect(option?.kind).toBe('signet-ring')
    expect(canAffordAnyFaceUpTech(state, state.players[0], option!)).toBe(true)
  })
})
