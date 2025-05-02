import React, { useState, useMemo } from 'react'
import { Card } from '../../types/GameTypes'
import './CardSearch.css'

interface CardSearchProps {
  isOpen: boolean
  cards: Card[]
  onSelect: (selectedCards: Card[]) => void
  onCancel: () => void
  isRevealTurn: boolean
  selectionCount: number
}

const CardSearch: React.FC<CardSearchProps> = ({
  isOpen,
  cards,
  onSelect,
  onCancel,
  isRevealTurn,
  selectionCount
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards

    const searchLower = searchTerm.toLowerCase()
    return cards.filter(card => {
      const searchableText = [
        card.name,//TODO check effect other fields
        card.revealEffect?.map(effect => JSON.stringify(effect.reward)).join(' '),
        card.revealEffect?.map(effect => JSON.stringify(effect.requirement)).join(' '),
        card.revealEffect?.map(effect => JSON.stringify(effect.cost)).join(' '),
        card.playEffect?.map(effect => JSON.stringify(effect.reward)).join(' '),
        card.playEffect?.map(effect => JSON.stringify(effect.requirement)).join(' '),
        card.playEffect?.map(effect => JSON.stringify(effect.cost)).join(' '),
        card.acquireEffect ? JSON.stringify(card.acquireEffect) : '',
        card.cost?.toString(),
        card.agentIcons.join(' '),
      ].join(' ').toLowerCase()

      return searchableText.includes(searchLower)
    })
  }, [cards, searchTerm])

  if (!isOpen) return null

  const handleCardClick = (card: Card) => {
    if (!isRevealTurn) {
      setSelectedCards([card])
    } else {
      if (selectedCards.find(c => c.id === card.id)) {
        setSelectedCards(selectedCards.filter(c => c.id !== card.id))
      } else if (selectedCards.length < selectionCount) {
        setSelectedCards([...selectedCards, card])
      }
    }
  }

  const handleConfirm = () => {
    if (selectedCards.length === selectionCount) {
      onSelect(selectedCards)
      setSelectedCards([])
      setSearchTerm('')
    }
  }

  const handleCancel = () => {
    setSelectedCards([])
    setSearchTerm('')
    onCancel()
  }

  return (
    <div className="card-selection-dialog-overlay">
      <div className="card-selection-dialog">
        <div className="dialog-header">
          <h2>Select a Card to Play</h2>
          <input
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="cards-grid">
          {filteredCards.map(card => (
            <div
              key={card.id}
              className={`card ${selectedCards?.find(c => c.id === card.id) ? 'selected' : ''}`}
              onClick={() => handleCardClick(card)}
            >
              {card.image && (
                <img 
                  src={card.image} 
                  alt={card.name}
                  className="card-image"
                />
              )}
              <div className="card-header">
                <h3>{card.name}</h3>
                {card.cost && <span className="persuasion">Cost: {card.cost}</span>}
              </div>
              <div className="card-icons">
                {card.agentIcons.map((icon, index) => (
                  <span key={index} className="agent-icon">{icon}</span>
                ))}
              </div>
              {card.revealEffect && (
                <div className="card-effect">
                  {card.revealEffect.map((effect, index) => (
                    <div key={index}>
                      Reveal: {JSON.stringify(effect.reward)}
                    </div>
                  ))}
                </div>
              )}
              {card.playEffect && (
                <div className="card-effect">
                  {card.playEffect.map((effect, index) => (
                    <div key={index}>
                      Play: {JSON.stringify(effect.reward)}
                    </div>
                  ))}
                </div>
              )}
              {card.acquireEffect && (
                <p className="card-acquire-effect">
                  Acquire: {JSON.stringify(card.acquireEffect)}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="dialog-actions">
          <button onClick={handleCancel}>Cancel</button>
          <button 
            onClick={handleConfirm}
            disabled={selectedCards.length !== selectionCount}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardSearch 