import { useCallback, useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePlayBoardModalContext } from '../context/PlayBoardModalContext'

export const PLAY_BOARD_MODAL_SCOPED_CLASS = 'play-board-modal-overlay--scoped'

export function usePlayBoardModalPortal(isActive: boolean) {
  const { boardContainerRef, scopeModalsToBoard } = usePlayBoardModalContext()
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!isActive || !scopeModalsToBoard) {
      setPortalTarget(null)
      return
    }
    setPortalTarget(boardContainerRef.current)
  }, [boardContainerRef, isActive, scopeModalsToBoard])

  const boardScoped = scopeModalsToBoard && Boolean(portalTarget)
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
