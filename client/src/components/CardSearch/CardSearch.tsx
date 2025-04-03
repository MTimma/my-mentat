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
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards

    const searchLower = searchTerm.toLowerCase()
    return cards.filter(card => {
      const searchableText = [
        card.name,
        card.effect,
        card.acquireEffect,
        card.persuasion?.toString(),
        card.swordIcon ? 'sword' : '',
        card.resources ? Object.entries(card.resources)
          .map(([key, value]) => `${key}: ${value}`).join(' ') : '',
        card.agentIcons.join(' '),
        card.fremenBond ? 'fremen bond' : '',
      ].join(' ').toLowerCase()

      return searchableText.includes(searchLower)
    })
  }, [cards, searchTerm])

  if (!isOpen) return null

  const handleCardClick = (card: Card) => {
    if (!isRevealTurn) {
      setSelectedCard(card)
    }
  }

  const handleConfirm = () => {
    if (selectedCard) {
      onSelect([selectedCard])
      setSelectedCard(null)
      setSearchTerm('')
    }
  }

  const handleCancel = () => {
    setSelectedCard(null)
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
              className={`card ${selectedCard?.id === card.id ? 'selected' : ''}`}
              onClick={() => handleCardClick(card)}
            >
              <div className="card-header">
                <h3>{card.name}</h3>
                {card.persuasion && <span className="persuasion">Persuasion: {card.persuasion}</span>}
              </div>
              <div className="card-icons">
                {card.agentIcons.map((icon, index) => (
                  <span key={index} className="agent-icon">{icon}</span>
                ))}
                {card.swordIcon && <span className="sword-icon">⚔️</span>}
              </div>
              {card.resources && (
                <div className="card-resources">
                  {Object.entries(card.resources).map(([resource, amount]) => (
                    <span key={resource} className="resource">
                      {resource}: {amount}
                    </span>
                  ))}
                </div>
              )}
              {card.effect && <p className="card-effect">{card.effect}</p>}
              {card.acquireEffect && (
                <p className="card-acquire-effect">Acquire: {card.acquireEffect}</p>
              )}
            </div>
          ))}
        </div>
        <div className="dialog-actions">
          <button onClick={handleCancel}>Cancel</button>
          <button 
            onClick={handleConfirm}
            disabled={!selectedCard}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardSearch 