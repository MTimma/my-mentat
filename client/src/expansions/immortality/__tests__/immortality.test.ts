import { describe, expect, it } from 'vitest'
import { GamePhase, NO_EXPANSIONS, AgentIcon, type Card, type GameState, type Reward } from '../../../types/GameTypes'
import { getBaseTestState } from '../../../components/GameContext/__tests__/_helpers'
import { applyGameAction } from '../../../components/GameContext/GameContext'
import { playRequirementSatisfied } from '../../../components/GameContext/requirements'
import {
  advanceResearch,
  advanceTleilaxuTrack,
  applySpecimenReward,
  playerGeneLevel,
  resolveResearchBranch,
  setResearchNode,
  setTleilaxuStep,
  spendSpecimens,
} from '../reducer'
import { RESEARCH_START_NODE_ID } from '../researchTrack'
import { resolveGamePack } from '../../../gamePacks/resolveGamePack'
import {
  OFFICIAL_BASE_IMMORTALITY_PACK,
  OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK,
} from '../../../gamePacks/constants'
import { buildStartingDeck } from '../../../services/starterDeckSetup'
import { createCatalogRuntime } from '../../../catalog/runtime'
import { boardSpaceById } from '../../../data/boardSpaceAvailability'
import { computeGraftAgentIcons, canConfirmGraftHandSelection, graftHandSelectionPreviewSlots, shouldPickGraftPartnerSlot } from '../graft'

const IMMORTALITY_EXPANSIONS = { ...NO_EXPANSIONS, immortality: true }

/** Minimal reward applier for track-bonus tests (no recursion into track advances). */
function applyPrimitiveReward(state: GameState, reward: Reward, playerId: number): GameState {
  return {
    ...state,
    players: state.players.map(p => {
      if (p.id !== playerId) return p
      const np = { ...p }
      if (reward.spice) np.spice += reward.spice
      if (reward.solari) np.solari += reward.solari
      if (reward.water) np.water += reward.water
      if (reward.troops) np.troops += reward.troops
      if (reward.victoryPoints) np.victoryPoints += reward.victoryPoints
      if (reward.persuasion) np.persuasion += reward.persuasion
      if (reward.drawCards) np.handCount += reward.drawCards
      if (reward.intrigueCards) np.intrigueCount += reward.intrigueCount ?? reward.intrigueCards
      if (reward.specimen) np.specimens = (np.specimens ?? 0) + reward.specimen
      return np
    }),
  }
}

function immortalityState(overrides?: Partial<GameState>): GameState {
  const base = getBaseTestState({ specimens: 0, tleilaxuStep: 0, researchNodeId: RESEARCH_START_NODE_ID })
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

describe('Immortality — specimens', () => {
  it('adds and spends specimens (clamped at 0)', () => {
    let state = immortalityState()
    state = applySpecimenReward(state, 0, 3)
    expect(state.players[0].specimens).toBe(3)
    state = spendSpecimens(state, 0, 2)
    expect(state.players[0].specimens).toBe(1)
    state = spendSpecimens(state, 0, 5)
    expect(state.players[0].specimens).toBe(0)
  })
})

describe('Immortality — Tleilaxu track', () => {
  it('advances steps and grants the entered space bonus', () => {
    let state = immortalityState()
    state = advanceTleilaxuTrack(state, 0, 1, applyPrimitiveReward)
    expect(state.players[0].tleilaxuStep).toBe(1)
    expect(state.players[0].spice).toBe(11) // base 10 + step-1 bonus spice
  })

  it('claims the 2-spice first-player bonus when first reaching the VP space', () => {
    let state = immortalityState()
    state = advanceTleilaxuTrack(state, 0, 4, applyPrimitiveReward)
    expect(state.players[0].tleilaxuStep).toBe(4)
    expect(state.players[0].victoryPoints).toBe(1) // VP-space bonus
    expect(state.tleilaxuTrackBonusClaimed).toBe(true)
    expect(state.tleilaxuTrackBonusSpice).toBe(0)
  })

  it('does not grant the setup spice twice', () => {
    let state = immortalityState({ tleilaxuTrackBonusClaimed: true, tleilaxuTrackBonusSpice: 0 })
    const before = state.players[0].spice
    state = advanceTleilaxuTrack(state, 0, 4, applyPrimitiveReward)
    // step bonuses still apply (spice + solari + troops), but no extra 2-spice setup bonus
    expect(state.tleilaxuTrackBonusSpice).toBe(0)
    expect(state.players[0].spice).toBe(before + 1) // only the step-1 spice bonus
  })
})

describe('Immortality — research track', () => {
  it('moves through a single branch and applies the node bonus', () => {
    let state = immortalityState()
    state = advanceResearch(state, 0, 1, applyPrimitiveReward)
    expect(state.players[0].researchNodeId).toBe('r1')
    expect(state.players[0].water).toBe(4) // base 3 + r1 bonus water
    expect(state.pendingResearchAdvance).toBeNull()
  })

  it('defers a branch choice and resolves it', () => {
    let state = immortalityState()
    state = advanceResearch(state, 0, 2, applyPrimitiveReward)
    // r0 -> r1 (single), then r1 forks (r2a/r2b) -> pending with 1 remaining
    expect(state.players[0].researchNodeId).toBe('r1')
    expect(state.pendingResearchAdvance).toEqual({ playerId: 0, remaining: 1 })

    state = resolveResearchBranch(state, 0, 'r2a', applyPrimitiveReward)
    expect(state.players[0].researchNodeId).toBe('r2a')
    expect(state.pendingResearchAdvance).toBeNull()
  })

  it('reports gene level reached', () => {
    expect(playerGeneLevel({ researchNodeId: 'r3' } as never)).toBe(1)
    expect(playerGeneLevel({ researchNodeId: 'r6' } as never)).toBe(2)
    expect(playerGeneLevel({ researchNodeId: RESEARCH_START_NODE_ID } as never)).toBe(0)
  })

  it('draws a card once the track is complete (gene unlock 2)', () => {
    let state = immortalityState()
    state = { ...state, players: state.players.map(p => (p.id === 0 ? { ...p, researchNodeId: 'r6' } : p)) }
    const before = state.players[0].handCount
    state = advanceResearch(state, 0, 1, applyPrimitiveReward)
    expect(state.players[0].researchNodeId).toBe('r6') // stays at end
    expect(state.players[0].handCount).toBe(before + 1)
  })

  it('SET_RESEARCH_NODE sets position without applying bonuses', () => {
    let state = immortalityState()
    state = setResearchNode(state, 0, 'r5b')
    expect(state.players[0].researchNodeId).toBe('r5b')
    expect(state.players[0].water).toBe(3)
  })

  it('SET_TLEILAXU_STEP sets step without applying bonuses', () => {
    let state = immortalityState()
    const spiceBefore = state.players[0].spice
    state = setTleilaxuStep(state, 0, 7)
    expect(state.players[0].tleilaxuStep).toBe(7)
    expect(state.players[0].spice).toBe(spiceBefore)
  })

  it('SET_RESEARCH_NODE rejects unknown nodes', () => {
    const state = immortalityState()
    const next = setResearchNode(state, 0, 'r99')
    expect(next.players[0].researchNodeId).toBe(RESEARCH_START_NODE_ID)
  })
})

describe('Immortality — reducer actions', () => {
  function tleilaxuCard(id: number, name: string, cost: number): Card {
    return { id, name, image: '', agentIcons: [], cost, immortality: true, tleilaxu: true }
  }

  it('ACQUIRE_TLEILAXU spends specimens, discards the card, and opens a refill slot', () => {
    const row = [tleilaxuCard(3001, 'Contaminator', 1), tleilaxuCard(3002, 'From the Tanks', 2)]
    let state = immortalityState({
      tleilaxuRow: row,
      tleilaxuRowDeck: [tleilaxuCard(3003, 'Ghola', 3)],
    })
    state = { ...state, players: state.players.map(p => (p.id === 0 ? { ...p, specimens: 3 } : p)) }

    state = applyGameAction(state, { type: 'ACQUIRE_TLEILAXU', playerId: 0, cardId: 3002 })
    expect(state.players[0].specimens).toBe(1) // 3 - cost 2
    expect(state.players[0].discardPile.some(c => c.id === 3002)).toBe(true)
    expect(state.tleilaxuRow?.some(c => c.id === 3002)).toBe(false)
    expect(state.pendingTleilaxuRowReplacement).toEqual({ cardIndex: 1 })
  })

  it('ACQUIRE_TLEILAXU keeps Reclaimed Forces in the row (permanent reserve)', () => {
    const row = [tleilaxuCard(3001, 'Reclaimed Forces', 3)]
    let state = immortalityState({ tleilaxuRow: row, tleilaxuRowDeck: [] })
    state = { ...state, players: state.players.map(p => (p.id === 0 ? { ...p, specimens: 3 } : p)) }

    state = applyGameAction(state, { type: 'ACQUIRE_TLEILAXU', playerId: 0, cardId: 3001 })
    expect(state.players[0].discardPile.some(c => c.name === 'Reclaimed Forces')).toBe(true)
    expect(state.tleilaxuRow?.some(c => c.id === 3001)).toBe(true) // never leaves the row
    expect(state.pendingTleilaxuRowReplacement ?? null).toBeNull()
  })

  it('ACQUIRE_TLEILAXU is rejected when specimens are insufficient', () => {
    const row = [tleilaxuCard(3002, 'From the Tanks', 2)]
    let state = immortalityState({ tleilaxuRow: row })
    state = { ...state, players: state.players.map(p => (p.id === 0 ? { ...p, specimens: 1 } : p)) }
    const next = applyGameAction(state, { type: 'ACQUIRE_TLEILAXU', playerId: 0, cardId: 3002 })
    expect(next.players[0].specimens).toBe(1)
    expect(next.tleilaxuRow?.length).toBe(1)
  })

  it('SET_TLEILAXU_ROW picks the purchasable row from the pool', () => {
    const a = tleilaxuCard(3001, 'Contaminator', 1)
    const b = tleilaxuCard(3002, 'From the Tanks', 2)
    const c = tleilaxuCard(3003, 'Ghola', 3)
    let state = immortalityState({
      tleilaxuRow: [a],
      tleilaxuRowDeck: [b, c],
      pendingTleilaxuRowReplacement: { cardIndex: 0 },
    })
    state = applyGameAction(state, { type: 'SET_TLEILAXU_ROW', cardIds: [3002, 3003] })
    expect(state.tleilaxuRow?.map(card => card.id)).toEqual([3002, 3003])
    expect(state.tleilaxuRowDeck?.map(card => card.id)).toEqual([3001])
    expect(state.pendingTleilaxuRowReplacement ?? null).toBeNull()
  })

  it('USE_FAMILY_ATOMICS marks the player and clears the Imperium Row once', () => {
    const rowCard = { id: 2001, name: 'Some Imperium Card', image: '', agentIcons: [] } as Card
    let state = immortalityState({ imperiumRow: [rowCard], imperiumRowDeck: [] })

    state = applyGameAction(state, { type: 'USE_FAMILY_ATOMICS', playerId: 0 })
    expect(state.players[0].familyAtomicsUsed).toBe(true)
    expect(state.imperiumRow).toHaveLength(0)
    expect(state.imperiumRowDeck.some(c => c.id === 2001)).toBe(true)

    // Second use is a no-op (once per game).
    const afterRefill = { ...state, imperiumRow: [rowCard], imperiumRowDeck: [] as Card[] }
    const next = applyGameAction(afterRefill, { type: 'USE_FAMILY_ATOMICS', playerId: 0 })
    expect(next.imperiumRow).toHaveLength(1)
  })
})

describe('Immortality — requirement gates', () => {
  const card: Card = { id: 9001, name: 'Test', image: '', agentIcons: [] }

  it('gates a researchLevel effect on gene level', () => {
    const base = immortalityState()
    const atZero = { ...base, players: base.players.map(p => (p.id === 0 ? { ...p, researchNodeId: 'r0' } : p)) }
    const atGene1 = { ...base, players: base.players.map(p => (p.id === 0 ? { ...p, researchNodeId: 'r3' } : p)) }
    const effect = { requirement: { researchLevel: 1 }, reward: { spice: 1 } }
    expect(playRequirementSatisfied(effect, card, atZero, 0)).toBe(false)
    expect(playRequirementSatisfied(effect, card, atGene1, 0)).toBe(true)
  })

  it('gates a grafted effect on the active graft pair', () => {
    const base = immortalityState()
    const effect = { requirement: { grafted: true }, reward: { spice: 2 } }
    expect(playRequirementSatisfied(effect, card, base, 0)).toBe(false)
    const withGraft = { ...base, graftPair: { cardIds: [9001, 42] } }
    expect(playRequirementSatisfied(effect, card, withGraft, 0)).toBe(true)
  })

  it('ignores immortality gates when the expansion is off', () => {
    const base = { ...immortalityState(), expansions: { ...NO_EXPANSIONS } }
    const effect = { requirement: { researchLevel: 2 }, reward: { spice: 1 } }
    expect(playRequirementSatisfied(effect, card, base, 0)).toBe(true)
  })

  it('SET_GRAFT_PAIR / CLEAR_GRAFT_PAIR manage the pair', () => {
    let state = immortalityState()
    state = applyGameAction(state, { type: 'SET_GRAFT_PAIR', cardIds: [1, 2] })
    expect(state.graftPair).toEqual({ cardIds: [1, 2] })
    state = applyGameAction(state, { type: 'CLEAR_GRAFT_PAIR' })
    expect(state.graftPair).toBeNull()
  })
})

describe('Immortality — graft hand selection', () => {
  const graftCard = { id: 1, name: 'Planned Coupling', graft: true } as Card
  const plainCard = { id: 2, name: 'Dune', graft: false } as Card
  const usurp = { id: 3, name: 'Usurp', graft: true } as Card

  it('requires a partner when the only pick is a graft card', () => {
    expect(canConfirmGraftHandSelection([graftCard])).toBe(false)
    expect(graftHandSelectionPreviewSlots([graftCard, null])).toBe(2)
  })

  it('allows a single Usurp pick (Imperium Row partner follows)', () => {
    expect(canConfirmGraftHandSelection([usurp])).toBe(true)
    expect(graftHandSelectionPreviewSlots([usurp, null])).toBe(1)
  })

  it('allows a plain card alone or paired with a graft card', () => {
    expect(canConfirmGraftHandSelection([plainCard])).toBe(true)
    expect(canConfirmGraftHandSelection([plainCard, graftCard])).toBe(true)
    expect(shouldPickGraftPartnerSlot(plainCard, graftCard)).toBe(true)
  })

  it('COMPLETE_GRAFT_PAIR works without pendingGraftPartner', () => {
    let state = immortalityState()
    state = {
      ...state,
      players: state.players.map(p =>
        p.id === 0
          ? {
              ...p,
              deck: [graftCard, plainCard],
            }
          : p,
      ),
    }
    state = applyGameAction(state, {
      type: 'COMPLETE_GRAFT_PAIR',
      playerId: 0,
      primaryCardId: graftCard.id,
      primaryDeckIndex: 0,
      secondaryCardId: plainCard.id,
      secondaryDeckIndex: 1,
    })
    expect(state.graftPair).toEqual({ cardIds: [graftCard.id, plainCard.id] })
    expect(state.pendingGraftPartner).toBeNull()
    expect(state.selectedCard).toBe(graftCard.id)
  })
})

describe('Immortality — catalog and game packs', () => {
  it('replaces the two Dune starter cards with Experimentation', () => {
    const deck = buildStartingDeck(OFFICIAL_BASE_IMMORTALITY_PACK)
    expect(deck.filter(c => c.name === 'Experimentation')).toHaveLength(2)
    expect(deck.some(c => c.name === 'Dune, the Desert Planet')).toBe(false)
  })

  it('applies the Experimentation swap on the Rise of Ix + Immortality pack too', () => {
    const deck = buildStartingDeck(OFFICIAL_BASE_RISE_OF_IX_IMMORTALITY_PACK)
    expect(deck.filter(c => c.name === 'Experimentation')).toHaveLength(2)
  })

  it('Immortality Research Station grants draw 2 and research 1', () => {
    const space = boardSpaceById(3, IMMORTALITY_EXPANSIONS)
    expect(space?.name).toBe('Research Station')
    expect(space?.immortality).toBe(true)
    const reward = space?.effects?.[0]?.reward
    expect(reward?.research).toBe(1)
    expect(reward?.drawCards).toBe(2)
  })

  it('computeGraftAgentIcons unions icons and Ghola copies partner', () => {
    const partner = {
      id: 1,
      name: 'Face Dancer',
      image: '',
      agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD],
    } as Card
    const ghola = {
      id: 2,
      name: 'Ghola',
      image: '',
      agentIcons: [AgentIcon.CITY],
    } as Card
    const icons = computeGraftAgentIcons([ghola, partner])
    expect(icons).toContain(AgentIcon.EMPEROR)
    expect(icons).toContain(AgentIcon.SPACING_GUILD)
    expect(icons).not.toContain(AgentIcon.CITY)
  })

  it('builds the Tleilaxu Row pool from the catalog', () => {
    const pack = resolveGamePack(OFFICIAL_BASE_IMMORTALITY_PACK)
    const runtime = createCatalogRuntime(pack)
    const pool = runtime.buildTleilaxuPool()
    expect(pool.length).toBeGreaterThan(0)
    expect(pool.some(c => c.name === 'Reclaimed Forces')).toBe(true)
  })
})
