import React, { useEffect } from 'react'
import { Leader } from '../../types/GameTypes'
import { getLeaderImage } from '../../data/leaders'
import TessiaLeaderOverlays from '../TessiaLeaderOverlays/TessiaLeaderOverlays'
import { BoardScopedModal } from '../BoardScopedModal'
import './LeaderImageModal.css'

interface LeaderImageModalProps {
  leader: Leader
  isOpen: boolean
  onClose: () => void
}

const LeaderImageModal: React.FC<LeaderImageModalProps> = ({ leader, isOpen, onClose }) => {
  const imagePath = getLeaderImage(leader.name)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !imagePath) return null

  return (
    <BoardScopedModal
      isOpen
      overlayClassName="leader-image-overlay"
      onClose={onClose}
      closeOnOverlayClick
    >
      <div className="leader-image-modal" onClick={event => event.stopPropagation()}>
        <div className="leader-image-header">
          <h3>{leader.name}</h3>
          <button className="leader-image-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="leader-image-body">
          <div className="leader-image-frame">
            <img
              src={imagePath}
              alt={leader.name}
              className="leader-image-img"
              data-preview-src={imagePath}
            />
            <TessiaLeaderOverlays leader={leader} />
          </div>
        </div>
      </div>
    </BoardScopedModal>
  )
}

export default LeaderImageModal
