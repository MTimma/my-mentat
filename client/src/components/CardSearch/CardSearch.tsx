import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CustomEffect, Player, CardPile } from '../../types/GameTypes'
import { PLAY_EFFECT_TEXTS, REVEAL_EFFECT_TEXTS } from '../../data/effectTexts'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
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
  /** Placed after the cancel control and before Select (e.g. quantity stepper). */
  confirmAdornment?: React.ReactNode
  /** Bust playability caches when rules inputs change without a new `cards` array identity. */
  playabilityInvalidateKey?: unknown
  /** When true, render inline inside a parent dialog instead of a full-screen portal overlay. */
  embedded?: boolean
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
  confirmAdornment,
  playabilityInvalidateKey,
  embedded = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectionSlots, setSelectionSlots] = useState<(Card | null)[]>([])
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardsGridRef = useRef<HTMLDivElement>(null)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const getCardPlayabilityRef = useRef(getCardPlayability)
  getCardPlayabilityRef.current = getCardPlayability

  const showPreview =
    showSelectionPreview ?? (selectionCount > 1 || Boolean(onSelectionChange))
  const searchAtBottom = showPreview || Boolean(slotBetweenCardsAndSearch)
  const isStandaloneModal = !embedded
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(
    isOpen && isStandaloneModal
  )
  const boardScoped = Boolean(scopedClass)
  const useCompactBoardLayout = searchAtBottom && boardScoped

  useVisualViewportOverlay(overlayRef, {
    enabled: isOpen && isStandaloneModal && !scopedClass,
    lockDocumentScroll: true,
  })

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  const buildSlots = useCallback(
    (initial: Card[]) =>
      Array.from({ length: selectionCount }, (_, index) => initial[index] ?? null),
    [selectionCount]
  )

  const filledCards = useCallback(
    (slots: (Card | null)[]) => slots.filter((card): card is Card => card !== null),
    []
  )

  const normalizeSlots = useCallback(
    (slots: (Card | null)[]) =>
      slots.length === selectionCount
        ? [...slots]
        : Array.from({ length: selectionCount }, (_, index) => slots[index] ?? null),
    [selectionCount]
  )

  useEffect(() => {
    if (!isOpen) return

    const slots = buildSlots(initialSelectedCards)
    setSelectionSlots(slots)
    onSelectionChangeRef.current?.(filledCards(slots))
  }, [buildSlots, filledCards, initialSelectedCards, isOpen, selectionCount])

  // Derive available cards from piles or use provided cards
  const availableCards = useMemo(() => {
    // Helper function to get cards from a specific pile
    const getCardsFromPile = (pile: CardPile): Card[] => {
      if (!player) return []
      switch (pile) {
        case 'HAND':
          return player.deck.slice(0, Math.max(0, player.handCount))
        case 'DISCARD':
          return player.discardPile
        case 'DECK':
          return [] // Draw pile is not selectable (use HAND for cards in hand)
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

  const selectedIds = useMemo(
    () => new Set(selectionSlots.filter((card): card is Card => card !== null).map(card => card.id)),
    [selectionSlots]
  )

  const handleCardPick = useCallback((card: Card) => {
    const fn = getCardPlayabilityRef.current
    if (fn) {
      const p = fn(card)
      if (!p.playable) return
    }

    setSelectionSlots(prev => {
      const slots = normalizeSlots(prev)
      if (!isRevealTurn) {
        slots.fill(null)
        slots[0] = card
      } else {
        const existingIndex = slots.findIndex(slot => slot?.id === card.id)
        if (existingIndex !== -1) {
          slots[existingIndex] = null
        } else {
          const emptyIndex = slots.findIndex(slot => slot === null)
          if (emptyIndex !== -1) {
            slots[emptyIndex] = card
          }
        }
      }
      onSelectionChangeRef.current?.(filledCards(slots))
      return slots
    })
  }, [filledCards, isRevealTurn, normalizeSlots])

  const handleRemoveFromPreview = useCallback((slotIndex: number) => {
    setSelectionSlots(prev => {
      const slots = normalizeSlots(prev)
      if (!slots[slotIndex]) return prev
      slots[slotIndex] = null
      onSelectionChangeRef.current?.(filledCards(slots))
      return slots
    })
  }, [filledCards, normalizeSlots])

  const handleConfirm = () => {
    const selected = filledCards(selectionSlots)
    if (selected.length === selectionCount) {
      onSelect(selected)
      setSelectionSlots(buildSlots([]))
      setSearchTerm('')
    }
  }

  const handleCancel = () => {
    const emptySlots = buildSlots([])
    setSelectionSlots(emptySlots)
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
        const card = selectionSlots[index] ?? null
        return (
          <button
            key={index}
            type="button"
            className={`card-search-selection-preview-slot${
              card ? ' card-search-selection-preview-slot--filled' : ''
            }`}
            disabled={!card}
            onClick={() => handleRemoveFromPreview(index)}
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

  const searchInput = (
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
  )

  const actionButtons = (
    <>
      <button className="header-cancel-button" onClick={handleCancel}>
        {cancelButtonText}
      </button>
      {confirmAdornment}
      <button
        type="button"
        className="header-confirm-button"
        onClick={handleConfirm}
        disabled={filledCards(selectionSlots).length !== selectionCount}
      >
        Select
      </button>
    </>
  )

  const dialogClassName = [
    'card-selection-dialog',
    searchAtBottom ? 'card-selection-dialog-search-at-bottom' : '',
    useCompactBoardLayout ? 'card-selection-dialog--board-compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const dialog = (
    <div className={dialogClassName}>
      <div className="dialog-title">
        {!hideTitle && <h2>{text}</h2>}
      </div>
      {useCompactBoardLayout ? (
        <div className="dialog-search" role="search">
          {searchInput}
        </div>
      ) : null}
      <div className="cards-grid" ref={cardsGridRef}>
        {filteredCards.map((card, index) => (
          <CardGridItem
            key={`${card.id}-${index}`}
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
      <div
        className={`dialog-actions${
          useCompactBoardLayout ? ' dialog-actions--buttons-only' : ''
        }`}
      >
        {!useCompactBoardLayout ? searchInput : null}
        {actionButtons}
      </div>
    </div>
  )

  if (isStandaloneModal) {
    if (waitForBoardTarget) return null
    const overlay = (
      <div
        ref={overlayRef}
        className={[
          'card-selection-dialog-overlay',
          'card-selection-dialog-overlay-standalone',
          scopedClass,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {dialog}
      </div>
    )

    return portalNode(overlay)
  }
  return dialog
}

export default CardSearch

