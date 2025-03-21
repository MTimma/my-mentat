import React, { useState, useEffect } from 'react'
import { Card } from '../types/GameTypes'
import { STARTING_DECK } from '../data/cards'

interface DeckSetupProps {
  playerName: string
  onComplete: (selectedCards: Card[]) => void
}

const DeckSetup: React.FC<DeckSetupProps> = ({ playerName, onComplete }) => {
  const defaultSelectedIds = [1, 2, 3, 4, 5]
  const [selectedCards, setSelectedCards] = useState<Card[]>(() => 
    STARTING_DECK.filter(card => defaultSelectedIds.includes(card.id))
  )

  useEffect(() => {
    setSelectedCards(STARTING_DECK.filter(card => defaultSelectedIds.includes(card.id)))
  }, [playerName])

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
      <h2>{playerName}'s Starting Hand</h2>
      <p>Select 5 cards from your starting deck</p>
      
      <div className="card-selection-grid">
        {STARTING_DECK.map(card => (
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
        Confirm Selection ({selectedCards.length}/5)
      </button>
    </div>
  )
}

export default DeckSetup 