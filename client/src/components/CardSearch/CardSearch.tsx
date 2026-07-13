import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CustomEffect, Player, CardPile } from '../../types/GameTypes'
import { getSelectableDeckCards } from '../../utils/playAreaDisplay'
import { blobMatchesSearchTokens, parseSearchTokens } from '../../utils/searchTokens'
import { PLAY_EFFECT_TEXTS, REVEAL_EFFECT_TEXTS } from '../../data/effectTexts'
import {
  canConfirmGraftHandSelection,
  graftHandSelectionPreviewSlots,
  shouldPickGraftPartnerSlot,
} from '../../expansions/immortality/graft'
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

const PILE_TAB_LABELS: Record<CardPile, string> = {
  [CardPile.DECK]: 'Hand',
  [CardPile.DISCARD]: 'Discard',
  [CardPile.PLAY_AREA]: 'Play Area',
}

function getCardsFromPile(player: Player, pile: CardPile): Card[] {
  switch (pile) {
    case CardPile.DECK:
      return getSelectableDeckCards(player)
    case CardPile.DISCARD:
      return player.discardPile
    case CardPile.PLAY_AREA:
      return player.playArea
    default:
      return []
  }
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
  /** Allow confirming without filling every selection slot (for open-ended pile picks). */
  allowPartialSelection?: boolean
  /** Immortality — agent turn: pick a graft card plus optional partner from hand. */
  graftPairSelection?: boolean
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
  allowPartialSelection = false,
  graftPairSelection = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectionSlots, setSelectionSlots] = useState<(Card | null)[]>([])
  const [activePile, setActivePile] = useState<CardPile | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardsGridRef = useRef<HTMLDivElement>(null)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const getCardPlayabilityRef = useRef(getCardPlayability)
  getCardPlayabilityRef.current = getCardPlayability

  const showPreview =
    showSelectionPreview ?? (selectionCount > 1 || Boolean(onSelectionChange) || graftPairSelection)
  const slotCapacity = graftPairSelection ? 2 : selectionCount
  const previewSlotCount = graftPairSelection
    ? graftHandSelectionPreviewSlots(selectionSlots)
    : selectionCount
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
      Array.from({ length: slotCapacity }, (_, index) => initial[index] ?? null),
    [slotCapacity]
  )

  const filledCards = useCallback(
    (slots: (Card | null)[]) => slots.filter((card): card is Card => card !== null),
    []
  )

  const normalizeSlots = useCallback(
    (slots: (Card | null)[]) =>
      slots.length === slotCapacity
        ? [...slots]
        : Array.from({ length: slotCapacity }, (_, index) => slots[index] ?? null),
    [slotCapacity]
  )

  const selectedCards = useMemo(() => filledCards(selectionSlots), [filledCards, selectionSlots])
  const graftConfirmEnabled =
    graftPairSelection && !isRevealTurn && canConfirmGraftHandSelection(selectedCards)
  const confirmEnabled =
    allowPartialSelection ||
    (graftPairSelection && !isRevealTurn
      ? graftConfirmEnabled
      : selectedCards.length === selectionCount)

  useEffect(() => {
    if (!isOpen) return

    setSelectionSlots(buildSlots(initialSelectedCards))
  }, [buildSlots, initialSelectedCards, isOpen, slotCapacity])

  useEffect(() => {
    if (!isOpen) return
    onSelectionChangeRef.current?.(filledCards(selectionSlots))
  }, [filledCards, isOpen, selectionSlots])

  const pileTabs = useMemo(() => {
    if (!player || !piles?.length || cards) return []
    return [...new Set(piles)]
  }, [cards, piles, player])

  const usePileTabs = pileTabs.length > 1

  useEffect(() => {
    if (!isOpen || !usePileTabs) {
      setActivePile(null)
      return
    }
    setActivePile(prev => (prev && pileTabs.includes(prev) ? prev : pileTabs[0]))
  }, [isOpen, pileTabs, usePileTabs])

  const cardsByPile = useMemo(() => {
    if (!player || pileTabs.length === 0) return new Map<CardPile, Card[]>()
    const map = new Map<CardPile, Card[]>()
    for (const pile of pileTabs) {
      let pileCards = getCardsFromPile(player, pile)
      if (customFilter) {
        pileCards = pileCards.filter(customFilter)
      }
      map.set(pile, pileCards)
    }
    return map
  }, [customFilter, pileTabs, player])

  // Derive available cards from piles or use provided cards
  const availableCards = useMemo(() => {
    if (cards) {
      return customFilter ? cards.filter(customFilter) : cards
    }

    if (usePileTabs && activePile) {
      return cardsByPile.get(activePile) ?? []
    }

    if (player && piles) {
      const baseCards = piles.flatMap(pile => getCardsFromPile(player, pile))
      return customFilter ? baseCards.filter(customFilter) : baseCards
    }

    return []
  }, [activePile, cards, cardsByPile, customFilter, piles, player, usePileTabs])

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
        return blob ? blobMatchesSearchTokens(blob, tokens, matchAll) : false
      })

    const andMatches = match(true)
    if (andMatches.length > 0 || tokens.length === 1) return andMatches
    return match(false)
  }, [availableCards, deferredSearch, searchBlobById])

  useEffect(() => {
    if (!isOpen) return
    scrollCardsGridToTop(cardsGridRef.current)
  }, [activePile, deferredSearch, isOpen, filteredCards.length])

  const handlePileTabSelect = useCallback((pile: CardPile) => {
    setActivePile(pile)
    setSearchTerm('')
  }, [])

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

  const handleCardPick = useCallback((card: Card) => {
    const fn = getCardPlayabilityRef.current
    if (fn) {
      const p = fn(card)
      if (!p.playable) return
    }

    setSelectionSlots(prev => {
      const slots = normalizeSlots(prev)

      if (graftPairSelection && !isRevealTurn) {
        const existingIndex = slots.findIndex(slot => slot?.id === card.id)
        if (existingIndex !== -1) {
          if (existingIndex === 0) {
            slots.fill(null)
          } else {
            slots[existingIndex] = null
          }
          return slots
        }

        const first = slots[0]
        const second = slots[1]
        if (!first) {
          slots[0] = card
        } else if (!second && shouldPickGraftPartnerSlot(first, card)) {
          slots[1] = card
        } else if (second) {
          if (shouldPickGraftPartnerSlot(first, card)) {
            slots[1] = card
          } else {
            slots[0] = card
            slots[1] = null
          }
        } else {
          slots[0] = card
        }
        return slots
      }

      if (!isRevealTurn) {
        slots.fill(null)
        slots[0] = card
      } else {
        const existingIndex = slots.findIndex(slot => slot === card)
        if (existingIndex !== -1) {
          slots[existingIndex] = null
        } else {
          const emptyIndex = slots.findIndex(slot => slot === null)
          if (emptyIndex !== -1) {
            slots[emptyIndex] = card
          }
        }
      }
      return slots
    })
  }, [filledCards, graftPairSelection, isRevealTurn, normalizeSlots])

  const handleRemoveFromPreview = useCallback((slotIndex: number) => {
    setSelectionSlots(prev => {
      const slots = normalizeSlots(prev)
      if (!slots[slotIndex]) return prev
      slots[slotIndex] = null
      return slots
    })
  }, [filledCards, normalizeSlots])

  const handleConfirm = () => {
    const selected = filledCards(selectionSlots)
    if (confirmEnabled) {
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
      {Array.from({ length: previewSlotCount }, (_, index) => {
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
                : `Empty slot ${index + 1} of ${previewSlotCount}`
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

  const pileTabBar = usePileTabs ? (
    <div className="card-search-pile-tabs" role="tablist" aria-label="Card piles">
      {pileTabs.map(pile => {
        const count = cardsByPile.get(pile)?.length ?? 0
        const isActive = pile === activePile
        return (
          <button
            key={pile}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`card-search-pile-tab${isActive ? ' card-search-pile-tab--active' : ''}`}
            onClick={() => handlePileTabSelect(pile)}
          >
            {PILE_TAB_LABELS[pile]}
            <span className="card-search-pile-tab-count" aria-hidden="true">
              {count}
            </span>
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
        disabled={!confirmEnabled}
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
            isSelected={
              graftPairSelection && !isRevealTurn
                ? selectionSlots.some(slot => slot?.id === card.id)
                : isRevealTurn
                  ? selectionSlots.some(slot => slot === card)
                  : selectionSlots[0] === card
            }
            playability={
              getCardPlayability ? playabilityByCardId.get(card.id) ?? PLAYABLE_CARD : PLAYABLE_CARD
            }
            onPick={handleCardPick}
          />
        ))}
      </div>
      {selectionPreview}
      {slotBetweenCardsAndSearch}
      {pileTabBar}
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

