import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import {
  AgentIcon,
  ChoiceType,
  CustomEffect,
  FactionType,
  FixedOptionsChoice,
  GamePhase,
  GainSource,
  RewardType,
  TurnType,
  type GameState,
} from '../../../types/GameTypes'
import { assertJsonSerializable } from '../../../save/recording'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, makePlayer, stubDeckCard, defaultRoiIxBoard } from './_helpers'

const ROI_EXPANSIONS = { riseOfIx: true, riseOfIxEpic: false }
const SMUGGLING_ID = BOARD_SPACES.find(s => s.name === 'Smuggling')!.id
const INTERSTELLAR_SHIPPING_ID = BOARD_SPACES.find(s => s.name === 'Interstellar Shipping')!.id

function roiState(overrides?: Partial<GameState>): GameState {
  return {
    ...getBaseTestState(undefined, { players: 3 }),
    expansions: ROI_EXPANSIONS,
    ixBoard: defaultRoiIxBoard(),
    players: [
      makePlayer(0, { freighterStep: 0 }),
      makePlayer(1, { freighterStep: 0 }),
      makePlayer(2, { freighterStep: 0 }),
    ],
    ...overrides,
  }
}

function spiceTradeCard(id: number) {
  return stubDeckCard(id, { agentIcons: [AgentIcon.SPICE_TRADE] })
}

function freighterChoice(state: GameState): FixedOptionsChoice {
  const choice = state.currTurn?.pendingChoices?.find(
    c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt.startsWith('Freighter')
  ) as FixedOptionsChoice | undefined
  if (!choice) throw new Error('No freighter pending choice')
  return choice
}

function shippingPendingRewards(state: GameState) {
  return state.pendingRewards.filter(r => r.source.type === GainSource.SHIPPING_TRACK)
}

function shippingPendingChoices(state: GameState) {
  return (state.currTurn?.pendingChoices ?? []).filter(
    c => c.source.type === GainSource.SHIPPING_TRACK || c.prompt.includes('Recall reward')
  )
}

function freighterChoices(state: GameState): FixedOptionsChoice[] {
  return (state.currTurn?.pendingChoices?.filter(c => c.prompt.startsWith('Freighter')) ??
    []) as FixedOptionsChoice[]
}

function hasAdvanceOption(choice: FixedOptionsChoice): boolean {
  return choice.options.some(opt => opt.reward.custom === CustomEffect.FREIGHTER_ADVANCE)
}

function resolveFreighter(
  state: GameState,
  playerId: number,
  choiceId: string,
  option: 'advance' | 'recall'
): GameState {
  const choice = state.currTurn?.pendingChoices?.find(c => c.id === choiceId) as
    | FixedOptionsChoice
    | undefined
  if (!choice) throw new Error('Choice not found')
  const optionIndex = choice.options.findIndex(opt =>
    option === 'advance'
      ? opt.reward.custom === CustomEffect.FREIGHTER_ADVANCE
      : opt.reward.custom === CustomEffect.FREIGHTER_RECALL
  )
  return applyGameAction(state, {
    type: 'RESOLVE_CHOICE',
    playerId,
    choiceId,
    optionIndex,
  })
}

function placeOnSpace(state: GameState, playerId: number, cardId: number, spaceId: number): GameState {
  let s = {
    ...state,
    activePlayerId: playerId,
    phase: GamePhase.PLAYER_TURNS,
    currTurn: { playerId, type: TurnType.ACTION },
  }
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId, cardId })
  return applyGameAction(s, { type: 'PLACE_AGENT', playerId, spaceId })
}

describe('freighter shipping track', () => {
  it('Advance from 0 -> 1', () => {
    const card = spiceTradeCard(8801)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 0, deck: [card] })],
    })
    s = placeOnSpace(s, 0, card.id, SMUGGLING_ID)
    const choice = freighterChoice(s)
    s = resolveFreighter(s, 0, choice.id, 'advance')
    expect(s.players[0].freighterStep).toBe(1)
    expect(s.gains).toContainEqual(
      expect.objectContaining({ type: RewardType.FREIGHTER, amount: 1, name: 'Advance' })
    )
  })

  it('Advance is not offered at step 3', () => {
    const card = spiceTradeCard(8802)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 3, deck: [card] })],
    })
    s = placeOnSpace(s, 0, card.id, SMUGGLING_ID)
    const choice = freighterChoice(s)
    expect(
      choice.options.some(opt => opt.reward.custom === CustomEffect.FREIGHTER_ADVANCE)
    ).toBe(false)
    expect(
      choice.options.some(opt => opt.reward.custom === CustomEffect.FREIGHTER_RECALL)
    ).toBe(true)
  })

  it('Recall from 0 yields no rewards', () => {
    const card = spiceTradeCard(8803)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 0, deck: [card] })],
    })
    s = placeOnSpace(s, 0, card.id, SMUGGLING_ID)
    const choice = freighterChoice(s)
    s = resolveFreighter(s, 0, choice.id, 'recall')
    expect(s.players[0].freighterStep).toBe(0)
    expect(shippingPendingRewards(s)).toEqual([])
    expect(shippingPendingChoices(s)).toEqual([])
    const recallGain = s.gains.find(g => g.type === RewardType.FREIGHTER && g.name === 'Recall')
    expect(recallGain).toBeDefined()
    expect(Math.abs(recallGain!.amount)).toBe(0)
  })

  it('Recall from 0 allows END_TURN when no other pending work remains', () => {
    const freighterOnlyChoice: FixedOptionsChoice = {
      id: 'test-freighter-recall-0',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Freighter (now at 0/3)',
      source: { type: GainSource.BOARD_SPACE, id: SMUGGLING_ID, name: 'Smuggling' },
      options: [
        { reward: { custom: CustomEffect.FREIGHTER_ADVANCE }, rewardLabel: 'Advance' },
        { reward: { custom: CustomEffect.FREIGHTER_RECALL }, rewardLabel: 'Recall' },
      ],
    }
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 0 })],
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        pendingChoices: [freighterOnlyChoice],
      },
      canEndTurn: false,
    })
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: freighterOnlyChoice.id,
      optionIndex: 1,
    })
    expect(s.canEndTurn).toBe(true)
    expect(s.currTurn?.pendingChoices ?? []).toHaveLength(0)
    expect(s.pendingRewards.filter(r => !r.disabled)).toHaveLength(0)
  })

  it('Recall from 1 keeps canEndTurn false while step-1 reward choice is pending', () => {
    const card = spiceTradeCard(8804)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 1, deck: [card] })],
    })
    s = placeOnSpace(s, 0, card.id, SMUGGLING_ID)
    const choice = freighterChoice(s)
    s = resolveFreighter(s, 0, choice.id, 'recall')
    expect(s.canEndTurn).toBe(false)
    expect(s.currTurn?.pendingChoices?.length).toBe(1)
  })

  it('Recall from 1 yields the step-1 OR-choice only', () => {
    const card = spiceTradeCard(8804)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 1, deck: [card] })],
    })
    s = placeOnSpace(s, 0, card.id, SMUGGLING_ID)
    const choice = freighterChoice(s)
    s = resolveFreighter(s, 0, choice.id, 'recall')
    expect(s.players[0].freighterStep).toBe(0)
    expect(s.currTurn?.pendingChoices?.length).toBe(1)
    expect(s.currTurn?.pendingChoices?.[0]).toMatchObject({
      prompt: expect.stringContaining('Dividends'),
    })
    expect(shippingPendingRewards(s)).toEqual([])
  })

  it('Recall from 2 yields Dividends OR-choice + troops + influence choice', () => {
    const card = spiceTradeCard(8805)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 2, deck: [card] })],
    })
    s = placeOnSpace(s, 0, card.id, SMUGGLING_ID)
    const choice = freighterChoice(s)
    s = resolveFreighter(s, 0, choice.id, 'recall')
    expect(shippingPendingRewards(s).map(r => r.reward)).toEqual([{ troops: 2 }])
    expect(shippingPendingChoices(s).length).toBe(2)
    expect(shippingPendingChoices(s).some(c => c.prompt.includes('Dividends'))).toBe(true)
    expect(shippingPendingChoices(s).some(c => c.prompt.includes('influence'))).toBe(true)
  })

  it('Recall from 3 yields all three reward steps', () => {
    const card = spiceTradeCard(8806)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 3, deck: [card] })],
    })
    s = placeOnSpace(s, 0, card.id, SMUGGLING_ID)
    const choice = freighterChoice(s)
    s = resolveFreighter(s, 0, choice.id, 'recall')
    expect(shippingPendingRewards(s).map(r => r.reward)).toEqual([
      { troops: 2 },
      { acquireTech: { discount: 2 } },
    ])
    expect(shippingPendingChoices(s).length).toBe(2)
  })

  it('CLAIM_ALL_REWARDS after recall from 3 grants pending acquire tech', () => {
    const card = spiceTradeCard(8808)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 3, spice: 3, deck: [card] })],
    })
    s = placeOnSpace(s, 0, card.id, SMUGGLING_ID)
    const choice = freighterChoice(s)
    s = resolveFreighter(s, 0, choice.id, 'recall')
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(s.pendingAcquireTech).toMatchObject({ playerId: 0, discount: 2 })
    expect(shippingPendingRewards(s).some(r => r.reward.acquireTech !== undefined)).toBe(false)
  })

  it('Dividends pays +5 to active and +1 to each other player', () => {
    let s = roiState()
    const dividendsChoice: FixedOptionsChoice = {
      id: 'test-dividends',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Recall reward (step 1): Dividends or +2 spice?',
      source: { type: GainSource.SHIPPING_TRACK, id: 0, name: 'Shipping track' },
      options: [{ reward: { dividends: true }, rewardLabel: 'Dividends' }],
    }
    s = {
      ...s,
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        pendingChoices: [dividendsChoice],
      },
    }
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: dividendsChoice.id,
      optionIndex: 0,
    })
    expect(s.players[0].solari).toBe(25)
    expect(s.players[1].solari).toBe(21)
    expect(s.players[2].solari).toBe(21)
  })

  it('Two freighter icons -> two pending choices', () => {
    const card = spiceTradeCard(8807)
    let s = roiState({
      players: [makePlayer(0, { deck: [card] })],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 0 },
        [FactionType.SPACING_GUILD]: { 0: 2 },
        [FactionType.BENE_GESSERIT]: { 0: 0 },
        [FactionType.FREMEN]: { 0: 0 },
      },
    })
    s = placeOnSpace(s, 0, card.id, INTERSTELLAR_SHIPPING_ID)
    const choices = freighterChoices(s)
    expect(choices).toHaveLength(2)
    expect(hasAdvanceOption(choices[0])).toBe(true)
    expect(hasAdvanceOption(choices[1])).toBe(true)
  })

  it('at step 2, Interstellar Shipping second choice cannot advance past step 3', () => {
    const card = spiceTradeCard(8808)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 2, deck: [card] })],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 0 },
        [FactionType.SPACING_GUILD]: { 0: 2 },
        [FactionType.BENE_GESSERIT]: { 0: 0 },
        [FactionType.FREMEN]: { 0: 0 },
      },
    })
    s = placeOnSpace(s, 0, card.id, INTERSTELLAR_SHIPPING_ID)
    const [first, second] = freighterChoices(s)
    expect(first.prompt).toBe('Freighter (now at 2/3)')
    expect(hasAdvanceOption(first)).toBe(true)
    expect(second.prompt).toBe('Freighter (now at 3/3)')
    expect(hasAdvanceOption(second)).toBe(false)
  })

  it('after advancing from step 2, remaining freighter choice drops Advance', () => {
    const card = spiceTradeCard(8809)
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 2, deck: [card] })],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 0 },
        [FactionType.SPACING_GUILD]: { 0: 2 },
        [FactionType.BENE_GESSERIT]: { 0: 0 },
        [FactionType.FREMEN]: { 0: 0 },
      },
    })
    s = placeOnSpace(s, 0, card.id, INTERSTELLAR_SHIPPING_ID)
    const [first] = freighterChoices(s)
    s = resolveFreighter(s, 0, first.id, 'advance')
    expect(s.players[0].freighterStep).toBe(3)
    const remaining = freighterChoices(s)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].prompt).toBe('Freighter (now at 3/3)')
    expect(hasAdvanceOption(remaining[0])).toBe(false)
  })

  it('freighterStep persists across END_TURN', () => {
    let s = roiState({
      players: [makePlayer(0, { freighterStep: 2 })],
      canEndTurn: true,
      currTurn: { playerId: 0, type: TurnType.ACTION },
    })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(s.players[0].freighterStep).toBe(2)
  })

  it('UNDO_TO_TURN restores prior freighterStep', () => {
    let s = roiState({ players: [makePlayer(0, { freighterStep: 1 })] })
    const setupSnapshot = { ...s, history: [], historyEntryKind: 'setup' as const }
    s = {
      ...s,
      history: [setupSnapshot, { ...s, history: [], players: [makePlayer(0, { freighterStep: 3 })] }],
    }
    s = applyGameAction(s, { type: 'UNDO_TO_TURN', turnIndex: 0 })
    expect(s.players[0].freighterStep).toBe(1)
  })

  it('RESOLVE_CHOICE freighter actions are JSON-serializable for recording', () => {
    const action = {
      type: 'RESOLVE_CHOICE' as const,
      playerId: 0,
      choiceId: 'card-8801-FREIGHTER-1',
      optionIndex: 0,
    }
    expect(() => assertJsonSerializable(action, action.type)).not.toThrow()
  })

  it('does not enqueue freighter choices when riseOfIx is off', () => {
    const card = spiceTradeCard(8808)
    let s = getBaseTestState({ deck: [card] })
    s = {
      ...s,
      expansions: { riseOfIx: false, riseOfIxEpic: false },
      activePlayerId: 0,
      currTurn: { playerId: 0, type: TurnType.ACTION },
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: SMUGGLING_ID })
    expect(s.currTurn?.pendingChoices?.filter(c => c.prompt.startsWith('Freighter')) ?? []).toEqual([])
  })
})
