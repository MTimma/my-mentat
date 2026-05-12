import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, Player, CardPile } from '../../types/GameTypes'
import './CardSearch.css'

const EMPTY_SELECTED_CARDS: Card[] = []

/** Lowercased substring blob for filtering — computed once per `availableCards` change, not on every keystroke. */
function buildCardSearchBlob(card: Card): string {
  const cardDescription = (card as { description?: string }).description || ''
  let effectBlob = ''
  const pe = card.playEffect
  if (pe?.length) {
    const chunks: string[] = []
    for (const effect of pe) {
      chunks.push(JSON.stringify(effect.reward), JSON.stringify(effect.requirement), JSON.stringify(effect.cost))
    }
    effectBlob = chunks.join(' ')
  }

  return [
    card.name,
    cardDescription,
    effectBlob,
    card.acquireEffect ? JSON.stringify(card.acquireEffect) : '',
    card.cost?.toString() ?? '',
    card.agentIcons.join(' '),
  ]
    .join(' ')
    .toLowerCase()
}

type GridItemPlayability = { playable: boolean; reason?: string }

const PLAYABLE_CARD: GridItemPlayability = { playable: true }

type CardGridItemProps = {
  card: Card
  isSelected: boolean
  playability: GridItemPlayability
  onPick: (card: Card) => void
}

const CardGridItem = React.memo(function CardGridItem({
  card,
  isSelected,
  playability,
  onPick,
}: CardGridItemProps) {
  const isDisabled = !playability.playable

  const handleClick = () => {
    if (isDisabled) return
    onPick(card)
  }

  return (
    <div className="card-cell">
      <div
        className={`card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={handleClick}
      >
        {card.image && <img src={card.image} alt={card.name} className="card-image" />}
        {!card.image && (
          <>
            <div className="card-header">
              <h3>{card.name}</h3>
              {card.cost && <span className="persuasion">Cost: {card.cost}</span>}
            </div>
            <div className="card-icons">
              {card.agentIcons.map((icon, index) => (
                <span key={index} className="agent-icon">
                  {icon}
                </span>
              ))}
            </div>
            {card.playEffect && (
              <div className="card-effect">
                {card.playEffect.map((effect, index) => (
                  <div key={index}>Reveal: {JSON.stringify(effect.reward)}</div>
                ))}
              </div>
            )}
            {card.playEffect && (
              <div className="card-effect">
                {card.playEffect.map((effect, index) => (
                  <div key={index}>Play: {JSON.stringify(effect.reward)}</div>
                ))}
              </div>
            )}
            {card.acquireEffect && (
              <p className="card-acquire-effect">Acquire: {JSON.stringify(card.acquireEffect)}</p>
            )}
          </>
        )}
        {isDisabled && playability.reason && (
          <div className="card-disabled-reason" aria-label={playability.reason}>
            {playability.reason}
          </div>
        )}
      </div>
    </div>
  )
})

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
  getCardPlayability?: (card: Card) => { playable: boolean; reason?: string }
  /** Rendered between cards grid and search bar (e.g. preview cards in Imperium Row Select) */
  slotBetweenCardsAndSearch?: React.ReactNode
  initialSelectedCards?: Card[]
  cancelButtonText?: string
  /** Placed after the cancel control and before Confirm (e.g. quantity stepper). */
  confirmAdornment?: React.ReactNode
  /** Bust playability caches when rules inputs change without a new `cards` array identity. */
  playabilityInvalidateKey?: unknown
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
  getCardPlayability,
  slotBetweenCardsAndSearch,
  initialSelectedCards = EMPTY_SELECTED_CARDS,
  cancelButtonText = 'Clear all',
  confirmAdornment,
  playabilityInvalidateKey,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const onSelectionChangeRef = useRef(onSelectionChange)
  const getCardPlayabilityRef = useRef(getCardPlayability)
  getCardPlayabilityRef.current = getCardPlayability

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  useEffect(() => {
    if (!isOpen) return

    setSelectedCards(initialSelectedCards)
    if (onSelectionChangeRef.current) {
      onSelectionChangeRef.current(initialSelectedCards)
    }
  }, [initialSelectedCards, isOpen])

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

  const searchBlobById = useMemo(() => {
    const m = new Map<number, string>()
    for (const card of availableCards) {
      m.set(card.id, buildCardSearchBlob(card))
    }
    return m
  }, [availableCards])

  const deferredSearch = useDeferredValue(searchTerm)
  const filteredCards = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    if (!q) return availableCards
    return availableCards.filter(card => searchBlobById.get(card.id)?.includes(q))
  }, [availableCards, deferredSearch, searchBlobById])

  /** Playability does not depend on search. Callback identity from parents is often unstable — use a ref + explicit bust key. */
  const playabilityByCardId = useMemo(() => {
    const m = new Map<number, GridItemPlayability>()
    const fn = getCardPlayabilityRef.current
    if (!fn) return m
    for (const card of availableCards) {
      m.set(card.id, fn(card))
    }
    return m
  }, [availableCards, playabilityInvalidateKey])

  const selectedIds = useMemo(() => new Set(selectedCards.map(c => c.id)), [selectedCards])

  const handleCardPick = useCallback((card: Card) => {
    const fn = getCardPlayabilityRef.current
    if (fn) {
      const p = fn(card)
      if (!p.playable) return
    }

    setSelectedCards(prev => {
      let next: Card[]
      if (!isRevealTurn) {
        next = [card]
      } else if (prev.find(c => c.id === card.id)) {
        next = prev.filter(c => c.id !== card.id)
      } else if (prev.length < selectionCount) {
        next = [...prev, card]
      } else {
        next = prev
      }
      onSelectionChangeRef.current?.(next)
      return next
    })
  }, [isRevealTurn, selectionCount])

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

  if (!isOpen) return null

  const isStandaloneModal = !slotBetweenCardsAndSearch
  const dialog = (
    <div className={`card-selection-dialog ${slotBetweenCardsAndSearch ? 'card-selection-dialog-search-at-bottom' : ''}`}>
      <div className="dialog-title">
        {!hideTitle && <h2>{text}</h2>}
      </div>
      <div className="cards-grid">
        {filteredCards.map(card => (
          <CardGridItem
            key={card.id}
            card={card}
            isSelected={selectedIds.has(card.id)}
            playability={
              getCardPlayability ? playabilityByCardId.get(card.id) ?? PLAYABLE_CARD : PLAYABLE_CARD
            }
            onPick={handleCardPick}
          />
        ))}
      </div>
      {slotBetweenCardsAndSearch}
      <div className="dialog-actions">
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
        <button className="header-cancel-button" onClick={handleCancel}>
          {cancelButtonText}
        </button>
        {confirmAdornment}
        <button
          className="header-confirm-button"
          onClick={handleConfirm}
          disabled={selectedCards.length !== selectionCount}
        >
          Confirm
        </button>
      </div>
    </div>
  )

  if (isStandaloneModal) {
    const overlay = (
      <div className="card-selection-dialog-overlay card-selection-dialog-overlay-standalone">
        {dialog}
      </div>
    )

    return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body)
  }
  return dialog
}

export default CardSearch

