import { useCallback, useLayoutEffect, useRef, useState, cloneElement, isValidElement, type ReactNode } from 'react'
import './TurnHistoryNav.css'

const SkipToBeginningIcon = () => (
  <svg className="turn-history-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5 5v14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M16 6l-6 6 6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="turn-history-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M14 6l-6 6 6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="turn-history-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M10 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SkipToCurrentIcon = () => (
  <svg className="turn-history-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M8 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M19 5v14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export interface TurnHistoryNavProps {
  viewingTurnIndex: number | null
  historyLength: number
  inSandboxSetup?: boolean
  isViewingHistory: boolean
  onTurnChange: (turnIndex: number) => void
  onReturnToCurrent: () => void
  className?: string
  /** Replaces the skip-to-current button (e.g. End Turn on the live turn). */
  lastSlot?: ReactNode
  /** When set, last-slot buttons share this label's measured width (mobile footer). */
  lastSlotWidthLabel?: string
  /** Classes applied to the hidden width reference button. */
  lastSlotWidthClassName?: string
}

const TurnHistoryNav = ({
  viewingTurnIndex,
  historyLength,
  inSandboxSetup = false,
  isViewingHistory,
  onTurnChange,
  onReturnToCurrent,
  className,
  lastSlot,
  lastSlotWidthLabel,
  lastSlotWidthClassName,
}: TurnHistoryNavProps) => {
  const lastSlotWidthSizerRef = useRef<HTMLButtonElement>(null)
  const [lastSlotWidth, setLastSlotWidth] = useState<number | undefined>()

  const effectiveViewIndex = viewingTurnIndex ?? historyLength
  const canGoToBeginning = !inSandboxSetup && effectiveViewIndex > 0
  const canGoToPreviousTurn = !inSandboxSetup && effectiveViewIndex > 0
  const canGoToNextTurn =
    !inSandboxSetup && viewingTurnIndex !== null && effectiveViewIndex < historyLength
  const canGoToCurrent = !inSandboxSetup && isViewingHistory

  const goToBeginning = useCallback(() => {
    if (!canGoToBeginning) return
    onTurnChange(0)
  }, [canGoToBeginning, onTurnChange])

  const goToPreviousTurn = useCallback(() => {
    if (!canGoToPreviousTurn) return
    onTurnChange(Math.max(0, effectiveViewIndex - 1))
  }, [canGoToPreviousTurn, effectiveViewIndex, onTurnChange])

  const goToNextTurn = useCallback(() => {
    if (!canGoToNextTurn) return
    if (effectiveViewIndex < historyLength) {
      onTurnChange(effectiveViewIndex + 1)
    } else {
      onReturnToCurrent()
    }
  }, [canGoToNextTurn, effectiveViewIndex, historyLength, onTurnChange, onReturnToCurrent])

  const goToCurrent = useCallback(() => {
    if (!canGoToCurrent) return
    onReturnToCurrent()
  }, [canGoToCurrent, onReturnToCurrent])

  useLayoutEffect(() => {
    if (!lastSlotWidthLabel) {
      setLastSlotWidth(undefined)
      return
    }

    const sizer = lastSlotWidthSizerRef.current
    if (!sizer) return

    const measure = () => {
      const nextWidth = Math.ceil(sizer.getBoundingClientRect().width)
      setLastSlotWidth(prev => (prev === nextWidth ? prev : nextWidth))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(sizer)
    return () => observer.disconnect()
  }, [lastSlotWidthLabel, lastSlotWidthClassName])

  const lastSlotSyncedStyle =
    lastSlotWidth != null
      ? ({ width: lastSlotWidth, minWidth: lastSlotWidth, maxWidth: lastSlotWidth } as const)
      : undefined

  const renderLastSlot = () => {
    if (lastSlot) {
      if (isValidElement(lastSlot) && lastSlotSyncedStyle) {
        return cloneElement(lastSlot, {
          style: { ...(lastSlot.props.style ?? {}), ...lastSlotSyncedStyle },
        })
      }
      return lastSlot
    }

    return (
      <button
        type="button"
        className={[
          'turn-history-nav-btn',
          lastSlotSyncedStyle ? 'turn-history-nav-btn--last-slot-synced' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={lastSlotSyncedStyle}
        onClick={goToCurrent}
        disabled={!canGoToCurrent}
        title="Go to current turn"
        aria-label="Go to current turn"
      >
        <SkipToCurrentIcon />
      </button>
    )
  }

  return (
    <div
      className={['turn-history-nav', className].filter(Boolean).join(' ')}
      aria-label="Turn navigation"
    >
      {lastSlotWidthLabel && lastSlotWidthClassName ? (
        <button
          ref={lastSlotWidthSizerRef}
          type="button"
          className={['turn-history-nav-last-slot-sizer', lastSlotWidthClassName]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
          tabIndex={-1}
        >
          {lastSlotWidthLabel}
        </button>
      ) : null}
      <button
        type="button"
        className="turn-history-nav-btn"
        onClick={goToBeginning}
        disabled={!canGoToBeginning}
        title="Go to beginning"
        aria-label="Go to beginning"
      >
        <SkipToBeginningIcon />
      </button>
      <button
        type="button"
        className="turn-history-nav-btn"
        onClick={goToPreviousTurn}
        disabled={!canGoToPreviousTurn}
        title="Previous turn"
        aria-label="Previous turn"
      >
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        className="turn-history-nav-btn"
        onClick={goToNextTurn}
        disabled={!canGoToNextTurn}
        title="Next turn"
        aria-label="Next turn"
      >
        <ChevronRightIcon />
      </button>
      {renderLastSlot()}
    </div>
  )
}

export default TurnHistoryNav
