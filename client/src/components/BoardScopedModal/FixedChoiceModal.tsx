import React, { type ReactNode } from 'react'
import type { FixedOptionsChoice } from '../../types/GameTypes'
import { BoardDialogPanel, BoardScopedModal } from './BoardScopedModal'
import { getFixedChoiceModalMeta } from './fixedChoiceModalMeta'

export interface FixedChoiceModalProps {
  choice: FixedOptionsChoice | null
  onClose: () => void
  children: ReactNode
}

/**
 * Standard OR-choice modal for pending FixedOptionsChoice (Kwisatz agent source, intrigue, etc.).
 * Pass rendered option buttons as children (keeps TurnControls affordability logic local).
 */
export function FixedChoiceModal({ choice, onClose, children }: FixedChoiceModalProps) {
  if (!choice) return null

  const meta = getFixedChoiceModalMeta(choice)
  const titleId = `fixed-choice-title-${choice.id}`

  return (
    <BoardScopedModal isOpen>
      <BoardDialogPanel
        className="fixed-choice-dialog"
        title={meta.title}
        lead={meta.lead}
        titleId={titleId}
        onClose={onClose}
        showCancel={meta.allowCancel}
      >
        {children}
      </BoardDialogPanel>
    </BoardScopedModal>
  )
}
