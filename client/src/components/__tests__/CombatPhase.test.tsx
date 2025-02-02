import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameProvider } from '../../contexts/GameContext'
import CombatPhase from '../CombatPhase'

const mockGameState = {
  phase: GamePhase.COMBAT,
  players: [
    { id: 1, intrigueCards: [] },
    { id: 2, intrigueCards: [] }
  ],
  combatTroops: { 1: 2, 2: 1 },
  combatStrength: { 1: 0, 2: 0 },
  currentConflict: {
    id: 1,
    name: 'Test Conflict',
    rewards: {
      first: [{ type: 'victory-points', amount: 1 }],
      second: [{ type: 'spice', amount: 1 }]
    }
  },
  firstPlayer: 1,
  combatPasses: []
}

describe('CombatPhase', () => {
  it('shows combat dialog for current player', () => {
    render(
      <GameProvider initialState={mockGameState}>
        <CombatPhase />
      </GameProvider>
    )
    
    expect(screen.getByText('Combat Phase')).toBeInTheDocument()
    expect(screen.getByText('No Combat cards available')).toBeInTheDocument()
  })

  it('resolves combat when all players pass', () => {
    const gameState = {
      ...mockGameState,
      combatPasses: [1, 2]
    }

    render(
      <GameProvider initialState={gameState}>
        <CombatPhase />
      </GameProvider>
    )
    
    // Combat should be resolved and dialog closed
    expect(screen.queryByText('Combat Phase')).not.toBeInTheDocument()
  })

  it('allows playing combat intrigue cards', () => {
    const gameState = {
      ...mockGameState,
      players: [
        {
          id: 1,
          intrigueCards: [{
            id: 1,
            name: 'Test Card',
            type: CardType.COMBAT,
            effect: JSON.stringify({ strengthBonus: 2 })
          }]
        }
      ]
    }

    render(
      <GameProvider initialState={gameState}>
        <CombatPhase />
      </GameProvider>
    )
    
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Test Card'))
    
    // Should update combat strength
    expect(screen.getByText('⚔️ 6')).toBeInTheDocument() // 2 troops * 2 + 2 bonus
  })

  it('hides dialog when not in combat phase', () => {
    const gameState = {
      ...mockGameState,
      phase: GamePhase.PLAYER_TURNS
    }

    render(
      <GameProvider initialState={gameState}>
        <CombatPhase />
      </GameProvider>
    )
    
    expect(screen.queryByText('Combat Phase')).not.toBeInTheDocument()
  })

  it('shows correct combat strength after playing multiple cards', () => {
    const gameState = {
      ...mockGameState,
      players: [{
        id: 1,
        intrigueCards: [
          {
            id: 1,
            name: 'Combat Card 1',
            type: CardType.COMBAT,
            effect: JSON.stringify({ strengthBonus: 2 })
          },
          {
            id: 2,
            name: 'Combat Card 2',
            type: CardType.COMBAT,
            effect: JSON.stringify({ strengthBonus: 1 })
          }
        ]
      }]
    }

    render(
      <GameProvider initialState={gameState}>
        <CombatPhase />
      </GameProvider>
    )

    fireEvent.click(screen.getByText('Combat Card 1'))
    fireEvent.click(screen.getByText('Combat Card 2'))
    
    expect(screen.getByText('⚔️ 7')).toBeInTheDocument() // 2 troops * 2 + 3 bonus
  })

  it('handles player passing correctly', () => {
    render(
      <GameProvider initialState={mockGameState}>
        <CombatPhase />
      </GameProvider>
    )

    fireEvent.click(screen.getByText('Pass'))
    expect(screen.queryByText('Combat Phase')).not.toBeInTheDocument()
  })
}) 