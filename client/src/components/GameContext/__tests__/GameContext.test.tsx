import { render, fireEvent } from '@testing-library/react'
import { GameProvider, useGame } from '../GameContext'
import { IntrigueCardType } from '../../../types/GameTypes'

describe('Intrigue Card System', () => {
  it('handles combat intrigue cards correctly', () => {
    const TestComponent = () => {
      const { gameState, dispatch } = useGame()
      
      const playCard = () => {
        dispatch({
          type: 'PLAY_INTRIGUE',
          cardId: 1,
          playerId: 1
        })
      }

      return (
        <button onClick={playCard}>
          Play Card
        </button>
      )
    }

    const { getByText } = render(
      <GameProvider initialState={{
        ...mockGameState,
        players: [{
          id: 1,
          intrigueCards: [{
            id: 1,
            name: "Ambush",
            type: IntrigueCardType.COMBAT,
            effect: {
              strengthBonus: 4
            },
            description: "Add 4 strength",
            oneTimeUse: true
          }]
        }]
      }}>
        <TestComponent />
      </GameProvider>
    )

    fireEvent.click(getByText('Play Card'))
    
    // Verify card was played and removed
    expect(gameState.players[0].intrigueCards).toHaveLength(0)
    expect(gameState.combatStrength[1]).toBe(4)
  })

  // Add more tests for different card types and effects
}) 