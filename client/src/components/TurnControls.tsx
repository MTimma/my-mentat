import React, { useState } from 'react'
import { Player, Card } from '../types/GameTypes'
// import CardSelectionDialog from './CardSelectionDialog'

interface TurnControlsProps {
  activePlayer: Player | null
  canEndTurn: boolean
  onPlayCard: (playerId: number, cardId: number) => void
  onReveal: (playerId: number, cardIds: number[]) => void
  onEndTurn: (playerId: number) => void
}

const TurnControls: React.FC<TurnControlsProps> = ({
  activePlayer,
  canEndTurn,
  onPlayCard,
  onReveal,
  onEndTurn
}) => {
  const [isCardSelectionOpen, setIsCardSelectionOpen] = useState(false)
  const [isRevealTurn, setIsRevealTurn] = useState(false)

  if (!activePlayer) return null

  const handlePlayCard = () => {
    setIsRevealTurn(false)
    setIsCardSelectionOpen(true)
  }

  const handleRevealTurn = () => {
    setIsRevealTurn(true)
    setIsCardSelectionOpen(true)
  }

  const handleCardSelection = (selectedCards: Card[]) => {
    setIsCardSelectionOpen(false)
    if (isRevealTurn) {
      onReveal(activePlayer.id, selectedCards.map(card => card.id))
    } else if (selectedCards.length === 1) {
      onPlayCard(activePlayer.id, selectedCards[0].id)
    }
  }

  return (
    <div className="turn-controls">
      <div className="active-player-info">
        Active Player: {activePlayer.leader.name}
      </div>
      <div className="control-buttons">
      <button 
          className="play-intrigue-button"
          onClick={handlePlayCard}
          disabled={activePlayer.agents === 0}
        >
          Play Intrigue
        </button>
        <button 
          className="play-card-button"
          onClick={handlePlayCard}
          disabled={activePlayer.agents === 0}
        >
          Play Card
        </button>
        <button 
          className="reveal-turn-button"
          onClick={handleRevealTurn}
        >
          Reveal Turn
        </button>
        <button 
          className="end-turn-button"
          onClick={() => onEndTurn(activePlayer.id)}
          disabled={!canEndTurn}
        >
          End Turn
        </button>
      </div>

      {/* <CardSelectionDialog
        isOpen={isCardSelectionOpen}
        cards={activePlayer.deck}
        selectionCount={isRevealTurn ? activePlayer.hand.length : 1}
        onSelect={handleCardSelection}
        onCancel={() => setIsCardSelectionOpen(false)}
        isRevealTurn={isRevealTurn}
      /> */}
    </div>
  )
}

export default TurnControls 