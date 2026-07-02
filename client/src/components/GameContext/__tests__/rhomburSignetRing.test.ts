import { describe, expect, it } from 'vitest'
import { TechTileId } from '../../../data/techTiles'
import { LEADER_NAMES, RISE_OF_IX_LEADERS } from '../../../data/leaders'
import {
  AgentIcon,
  ChoiceType,
  CustomEffect,
  GainSource,
  GamePhase,
  NO_EXPANSIONS,
  RewardType,
  TurnType,
} from '../../../types/GameTypes'
import {
  filterAcquireTechFromChoices,
  findOriginalOptionIndex,
} from '../riseOfIx/techTurnControlsUi'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { makePlayer, stubDeckCard, withCardOnTop } from './_helpers'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

function rhomburState() {
  const base = getFreshDefaultGameState()
  const rhomburLeader = RISE_OF_IX_LEADERS.find(l => l.name === LEADER_NAMES.PRINCE_RHOMBUR_VERNIUS)!
  return {
    ...base,
    expansions: RISE_OF_IX,
    players: [
      makePlayer(0, {
        spice: 10,
        troopSupply: 5,
        leader: rhomburLeader,
      }),
      makePlayer(1),
    ],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    ixBoard: {
      stacks: [[TechTileId.SPACEPORT], [TechTileId.WINDTRAPS], [TechTileId.HOLTZMAN_ENGINE]],
      nextFaceUpRevealed: {},
    },
  }
}

function signetRingCard() {
  return stubDeckCard(9301, {
    agentIcons: [AgentIcon.LANDSRAAD],
    playEffect: [{ reward: { custom: CustomEffect.SIGNET_RING } }],
  })
}

describe('Prince Rhombur signet ring (OR: buy tech or negotiator)', () => {
  it('creates a single OR choice, not separate optional effects', () => {
    let s = rhomburState()
    const card = signetRingCard()
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const choice = s.currTurn?.pendingChoices?.find(c => c.prompt === 'Signet Ring')
    expect(choice?.type).toBe(ChoiceType.FIXED_OPTIONS)
    expect(choice?.options).toHaveLength(2)
    expect(choice?.options.some(o => o.reward.acquireTech !== undefined)).toBe(true)
    expect(choice?.options.some(o => o.reward.techNegotiator === 1)).toBe(true)
    expect(s.currTurn?.optionalEffects?.some(e => e.source.name === 'Signet Ring')).toBe(false)
    expect(s.canEndTurn).toBe(false)
  })

  it('negotiator choice removes acquire option for the rest of the turn', () => {
    let s = rhomburState()
    const card = signetRingCard()
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const choice = s.currTurn?.pendingChoices?.find(c => c.prompt === 'Signet Ring')!
    const filtered = filterAcquireTechFromChoices([choice])[0]!
    const resolveIndex = findOriginalOptionIndex(choice.options, filtered.options[0])
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: resolveIndex,
    })

    expect(s.players[0].negotiatorsOnIx).toBe(1)
    expect(s.pendingAcquireTech).toBeFalsy()
    expect(s.currTurn?.pendingChoices?.some(c => c.prompt === 'Signet Ring')).toBe(false)
    expect(
      s.gains.some(
        g =>
          g.type === RewardType.NEGOTIATOR &&
          g.source === GainSource.CARD &&
          g.name === 'Signet Ring'
      )
    ).toBe(true)
  })

  it('acquire tech choice opens purchase without placing negotiator', () => {
    let s = rhomburState()
    const card = signetRingCard()
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const choice = s.currTurn?.pendingChoices?.find(c => c.prompt === 'Signet Ring')!
    const acquireIndex = choice.options.findIndex(o => o.reward.acquireTech !== undefined)
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: acquireIndex,
    })

    expect(s.pendingAcquireTech).toEqual(expect.objectContaining({ playerId: 0, discount: 0 }))
    expect(s.players[0].negotiatorsOnIx ?? 0).toBe(0)
    expect(s.currTurn?.pendingChoices?.some(c => c.prompt === 'Signet Ring')).toBe(false)
  })
})
