import React, { useEffect } from 'react'
import { GameState } from '../../types/GameTypes'
import { getHistoryRowLabel } from '../../utils/turnHistoryDisplay'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
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
  onCancel
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])
  
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isOpen)

  if (!isOpen || !targetState) return null
  if (waitForBoardTarget) return null
  
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

  const dialog = (
    <div
      className={['undo-confirm-overlay', scopedClass].filter(Boolean).join(' ')}
      onClick={onCancel}
    >
      <div className="undo-confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="undo-confirm-header">
          <h2>Confirm Undo</h2>
        </div>
        
        <div className="undo-confirm-body">
          <p className="undo-main-warning">
            {isSandboxEditUndo
              ? 'You will return to setup editing. Your board configuration will be kept.'
              : `This will reset ${undoFromLabel} and all future turns.`}
          </p>
          
          <div className="undo-details">
            <div className="undo-detail-row">
              <span className="detail-label">Reverting to:</span>
              <span className="detail-value">{revertLabel}</span>
            </div>
            <div className="undo-detail-row">
              <span className="detail-label">Undoing from:</span>
              <span className="detail-value">{currentLabel}</span>
            </div>
          </div>
        </div>
        
        <div className="undo-confirm-actions">
          <button className="undo-confirm-cancel" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="undo-confirm-submit" type="button" onClick={onConfirm}>
            Undo {turnsToUndo} Turn{turnsToUndo !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )

  return portalNode(dialog)
}

export default UndoConfirmDialog
