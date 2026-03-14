import React from 'react'
import { Leader } from '../../types/GameTypes'
import { getLeaderImage } from '../../data/leaders'
import './LeaderImageModal.css'

interface LeaderImageModalProps {
  leader: Leader
  isOpen: boolean
  onClose: () => void
}

const LeaderImageModal: React.FC<LeaderImageModalProps> = ({ leader, isOpen, onClose }) => {
  const imagePath = getLeaderImage(leader.name)
  if (!isOpen || !imagePath) return null

  return (
    <div
      className="dialog-overlay leader-image-overlay"
      onClick={(e) => { e.stopPropagation(); onClose() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label="Close leader image"
    >
      <div className="leader-image-modal" onClick={(e) => e.stopPropagation()}>
        <div className="leader-image-header">
          <h3>{leader.name}</h3>
          <button
            className="leader-image-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="leader-image-body">
          <img
            src={imagePath}
            alt={leader.name}
            className="leader-image-img"
          />
        </div>
      </div>
    </div>
  )
}

export default LeaderImageModal
