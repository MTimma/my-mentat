import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { LEADER_NAMES, RISE_OF_IX_LEADERS } from '../../../data/leaders'
import { YUNA_SOLARI_BONUS_GAIN_NAME } from '../../../data/leaderAbilities/yunaSolariBonus'
import {
  applyBountyInfiltrationBonus,
  applyWebOfPower,
} from '../riseOfIxReducer'
import { applyGameAction } from '../GameContext'
import {
  AgentIcon,
  ChoiceType,
  FactionType,
  GainSource,
  TurnType,
  type Card,
  type FixedOptionsChoice,
  type GameState,
} from '../../../types/GameTypes'
import { updateFactionInfluence } from '../../../utils/influenceVictoryPoints'
import { getBaseTestState, getRoiTestState, stubDeckCard, withCardOnTop } from './_helpers'

const yuna = RISE_OF_IX_LEADERS.find(l => l.name === LEADER_NAMES.PRINCESS_YUNA_MORITANI)!

const WEALTH_ID = BOARD_SPACES.find(s => s.name === 'Wealth')!.id
const CONSPIRE_ID = BOARD_SPACES.find(s => s.name === 'Conspire')!.id
const SMUGGLING_ID = BOARD_SPACES.find(s => s.name === 'Smuggling')!.id
const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id
const SELL_MELANGE_ID = BOARD_SPACES.find(s => s.name === 'Sell Melange')!.id

function yunaState(players = 1): GameState {
  return getRoiTestState({
    players,
    playerOverrides: { leader: yuna, solari: 20, spice: 10 },
  })
}

function royaltyCount(state: GameState, playerId = 0): number {
  return state.gains.filter(
    g => g.playerId === playerId && g.name === YUNA_SOLARI_BONUS_GAIN_NAME
  ).length
}

function placeAndClaim(state: GameState, card: Card, spaceId: number): GameState {
  let s = withCardOnTop(state, 0, card)
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId })
  return applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
}

describe('Yuna Smuggling Operation — solari gained on her turn', () => {
  it('Shipping 1 Dividends: +5 becomes +6, other players stay at +1', () => {
    let s = yunaState(3)
    const choice: FixedOptionsChoice = {
      id: 'yuna-dividends',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Recall reward (step 1): Dividends or +2 spice?',
      source: { type: GainSource.SHIPPING_TRACK, id: 0, name: 'Shipping 1' },
      options: [{ reward: { dividends: true }, rewardLabel: 'Dividends' }],
    }
    s = {
      ...s,
      currTurn: { playerId: 0, type: TurnType.ACTION, pendingChoices: [choice] },
    }
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: 0,
    })
    expect(s.players[0].solari).toBe(26)
    expect(s.players[1].solari).toBe(21)
    expect(s.players[2].solari).toBe(21)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Dividends paid on another player’s turn does not bonus Yuna’s 1 solari', () => {
    let s = getRoiTestState({ players: 2, activeId: 1 })
    s = {
      ...s,
      players: s.players.map(p =>
        p.id === 0 ? { ...p, leader: yuna, solari: 4 } : p
      ),
      currTurn: {
        playerId: 1,
        type: TurnType.ACTION,
        pendingChoices: [
          {
            id: 'opp-dividends',
            type: ChoiceType.FIXED_OPTIONS,
            prompt: 'Dividends',
            source: { type: GainSource.SHIPPING_TRACK, id: 0, name: 'Shipping 1' },
            options: [{ reward: { dividends: true } }],
          },
        ],
      },
    }
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 1,
      choiceId: 'opp-dividends',
      optionIndex: 0,
    })
    expect(s.players[0].solari).toBe(5)
    expect(s.players[1].solari).toBe(25)
    expect(royaltyCount(s, 0)).toBe(0)
    expect(royaltyCount(s, 1)).toBe(0)
  })

  it('Smuggling +1 solari becomes +2', () => {
    const card = stubDeckCard(9101, { agentIcons: [AgentIcon.SPICE_TRADE] })
    const s = placeAndClaim(yunaState(), card, SMUGGLING_ID)
    expect(s.players[0].solari).toBe(22)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Wealth +2 solari becomes +3', () => {
    const card = stubDeckCard(9102, { agentIcons: [AgentIcon.EMPEROR] })
    const s = placeAndClaim(yunaState(), card, WEALTH_ID)
    expect(s.players[0].solari).toBe(23)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Conspire +5 solari becomes +6', () => {
    const card = stubDeckCard(9103, { agentIcons: [AgentIcon.EMPEROR] })
    const s = placeAndClaim(yunaState(), card, CONSPIRE_ID)
    expect(s.players[0].solari).toBe(26)
    expect(s.players[0].spice).toBe(6)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Sell Melange adds +1 on top of the chosen solari', () => {
    // Sell Melange is removed from the board while Rise of Ix is on.
    const card = stubDeckCard(9104, { agentIcons: [AgentIcon.SPICE_TRADE] })
    let s = getBaseTestState({
      leader: yuna,
      solari: 20,
      spice: 10,
      deck: [card],
      handCount: 1,
    })
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, {
      type: 'PLACE_AGENT',
      playerId: 0,
      spaceId: SELL_MELANGE_ID,
      sellMelangeData: { spiceCost: 3, solariReward: 8 },
    })
    expect(s.players[0].solari).toBe(29)
    expect(royaltyCount(s)).toBe(1)
  })

  it('agent-box solari with no cost (Opulence-style) and the space each get +1', () => {
    const card = stubDeckCard(9105, {
      name: 'Opulence',
      agentIcons: [AgentIcon.EMPEROR],
      playEffect: [{ reward: { solari: 3 } }],
    })
    const s = placeAndClaim(yunaState(), card, WEALTH_ID)
    expect(s.players[0].solari).toBe(27)
    expect(royaltyCount(s)).toBe(2)
  })

  it('reveal-box solari (CHOAM Directorship-style) becomes +1 more when claimed', () => {
    const card = stubDeckCard(9106, {
      revealEffect: [{ reward: { solari: 3 } }],
    })
    let s = getRoiTestState({
      playerOverrides: { leader: yuna, deck: [card], handCount: 1, solari: 20 },
    })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [card.id] })
    expect(s.players[0].solari).toBe(20)
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(s.players[0].solari).toBe(24)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Spice Smugglers pay-2-spice solari becomes +4', () => {
    const card = stubDeckCard(9107, {
      name: 'Spice Smugglers',
      agentIcons: [AgentIcon.CITY],
      playEffect: [
        {
          cost: { spice: 2 },
          reward: {
            solari: 3,
            influence: {
              amounts: [{ faction: FactionType.SPACING_GUILD, amount: 1 }],
            },
          },
        },
      ],
    })
    let s = withCardOnTop(yunaState(), 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })
    const effect = s.currTurn?.optionalEffects?.find(e => e.reward.solari === 3)
    expect(effect).toBeTruthy()
    s = applyGameAction(s, { type: 'PAY_COST', playerId: 0, effectId: effect!.id })
    expect(s.players[0].solari).toBe(24)
    expect(s.players[0].spice).toBe(8)
    expect(royaltyCount(s)).toBe(1)
  })

  it('choice that pays for solari (Local Fence-style) becomes +1 more', () => {
    const choice: FixedOptionsChoice = {
      id: 'fence',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Local Fence',
      source: { type: GainSource.CARD, id: 1, name: 'Local Fence' },
      options: [{ cost: { spice: 2 }, reward: { solari: 5 } }],
    }
    let s = yunaState()
    s = {
      ...s,
      currTurn: { playerId: 0, type: TurnType.ACTION, pendingChoices: [choice] },
    }
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: 0,
    })
    expect(s.players[0].solari).toBe(26)
    expect(s.players[0].spice).toBe(8)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Windfall intrigue +2 solari becomes +3 on her turn', () => {
    let s = yunaState()
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 32 })
    expect(s.players[0].solari).toBe(23)
    expect(royaltyCount(s)).toBe(1)
  })

  it('scheduled reveal intrigue solari becomes +1 more', () => {
    const card = stubDeckCard(9108, { revealEffect: [{ reward: { persuasion: 1 } }] })
    let s = getRoiTestState({
      playerOverrides: { leader: yuna, deck: [card], handCount: 1, solari: 20 },
      stateOverrides: {
        scheduledIntrigueOnReveal: {
          0: [{ cardId: 1, name: 'Scheduled', image: '', reward: { solari: 2 } }],
        },
      },
    })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [card.id] })
    expect(s.players[0].solari).toBe(23)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Bounty Hunter infiltrate +2 solari becomes +3', () => {
    let s = getRoiTestState({
      playerOverrides: { leader: yuna, solari: 5 },
      stateOverrides: {
        infiltrateIgnoreOccupancyOnce: { 0: true },
        occupiedSpaces: { 1: [0, 1] },
        currTurn: { playerId: 0, type: TurnType.ACTION, agentSpaceId: 1 },
      },
    })
    s = applyBountyInfiltrationBonus(s, 0, { type: GainSource.CARD, id: 1, name: 'Bounty Hunter' })
    expect(s.players[0].solari).toBe(8)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Web of Power emperor reward +2 solari becomes +3', () => {
    let s = getRoiTestState({
      playerOverrides: { leader: yuna, solari: 0 },
      stateOverrides: {
        factionInfluence: {
          [FactionType.EMPEROR]: { 0: 2 },
          [FactionType.SPACING_GUILD]: { 0: 0 },
          [FactionType.BENE_GESSERIT]: { 0: 0 },
          [FactionType.FREMEN]: { 0: 0 },
        },
      },
    })
    s = applyWebOfPower(s, 0, 99, 'Web of Power')
    expect(s.players[0].solari).toBe(3)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Spacing Guild 4th-influence +3 solari becomes +4 on her turn', () => {
    let s = yunaState()
    s = {
      ...s,
      factionInfluence: {
        ...s.factionInfluence,
        [FactionType.SPACING_GUILD]: { 0: 3 },
      },
    }
    s = updateFactionInfluence(s, FactionType.SPACING_GUILD, 0, 1)
    expect(s.players[0].solari).toBe(24)
    expect(royaltyCount(s)).toBe(1)
  })

  it('Spacing Guild 4th-influence solari on someone else’s turn has no bonus', () => {
    let s = getRoiTestState({ players: 2, activeId: 1 })
    s = {
      ...s,
      players: s.players.map(p => (p.id === 0 ? { ...p, leader: yuna, solari: 0 } : p)),
      factionInfluence: {
        ...s.factionInfluence,
        [FactionType.SPACING_GUILD]: { 0: 3, 1: 0 },
      },
    }
    s = updateFactionInfluence(s, FactionType.SPACING_GUILD, 0, 1)
    expect(s.players[0].solari).toBe(3)
    expect(royaltyCount(s, 0)).toBe(0)
  })
})
