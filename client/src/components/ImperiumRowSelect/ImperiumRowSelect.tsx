import React, { useMemo, useRef, useState } from 'react'
import { Card } from '../../types/GameTypes'
import CardSearch from '../CardSearch/CardSearch'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import { useVisualViewportOverlay } from '../../utils/useVisualViewportOverlay'
import './ImperiumRowSelect.css'

interface ImperiumRowSelectProps {
  cards: Card[]
  requiredCount: number
  onConfirm: (cardIds: number[]) => void
  /** When provided, the cancel control closes the dialog instead of clearing the selection. */
  onCancel?: () => void
  initialSelectedCards?: Card[]
}

const ImperiumRowSelect: React.FC<ImperiumRowSelectProps> = ({ cards, requiredCount, onConfirm, onCancel, initialSelectedCards }) => {
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const overlayRef = useRef<HTMLDivElement>(null)
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(true)

  useVisualViewportOverlay(overlayRef, { enabled: !scopedClass, lockDocumentScroll: true })

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.name.localeCompare(b.name)),
    [cards]
  )

  const handleSelect = (cardsToSelect: Card[]) => {
    onConfirm(cardsToSelect.map(card => card.id))
  }

  const handleCancel = () => {
    setSelectedCards([])
    onCancel?.()
  }

  const handleSelectionChange = (cards: Card[]) => {
    setSelectedCards(cards)
  }

  if (waitForBoardTarget) return null

  const overlay = (
    <div
      ref={overlayRef}
      className={['imperium-select-overlay', scopedClass].filter(Boolean).join(' ')}
    >
      <div className="imperium-select-dialog">
        <header className="imperium-select-header">
          <h2>Select {requiredCount} Imperium Row Cards</h2>
          <p>Click cards to choose which ones appear in the row before revealing the next conflict.</p>
          <div className="imperium-select-count">
            Selected {selectedCards.length} / {requiredCount}
          </div>
        </header>

        <div className="imperium-select-cardsearch-wrapper">
          <CardSearch
            isOpen={true}
            cards={sortedCards}
            onSelect={handleSelect}
            onCancel={handleCancel}
            isRevealTurn={true}
            selectionCount={requiredCount}
            text={`Select ${requiredCount} Imperium Row Cards`}
            onSelectionChange={handleSelectionChange}
            hideTitle={true}
            initialSelectedCards={initialSelectedCards}
            cancelButtonText={onCancel ? 'Cancel' : undefined}
            embedded
          />
        </div>
      </div>
    </div>
  )

  return portalNode(overlay)
}

export default ImperiumRowSelect
