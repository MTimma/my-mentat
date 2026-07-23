import React, { type ReactNode, type Ref } from 'react'
import { BoardScopedModal } from './BoardScopedModal'

export interface PickerModalShellProps {
  isOpen?: boolean
  title: ReactNode
  lead?: ReactNode
  countLabel?: ReactNode
  onClose?: () => void
  closeOnOverlayClick?: boolean
  overlayRef?: Ref<HTMLDivElement>
  className?: string
  children: ReactNode
}

/**
 * Shared layout for grid pickers (imperium row, conflict, tech, embedded CardSearch).
 */
export function PickerModalShell({
  isOpen = true,
  title,
  lead,
  countLabel,
  onClose,
  closeOnOverlayClick = false,
  overlayRef,
  className,
  children,
}: PickerModalShellProps) {
  return (
    <BoardScopedModal
      isOpen={isOpen}
      overlayVariant="picker"
      overlayClassName="imperium-select-overlay"
      onClose={onClose}
      closeOnOverlayClick={closeOnOverlayClick}
      overlayRef={overlayRef}
    >
      <div className={['picker-modal-shell', 'imperium-select-dialog', className].filter(Boolean).join(' ')}>
        <header className="picker-modal-shell__header imperium-select-header">
          <h2>{title}</h2>
          {lead ? <p>{lead}</p> : null}
          {countLabel ? <div className="picker-modal-shell__count imperium-select-count">{countLabel}</div> : null}
        </header>
        <div className="picker-modal-shell__body imperium-select-cardsearch-wrapper">{children}</div>
      </div>
    </BoardScopedModal>
  )
}
