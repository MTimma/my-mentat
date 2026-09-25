import React, { useEffect } from 'react'
import { GameState } from '../../types/GameTypes'
import { getHistoryRowLabel } from '../../utils/turnHistoryDisplay'
import { BoardScopedModal } from '../BoardScopedModal'
import './UndoConfirmDialog.css'

interface UndoConfirmDialogProps {
  isOpen: boolean
  targetTurnIndex: number
  undoSourceRowIndex: number
  undoToSetup: boolean
  currentHistoryLength: number
  targetState: GameState | null
  currentState: GameState
  onConfirm: () => void
  onCancel: () => void
}

const UndoConfirmDialog: React.FC<UndoConfirmDialogProps> = ({
  isOpen,
  targetTurnIndex,
  undoSourceRowIndex,
  undoToSetup,
  currentHistoryLength,
  targetState,
  currentState,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen || !targetState) return null

  const history = currentState.history
  const isSandboxEditUndo =
    Boolean(currentState.setupBaseline?.sandboxSetup) &&
    (undoToSetup || targetState.historyEntryKind === 'setup')

  const turnsToUndo = undoToSetup
    ? currentHistoryLength + 1
    : Math.max(1, currentHistoryLength - undoSourceRowIndex + 1)

  const undoFromLabel = isSandboxEditUndo
    ? getHistoryRowLabel(history, undoSourceRowIndex)
    : undoToSetup || undoSourceRowIndex === 0
      ? 'the initial setup'
      : getHistoryRowLabel(history, undoSourceRowIndex)

  const revertLabel = isSandboxEditUndo
    ? 'Setup editing'
    : undoToSetup
      ? 'Setup'
      : getHistoryRowLabel(history, targetTurnIndex)

  const currentLabel = undoSourceRowIndex >= history.length
    ? `${getHistoryRowLabel(history, undoSourceRowIndex)} (current)`
    : getHistoryRowLabel(history, undoSourceRowIndex)

  return (
    <BoardScopedModal
      isOpen
      overlayClassName="undo-confirm-overlay"
      onClose={onCancel}
      closeOnOverlayClick
    >
      <div className="undo-confirm-dialog" onClick={event => event.stopPropagation()}>
        <div className="undo-confirm-body">
          <p className="undo-main-warning">
            {isSandboxEditUndo
              ? 'This will reset the game to the setup.'
              : `This will reset the game to turn ${undoFromLabel}.`}
          </p>
          <p className="undo-main-warning">
            Are you sure?
          </p>
        </div>

        <div className="undo-confirm-actions">
          <button className="undo-confirm-submit modal-btn modal-btn--primary" type="button" onClick={onConfirm}>
            Confirm
          </button>
          <button className="undo-confirm-cancel modal-btn modal-btn--secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </BoardScopedModal>
  )
}

export default UndoConfirmDialog
