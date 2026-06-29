import React, { useState } from 'react'
import { useGame } from '../../components/GameContext/gameContextState'
import BeneTleilaxBoardPanel, { type BeneTleilaxBoardPlacement } from './BeneTleilaxBoardPanel'
import BeneTleilaxBoardModal from './BeneTleilaxBoardModal'
import './BeneTleilaxBoardOverlay.css'

export type { BeneTleilaxBoardPlacement }

export interface BeneTleilaxBoardOverlayProps {
  currentPlayerId: number
  placement?: BeneTleilaxBoardPlacement
  markerDebug?: boolean
}

const BeneTleilaxBoardOverlay: React.FC<BeneTleilaxBoardOverlayProps> = ({
  currentPlayerId,
  placement = 'stacked',
  markerDebug = false,
}) => {
  const { gameState, dispatch } = useGame()
  const [modalOpen, setModalOpen] = useState(false)
  const isDocked = placement === 'docked'
  const players = gameState.players

  const onResearchNodeSelect = (playerId: number, nodeId: string) => {
    dispatch({ type: 'SET_RESEARCH_NODE', playerId, nodeId })
  }

  const onTleilaxuStepSelect = (playerId: number, step: number) => {
    dispatch({ type: 'SET_TLEILAXU_STEP', playerId, step })
  }

  return (
    <>
      <button
        type="button"
        className={[
          'bene-tleilax-board__open',
          isDocked ? 'bene-tleilax-board__open--docked' : 'bene-tleilax-board__open--stacked',
        ].join(' ')}
        onClick={() => setModalOpen(true)}
        aria-label="Open Bene Tleilax board"
        title="Click to open Bene Tleilax board"
      >
        <BeneTleilaxBoardPanel
          players={players}
          currentPlayerId={currentPlayerId}
          tleilaxuTrackBonusSpice={gameState.tleilaxuTrackBonusSpice}
          tleilaxuTrackBonusClaimed={gameState.tleilaxuTrackBonusClaimed}
          placement={placement}
          markerDebug={markerDebug}
        />
        <span className="bene-tleilax-board__open-hint" aria-hidden>
          Expand
        </span>
      </button>

      <BeneTleilaxBoardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        players={players}
        currentPlayerId={currentPlayerId}
        tleilaxuTrackBonusSpice={gameState.tleilaxuTrackBonusSpice}
        tleilaxuTrackBonusClaimed={gameState.tleilaxuTrackBonusClaimed}
        markerDebug={markerDebug}
        onResearchNodeSelect={onResearchNodeSelect}
        onTleilaxuStepSelect={onTleilaxuStepSelect}
      />
    </>
  )
}

export default BeneTleilaxBoardOverlay
