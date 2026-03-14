import React, { useState } from 'react'
import { FactionType } from '../../types/GameTypes'
import './MasterstrokeFactionModal.css'

const FACTIONS = Object.values(FactionType)

interface MasterstrokeFactionModalProps {
  open: boolean
  onConfirm: (factions: FactionType[]) => void
  onCancel: () => void
}

const MasterstrokeFactionModal: React.FC<MasterstrokeFactionModalProps> = ({
  open,
  onConfirm,
  onCancel,
}) => {
  const [selectedFactions, setSelectedFactions] = useState<FactionType[]>([])

  const handleFactionClick = (faction: FactionType) => {
    setSelectedFactions((prev) => {
      if (prev.includes(faction)) {
        return prev.filter((f) => f !== faction)
      }
      if (prev.length < 2) {
        return [...prev, faction]
      }
      return prev
    })
  }

  const handleConfirm = () => {
    if (selectedFactions.length === 2) {
      onConfirm(selectedFactions)
      setSelectedFactions([])
    }
  }

  const handleCancel = () => {
    setSelectedFactions([])
    onCancel()
  }

  if (!open) return null

  return (
    <div className="dialog-overlay masterstroke-faction-overlay" onClick={handleCancel}>
      <div className="masterstroke-faction-modal" onClick={(e) => e.stopPropagation()}>
        <div className="masterstroke-faction-header">
          <h3>Masterstroke – Choose 2 Factions</h3>
          <button
            className="masterstroke-faction-close"
            onClick={handleCancel}
            aria-label="Cancel"
          >
            ×
          </button>
        </div>
        <div className="masterstroke-faction-body">
          <p className="masterstroke-faction-prompt">
            Select 2 factions to gain 1 Influence with each.
          </p>
          <div className="masterstroke-faction-buttons">
            {FACTIONS.map((faction) => (
              <button
                key={faction}
                onClick={() => handleFactionClick(faction)}
                className={`masterstroke-faction-btn ${
                  selectedFactions.includes(faction) ? 'selected' : ''
                }`}
                disabled={
                  selectedFactions.length === 2 && !selectedFactions.includes(faction)
                }
              >
                <img
                  className="masterstroke-faction-icon"
                  src={`/icon/${faction}.png`}
                  alt={faction
                    .split('-')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="masterstroke-faction-footer">
          <button
            className="masterstroke-faction-confirm"
            onClick={handleConfirm}
            disabled={selectedFactions.length !== 2}
          >
            Confirm
          </button>
          <button className="masterstroke-faction-cancel" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default MasterstrokeFactionModal
