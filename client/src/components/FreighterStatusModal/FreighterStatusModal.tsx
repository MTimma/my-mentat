import React from 'react'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import type { Player } from '../../types/GameTypes'
import './FreighterStatusModal.css'

const TRACK_STEPS: Array<{ step: 0 | 1 | 2 | 3; label: string; reward: string }> = [
  { step: 0, label: 'Start', reward: '—' },
  { step: 1, label: 'Step 1', reward: 'Dividends (+5 solari, +1 each opponent) or +2 spice' },
  { step: 2, label: 'Step 2', reward: '+2 troops and +1 influence (choose faction)' },
  { step: 3, label: 'Step 3', reward: 'Acquire Tech (−2 spice)' },
]

interface FreighterStatusModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
}

const FreighterStatusModal: React.FC<FreighterStatusModalProps> = ({
  isOpen,
  onClose,
  players,
}) => {
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isOpen)

  if (!isOpen || waitForBoardTarget) return null

  return portalNode(
    <div
      className={['freighter-status-overlay', scopedClass].filter(Boolean).join(' ')}
      onClick={onClose}
    >
      <div className="freighter-status-modal" onClick={event => event.stopPropagation()}>
        <div className="freighter-status-modal__header">
          <h2>CHOAM Shipping track</h2>
          <button
            type="button"
            className="freighter-status-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="freighter-status-modal__track" aria-label="Recall rewards by step">
          {TRACK_STEPS.map(({ step, label, reward }) => (
            <div key={step} className="freighter-status-modal__step">
              <span className="freighter-status-modal__step-label">{label}</span>
              <span className="freighter-status-modal__step-reward">{reward}</span>
            </div>
          ))}
        </div>

        <div className="freighter-status-modal__players">
          <h3>Freighter positions</h3>
          {players.map(player => {
            const step = player.freighterStep ?? 0
            return (
              <div key={player.id} className="freighter-status-modal__player-row">
                <span>{player.leader.name}</span>
                <span className={`freighter-status-modal__player-step player-${player.color}`}>
                  {step}/3
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default FreighterStatusModal
