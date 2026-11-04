import { createContext, useContext } from 'react'
import './TurnHistory.css'

export type TurnHistoryEditApi = {
  /** Edit the given past turn and replay the turns that follow it. */
  onEditTurn: (turnIndex: number) => void
  /** Whether the given turn can be edited. */
  canEditTurn: (turnIndex: number) => boolean
  /** True while a turn edit is open (its replacement is being played). */
  editing: boolean
  /** Cancel the open edit, restoring the original turn. No confirmation. */
  onCancelEdit: () => void
}

const TurnHistoryEditContext = createContext<TurnHistoryEditApi | null>(null)

export const TurnHistoryEditProvider = TurnHistoryEditContext.Provider

export function useTurnHistoryEdit(): TurnHistoryEditApi | null {
  return useContext(TurnHistoryEditContext)
}

const EditTurnIcon = () => (
  <svg
    className="turn-history-action-icon turn-history-action-icon--edit"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 20h9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** The undo arrow flipped vertically — cancels the open edit. */
const CancelEditIcon = () => (
  <svg
    className="turn-history-action-icon turn-history-action-icon--cancel-edit"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <g transform="translate(0 24) scale(1 -1)">
      <path
        d="M9 14 5 10l4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 10h9.5a5.5 5.5 0 1 1 0 11H12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
)

export interface TurnHistoryRowEditButtonProps {
  onEdit: () => void
  className?: string
}

/**
 * Pencil that appears on hover at the right of a turn-history row and edits that
 * turn, replaying the turns that follow it.
 */
export function TurnHistoryRowEditButton({ onEdit, className }: TurnHistoryRowEditButtonProps) {
  return (
    <button
      type="button"
      className={['turn-history-row-edit-btn', className].filter(Boolean).join(' ')}
      onClick={event => {
        event.stopPropagation()
        onEdit()
      }}
      title="Edit this turn"
      aria-label="Edit this turn"
    >
      <EditTurnIcon />
    </button>
  )
}

export interface TurnHistoryCancelEditButtonProps {
  onCancel: () => void
  className?: string
}

/**
 * Always-visible clockwise arrow shown on the turn currently being edited; it
 * cancels the edit and restores the original turn, with no confirmation.
 */
export function TurnHistoryCancelEditButton({ onCancel, className }: TurnHistoryCancelEditButtonProps) {
  return (
    <button
      type="button"
      className={['turn-history-cancel-edit-btn', className].filter(Boolean).join(' ')}
      onClick={event => {
        event.stopPropagation()
        onCancel()
      }}
      title="Cancel edit"
      aria-label="Cancel edit"
    >
      <CancelEditIcon />
    </button>
  )
}
