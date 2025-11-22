import React, { useMemo, useState } from 'react'
import { Card } from '../../types/GameTypes'
import './ImperiumRowSelect.css'

interface ImperiumRowSelectProps {
  cards: Card[]
  requiredCount: number
  onConfirm: (cardIds: number[]) => void
}

const ImperiumRowSelect: React.FC<ImperiumRowSelectProps> = ({ cards, requiredCount, onConfirm }) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const handleToggle = (cardId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else if (next.size < requiredCount) {
        next.add(cardId)
      }
      return next
    })
  }

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.name.localeCompare(b.name)),
    [cards]
  )

  const canConfirm = selectedIds.size === requiredCount

  return (
    <div className="imperium-select-overlay">
      <div className="imperium-select-dialog">
        <header className="imperium-select-header">
          <h2>Select {requiredCount} Imperium Row Cards</h2>
          <p>Click cards to choose which ones appear in the row before revealing the next conflict.</p>
          <div className="imperium-select-count">
            Selected {selectedIds.size} / {requiredCount}
          </div>
        </header>

        <div className="imperium-select-grid">
          {sortedCards.map(card => {
            const isSelected = selectedIds.has(card.id)
            return (
              <button
                key={card.id}
                type="button"
                className={`imperium-select-card${isSelected ? ' selected' : ''}`}
                onClick={() => handleToggle(card.id)}
              >
                <img src={card.image} alt={card.name} />
                <div className="imperium-select-card-name">{card.name}</div>
                {card.cost !== undefined && (
                  <div className="imperium-select-card-cost">{card.cost} 💧</div>
                )}
              </button>
            )
          })}
        </div>

        <footer className="imperium-select-actions">
          <button
            type="button"
            className="confirm"
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(Array.from(selectedIds))}
          >
            Confirm Selection
          </button>
        </footer>
      </div>
    </div>
  )
}

export default ImperiumRowSelect
