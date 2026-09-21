import React, { createContext, useContext } from 'react'
import type { LoadSaveFn } from '../api/gamesApi'
import './TurnHistory.css'

export type TurnHistoryUndoApi = {
  onUndo: () => void
  canUndo: boolean
  undoTitle?: string
  undoAriaLabel?: string
  onLoadSave?: LoadSaveFn
}

const TurnHistoryUndoContext = createContext<TurnHistoryUndoApi | null>(null)

export const TurnHistoryUndoProvider = TurnHistoryUndoContext.Provider

export function useTurnHistoryUndo(): TurnHistoryUndoApi | null {
  return useContext(TurnHistoryUndoContext)
}

const UndoIcon = () => (
  <svg className="turn-history-action-icon turn-history-action-icon--undo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
  </svg>
)

export function TurnHistoryUndoButton({
  onUndo,
  canUndo = false,
  undoTitle,
  undoAriaLabel,
  className,
}: Partial<TurnHistoryUndoApi> & { className?: string }) {
  if (!onUndo) return null
  return (
    <button
      type="button"
      className={['turn-history-icon-btn', 'turn-history-icon-btn--undo', className]
        .filter(Boolean)
        .join(' ')}
      onClick={onUndo}
      disabled={!canUndo}
      title={undoTitle}
      aria-label={undoAriaLabel ?? undoTitle ?? 'Undo turn'}
    >
      <UndoIcon />
    </button>
  )
}
