import React, { useMemo, useRef, useState } from 'react'
import { Card } from '../../types/GameTypes'
import CardSearch from '../CardSearch/CardSearch'
import { PickerModalShell } from '../BoardScopedModal'
import { usePlayBoardModalContext } from '../../context/PlayBoardModalContext'
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

const ImperiumRowSelect: React.FC<ImperiumRowSelectProps> = ({
  cards,
  requiredCount,
  onConfirm,
  onCancel,
  initialSelectedCards,
}) => {
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const overlayRef = useRef<HTMLDivElement>(null)
  const { scopeModalsToBoard } = usePlayBoardModalContext()

  useVisualViewportOverlay(overlayRef, { enabled: !scopeModalsToBoard, lockDocumentScroll: true })

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

  return (
    <PickerModalShell
      title={`Select ${requiredCount} Imperium Row Cards`}
      lead="Click cards to choose which ones appear in the row before revealing the next conflict."
      countLabel={`Selected ${selectedCards.length} / ${requiredCount}`}
      overlayRef={overlayRef}
    >
      <CardSearch
        isOpen={true}
        cards={sortedCards}
        onSelect={handleSelect}
        onCancel={handleCancel}
        isRevealTurn={requiredCount > 1}
        selectionCount={requiredCount}
        text={`Select ${requiredCount} Imperium Row Cards`}
        onSelectionChange={handleSelectionChange}
        hideTitle={true}
        initialSelectedCards={initialSelectedCards}
        cancelButtonText={onCancel ? 'Cancel' : undefined}
        embedded
      />
    </PickerModalShell>
  )
}

export default ImperiumRowSelect
