import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../../data/boardSpaces'
import { TechTileId } from '../../../../data/techTiles'
import {
  AgentIcon,
  GainSource,
  GamePhase,
  NO_EXPANSIONS,
  RewardType,
  TurnType,
} from '../../../../types/GameTypes'
import { TECH_NEGOTIATION_SPACE_ID, buildRhomburSignetChoice, buildTechNegotiationChoice } from '../boardSpaceChoices'
import { getTechAcquireOffer, getTechAcquireSourceOptions } from '../techAcquireOffer'
import { applyGameAction, getFreshDefaultGameState } from '../../GameContext'
import { makePlayer, stubDeckCard, withCardOnTop } from '../../__tests__/_helpers'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }
const TECH_NEGOTIATION_ID = BOARD_SPACES.find(s => s.name === 'Tech Negotiation')!.id

function roiState() {
  const base = getFreshDefaultGameState()
  return {
    ...base,
    expansions: RISE_OF_IX,
    players: [makePlayer(0, { spice: 10 }), makePlayer(1)],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    ixBoard: {
      stacks: [[TechTileId.SPACEPORT], [TechTileId.WINDTRAPS], [TechTileId.HOLTZMAN_ENGINE]],
      nextFaceUpRevealed: {},
    },
  }
}

function bothSignetAndTechNegPending(s: ReturnType<typeof roiState>) {
  const techNegChoice = buildTechNegotiationChoice(s, 'Tech Negotiation', 0, [])
  const signetChoice = buildRhomburSignetChoice(s, 0, 9301, [techNegChoice.id])
  return {
    ...s,
    currTurn: {
      playerId: 0,
      type: TurnType.ACTION,
      pendingChoices: [techNegChoice, signetChoice],
    },
  }
}

describe('getTechAcquireOffer', () => {
  it('returns pending OR acquire branch before RESOLVE_CHOICE', () => {
    let s = roiState()
    const card = stubDeckCard(9001, { agentIcons: [AgentIcon.LANDSRAAD] })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: TECH_NEGOTIATION_ID })

    const offer = getTechAcquireOffer(s, 0)
    expect(offer).toMatchObject({
      ready: false,
      discount: 1,
      pendingChoice: expect.objectContaining({ optionIndex: 0 }),
    })
    expect(s.pendingAcquireTech).toBeFalsy()
  })

  it('returns ready offer after RESOLVE_CHOICE acquire branch', () => {
    let s = roiState()
    const card = stubDeckCard(9002, { agentIcons: [AgentIcon.LANDSRAAD] })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: TECH_NEGOTIATION_ID })
    const choice = s.currTurn?.pendingChoices?.find(c => c.prompt === 'Tech Negotiation')!
    const acquireIndex = choice.options.findIndex(o => o.reward.acquireTech !== undefined)
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: acquireIndex,
    })

    const offer = getTechAcquireOffer(s, 0)
    expect(offer).toMatchObject({ ready: true, discount: 1 })
    expect(offer?.pendingChoice).toBeUndefined()
  })

  it('returns optional acquire effect on Dreadnought without PAY_COST', () => {
    let s = roiState()
    const card = stubDeckCard(9003, { agentIcons: [AgentIcon.LANDSRAAD] })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, {
      type: 'PLACE_AGENT',
      playerId: 0,
      spaceId: BOARD_SPACES.find(bs => bs.name === 'Dreadnought')!.id,
    })

    const offer = getTechAcquireOffer(s, 0)
    expect(offer).toMatchObject({
      ready: false,
      discount: 0,
      pendingOptionalEffectId: expect.any(String),
    })
  })

  it('lists both sources when signet acquire and Tech Negotiation acquire are open and uncommitted', () => {
    const s = bothSignetAndTechNegPending(roiState())
    const options = getTechAcquireSourceOptions(s, 0)
    expect(options).toHaveLength(2)
    expect(options.find(o => o.id === 'board-space')).toMatchObject({
      kind: 'board-space',
      discount: 1,
      icon: '/icon/tech_discount.png',
      label: 'Tech Negotiation',
    })
    expect(options.find(o => o.id === 'signet-ring')).toMatchObject({
      kind: 'signet-ring',
      discount: 0,
      icon: '/icon/tech.png',
      label: 'Signet Ring',
    })
    expect(getTechAcquireOffer(s, 0)).toBeNull()
  })

  it('offers board −1 after signet negotiator was taken (ring acquire still pending)', () => {
    let s = bothSignetAndTechNegPending(roiState())
    s = {
      ...s,
      gains: [
        {
          round: 1,
          playerId: 0,
          source: GainSource.CARD,
          sourceId: 10,
          name: 'Signet Ring',
          amount: 1,
          type: RewardType.NEGOTIATOR,
        },
      ],
    }

    const offer = getTechAcquireOffer(s, 0)
    expect(offer).toMatchObject({
      ready: false,
      discount: 1,
      pendingChoice: expect.objectContaining({ optionIndex: 0 }),
    })
    expect(offer?.pendingOptionalEffectId).toBeUndefined()
  })

  it('offers signet acquire after Tech Negotiation negotiator was taken', () => {
    let s = bothSignetAndTechNegPending(roiState())
    s = {
      ...s,
      currTurn: {
        ...s.currTurn!,
        pendingChoices: s.currTurn!.pendingChoices!.filter(c => c.prompt !== 'Tech Negotiation'),
      },
      gains: [
        {
          round: 1,
          playerId: 0,
          source: GainSource.BOARD_SPACE,
          sourceId: TECH_NEGOTIATION_SPACE_ID,
          name: 'Tech Negotiation',
          amount: 1,
          type: RewardType.NEGOTIATOR,
        },
      ],
    }

    const offer = getTechAcquireOffer(s, 0)
    expect(offer).toMatchObject({
      ready: false,
      discount: 0,
      pendingChoice: expect.objectContaining({ optionIndex: 0 }),
    })
    expect(offer?.pendingOptionalEffectId).toBeUndefined()
  })

  it('offers unclaimed acquire-tech pending reward from shipping track recall', () => {
    const s = {
      ...roiState(),
      pendingRewards: [
        {
          id: 'shipping-recall-tech',
          source: { type: GainSource.SHIPPING_TRACK, id: 0, name: 'Shipping track' },
          reward: { acquireTech: { discount: 2 } },
          isTrash: false,
        },
      ],
    }
    const options = getTechAcquireSourceOptions(s, 0)
    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      discount: 2,
      ready: false,
      pendingRewardId: 'shipping-recall-tech',
      label: 'Shipping track',
    })
  })
})
