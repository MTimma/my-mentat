import { describe, expect, it } from 'vitest'
import {
  AgentIcon,
  ChoiceType,
  CustomEffect,
  FactionType,
  GainSource,
  GamePhase,
  NO_EXPANSIONS,
  TurnType,
  type Card,
  type FixedOptionsChoice,
  type GameState,
} from '../../../types/GameTypes'
import { applyGameAction } from '../../../components/GameContext/GameContext'
import { getBaseTestState } from '../../../components/GameContext/__tests__/_helpers'
import { buildTleilaxuPool } from '../../../catalog/runtime'
import { RESEARCH_START_NODE_ID } from '../researchTrack'

const IMMORTALITY_EXPANSIONS = { ...NO_EXPANSIONS, immortality: true }

const pool = buildTleilaxuPool()
const byName = (name: string): Card => {
  const card = pool.find(c => c.name === name)
  if (!card) throw new Error(`Missing Tleilaxu card: ${name}`)
  return structuredClone(card)
}

function immortalityState(overrides: Partial<GameState> = {}): GameState {
  const base = getBaseTestState({
    specimens: 10,
    tleilaxuStep: 0,
    researchNodeId: RESEARCH_START_NODE_ID,
  })
  return {
    ...base,
    expansions: IMMORTALITY_EXPANSIONS,
    phase: GamePhase.PLAYER_TURNS,
    tleilaxuTrackBonusSpice: 2,
    tleilaxuTrackBonusClaimed: false,
    pendingResearchAdvance: null,
    ...overrides,
  }
}

function revealTurn(): GameState['currTurn'] {
  return { playerId: 0, type: TurnType.REVEAL, persuasionCount: 0 }
}

/** Play a graft pair on a board space and return the resulting state. */
function playGraftPair(
  state: GameState,
  primary: Card,
  partner: Card,
  spaceId: number
): GameState {
  let s: GameState = {
    ...state,
    players: state.players.map(p =>
      p.id === 0 ? { ...p, deck: [primary, partner, ...p.deck], handCount: 2 } : p
    ),
    graftPair: { cardIds: [primary.id, partner.id] },
    currTurn: { playerId: 0, type: TurnType.ACTION },
  }
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: primary.id })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId })
  return s
}

describe('Tleilaxu Row — definitions match the CSV', () => {
  const expected: Array<{
    name: string
    cost: number
    agentIcons: AgentIcon[]
    graft?: boolean
    infiltrate?: boolean
    factions?: FactionType[]
    reveal: { persuasion?: number; combat?: number; specimen?: number }
  }> = [
    { name: 'Reclaimed Forces', cost: 3, agentIcons: [], reveal: {} },
    { name: 'Usurp', cost: 4, agentIcons: [], graft: true, reveal: { persuasion: 1, combat: 1, specimen: 1 } },
    { name: 'Twisted Mentat', cost: 4, agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY], graft: true, reveal: { persuasion: 1, combat: 1, specimen: 1 } },
    { name: 'Beguiling Pheromones', cost: 3, agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE], graft: true, reveal: { persuasion: 1, combat: 1 } },
    { name: 'Stitched Horror', cost: 3, agentIcons: [AgentIcon.CITY], graft: true, reveal: { persuasion: 1, combat: 1 } },
    { name: 'Unnatural Reflexes', cost: 3, agentIcons: [AgentIcon.SPICE_TRADE], graft: true, reveal: { persuasion: 1, combat: 1 } },
    { name: 'Ghola', cost: 3, agentIcons: [AgentIcon.CITY], graft: true, reveal: { persuasion: 1, combat: 1, specimen: 1 } },
    { name: 'Scientific Breakthrough', cost: 3, agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY, AgentIcon.SPICE_TRADE], reveal: { persuasion: 1, combat: 1 } },
    { name: 'Slig Farmer', cost: 2, agentIcons: [AgentIcon.LANDSRAAD], graft: true, reveal: { persuasion: 1 } },
    { name: 'From the Tanks', cost: 2, agentIcons: [AgentIcon.LANDSRAAD], reveal: { persuasion: 1 } },
    { name: 'Face Dancer', cost: 2, agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.FREMEN], factions: [FactionType.EMPEROR, FactionType.SPACING_GUILD, FactionType.FREMEN], graft: true, reveal: { persuasion: 1 } },
    { name: 'Guild Impersonator', cost: 2, agentIcons: [AgentIcon.SPACING_GUILD], factions: [FactionType.SPACING_GUILD], graft: true, reveal: { persuasion: 1 } },
    { name: 'Chairdog', cost: 2, agentIcons: [AgentIcon.CITY], graft: true, reveal: { persuasion: 1 } },
    { name: 'Tleilaxu Infiltrator', cost: 2, agentIcons: [AgentIcon.CITY], graft: true, infiltrate: true, reveal: { persuasion: 1 } },
    { name: 'Subject X-137', cost: 2, agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE], reveal: { persuasion: 1 } },
    { name: 'Corrino Genes', cost: 1, agentIcons: [AgentIcon.EMPEROR], factions: [FactionType.EMPEROR], reveal: { persuasion: 1 } },
    { name: 'Contaminator', cost: 1, agentIcons: [AgentIcon.FREMEN], factions: [FactionType.FREMEN], reveal: { persuasion: 1 } },
    { name: 'Industrial Espionage', cost: 1, agentIcons: [AgentIcon.LANDSRAAD], reveal: { persuasion: 1 } },
    { name: 'Face Dancer Initiate', cost: 1, agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.FREMEN], factions: [FactionType.EMPEROR, FactionType.SPACING_GUILD, FactionType.FREMEN], graft: true, reveal: { persuasion: 1 } },
  ]

  it('has all 19 non-promo cards', () => {
    expect(pool.map(c => c.name).sort()).toEqual(expected.map(c => c.name).sort())
  })

  it.each(expected)('$name matches cost, icons, graft, infiltrate and reveal', card => {
    const actual = byName(card.name)
    expect(actual.cost).toBe(card.cost)
    expect(actual.agentIcons).toEqual(card.agentIcons)
    expect(Boolean(actual.graft)).toBe(Boolean(card.graft))
    expect(Boolean(actual.infiltrate)).toBe(Boolean(card.infiltrate))
    expect(actual.faction ?? []).toEqual(card.factions ?? [])
    expect(actual.revealEffect?.[0]?.reward ?? {}).toMatchObject(card.reveal)
  })

  it('encodes the acquire effects from the CSV', () => {
    expect(byName('Subject X-137').acquireEffect).toEqual({ tleilaxu: 1 })
    expect(byName('Corrino Genes').acquireEffect).toEqual({ solari: 2 })
    expect(byName('Reclaimed Forces').acquireEffect).toEqual({
      custom: CustomEffect.RECLAIMED_FORCES,
    })
  })

  it('Subject X-137 agent box is only +1 Tleilaxu at research level 1', () => {
    expect(byName('Subject X-137').playEffect).toEqual([
      { requirement: { researchLevel: 1 }, reward: { tleilaxu: 1 } },
    ])
  })

  it('Slig Farmer has the icon-solari box and the optional 5-solari beetle', () => {
    expect(byName('Slig Farmer').playEffect).toEqual([
      { reward: { custom: CustomEffect.SLIG_FARMER } },
      { cost: { solari: 5 }, reward: { tleilaxu: 1 } },
    ])
  })
})

describe('Tleilaxu Row — acquire effects', () => {
  it('Subject X-137 advances the Tleilaxu track on acquire', () => {
    const card = byName('Subject X-137')
    let state = immortalityState({
      tleilaxuRow: [card],
      tleilaxuRowDeck: [],
      currTurn: revealTurn(),
    })
    state = applyGameAction(state, { type: 'ACQUIRE_TLEILAXU', playerId: 0, cardId: card.id })
    expect(state.players[0].tleilaxuStep).toBe(1)
    expect(state.players[0].discardPile.some(c => c.id === card.id)).toBe(true)
  })

  it('Corrino Genes grants +2 solari on acquire', () => {
    const card = byName('Corrino Genes')
    let state = immortalityState({
      tleilaxuRow: [card],
      tleilaxuRowDeck: [],
      currTurn: revealTurn(),
    })
    const before = state.players[0].solari
    state = applyGameAction(state, { type: 'ACQUIRE_TLEILAXU', playerId: 0, cardId: card.id })
    expect(state.players[0].solari).toBe(before + 2)
  })

  it('Reclaimed Forces offers +2 troops or +1 Tleilaxu and stays in the row', () => {
    const card = byName('Reclaimed Forces')
    let state = immortalityState({
      tleilaxuRow: [card],
      tleilaxuRowDeck: [],
      currTurn: revealTurn(),
    })
    state = {
      ...state,
      players: state.players.map(p =>
        p.id === 0 ? { ...p, troops: 4, specimens: 3, troopSupply: 5 } : p
      ),
    }
    state = applyGameAction(state, { type: 'ACQUIRE_TLEILAXU', playerId: 0, cardId: card.id })

    const choice = state.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS
    ) as FixedOptionsChoice | undefined
    expect(choice?.options.map(o => o.reward)).toEqual([
      { troops: 2 },
      { tleilaxu: 1 },
    ])
    expect(state.tleilaxuRow?.some(c => c.id === card.id)).toBe(true)

    const troopsBefore = state.players[0].troops
    state = applyGameAction(state, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice!.id,
      optionIndex: 0,
    })
    expect(state.players[0].troops).toBe(troopsBefore + 2)
  })
})

describe('Tleilaxu Row — play effects', () => {
  it('Usurp does not queue a clickable graft reward', () => {
    const usurp = byName('Usurp')
    const partner = byName('Face Dancer')
    const state = playGraftPair(immortalityState(), usurp, partner, 15)
    expect(
      state.pendingRewards.some(r => r.reward.custom === CustomEffect.USURP_GRAFT)
    ).toBe(false)
  })

  it('Stitched Horror offers choose-two combinations and handles the trash option', () => {
    const horror = byName('Stitched Horror')
    const partner = byName('Face Dancer')
    let state = playGraftPair(immortalityState(), horror, partner, 15)

    const choice = state.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS
    ) as FixedOptionsChoice | undefined
    expect(choice?.options).toHaveLength(6)
    expect(choice?.options.map(o => o.reward)).toContainEqual({ water: 1, trash: 1 })

    const waterBefore = state.players[0].water
    const trashIndex = choice!.options.findIndex(o => o.reward.water && o.reward.trash)
    state = applyGameAction(state, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice!.id,
      optionIndex: trashIndex,
    })

    const trashReward = state.pendingRewards.find(
      r => r.source.id === horror.id && r.reward.trash === 1
    )
    expect(trashReward?.reward.water).toBe(1)
    const trashTarget = state.players[0].deck[0]
    state = applyGameAction(state, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: trashReward!.id,
      customData: { trashedCardId: trashTarget.id },
    })
    expect(state.players[0].water).toBe(waterBefore + 1)
    expect(state.players[0].trash.some(c => c.id === trashTarget.id)).toBe(true)
  })

  it('Beguiling Pheromones queues trash + faction influence on a faction space', () => {
    const pheromones = byName('Beguiling Pheromones')
    const partner = byName('Face Dancer')
    let state = playGraftPair(immortalityState(), pheromones, partner, 15)

    const reward = state.pendingRewards.find(
      r => r.source.id === pheromones.id && r.reward.trash === 1
    )
    expect(reward?.reward.influence).toEqual({
      amounts: [{ faction: FactionType.EMPEROR, amount: 1 }],
    })

    const influenceBefore = state.factionInfluence[FactionType.EMPEROR][0] ?? 0
    const trashTarget = state.players[0].deck[0]
    state = applyGameAction(state, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: reward!.id,
      customData: { trashedCardId: trashTarget.id },
    })
    expect(state.factionInfluence[FactionType.EMPEROR][0]).toBe(influenceBefore + 1)
    expect(state.players[0].trash.some(c => c.id === trashTarget.id)).toBe(true)
  })

  it('Slig Farmer grants solari per partner icon and offers the 5-solari beetle', () => {
    const slig = byName('Slig Farmer')
    const partner = byName('Face Dancer') // 3 agent icons
    let state = playGraftPair(immortalityState(), slig, partner, 15)

    const reward = state.pendingRewards.find(
      r => r.source.id === slig.id && r.reward.custom === CustomEffect.SLIG_FARMER
    )
    expect(reward).toBeDefined()

    const solariBefore = state.players[0].solari
    state = applyGameAction(state, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: reward!.id,
    })
    expect(state.players[0].solari).toBe(solariBefore + 3)

    const optional = state.currTurn?.optionalEffects?.find(
      e => e.source.id === slig.id && e.cost?.solari === 5
    )
    expect(optional).toBeDefined()

    const stepBefore = state.players[0].tleilaxuStep ?? 0
    const solariAfterClaim = state.players[0].solari
    state = applyGameAction(state, {
      type: 'PAY_COST',
      playerId: 0,
      effectId: optional!.id,
    })
    expect(state.players[0].solari).toBe(solariAfterClaim - 5)
    expect(state.players[0].tleilaxuStep).toBe(stepBefore + 1)
  })

  it('Guild Impersonator grants Spacing Guild influence on a later spice gain this turn', () => {
    const impersonator = byName('Guild Impersonator')
    const partner = byName('Face Dancer')
    let state = playGraftPair(immortalityState(), impersonator, partner, 15)

    // It is a trigger, not a clickable choice.
    expect(
      state.pendingRewards.some(r => r.reward.custom === CustomEffect.GUILD_IMPERSONATOR)
    ).toBe(false)

    const influenceBefore = state.factionInfluence[FactionType.SPACING_GUILD][0] ?? 0
    // Simulate a later spice gain in the same turn (e.g. an intrigue).
    state = {
      ...state,
      pendingRewards: [
        ...state.pendingRewards,
        {
          id: 'test-spice-reward',
          source: { type: GainSource.CARD, id: impersonator.id, name: impersonator.name },
          reward: { spice: 1 },
          isTrash: false,
        },
      ],
    }
    state = applyGameAction(state, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: 'test-spice-reward',
    })
    expect(state.factionInfluence[FactionType.SPACING_GUILD][0]).toBe(influenceBefore + 1)
  })

  it('Scientific Breakthrough grants 1 VP at research level 2 and trashes itself', () => {
    const card = byName('Scientific Breakthrough')
    let state = immortalityState({
      players: getBaseTestState().players.map(p => ({
        ...p,
        researchNodeId: 'r6',
        deck: [card, ...p.deck],
        handCount: 1,
      })),
      currTurn: { playerId: 0, type: TurnType.ACTION },
    })
    state = applyGameAction(state, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    state = applyGameAction(state, { type: 'PLACE_AGENT', playerId: 0, spaceId: 12 })

    const reward = state.pendingRewards.find(
      r => r.source.id === card.id && r.reward.custom === CustomEffect.SCIENTIFIC_BREAKTHROUGH
    )
    expect(reward?.reward.trashThisCard).toBe(true)

    const vpBefore = state.players[0].victoryPoints
    state = applyGameAction(state, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: reward!.id,
    })
    expect(state.players[0].victoryPoints).toBe(vpBefore + 1)
    expect(state.players[0].trash.some(c => c.id === card.id)).toBe(true)
  })
})
