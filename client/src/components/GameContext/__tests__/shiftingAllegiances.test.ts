import { describe, it, expect } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import {
  AgentIcon,
  ChoiceType,
  FactionType,
  FixedOptionsChoice,
  GainSource,
  GamePhase,
  Leader,
  PlayerColor,
  RewardType,
  TurnType,
  type Card,
  type GameState,
  type OptionalEffect,
  type Player,
} from '../../../types/GameTypes'
import { seedTroopSupply } from '../../../utils/troops'

function makePlayer(id: number, overrides: Partial<Player> = {}): Player {
  const colors = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW]
  const player = {
    id,
    color: colors[id % 4] ?? PlayerColor.RED,
    leader: new Leader('Test', { name: 'Ability', description: '' }, 'Signet', 1),
    troops: 8,
    spice: 5,
    water: 3,
    solari: 20,
    victoryPoints: 0,
    agents: 2,
    persuasion: 0,
    combatValue: 0,
    hasSwordmaster: false,
    hasHighCouncilSeat: false,
    handCount: 5,
    revealed: false,
    intrigueCount: 0,
    deck: [],
    discardPile: [],
    playArea: [],
    trash: [],
    ...overrides,
  }
  return 'troopSupply' in overrides ? player : seedTroopSupply(player)
}

const SHIFTING_ALLEGIANCES: Card = {
  id: 1051,
  name: 'Shifting Allegiances',
  image: 'imperium_row/shifting_allegiances.avif',
  agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
  cost: 3,
  playEffect: [
    {
      cost: {
        spice: 2,
        influence: {
          chooseOne: true,
          amounts: [
            { faction: FactionType.EMPEROR, amount: 1 },
            { faction: FactionType.SPACING_GUILD, amount: 1 },
            { faction: FactionType.BENE_GESSERIT, amount: 1 },
            { faction: FactionType.FREMEN, amount: 1 },
          ],
        },
      },
      reward: {
        influence: {
          chooseOne: true,
          amounts: [
            { faction: FactionType.EMPEROR, amount: 2 },
            { faction: FactionType.SPACING_GUILD, amount: 2 },
            { faction: FactionType.BENE_GESSERIT, amount: 2 },
            { faction: FactionType.FREMEN, amount: 2 },
          ],
        },
      },
    },
  ],
}

function stateWithOptionalEffect(overrides: Partial<GameState> = {}): GameState {
  const base = getFreshDefaultGameState()
  const optionalEffect: OptionalEffect = {
    id: 'shifting-test',
    cost: SHIFTING_ALLEGIANCES.playEffect![0].cost as OptionalEffect['cost'],
    reward: SHIFTING_ALLEGIANCES.playEffect![0].reward,
    source: { type: GainSource.CARD, id: SHIFTING_ALLEGIANCES.id, name: SHIFTING_ALLEGIANCES.name },
  }
  return {
    ...base,
    players: [makePlayer(0)],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    factionInfluence: {
      [FactionType.EMPEROR]: { 0: 2 },
      [FactionType.SPACING_GUILD]: { 0: 0 },
      [FactionType.BENE_GESSERIT]: { 0: 0 },
      [FactionType.FREMEN]: { 0: 0 },
    },
    currTurn: {
      playerId: 0,
      type: TurnType.ACTION,
      optionalEffects: [optionalEffect],
      pendingChoices: [],
      gainedEffects: [],
      acquiredCards: [],
    },
    ...overrides,
  }
}

describe('Shifting Allegiances optional effect', () => {
  it('does not pay spice until influence choices resolve', () => {
    let state = stateWithOptionalEffect()
    const effect = state.currTurn!.optionalEffects![0]

    state = applyGameAction(state, { type: 'PAY_COST', playerId: 0, effect })
    expect(state.players[0].spice).toBe(5)
    expect(state.currTurn?.optionalEffects).toHaveLength(0)
    expect(state.currTurn?.pendingChoices).toHaveLength(1)

    const loseChoice = state.currTurn!.pendingChoices![0] as FixedOptionsChoice
    expect(loseChoice.type).toBe(ChoiceType.FIXED_OPTIONS)
    expect(loseChoice.prompt).toContain('lose 1 influence')
    expect(loseChoice.influenceResolution?.payOnResolve?.spice).toBe(2)
    expect(loseChoice.influenceResolution?.thenGain).toBeDefined()
  })

  it('rejects PAY_COST when player cannot lose influence anywhere', () => {
    const state = stateWithOptionalEffect({
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 0 },
        [FactionType.SPACING_GUILD]: { 0: 0 },
        [FactionType.BENE_GESSERIT]: { 0: 0 },
        [FactionType.FREMEN]: { 0: 0 },
      },
    })
    const effect = state.currTurn!.optionalEffects![0]
    const next = applyGameAction(state, { type: 'PAY_COST', playerId: 0, effect })
    expect(next.players[0].spice).toBe(5)
    expect(next.currTurn?.optionalEffects).toHaveLength(1)
    expect(next.currTurn?.pendingChoices).toHaveLength(0)
  })

  it('pays spice, loses influence, then prompts to gain', () => {
    let state = stateWithOptionalEffect()
    const effect = state.currTurn!.optionalEffects![0]
    state = applyGameAction(state, { type: 'PAY_COST', playerId: 0, effect })

    const loseChoice = state.currTurn!.pendingChoices![0] as FixedOptionsChoice
    const loseReward = loseChoice.options.find(o => !o.disabled)!.reward

    state = applyGameAction(state, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: loseChoice.id,
      reward: loseReward,
      source: loseChoice.source,
    })

    expect(state.players[0].spice).toBe(3)
    expect(state.factionInfluence[FactionType.EMPEROR]?.[0]).toBe(1)
    expect(state.currTurn?.pendingChoices).toHaveLength(1)
    expect(state.currTurn!.pendingChoices![0].prompt).toContain('gain 2 influence')

    const gainChoice = state.currTurn!.pendingChoices![0] as FixedOptionsChoice
    const gainReward = {
      influence: { amounts: [{ faction: FactionType.FREMEN, amount: 2 }] },
    }
    state = applyGameAction(state, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: gainChoice.id,
      reward: gainReward,
      source: gainChoice.source,
    })

    expect(state.factionInfluence[FactionType.FREMEN]?.[0]).toBe(2)
    expect(state.currTurn?.pendingChoices).toHaveLength(0)
    expect(state.gains.some(g => g.type === RewardType.INFLUENCE && g.amount === -1)).toBe(true)
    expect(state.gains.some(g => g.type === RewardType.INFLUENCE && g.amount === 2)).toBe(true)
  })

  it('grants fourth-influence milestone when gain crosses Emperor to 4', () => {
    let state = stateWithOptionalEffect({
      players: [makePlayer(0, { troops: 5 })],
      factionInfluence: {
        [FactionType.EMPEROR]: { 0: 2 },
        [FactionType.SPACING_GUILD]: { 0: 0 },
        [FactionType.BENE_GESSERIT]: { 0: 0 },
        [FactionType.FREMEN]: { 0: 0 },
      },
    })
    const effect = state.currTurn!.optionalEffects![0]
    state = applyGameAction(state, { type: 'PAY_COST', playerId: 0, effect })

    const loseChoice = state.currTurn!.pendingChoices![0] as FixedOptionsChoice
    state = applyGameAction(state, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: loseChoice.id,
      reward: { influence: { amounts: [{ faction: FactionType.SPACING_GUILD, amount: 1 }] } },
      source: loseChoice.source,
    })

    const gainChoice = state.currTurn!.pendingChoices![0] as FixedOptionsChoice
    state = applyGameAction(state, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: gainChoice.id,
      reward: { influence: { amounts: [{ faction: FactionType.EMPEROR, amount: 2 }] } },
      source: gainChoice.source,
    })

    expect(state.factionInfluence[FactionType.EMPEROR]?.[0]).toBe(4)
    expect(state.players[0].troops).toBe(7)
    expect(state.gains.some(g => g.type === RewardType.TROOPS && g.amount === 2)).toBe(true)
  })
})
