import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { TechTileId } from '../../../data/techTiles'
import { DEFAULT_DREADNOUGHTS } from '../../../utils/dreadnoughts'
import {
  AgentIcon,
  ChoiceType,
  GamePhase,
  NO_EXPANSIONS,
  RewardType,
  TurnType,
} from '../../../types/GameTypes'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { makePlayer, stubDeckCard, withCardOnTop } from './_helpers'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

const TECH_NEGOTIATION_ID = BOARD_SPACES.find(s => s.name === 'Tech Negotiation')!.id
const DREADNOUGHT_SPACE_ID = BOARD_SPACES.find(s => s.name === 'Dreadnought')!.id

function roiState(overrides: Record<string, unknown> = {}) {
  const base = getFreshDefaultGameState()
  const p0 = makePlayer(0, {
    spice: 10,
    solari: 10,
    negotiatorsOnIx: 0,
    troopSupply: 8,
    dreadnoughts: { ...DEFAULT_DREADNOUGHTS, supply: 2 },
    tech: [],
  })
  return {
    ...base,
    expansions: RISE_OF_IX,
    players: [p0, makePlayer(1)],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    ixBoard: {
      stacks: [
        [TechTileId.MINIMIC_FILM, TechTileId.ARTILLERY],
        [TechTileId.WINDTRAPS],
        [TechTileId.HOLTZMAN_ENGINE],
      ],
      nextFaceUpRevealed: {},
    },
    ...overrides,
  }
}

function placeOnIxSpace(spaceId: number) {
  let s = roiState()
  const card = stubDeckCard(8101, { agentIcons: [AgentIcon.LANDSRAAD] })
  s = withCardOnTop(s, 0, card)
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId })
  return s
}

function techNegotiationChoice(s: ReturnType<typeof placeOnIxSpace>) {
  return s.currTurn?.pendingChoices?.find(
    c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt === 'Tech Negotiation'
  )
}

describe('Tech Negotiation board space (OR choice)', () => {
  it('offers acquire tech OR negotiator as a single FIXED_OPTIONS choice', () => {
    const s = placeOnIxSpace(TECH_NEGOTIATION_ID)
    const choice = techNegotiationChoice(s)
    expect(choice?.type).toBe(ChoiceType.FIXED_OPTIONS)
    expect(choice?.options).toHaveLength(2)
    expect(choice?.options.some(o => o.reward.acquireTech?.discount === 1)).toBe(true)
    expect(choice?.options.some(o => o.reward.techNegotiator === 1)).toBe(true)
    expect(s.currTurn?.optionalEffects?.some(e => e.source.id === TECH_NEGOTIATION_ID)).toBe(false)
    expect(s.pendingAcquireTech).toBeFalsy()
    expect(s.players[0].negotiatorsOnIx).toBe(0)
    expect(s.canEndTurn).toBe(false)
  })

  it('negotiator option places one on Ix without opening tech purchase', () => {
    let s = placeOnIxSpace(TECH_NEGOTIATION_ID)
    const choice = techNegotiationChoice(s)!
    const negotiatorIndex = choice.options.findIndex(o => o.reward.techNegotiator === 1)
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: negotiatorIndex,
    })
    expect(s.players[0].negotiatorsOnIx).toBe(1)
    expect(s.pendingAcquireTech).toBeFalsy()
    expect(s.players[0].tech ?? []).toHaveLength(0)
    expect(
      s.gains.some(
        g =>
          g.type === RewardType.POOL_TROOP &&
          g.amount === -1 &&
          g.name === 'Tech Negotiator'
      )
    ).toBe(true)
  })

  it('acquire option sets pending purchase with −1 discount, no negotiator', () => {
    let s = placeOnIxSpace(TECH_NEGOTIATION_ID)
    const choice = techNegotiationChoice(s)!
    const acquireIndex = choice.options.findIndex(o => o.reward.acquireTech !== undefined)
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: acquireIndex,
    })
    expect(s.pendingAcquireTech).toEqual(
      expect.objectContaining({ playerId: 0, discount: 1 })
    )
    expect(s.players[0].negotiatorsOnIx).toBe(0)
  })

  it('cannot take both negotiator and acquire tech on the same visit', () => {
    let s = placeOnIxSpace(TECH_NEGOTIATION_ID)
    const choice = techNegotiationChoice(s)!
    const negotiatorIndex = choice.options.findIndex(o => o.reward.techNegotiator === 1)
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: negotiatorIndex,
    })
    expect(s.players[0].negotiatorsOnIx).toBe(1)
    expect(s.pendingAcquireTech).toBeFalsy()
    expect(s.currTurn?.pendingChoices?.some(c => c.prompt === 'Tech Negotiation')).toBe(false)
  })

  it('acquire path: purchase with chosen negotiator return reduces spice cost', () => {
    let s = roiState()
    s.players[0].negotiatorsOnIx = 2
    s.players[0].spice = 2
    const card = stubDeckCard(8102, { agentIcons: [AgentIcon.LANDSRAAD] })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: TECH_NEGOTIATION_ID })
    const choice = techNegotiationChoice(s)!
    const acquireIndex = choice.options.findIndex(o => o.reward.acquireTech !== undefined)
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: acquireIndex,
    })
    s = applyGameAction(s, {
      type: 'ACQUIRE_TECH',
      playerId: 0,
      tileId: TechTileId.MINIMIC_FILM,
      stackIndex: 0,
      negotiatorsReturned: 1,
      discount: 0,
      nextFaceUpTileId: TechTileId.ARTILLERY,
    })
    expect(s.players[0].spice).toBe(2)
    expect(s.players[0].negotiatorsOnIx).toBe(1)
    expect(s.players[0].tech?.[0]?.id).toBe(TechTileId.MINIMIC_FILM)
    expect(s.pendingAcquireTech).toBeFalsy()
  })
})

function optionalEffectsForBoardSpace(s: ReturnType<typeof placeOnIxSpace>, spaceId: number) {
  const space = BOARD_SPACES.find(bs => bs.id === spaceId)!
  return (s.currTurn?.optionalEffects ?? []).filter(
    e => e.source.type === 'board-space' && e.source.id === spaceId && e.source.name === space.name
  )
}

describe('Dreadnought board space (mandatory commission + optional acquire)', () => {
  it('auto-commissions dreadnought and offers optional acquire tech — not OR', () => {
    const s = placeOnIxSpace(DREADNOUGHT_SPACE_ID)
    expect(s.currTurn?.pendingChoices?.some(c => c.type === ChoiceType.FIXED_OPTIONS)).toBe(false)
    expect(s.players[0].dreadnoughts?.garrison).toBe(1)
    expect(s.players[0].dreadnoughts?.supply).toBe(1)
    const optional = optionalEffectsForBoardSpace(s, DREADNOUGHT_SPACE_ID)
    expect(optional).toHaveLength(1)
    expect(optional[0].reward.acquireTech).toBeDefined()
    expect(s.pendingAcquireTech).toBeFalsy()
    expect(s.canEndTurn).toBe(true)
  })

  it('optional acquire tech opens purchase without blocking commission', () => {
    let s = placeOnIxSpace(DREADNOUGHT_SPACE_ID)
    expect(s.players[0].dreadnoughts?.garrison).toBe(1)
    const acquire = optionalEffectsForBoardSpace(s, DREADNOUGHT_SPACE_ID)[0]
    s = applyGameAction(s, { type: 'PAY_COST', playerId: 0, effectId: acquire.id })
    expect(s.pendingAcquireTech?.playerId).toBe(0)
    expect(s.players[0].dreadnoughts?.garrison).toBe(1)
  })

  it('does not commission when already at 2 active dreadnoughts', () => {
    let s = roiState()
    s.players[0].dreadnoughts = { ...DEFAULT_DREADNOUGHTS, supply: 0, garrison: 2 }
    const card = stubDeckCard(8103, { agentIcons: [AgentIcon.LANDSRAAD] })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: DREADNOUGHT_SPACE_ID })
    expect(s.players[0].dreadnoughts?.garrison).toBe(2)
    expect(optionalEffectsForBoardSpace(s, DREADNOUGHT_SPACE_ID)).toHaveLength(1)
  })

  it('records solari cost for dreadnought space visit', () => {
    const s = placeOnIxSpace(DREADNOUGHT_SPACE_ID)
    expect(s.players[0].dreadnoughts?.garrison).toBe(1)
    expect(s.players[0].solari).toBe(7)
    expect(
      s.gains.some(
        g =>
          g.type === RewardType.SOLARI &&
          g.amount === -3 &&
          g.name === 'Dreadnought'
      )
    ).toBe(true)
  })
})

describe('optional may icons on cards', () => {
  it('Ixian Engineer playEffect acquireTech is optional and does not block end turn', () => {
    const card = stubDeckCard(8201, {
      agentIcons: [AgentIcon.SPICE_TRADE],
      playEffect: [{ reward: { acquireTech: {} } }],
    })
    let s = roiState()
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })
    const optional = s.currTurn?.optionalEffects?.filter(e => e.source.id === card.id) ?? []
    expect(optional).toHaveLength(1)
    expect(optional[0].reward.acquireTech).toBeDefined()
    expect(s.pendingRewards.some(r => r.reward.acquireTech !== undefined)).toBe(false)
    expect(s.currTurn?.optionalEffects?.some(e => e.reward.acquireTech !== undefined)).toBe(true)
  })

  it('Ix-Guild Compact reveal techNegotiator is optional', () => {
    const card = stubDeckCard(8202, {
      agentIcons: [AgentIcon.SPACING_GUILD],
      revealEffect: [{ reward: { techNegotiator: 2 } }],
    })
    let s = roiState({ currTurn: { playerId: 0, type: TurnType.ACTION, cardId: card.id } })
    s.players[0].deck = [card]
    s.players[0].handCount = 1
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [card.id] })
    const optional = s.currTurn?.optionalEffects?.filter(e => e.source.id === card.id) ?? []
    expect(optional).toHaveLength(1)
    expect(optional[0].reward.techNegotiator).toBe(2)
    expect(s.players[0].negotiatorsOnIx).toBe(0)
    expect(s.canEndTurn).toBe(true)
  })
})
