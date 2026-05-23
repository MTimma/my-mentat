import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, CustomEffect, Player, CardPile } from '../../types/GameTypes'
import { PLAY_EFFECT_TEXTS, REVEAL_EFFECT_TEXTS } from '../../data/effectTexts'
import { useVisualViewportOverlay } from '../../utils/useVisualViewportOverlay'
import './CardSearch.css'

/** iOS often scrolls the cards grid after the keyboard opens; re-apply scrollTop a few times. */
function scrollCardsGridToTop(grid: HTMLDivElement | null) {
  if (!grid) return
  const snap = () => {
    grid.scrollTop = 0
    grid.scrollLeft = 0
  }
  snap()
  requestAnimationFrame(snap)
  window.setTimeout(snap, 50)
  window.setTimeout(snap, 150)
  window.setTimeout(snap, 320)
}

const EMPTY_SELECTED_CARDS: Card[] = []

type SearchableEffect = {
  reward?: { custom?: CustomEffect }
  requirement?: unknown
  cost?: unknown
}

function appendEffectBlobParts(
  effects: SearchableEffect[] | undefined,
  chunks: string[],
  customTexts: Partial<Record<CustomEffect, string>>
) {
  if (!effects?.length) return
  for (const effect of effects) {
    chunks.push(JSON.stringify(effect.reward), JSON.stringify(effect.requirement), JSON.stringify(effect.cost))
    const custom = effect.reward?.custom
    if (custom && customTexts[custom]) {
      chunks.push(customTexts[custom])
    }
  }
}

/** Lowercased substring blob for filtering — computed once per `availableCards` change, not on every keystroke. */
function buildCardSearchBlob(card: Card): string {
  const chunks: string[] = [card.name]
  const cardDescription = (card as { description?: string }).description
  if (cardDescription) chunks.push(cardDescription)
  if (card.faction?.length) chunks.push(...card.faction)
  if (card.infiltrate) chunks.push('infiltrate')
  appendEffectBlobParts(card.playEffect, chunks, PLAY_EFFECT_TEXTS)
  appendEffectBlobParts(card.revealEffect, chunks, REVEAL_EFFECT_TEXTS)
  appendEffectBlobParts(card.trashEffect, chunks, { ...PLAY_EFFECT_TEXTS, ...REVEAL_EFFECT_TEXTS })
  if (card.acquireEffect) chunks.push(JSON.stringify(card.acquireEffect))
  if (card.cost != null) chunks.push(String(card.cost))
  if (card.agentIcons.length) chunks.push(...card.agentIcons)
  return chunks.join(' ').toLowerCase()
}

function parseSearchTokens(search: string): string[] {
  return search.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

function cardMatchesTokens(blob: string, tokens: string[], matchAll: boolean): boolean {
  return matchAll ? tokens.every(token => blob.includes(token)) : tokens.some(token => blob.includes(token))
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
  /** Rendered between cards grid and search bar (e.g. spacer for bottom search layout) */
  slotBetweenCardsAndSearch?: React.ReactNode
  /** Selected-card preview strip above search; click a card to deselect. Defaults on for multi-select or `onSelectionChange`. */
  showSelectionPreview?: boolean
  initialSelectedCards?: Card[]
  cancelButtonText?: string
  confirmButtonText?: string
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
  showSelectionPreview,
  initialSelectedCards = EMPTY_SELECTED_CARDS,
  cancelButtonText = 'Clear all',
  confirmButtonText = 'Confirm',
  confirmAdornment,
  playabilityInvalidateKey,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardsGridRef = useRef<HTMLDivElement>(null)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const getCardPlayabilityRef = useRef(getCardPlayability)
  getCardPlayabilityRef.current = getCardPlayability

  const showPreview =
    showSelectionPreview ?? (selectionCount > 1 || Boolean(onSelectionChange))
  const searchAtBottom = showPreview || Boolean(slotBetweenCardsAndSearch)
  const isStandaloneModal = !searchAtBottom

  useVisualViewportOverlay(overlayRef, {
    enabled: isOpen && isStandaloneModal,
    lockDocumentScroll: true,
  })

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
    const tokens = parseSearchTokens(deferredSearch)
    if (tokens.length === 0) return availableCards

    const match = (matchAll: boolean) =>
      availableCards.filter(card => {
        const blob = searchBlobById.get(card.id)
        return blob ? cardMatchesTokens(blob, tokens, matchAll) : false
      })

    const andMatches = match(true)
    if (andMatches.length > 0 || tokens.length === 1) return andMatches
    return match(false)
  }, [availableCards, deferredSearch, searchBlobById])

  useEffect(() => {
    if (!isOpen) return
    scrollCardsGridToTop(cardsGridRef.current)
  }, [deferredSearch, isOpen, filteredCards.length])

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

  const handleRemoveFromPreview = useCallback((card: Card) => {
    setSelectedCards(prev => {
      if (!prev.some(c => c.id === card.id)) return prev
      const next = isRevealTurn ? prev.filter(c => c.id !== card.id) : []
      onSelectionChangeRef.current?.(next)
      return next
    })
  }, [isRevealTurn])

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

  const handleSearchFocus = useCallback(() => {
    scrollCardsGridToTop(cardsGridRef.current)
  }, [])

  if (!isOpen) return null

  const selectionPreview = showPreview ? (
    <div className="card-search-selection-preview" aria-label="Selected cards">
      {Array.from({ length: selectionCount }, (_, index) => {
        const card = selectedCards[index] ?? null
        return (
          <button
            key={index}
            type="button"
            className={`card-search-selection-preview-slot${
              card ? ' card-search-selection-preview-slot--filled' : ''
            }`}
            disabled={!card}
            onClick={() => card && handleRemoveFromPreview(card)}
            title={card ? `Remove ${card.name}` : undefined}
            aria-label={
              card
                ? `Remove ${card.name} from selection`
                : `Empty slot ${index + 1} of ${selectionCount}`
            }
          >
            {card?.image ? (
              <img src={card.image} alt="" className="card-search-selection-preview-image" />
            ) : null}
          </button>
        )
      })}
    </div>
  ) : null

  const dialog = (
    <div className={`card-selection-dialog ${searchAtBottom ? 'card-selection-dialog-search-at-bottom' : ''}`}>
      <div className="dialog-title">
        {!hideTitle && <h2>{text}</h2>}
      </div>
      <div className="cards-grid" ref={cardsGridRef}>
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
      {selectionPreview}
      {slotBetweenCardsAndSearch}
      <div className="dialog-actions">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={handleSearchFocus}
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
          {confirmButtonText}
        </button>
      </div>
    </div>
  )

  if (isStandaloneModal) {
    const overlay = (
      <div
        ref={overlayRef}
        className="card-selection-dialog-overlay card-selection-dialog-overlay-standalone"
      >
        {dialog}
      </div>
    )

    return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body)
  }
  return dialog
}

export default CardSearch

