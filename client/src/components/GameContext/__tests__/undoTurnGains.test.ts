import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { AgentIcon, RewardType } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard, withCardOnTop } from './_helpers'
import { getGainsForTurnState } from '../../../utils/turnGainsDisplay'

const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id
const IMPERIAL_BASIN_ID = BOARD_SPACES.find(s => s.name === 'Imperial Basin')!.id
const CARTHAG_ID = BOARD_SPACES.find(s => s.name === 'Carthag')!.id

function completeAgentTurn(
  state: ReturnType<typeof getBaseTestState>,
  playerId: number,
  cardId: number,
  spaceId: number
) {
  let s = state
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId, cardId })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId, spaceId })
  s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId })
  return applyGameAction(s, { type: 'END_TURN', playerId })
}

describe('UNDO_TO_TURN — turn gains after redoing a different board space', () => {
  it('after undo, a new agent turn only tracks gains for the new space', () => {
    const cityCard = stubDeckCard(6001, { agentIcons: [AgentIcon.CITY] })
    const spiceCard = stubDeckCard(6002, { agentIcons: [AgentIcon.SPICE_TRADE] })

    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = withCardOnTop(s, 0, cityCard)
    s = withCardOnTop(s, 1, cityCard)
    s = completeAgentTurn(s, 0, cityCard.id, CARTHAG_ID)

    expect(s.activePlayerId).toBe(1)
    const afterP0TurnIndex = s.history.length - 1

    s = withCardOnTop(s, 1, cityCard)
    s = completeAgentTurn(s, 1, cityCard.id, ARRAKEEN_ID)

    expect(s.history.length).toBe(afterP0TurnIndex + 2)

    s = applyGameAction(s, { type: 'UNDO_TO_TURN', turnIndex: afterP0TurnIndex })
    expect(s.activePlayerId).toBe(1)
    expect(s.gains).toEqual([])
    expect(s.pendingRewards).toEqual([])
    expect(s.currTurn).toBeNull()

    s = withCardOnTop(s, 1, spiceCard)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 1, cardId: spiceCard.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 1, spaceId: IMPERIAL_BASIN_ID })
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 1 })

    const turnGains = getGainsForTurnState(s)
    const types = turnGains.map(g => g.type)

    expect(s.currTurn?.agentSpaceId).toBe(IMPERIAL_BASIN_ID)
    expect(types).toContain(RewardType.SPICE)
    expect(types).not.toContain(RewardType.TROOPS)
    expect(types).not.toContain(RewardType.DRAW)
  })

  it('history snapshots store only that turn gains with gainsStartIndex 0', () => {
    const cityCard = stubDeckCard(6007, { agentIcons: [AgentIcon.CITY] })

    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = withCardOnTop(s, 0, cityCard)
    s = completeAgentTurn(s, 0, cityCard.id, CARTHAG_ID)

    const snap = s.history[s.history.length - 1]
    expect(snap.currTurn?.gainsStartIndex).toBe(0)
    expect(getGainsForTurnState(snap).map(g => g.type)).toContain(RewardType.TROOPS)
  })

  it('PLAY_CARD with a different card resets turn gain scope for history display', () => {
    const cityCard = stubDeckCard(6015, { agentIcons: [AgentIcon.CITY] })
    const spiceCard = stubDeckCard(6016, { agentIcons: [AgentIcon.SPICE_TRADE] })

    let s = getBaseTestState(undefined, { players: 2, activeId: 1 })
    s = withCardOnTop(s, 1, cityCard)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 1, cardId: cityCard.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 1, spaceId: ARRAKEEN_ID })
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 1 })

    expect(getGainsForTurnState(s).map(g => g.type)).toContain(RewardType.TROOPS)

    s = withCardOnTop(s, 1, spiceCard)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 1, cardId: spiceCard.id })
    expect(s.currTurn?.gainsStartIndex).toBe(s.gains.length)
    expect(getGainsForTurnState(s)).toHaveLength(0)
  })
})
