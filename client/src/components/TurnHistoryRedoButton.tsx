import { createContext, useContext } from 'react'
import './TurnHistory.css'

export type TurnHistoryRedoApi = {
  onRedo: () => void
  canRedo: boolean
  redoTitle?: string
  redoAriaLabel?: string
}

const TurnHistoryRedoContext = createContext<TurnHistoryRedoApi | null>(null)

export const TurnHistoryRedoProvider = TurnHistoryRedoContext.Provider

export function useTurnHistoryRedo(): TurnHistoryRedoApi | null {
  return useContext(TurnHistoryRedoContext)
}

const EditIcon = () => (
  <svg
    className="turn-history-action-icon turn-history-action-icon--redo"
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

export interface TurnHistoryRedoButtonProps extends Partial<TurnHistoryRedoApi> {
  className?: string
}

/**
 * Edit button for a past turn. Edits the turn currently being viewed and
 * replays the turns that follow it.
 */
export function TurnHistoryRedoButton({
  onRedo,
  canRedo = false,
  redoTitle,
  redoAriaLabel,
  className,
}: TurnHistoryRedoButtonProps) {
  if (!onRedo) return null
  return (
    <button
      type="button"
      className={['turn-history-icon-btn', 'turn-history-icon-btn--redo', className]
        .filter(Boolean)
        .join(' ')}
      onClick={onRedo}
      disabled={!canRedo}
      title={redoTitle}
      aria-label={redoAriaLabel ?? redoTitle ?? 'Edit turn'}
    >
      <EditIcon />
    </button>
  )
}
