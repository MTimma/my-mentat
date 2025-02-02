import React, { useState } from 'react'
import { Card, Player } from '../types/GameTypes'
import { STARTING_CARDS } from '../data/cards'

interface DeckSetupProps {
  player: Player
  onComplete: (selectedCards: Card[]) => void
}

const DeckSetup: React.FC<DeckSetupProps> = ({ player, onComplete }) => {
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  const handleCardSelect = (card: Card) => {
    if (selectedCards.find(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id))
    } else if (selectedCards.length < 5) {
      setSelectedCards([...selectedCards, card])
    }
  }

  const handleConfirm = () => {
    if (selectedCards.length === 5) {
      onComplete(selectedCards)
    }
  }

  return (
    <div className="deck-setup">
      <h2>{player.leader.name}'s Starting Hand</h2>
      <p>Select 5 cards from your starting deck</p>
      
      <div className="card-selection">
        {STARTING_CARDS.map(card => (
          <div 
            key={card.id}
            className={`card-option ${
              selectedCards.find(c => c.id === card.id) ? 'selected' : ''
            }`}
            onClick={() => handleCardSelect(card)}
          >
            <h3>{card.name}</h3>
            <div className="card-details">
              {card.agentIcons.map(icon => (
                <span key={icon} className={`agent-icon ${icon}`} />
              ))}
              {card.persuasion && (
                <span className="persuasion">🗣️ {card.persuasion}</span>
              )}
              {card.swordIcon && <span className="sword">⚔️</span>}
            </div>
          </div>
        ))}
      </div>

      <button
        className="confirm-button"
        disabled={selectedCards.length !== 5}
        onClick={handleConfirm}
      >
        Confirm Selection
      </button>
    </div>
  )
}

export default DeckSetup 