import React, { useState, useMemo } from 'react'
import { Card, Player, CardPile } from '../../types/GameTypes'
import './CardSearch.css'

interface CardSearchProps {
  isOpen: boolean
  cards?: Card[] // Optional now - can be provided directly or derived from player + piles
  player?: Player // Optional - needed when using piles
  piles?: CardPile[] // Optional - alternative to providing cards directly
  customFilter?: (card: Card) => boolean // Optional custom filter
  onSelect: (selectedCards: Card[]) => void
  onCancel: () => void
  isRevealTurn: boolean
  selectionCount: number
  text: string
  onSelectionChange?: (selectedCards: Card[]) => void
  hideTitle?: boolean
}

const CardSearch: React.FC<CardSearchProps> = ({
  isOpen,
  cards,
  player,
  piles,
  customFilter,
  onSelect,
  onCancel,
  isRevealTurn,
  selectionCount,
  text,
  onSelectionChange,
  hideTitle = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  // Derive available cards from piles or use provided cards
  const availableCards = useMemo(() => {
    // Helper function to get cards from a specific pile
    const getCardsFromPile = (pile: CardPile): Card[] => {
      if (!player) return []
      switch (pile) {
        case 'HAND':
          return player.deck // In this game, deck represents hand
        case 'DISCARD':
          return player.discardPile
        case 'DECK':
          return [] // Deck cards are not visible for selection
        case 'PLAY_AREA':
          return player.playArea
        default:
          return []
      }
    }

    let baseCards: Card[]

    if (cards) {
      // Use provided cards directly
      baseCards = cards
    } else if (player && piles) {
      // Derive cards from piles
      baseCards = piles.flatMap(pile => getCardsFromPile(pile))
    } else {
      baseCards = []
    }

    // Apply custom filter if provided
    if (customFilter) {
      return baseCards.filter(customFilter)
    }

    return baseCards
  }, [cards, player, piles, customFilter])

  const filteredCards = useMemo(() => {
    if (!searchTerm) return availableCards

    const searchLower = searchTerm.toLowerCase()
    return availableCards.filter(card => {
      const searchableText = [
        card.name,
        card.description || '',
        card.playEffect?.map(effect => JSON.stringify(effect.reward)).join(' '),
        card.playEffect?.map(effect => JSON.stringify(effect.requirement)).join(' '),
        card.playEffect?.map(effect => JSON.stringify(effect.cost)).join(' '),
        card.playEffect?.map(effect => JSON.stringify(effect.reward)).join(' '),
        card.playEffect?.map(effect => JSON.stringify(effect.requirement)).join(' '),
        card.playEffect?.map(effect => JSON.stringify(effect.cost)).join(' '),
        card.acquireEffect ? JSON.stringify(card.acquireEffect) : '',
        card.cost?.toString(),
        card.agentIcons.join(' '),
      ].join(' ').toLowerCase()

      return searchableText.includes(searchLower)
    })
  }, [availableCards, searchTerm])

  if (!isOpen) return null

  const handleCardClick = (card: Card) => {
    let nextSelected: Card[]

    if (!isRevealTurn) {
      nextSelected = [card]
    } else {
      if (selectedCards.find(c => c.id === card.id)) {
        nextSelected = selectedCards.filter(c => c.id !== card.id)
      } else if (selectedCards.length < selectionCount) {
        nextSelected = [...selectedCards, card]
      } else {
        nextSelected = selectedCards
      }
    }

    setSelectedCards(nextSelected)
    if (onSelectionChange) {
      onSelectionChange(nextSelected)
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
    if (onSelectionChange) {
      onSelectionChange([])
    }
    setSearchTerm('')
    onCancel()
  }

  return (
    <div className="card-selection-dialog">
      <div className="dialog-header">
        {!hideTitle && <h2>{text}</h2>}
        <div className="dialog-header-actions">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                className="search-clear-button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <button
            className="header-cancel-button"
            onClick={handleCancel}
          >
            Clear all
          </button>
          <button
            className="header-confirm-button"
            onClick={handleConfirm}
            disabled={selectedCards.length !== selectionCount}
          >
            Confirm
          </button>
        </div>
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
            {!card.image && (
              <>
                <div className="card-header">
                  <h3>{card.name}</h3>
                  {card.cost && <span className="persuasion">Cost: {card.cost}</span>}
                </div>
                <div className="card-icons">
                  {card.agentIcons.map((icon, index) => (
                    <span
                      key={index}
                      className="agent-icon"
                    >
                      {icon}
                    </span>
                  ))}
                </div>
                {card.playEffect && (
                  <div className="card-effect">
                    {card.playEffect.map((effect, index) => (
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CardSearch

