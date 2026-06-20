import React from 'react'
import { Leader } from '../../types/GameTypes'
import { getLeaderImage } from '../../data/leaders'
import {
  isTessiaLeader,
  TESSIA_PARKED_SNOOPER_SLOTS,
} from '../../data/leaderAbilities/tessiaSnoopers'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import './LeaderImageModal.css'

interface LeaderImageModalProps {
  leader: Leader
  isOpen: boolean
  onClose: () => void
}

const LeaderImageModal: React.FC<LeaderImageModalProps> = ({ leader, isOpen, onClose }) => {
  const imagePath = getLeaderImage(leader.name)
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isOpen)
  const showParkedSnoopers = isTessiaLeader(leader)

  if (!isOpen || !imagePath) return null
  if (waitForBoardTarget) return null

  return portalNode(
    <div
      className={['dialog-overlay', 'leader-image-overlay', scopedClass].filter(Boolean).join(' ')}
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
          <div className="leader-image-frame">
            <img
              src={imagePath}
              alt={leader.name}
              className="leader-image-img"
            />
            {showParkedSnoopers
              ? TESSIA_PARKED_SNOOPER_SLOTS.map(slot => {
                  if (!leader.tessiaSnoopers?.[slot.faction]) return null
                  return (
                    <div
                      key={`parked-snooper-${slot.faction}`}
                      className="leader-image-snooper"
                      data-faction={slot.faction}
                      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                      title={`Parked snooper (${slot.faction})`}
                    >
                      <img src="/icon/snooper.svg" alt="" aria-hidden="true" />
                    </div>
                  )
                })
              : null}
          </div>
        </div>
      </div>
    </div>
  )
}


export default LeaderImageModal
