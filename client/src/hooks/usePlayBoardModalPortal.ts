import { useCallback, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { usePlayBoardModalContext } from '../context/PlayBoardModalContext'

export const PLAY_BOARD_MODAL_SCOPED_CLASS = 'play-board-modal-overlay--scoped'

export type PlayBoardModalPortalOptions = {
  /** When set, portal into this element instead of relying on context alone. */
  containerRef?: RefObject<HTMLElement | null>
}

export function usePlayBoardModalPortal(
  isActive: boolean,
  options?: PlayBoardModalPortalOptions
) {
  const { boardContainerRef, scopeModalsToBoard } = usePlayBoardModalContext()
  const explicitContainer = options?.containerRef
  const targetRef = explicitContainer ?? boardContainerRef
  const shouldScope = Boolean(explicitContainer) || scopeModalsToBoard
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!isActive || !shouldScope) {
      setPortalTarget(null)
      return
    }
    setPortalTarget(targetRef.current)
  }, [isActive, shouldScope, targetRef])

  const boardScoped = shouldScope && Boolean(portalTarget)
  const scopedClass = boardScoped ? PLAY_BOARD_MODAL_SCOPED_CLASS : ''

  const portalNode = useCallback(
    (node: ReactNode) => {
      if (typeof document === 'undefined') return node
      if (boardScoped && portalTarget) {
        return createPortal(node, portalTarget)
      }
      return createPortal(node, document.body)
    },
    [boardScoped, portalTarget]
  )

  const waitForBoardTarget = boardScoped && !portalTarget

  return {
    portalNode,
    scopedClass,
    boardScoped,
    portalTarget,
    waitForBoardTarget,
  }
}
