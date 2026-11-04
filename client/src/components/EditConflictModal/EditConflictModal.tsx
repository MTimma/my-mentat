import { useEffect } from 'react'
import type { RedoConflict } from '../../types/GameTypes'
import { BoardScopedModal } from '../BoardScopedModal'
import '../TimeTravel/UndoConfirmDialog.css'

interface EditConflictModalProps {
  /** `confirm` = ask before overwriting a turn. `conflict` = later turns no longer apply. */
  mode: 'confirm' | 'conflict'
  turnLabel: string
  conflict: RedoConflict | null
  onConfirm: () => void
  onTruncate: () => void
  onCancel: () => void
  /** Conflict only: dismiss and keep editing the replacement turn. */
  onBackToEdit?: () => void
}

const EditConflictModal = ({
  mode,
  turnLabel,
  conflict,
  onConfirm,
  onTruncate,
  onCancel,
  onBackToEdit,
}: EditConflictModalProps) => {
  const dismiss = onBackToEdit ?? onCancel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dismiss])

  const title = mode === 'confirm' ? `Edit ${turnLabel}` : 'Illegal turns were found after the edit'
  const message =
    mode === 'confirm'
      ? `Rewriting ${turnLabel}.`
      : conflict?.message ?? 'The following of the turns are no longer valid due to the edit.'

  return (
    <BoardScopedModal
      isOpen
      overlayClassName="undo-confirm-overlay"
      onClose={dismiss}
      closeOnOverlayClick
    >
      <div className="undo-confirm-dialog" onClick={event => event.stopPropagation()}>
        <div className="undo-confirm-header">
          <h2>{title}</h2>
        </div>
        <div className="undo-confirm-body">
          <p className="undo-main-warning">{message}</p>
          {mode === 'conflict' ? (
            <p className="undo-main-warning">
              It will be deleted together with any future turns.
            </p>
          ) : null}
        </div>
        <div className="undo-confirm-actions">
          {mode === 'confirm' ? (
            <button
              className="undo-confirm-submit modal-btn modal-btn--primary"
              type="button"
              onClick={onConfirm}
            >
              Edit turn
            </button>
          ) : (
            <button
              className="undo-confirm-submit modal-btn modal-btn--primary"
              type="button"
              onClick={onTruncate}
            >
              Confirm delete
            </button>
          )}
          {mode === 'conflict' && onBackToEdit ? (
            <button
              className="undo-confirm-back modal-btn modal-btn--secondary"
              type="button"
              onClick={onBackToEdit}
            >
              Back to edit
            </button>
          ) : null}
          <button
            className="undo-confirm-cancel modal-btn modal-btn--secondary"
            type="button"
            onClick={onCancel}
          >
            Cancel edit
          </button>
        </div>
      </div>
    </BoardScopedModal>
  )
}

export default EditConflictModal
