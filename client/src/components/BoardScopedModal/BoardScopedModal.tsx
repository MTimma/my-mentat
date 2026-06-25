import React, { cloneElement, isValidElement, type ReactNode } from 'react'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'

export interface BoardScopedModalProps {
  isOpen: boolean
  children: ReactNode
  /** Extra classes on the overlay (e.g. imperium-preview-overlay). */
  overlayClassName?: string
  onClose?: () => void
  closeOnOverlayClick?: boolean
}

/**
 * Portals a modal overlay into the play board (desktop) or document body (mobile).
 * Prefer this over hand-rolled usePlayBoardModalPortal + cloneElement wiring.
 */
export function BoardScopedModal({
  isOpen,
  children,
  overlayClassName,
  onClose,
  closeOnOverlayClick = false,
}: BoardScopedModalProps) {
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isOpen)

  if (!isOpen || waitForBoardTarget) return null

  const handleOverlayClick = closeOnOverlayClick && onClose ? onClose : undefined

  return portalNode(
    <div
      className={['dialog-overlay', overlayClassName, scopedClass].filter(Boolean).join(' ')}
      onClick={handleOverlayClick}
    >
      {children}
    </div>
  )
}

export interface BoardDialogPanelProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  lead?: ReactNode
  titleId?: string
  onClose?: () => void
  showCancel?: boolean
  cancelLabel?: string
}

/** Centered panel for BoardScopedModal (board-safe; no viewport-fixed positioning). */
export function BoardDialogPanel({
  children,
  className,
  title,
  lead,
  titleId,
  onClose,
  showCancel = false,
  cancelLabel = 'Cancel',
}: BoardDialogPanelProps) {
  return (
    <div
      className={['target-dialog', className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={event => event.stopPropagation()}
    >
      {title != null && title !== '' ? <h3 id={titleId}>{title}</h3> : null}
      {lead ? <p className="fixed-choice-dialog__lead">{lead}</p> : null}
      {children}
      {showCancel && onClose ? (
        <button type="button" className="secondary-btn fixed-choice-cancel" onClick={onClose}>
          {cancelLabel}
        </button>
      ) : null}
    </div>
  )
}

/**
 * For modals that need custom overlay markup (e.g. imperium preview) but the same portal/scoped-class behavior.
 */
export function useBoardScopedPortal(isActive: boolean) {
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isActive)

  const portalOverlay = (overlay: ReactNode) => {
    if (!isActive || waitForBoardTarget) return null
    const node =
      scopedClass && isValidElement(overlay)
        ? cloneElement(overlay as React.ReactElement<{ className?: string }>, {
            className: [overlay.props.className, scopedClass].filter(Boolean).join(' '),
          })
        : overlay
    return portalNode(node)
  }

  return { portalOverlay, waitForBoardTarget, scopedClass }
}
