import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { STARTING_DECK } from '../../../data/cards'
import { RISE_OF_IX_INTRIGUE_CARDS } from '../../../data/intrigueCardsRiseOfIx'
import { evaluateGrandConspiracy } from '../riseOfIx/intrigue'
import {
  AgentIcon,
  ChoiceType,
  CustomEffect,
  FactionType,
  FixedOptionsChoice,
  GainSource,
  GamePhase,
  TurnType,
  type Card,
  type GameState,
  type Player,
} from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, makePlayer, stubDeckCard } from './_helpers'
import { buildInitialIxBoard } from '../riseOfIxReducer'

const ROI = { riseOfIx: true, riseOfIxEpic: false }
const cardByName = (name: string) => RISE_OF_IX_INTRIGUE_CARDS.find(c => c.name === name)!

function roiPlotState(players: Player[], overrides?: Partial<GameState>): GameState {
  return {
    ...getBaseTestState(undefined, { players: players.length }),
    expansions: ROI,
    players,
    intrigueDeck: [...RISE_OF_IX_INTRIGUE_CARDS],
    ixBoard: buildInitialIxBoard(),
    ...overrides,
  }
}

function combatState(players: Player[]): GameState {
  return {
    ...roiPlotState(players),
    phase: GamePhase.COMBAT,
    currTurn: null,
    combatTroops: Object.fromEntries(players.map(p => [p.id, 2])),
    combatStrength: Object.fromEntries(players.map(p => [p.id, 4])),
    currentConflict: {
      id: 1,
      tier: 1,
      name: 'Test',
      rewards: { first: [], second: [], third: [] },
    },
  }
}

function withAgentThisTurn(state: GameState, playerId: number, spaceId: number): GameState {
  const card = stubDeckCard(9000 + playerId, { agentIcons: [AgentIcon.CITY] })
  let s = {
    ...state,
    activePlayerId: playerId,
    phase: GamePhase.PLAYER_TURNS,
    players: state.players.map((p, i) =>
      i === playerId ? { ...p, deck: [card], handCount: 1 } : p
    ),
  }
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId, cardId: card.id })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId, spaceId })
  return s
}

describe('Rise of Ix intrigue cards', () => {
  it('Blackmail: combat influence cost and +5 combat', () => {
    const card = cardByName('Blackmail')
    let s = combatState([
      makePlayer(0, {
        intrigueCount: 1,
        dreadnoughts: { supply: 3, garrison: 1, conflict: 0, control: [] },
      }),
      makePlayer(1),
    ])
    s = {
      ...s,
      factionInfluence: {
        ...s.factionInfluence,
        [FactionType.EMPEROR]: { 0: 2, 1: 0 },
      },
    }
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: card.id })
    const choice = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    expect(choice).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      reward: {
        influence: { amounts: [{ faction: FactionType.EMPEROR, amount: -1 }] },
        combat: 5,
      },
    })
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)
    expect(s.combatStrength[0]).toBe(9)
  })

  it('Cannon Turrets: +2 combat and opponents retreat dreadnought', () => {
    const card = cardByName('Cannon Turrets')
    let s = combatState([
      makePlayer(0, { intrigueCount: 1 }),
      makePlayer(1, { dreadnoughts: { supply: 0, garrison: 0, conflict: 1, control: [] } }),
    ])
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: card.id })
    expect(s.combatStrength[0]).toBe(6)
    expect(s.players[1].dreadnoughts?.conflict).toBe(0)
    expect(s.players[1].dreadnoughts?.garrison).toBe(1)
    expect(s.players[0].dreadnoughts?.conflict ?? 0).toBe(0)
  })

  it('Strategic Push: +2 solari only when player wins combat', () => {
    const card = cardByName('Strategic Push')
    let s = combatState([
      makePlayer(0, { intrigueCount: 1, solari: 0 }),
      makePlayer(1),
      makePlayer(2),
      makePlayer(3),
    ])
    s = {
      ...s,
      combatStrength: { 0: 20, 1: 2, 2: 2, 3: 2 },
      combatTroops: { 0: 2, 1: 1, 2: 1, 3: 1 },
    }
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: card.id })
    s = { ...s, phase: GamePhase.COMBAT_REWARDS }
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].solari).toBe(2)
  })

  it('Second Wave: +2 combat and mobilize up to 2 garrison units', () => {
    const card = cardByName('Second Wave')
    let s = combatState([
      makePlayer(0, {
        intrigueCount: 1,
        troops: 4,
        dreadnoughts: { supply: 0, garrison: 2, conflict: 0, control: [] },
      }),
      makePlayer(1),
    ])
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: card.id })
    expect(s.pendingSecondWave).toBe(0)
    s = applyGameAction(s, { type: 'MOBILIZE_SECOND_WAVE', playerId: 0, troops: 1, dreadnoughts: 1 })
    expect(s.combatTroops[0]).toBe(3)
    expect(s.players[0].dreadnoughts?.conflict).toBe(1)
  })

  it('War Chest: combat cost and endgame VP at 10+ solari', () => {
    const combatCard = cardByName('War Chest')
    let s = combatState([makePlayer(0, { intrigueCount: 1, solari: 5 })])
    const paid = s.currTurn?.pendingChoices?.find(c => c.prompt.includes('confirm'))
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: combatCard.id })
    const choice = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    if (choice) {
      s = applyGameAction(s, {
        type: 'RESOLVE_CHOICE',
        playerId: 0,
        choiceId: choice.id,
        reward: choice.options[0].reward,
      })
      expect(s.players[0].solari).toBe(3)
      expect(s.combatStrength[0]).toBe(8)
    }

    let end = roiPlotState([makePlayer(0, { intrigueCount: 1, solari: 12, victoryPoints: 0 })], {
      phase: GamePhase.END_GAME,
    })
    end = applyGameAction(end, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: combatCard.id })
    expect(end.players[0].victoryPoints).toBe(1)
  })

  it('Finesse: combat +2 and plot influence swap', () => {
    const card = cardByName('Finesse')
    let s = combatState([makePlayer(0, { intrigueCount: 1 })])
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: card.id })
    expect(s.combatStrength[0]).toBe(6)

    s = roiPlotState([makePlayer(0, { intrigueCount: 1 })], {
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 2 },
        [FactionType.FREMEN]: { 0: 0 },
        [FactionType.BENE_GESSERIT]: { 0: 0 },
        [FactionType.SPACING_GUILD]: { 0: 0 },
      },
    })
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    expect(s.currTurn?.pendingChoices?.length).toBeGreaterThan(0)
    const loseChoice = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: loseChoice.id,
      reward: { influence: { amounts: [{ faction: FactionType.EMPEROR, amount: -1 }] } },
    })
    const gainChoice = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: gainChoice.id,
      reward: { influence: { amounts: [{ faction: FactionType.FREMEN, amount: 1 }] } },
    })
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)
    expect(s.factionInfluence[FactionType.FREMEN][0]).toBe(1)
  })

  it('Advanced Weaponry: combat +4 with 3 tech; plot commissions dreadnought', () => {
    const card = cardByName('Advanced Weaponry')
    const tech = [{ id: 'artillery' as const, faceUp: true }, { id: 'windtraps' as const, faceUp: true }, { id: 'flagship' as const, faceUp: true }]
    let s = combatState([
      makePlayer(0, { intrigueCount: 1, tech, dreadnoughts: { supply: 3, garrison: 0, conflict: 1, control: [] } }),
    ])
    s = applyGameAction(s, { type: 'PLAY_COMBAT_INTRIGUE', playerId: 0, cardId: card.id })
    expect(s.combatStrength[0]).toBe(8)

    s = roiPlotState([makePlayer(0, { intrigueCount: 1, solari: 5, dreadnoughts: { supply: 3, garrison: 0, conflict: 0, control: [] } })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    const choice = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      reward: choice.options[0].reward,
    })
    expect(s.players[0].solari).toBe(2)
    expect(s.players[0].dreadnoughts?.garrison).toBe(1)
  })

  it('Grand Conspiracy evaluator tiers', () => {
    const p = makePlayer(0, {
      hasHighCouncilSeat: true,
      dreadnoughts: { supply: 0, garrison: 2, conflict: 0, control: [] },
      deck: [stubDeckCard(301, { name: 'The Spice Must Flow' })],
    })
    const s = roiPlotState([p], {
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 4 },
        [FactionType.FREMEN]: { 0: 4 },
        [FactionType.BENE_GESSERIT]: { 0: 0 },
        [FactionType.SPACING_GUILD]: { 0: 0 },
      },
    })
    expect(evaluateGrandConspiracy(s, 0)).toBe(2)
  })

  it('Strongarm: troop cost and agent-faction influence', () => {
    const card = cardByName('Strongarm')
    const emperorSpace = BOARD_SPACES.find(s => s.influence?.faction === FactionType.EMPEROR)!.id
    let s = withAgentThisTurn(roiPlotState([makePlayer(0, { intrigueCount: 1, troops: 5 })]), 0, emperorSpace)
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    const choice = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      reward: choice.options[0].reward,
    })
    expect(s.players[0].troops).toBe(4)
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)
  })

  it('Ixian Probe: discard 2 draw 2', () => {
    const card = cardByName('Ixian Probe')
    const deck: Card[] = [
      stubDeckCard(1),
      stubDeckCard(2),
      stubDeckCard(3),
      stubDeckCard(4),
      stubDeckCard(5),
    ]
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, deck, handCount: 3 })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    const choice = s.currTurn?.pendingChoices?.[0]
    expect(choice?.type).toBe(ChoiceType.CARD_SELECT)
    s = applyGameAction(s, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: choice!.id,
      cardIds: [1, 2],
    })
    expect(s.players[0].handCount).toBe(3)
    expect(s.players[0].discardPile).toHaveLength(2)
    expect(s.players[0].deck.map(c => c.id)).toEqual([3, 4, 5])
  })

  it('Ixian Probe: with empty hand discards from draw pile and draws 2', () => {
    const card = cardByName('Ixian Probe')
    const deck: Card[] = [stubDeckCard(1), stubDeckCard(2), stubDeckCard(3), stubDeckCard(4)]
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, deck, handCount: 0 })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    const choice = s.currTurn?.pendingChoices?.[0]
    expect(choice?.type).toBe(ChoiceType.CARD_SELECT)
    expect(choice?.disabled).toBeFalsy()
    s = applyGameAction(s, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: choice!.id,
      cardIds: [1, 2],
    })
    expect(s.players[0].handCount).toBe(2)
    expect(s.players[0].deck.map(c => c.id)).toEqual([3, 4])
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([1, 2])
  })

  it('Ixian Probe: with 1 hand card discards hand then draw pile', () => {
    const card = cardByName('Ixian Probe')
    const deck: Card[] = [stubDeckCard(1), stubDeckCard(2), stubDeckCard(3), stubDeckCard(4)]
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, deck, handCount: 1 })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    const choice = s.currTurn?.pendingChoices?.[0]
    s = applyGameAction(s, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: choice!.id,
      cardIds: [1, 2],
    })
    expect(s.players[0].handCount).toBe(2)
    expect(s.players[0].deck.map(c => c.id)).toEqual([3, 4])
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([1, 2])
  })

  it('Ixian Probe: rejects draw-pile discard before hand is exhausted', () => {
    const deck: Card[] = [stubDeckCard(1), stubDeckCard(2), stubDeckCard(3)]
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, deck, handCount: 1 })])
    const before = s.players[0]
    s = applyGameAction(s, {
      type: 'CUSTOM_EFFECT',
      playerId: 0,
      customEffect: CustomEffect.IXIAN_PROBE,
      data: { cardIds: [2, 3], drawCards: 2, sourceCardId: 42, discardCount: 2 },
    })
    expect(s.players[0].deck.map(c => c.id)).toEqual(before.deck.map(c => c.id))
    expect(s.players[0].handCount).toBe(before.handCount)
    expect(s.players[0].discardPile).toHaveLength(0)
  })

  it('Cull: solari cost and trash', () => {
    const card = cardByName('Cull')
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, solari: 3, deck: [stubDeckCard(55)], handCount: 1 })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    const choice = s.currTurn?.pendingChoices?.[0]
    s = applyGameAction(s, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: choice!.id,
      cardIds: [55],
    })
    expect(s.players[0].solari).toBe(2)
    expect(s.players[0].trash).toHaveLength(1)
  })

  it('Secret Forces: requires High Council for +2 troops', () => {
    const card = cardByName('Secret Forces')
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, troops: 5, hasHighCouncilSeat: true })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    expect(s.players[0].troops).toBe(7)
  })

  it('Quid Pro Quo: spice cost and influence per agent faction', () => {
    const card = cardByName('Quid Pro Quo')
    const emperorSpace = BOARD_SPACES.find(s => s.influence?.faction === FactionType.EMPEROR)!.id
    const fremenSpace = BOARD_SPACES.find(s => s.influence?.faction === FactionType.FREMEN)!.id
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, spice: 5 })], {
      occupiedSpaces: { [emperorSpace]: [0], [fremenSpace]: [0] },
    })
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    expect(s.players[0].spice).toBe(3)
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)
    expect(s.factionInfluence[FactionType.FREMEN][0]).toBe(1)
  })

  it('Glimpse the Path: spice, water, draw', () => {
    const card = cardByName('Glimpse the Path')
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, spice: 2, water: 1, handCount: 5 })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    expect(s.players[0].spice).toBe(1)
    expect(s.players[0].water).toBe(2)
    expect(s.players[0].handCount).toBe(6)
  })

  it('Diversion: 4 units in conflict grants freighter choice', () => {
    const card = cardByName('Diversion')
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, troops: 10 })], {
      combatTroops: { 0: 3 },
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        diversionActive: true,
        canDeployTroops: true,
        troopLimit: 10,
        removableTroops: 0,
      },
    })
    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    expect(s.currTurn?.pendingChoices?.some(c => c.prompt.startsWith('Freighter'))).toBe(true)
    expect(s.currTurn?.diversionFreighterStepBefore).toBe(0)
  })

  it('Diversion: undeploy below 4 units restores freighter step and clears pending choice', () => {
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, troops: 10, freighterStep: 2 })], {
      combatTroops: { 0: 4 },
      combatStrength: { 0: 8 },
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        diversionActive: false,
        diversionFreighterGranted: true,
        diversionFreighterStepBefore: 2,
        diversionFreighterChoiceIds: ['diversion-freighter-test'],
        canDeployTroops: true,
        troopLimit: 10,
        removableTroops: 4,
        pendingChoices: [
          {
            id: 'diversion-freighter-test',
            type: ChoiceType.FIXED_OPTIONS,
            prompt: 'Freighter (now at 2/3)',
            source: { type: GainSource.INTRIGUE, id: 0, name: 'Diversion' },
            options: [],
          },
        ],
      },
    })
    s = applyGameAction(s, { type: 'UNDEPLOY_TROOP', playerId: 0 })
    expect(s.players[0].freighterStep).toBe(2)
    expect(s.currTurn?.diversionFreighterGranted).toBe(false)
    expect(s.currTurn?.diversionActive).toBe(true)
    expect(s.currTurn?.pendingChoices?.some(c => c.id === 'diversion-freighter-test')).toBe(false)
  })

  it('Expedite: spice for freighter choice', () => {
    const card = cardByName('Expedite')
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1, spice: 2, freighterStep: 0 })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    const confirm = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    expect(confirm).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: confirm.id,
      reward: confirm.options[0].reward,
    })
    const freighter = s.currTurn?.pendingChoices?.find(c => c.prompt.startsWith('Freighter')) as
      | FixedOptionsChoice
      | undefined
    expect(freighter).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: freighter.id,
      optionIndex: 0,
    })
    expect(s.players[0].spice).toBe(1)
    expect(s.players[0].freighterStep).toBe(1)
  })

  it('Machine Culture: plot acquire tech and endgame VP', () => {
    const card = cardByName('Machine Culture')
    let s = roiPlotState([makePlayer(0, { intrigueCount: 1 })])
    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    const confirm = s.currTurn?.pendingChoices?.[0] as FixedOptionsChoice
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: confirm.id,
      reward: confirm.options[0].reward,
    })
    expect(s.pendingAcquireTech?.playerId).toBe(0)

    const tech = [
      { id: 'artillery' as const, faceUp: true },
      { id: 'windtraps' as const, faceUp: true },
      { id: 'flagship' as const, faceUp: true },
    ]
    let end = roiPlotState([makePlayer(0, { intrigueCount: 1, tech, victoryPoints: 0 })], {
      phase: GamePhase.END_GAME,
    })
    end = applyGameAction(end, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: card.id })
    expect(end.players[0].victoryPoints).toBe(1)
  })
})
