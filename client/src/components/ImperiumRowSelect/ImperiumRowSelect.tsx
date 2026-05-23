import React, { useMemo, useRef, useState } from 'react'
import { Card } from '../../types/GameTypes'
import CardSearch from '../CardSearch/CardSearch'
import { useVisualViewportOverlay } from '../../utils/useVisualViewportOverlay'
import './ImperiumRowSelect.css'

interface ImperiumRowSelectProps {
  cards: Card[]
  requiredCount: number
  onConfirm: (cardIds: number[]) => void
}

const ImperiumRowSelect: React.FC<ImperiumRowSelectProps> = ({ cards, requiredCount, onConfirm }) => {
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const overlayRef = useRef<HTMLDivElement>(null)

  useVisualViewportOverlay(overlayRef, { enabled: true, lockDocumentScroll: true })

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.name.localeCompare(b.name)),
    [cards]
  )

  const handleSelect = (cardsToSelect: Card[]) => {
    onConfirm(cardsToSelect.map(card => card.id))
  }

  const handleCancel = () => {
    setSelectedCards([])
  }

  const handleSelectionChange = (cards: Card[]) => {
    setSelectedCards(cards)
  }

  return (
    <div ref={overlayRef} className="imperium-select-overlay">
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
          />
        </div>
      </div>
    </div>
  )
}

export default ImperiumRowSelect
