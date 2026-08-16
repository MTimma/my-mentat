import React, { useEffect } from 'react'
import type { RefObject } from 'react'
import type { TechTileId } from '../../data/techTiles'
import type { GameState, Player } from '../../types/GameTypes'
import { usePlayBoardModalContext } from '../../context/PlayBoardModalContext'
import { BoardScopedModal } from '../BoardScopedModal'
import TurnControlsTechRow from '../TurnControlsTechRow/TurnControlsTechRow'
import './PlayerTechModal.css'

export interface PlayerTechModalProps {
  isOpen: boolean
  onClose: () => void
  gameState: GameState
  player: Player
  onActivateTech?: (playerId: number, tileId: TechTileId) => void
  isHistoryView?: boolean
  containerRef?: RefObject<HTMLElement | null>
}

/** Board-scoped modal listing owned tech tiles. Same tile row as birdseye / combat detail. */
const PlayerTechModal: React.FC<PlayerTechModalProps> = ({
  isOpen,
  onClose,
  gameState,
  player,
  onActivateTech,
  isHistoryView,
  containerRef,
}) => {
  const { boardContainerRef, scopeModalsToBoard } = usePlayBoardModalContext()
  const effectiveContainerRef =
    containerRef ?? (scopeModalsToBoard ? boardContainerRef : undefined)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const ownedCount = player.tech?.length ?? 0

  return (
    <BoardScopedModal
      isOpen
      overlayClassName={[
        'player-tech-overlay',
        effectiveContainerRef ? 'player-tech-overlay--board-scoped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      containerRef={effectiveContainerRef}
      onClose={onClose}
      closeOnOverlayClick
    >
      <div className="player-tech-modal" onClick={event => event.stopPropagation()}>
        <div className="player-tech-modal__header">
          <h3>
            {player.leader.name} – Technology ({ownedCount})
          </h3>
          <button type="button" className="player-tech-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="player-tech-modal__body">
          {ownedCount === 0 ? (
            <p className="player-tech-modal__empty">No technology tiles</p>
          ) : (
            <TurnControlsTechRow
              gameState={gameState}
              player={player}
              onActivateTech={onActivateTech}
              isHistoryView={isHistoryView}
            />
          )}
        </div>
      </div>
    </BoardScopedModal>
  )
}

export default PlayerTechModal
