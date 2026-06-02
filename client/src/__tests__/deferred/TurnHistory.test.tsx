/** DEFERRED — not run by Vitest (see vite.config.ts exclude). Needs jsdom + Testing Library when revived. */
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import TurnHistory from '../../components/TurnHistory'
import {
  GamePhase,
  GainSource,
  PlayerColor,
  RewardType,
  TurnType,
  type GameState,
  type Player,
  Leader,
} from '../../types/GameTypes'
import { STARTING_DECK } from '../../data/cards'

function testPlayer(id: number): Player {
  return {
    id,
    color: PlayerColor.RED,
    leader: new Leader('Paul Atreides', { name: 'A', description: '' }, '', 1),
    troops: 8,
    spice: 10,
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
  }
}

function agentTurnSnapshot(): GameState {
  const card = STARTING_DECK.find(c => c.name === 'Duncan Idaho') ?? STARTING_DECK[0]
  const base = {
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    firstPlayerMarker: 0,
    currentRound: 1,
    players: [testPlayer(0)],
    gains: [
      {
        playerId: 0,
        source: GainSource.BOARD_SPACE,
        sourceId: 15,
        round: 1,
        name: 'Wealth',
        amount: 2,
        type: RewardType.SOLARI,
      },
      {
        playerId: 0,
        source: GainSource.CARD,
        sourceId: card.id,
        round: 1,
        name: card.name,
        amount: 1,
        type: RewardType.TROOPS,
      },
    ],
    currTurn: {
      playerId: 0,
      type: TurnType.ACTION,
      cardId: card.id,
      agentSpaceId: 15,
    },
  }
  return { ...(base as GameState), history: [] }
}

describe('TurnHistory — agent turn display', () => {
  it('shows board space name as turn label', () => {
    const turn = agentTurnSnapshot()
    const history: GameState[] = [
      { ...turn, history: [] },
      { ...turn, history: [] },
    ]
    render(
      <TurnHistory
        turns={history}
        viewingTurnIndex={1}
        players={turn.players}
        currentGameState={history[history.length - 1]}
        onTurnChange={vi.fn()}
        onReturnToCurrent={vi.fn()}
        onUndoToTurn={vi.fn()}
      />
    )
    const viewingRow = document.querySelector('[data-turn-index="1"]')
    expect(viewingRow?.querySelector('.turn-label')?.textContent).toBe('Wealth')
  })

  it('shows aggregated resource gains for the turn', () => {
    const turn = agentTurnSnapshot()
    const history: GameState[] = [{ ...turn, history: [] }, { ...turn, history: [] }]
    const { container } = render(
      <TurnHistory
        turns={history}
        viewingTurnIndex={1}
        players={turn.players}
        currentGameState={history[1]}
        onTurnChange={vi.fn()}
        onReturnToCurrent={vi.fn()}
        onUndoToTurn={vi.fn()}
      />
    )
    const gains = container.querySelectorAll('.gain-item')
    expect(gains.length).toBeGreaterThanOrEqual(1)
    const labels = Array.from(gains).map(el => el.getAttribute('aria-label') ?? '')
    expect(labels.some(l => /solari/i.test(l))).toBe(true)
  })

  it.todo('shows played card thumbnail when cardId is on currTurn')
  it.todo('reveal turn shows Reveal label and persuasion gains')
})
