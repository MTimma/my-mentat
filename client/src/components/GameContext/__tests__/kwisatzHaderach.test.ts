import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { applyGameAction } from '../GameContext'
import {
  AgentIcon,
  ChoiceType,
  CustomEffect,
  GamePhase,
  FactionType,
} from '../../../types/GameTypes'
import { getBaseTestState, stubDeckCard } from './_helpers'
import {
  GAINED_EFFECT_KWISATZ_FROM_BOARD,
  GAINED_EFFECT_RECALL_REQUIRED,
  canPlaceAgentOnBoard,
} from '../../../utils/kwisatzHaderach'

const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id
const CARTHAG_ID = BOARD_SPACES.find(s => s.name === 'Carthag')!.id

function kwisatzCard() {
  return stubDeckCard(1031, {
    name: 'Kwisatz Haderach',
    infiltrate: true,
    agentIcons: [AgentIcon.CITY, AgentIcon.EMPEROR],
    playEffect: [
      { beforePlaceAgent: { recallAgent: true }, reward: {} },
      { reward: { custom: CustomEffect.KWISATZ_HADERACH } },
      { reward: { drawCards: 1 } },
    ],
  })
}

function kwisatzState(opts?: {
  agents?: number
  occupiedSpaceId?: number
  playerId?: number
}) {
  const playerId = opts?.playerId ?? 0
  const card = kwisatzCard()
  let s = getBaseTestState(
    {
      deck: [card],
      handCount: 1,
      agents: opts?.agents ?? 1,
    },
    { players: 2, activeId: playerId }
  )
  s = {
    ...s,
    phase: GamePhase.PLAYER_TURNS,
    canEndTurn: false,
    occupiedSpaces:
      opts?.occupiedSpaceId != null
        ? { [opts.occupiedSpaceId]: [playerId] }
        : {},
  }
  return s
}

describe('Kwisatz Haderach', () => {
  it('can be played from supply when no agents are on the board', () => {
    const s = kwisatzState({ agents: 1 })
    const after = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    expect(after.selectedCard).toBe(1031)
    expect(after.currTurn?.gainedEffects).not.toContain(GAINED_EFFECT_RECALL_REQUIRED)
    expect(after.currTurn?.pendingChoices ?? []).toHaveLength(0)
  })

  it('offers supply vs board recall when both sources are available', () => {
    const s = kwisatzState({ agents: 1, occupiedSpaceId: ARRAKEEN_ID })
    const after = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    expect(after.currTurn?.pendingChoices).toHaveLength(1)
    expect(after.currTurn?.pendingChoices?.[0]?.type).toBe(ChoiceType.FIXED_OPTIONS)
    expect(after.canEndTurn).toBe(false)
  })

  it('requires recall when only board agents are available', () => {
    const s = kwisatzState({ agents: 0, occupiedSpaceId: ARRAKEEN_ID })
    const after = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    expect(after.currTurn?.gainedEffects).toContain(GAINED_EFFECT_RECALL_REQUIRED)
  })

  it('recalling then placing moves the agent instead of duplicating it', () => {
    let s = kwisatzState({ agents: 0, occupiedSpaceId: ARRAKEEN_ID })
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })
    expect(s.occupiedSpaces[ARRAKEEN_ID]?.includes(0)).not.toBe(true)
    expect(s.players[0].agents).toBe(1)
    expect(s.currTurn?.gainedEffects).toContain(GAINED_EFFECT_KWISATZ_FROM_BOARD)

    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: CARTHAG_ID })
    expect(s.occupiedSpaces[ARRAKEEN_ID]?.includes(0)).not.toBe(true)
    expect(s.occupiedSpaces[CARTHAG_ID]).toEqual([0])
    expect(s.players[0].agents).toBe(0)
  })

  it('choosing recall from the agent-source choice enters recall mode', () => {
    let s = kwisatzState({ agents: 1, occupiedSpaceId: ARRAKEEN_ID })
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    const choice = s.currTurn?.pendingChoices?.[0]
    expect(choice).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice!.id,
      optionIndex: 1,
    })
    expect(s.currTurn?.gainedEffects).toContain(GAINED_EFFECT_RECALL_REQUIRED)
    expect(s.currTurn?.pendingChoices ?? []).toHaveLength(0)
    expect(s.canEndTurn).toBe(false)
  })

  it('blocks board placement while the agent-source choice is pending', () => {
    const s = kwisatzState({ agents: 1, occupiedSpaceId: ARRAKEEN_ID })
    const after = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    expect(canPlaceAgentOnBoard(after)).toBe(false)
  })

  it('choosing supply keeps end turn blocked until agent is placed', () => {
    let s = kwisatzState({ agents: 1, occupiedSpaceId: ARRAKEEN_ID })
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    const choice = s.currTurn?.pendingChoices?.[0]
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice!.id,
      optionIndex: 0,
    })
    expect(s.canEndTurn).toBe(false)
    expect(s.selectedCard).toBe(1031)
    expect(canPlaceAgentOnBoard(s)).toBe(true)
  })

  it('still pays board space costs when placing from supply', () => {
    const CONSPIRE_ID = BOARD_SPACES.find(s => s.name === 'Conspire')!.id
    let s = kwisatzState({ agents: 1 })
    s = {
      ...s,
      players: s.players.map((p, i) => (i === 0 ? { ...p, spice: 3 } : p)),
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    const blocked = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: CONSPIRE_ID })
    expect(blocked.players[0].spice).toBe(3)

    s = {
      ...kwisatzState({ agents: 1 }),
      players: kwisatzState({ agents: 1 }).players.map((p, i) =>
        i === 0 ? { ...p, spice: 4 } : p
      ),
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    const placed = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: CONSPIRE_ID })
    expect(placed.players[0].spice).toBe(0)
    expect(placed.occupiedSpaces[CONSPIRE_ID]).toEqual([0])
  })

  it('ignores influence requirements but not costs', () => {
    const SIETCH_TABR_ID = BOARD_SPACES.find(s => s.name === 'Sietch Tabr')!.id
    let s = kwisatzState({ agents: 1 })
    s = {
      ...s,
      factionInfluence: {
        ...s.factionInfluence,
        [FactionType.FREMEN]: { 0: 0, 1: 0 },
      },
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    const placed = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: SIETCH_TABR_ID })
    expect(placed.occupiedSpaces[SIETCH_TABR_ID]).toEqual([0])
  })

  it('pays costs when placing after recalling from the board', () => {
    const CONSPIRE_ID = BOARD_SPACES.find(s => s.name === 'Conspire')!.id
    let s = kwisatzState({ agents: 0, occupiedSpaceId: ARRAKEEN_ID })
    s = {
      ...s,
      players: s.players.map((p, i) => (i === 0 ? { ...p, spice: 4 } : p)),
    }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1031 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: CONSPIRE_ID })
    expect(s.players[0].spice).toBe(0)
    expect(s.occupiedSpaces[CONSPIRE_ID]).toEqual([0])
  })
})
