import React from 'react'
import type { Player } from '../../types/GameTypes'
import { BoardScopedModal, BoardDialogPanel } from '../BoardScopedModal/BoardScopedModal'
import BeneTleilaxBoardPanel from './BeneTleilaxBoardPanel'
import './BeneTleilaxBoardModal.css'

export interface BeneTleilaxBoardModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  currentPlayerId: number
  tleilaxuTrackBonusSpice?: number
  tleilaxuTrackBonusClaimed?: boolean
  markerDebug?: boolean
  onResearchNodeSelect: (playerId: number, nodeId: string) => void
  onTleilaxuStepSelect: (playerId: number, step: number) => void
}

const BeneTleilaxBoardModal: React.FC<BeneTleilaxBoardModalProps> = ({
  isOpen,
  onClose,
  players,
  currentPlayerId,
  tleilaxuTrackBonusSpice,
  tleilaxuTrackBonusClaimed,
  markerDebug,
  onResearchNodeSelect,
  onTleilaxuStepSelect,
}) => (
  <BoardScopedModal isOpen={isOpen} onClose={onClose} closeOnOverlayClick overlayClassName="bene-tleilax-modal-overlay">
    <BoardDialogPanel
      className="bene-tleilax-modal__panel"
      title="Bene Tleilax board"
      titleId="bene-tleilax-modal-title"
      lead="Click a track space to set the active player's position."
      onClose={onClose}
      showCancel
      cancelLabel="Close"
    >
      <BeneTleilaxBoardPanel
        players={players}
        currentPlayerId={currentPlayerId}
        tleilaxuTrackBonusSpice={tleilaxuTrackBonusSpice}
        tleilaxuTrackBonusClaimed={tleilaxuTrackBonusClaimed}
        markerDebug={markerDebug}
        interactive
        onResearchNodeSelect={onResearchNodeSelect}
        onTleilaxuStepSelect={onTleilaxuStepSelect}
      />
    </BoardDialogPanel>
  </BoardScopedModal>
)

export default BeneTleilaxBoardModal
