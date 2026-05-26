import { useState } from 'react'
import { Player } from '../../types/GameTypes'
import { getLeaderIconPath, getLeaderImage } from '../../data/leaders'
import LeaderImageModal from '../LeaderImageModal/LeaderImageModal'
import './PlayFooterToolbar.css'

const TurnHistoryIcon = () => (
  <svg className="utility-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5 6.5h8.5" />
    <path d="M5 11.5h6.5" />
    <path d="M5 16.5h5" />
    <circle cx="16.5" cy="15.5" r="4.25" />
    <path d="M16.5 13v2.7l2 1.1" />
    <path d="M3.5 6.5h.01M3.5 11.5h.01M3.5 16.5h.01" />
  </svg>
)

const PlayerOverviewIcon = () => (
  <svg className="utility-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="7.25" cy="7.25" r="2.25" />
    <path d="M3.75 13.25c.6-1.85 1.85-2.75 3.5-2.75s2.9.9 3.5 2.75" />
    <circle cx="15.75" cy="6.75" r="1.85" />
    <path d="M12.85 11.75c.5-1.35 1.5-2 2.9-2s2.4.65 2.9 2" />
    <path d="M5 20v-3.25" />
    <path d="M11 20v-5.25" />
    <path d="M17 20v-7.25" />
    <path d="M3.5 20h16.75" />
  </svg>
)

const MagnifyingGlassIcon = () => (
  <svg className="see-leader-magnifier" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="10.5" cy="10.5" r="5.5" />
    <path d="M15 15l4.5 4.5" />
  </svg>
)

const BoardPeekIcon = () => (
  <svg className="utility-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.75" />
  </svg>
)

export interface PlayFooterToolbarProps {
  player: Player
  onOpenPlayerOverview: () => void
  onTurnHistoryToggle: () => void
  isTurnHistoryOpen?: boolean
  /** Wide layout: timeline is always visible in the sidebar */
  hideTurnHistoryToggle?: boolean
  /** Mobile image board: hold to hide footer chrome and view the board */
  showBoardPeekButton?: boolean
  isBoardPeekActive?: boolean
  onBoardPeekHoldChange?: (held: boolean) => void
}

const PlayFooterToolbar = ({
  player,
  onOpenPlayerOverview,
  onTurnHistoryToggle,
  isTurnHistoryOpen = false,
  hideTurnHistoryToggle = false,
  showBoardPeekButton = false,
  isBoardPeekActive = false,
  onBoardPeekHoldChange,
}: PlayFooterToolbarProps) => {
  const endBoardPeekHold = (target: HTMLButtonElement, pointerId: number) => {
    onBoardPeekHoldChange?.(false)
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
  }

  const [isLeaderImageOpen, setIsLeaderImageOpen] = useState(false)
  const leaderIconPath = getLeaderIconPath(player.leader.name)
  const hasLeaderImage = Boolean(getLeaderImage(player.leader.name))

  return (
    <div className="history-banner-toolbar" aria-label="Game shortcuts">
      {hasLeaderImage && (
        <button
          type="button"
          className={`see-leader-button leader-avatar-btn ${player.color}`}
          onClick={() => setIsLeaderImageOpen(true)}
          title="See Leader"
          aria-label={`View ${player.leader.name}`}
        >
          {leaderIconPath ? (
            <img src={leaderIconPath} alt="" className="see-leader-icon" draggable={false} />
          ) : (
            <span className="see-leader-icon-fallback" aria-hidden="true">
              {player.leader.name.charAt(0)}
            </span>
          )}
          <MagnifyingGlassIcon />
        </button>
      )}
      <button
        type="button"
        className="utility-action-button history-toolbar-button"
        onClick={onOpenPlayerOverview}
        title="View Player Overview"
        aria-label="View player overview and stats"
      >
        <PlayerOverviewIcon />
      </button>
      {!hideTurnHistoryToggle && (
        <button
          type="button"
          className="utility-action-button history-toolbar-button"
          onClick={onTurnHistoryToggle}
          title="View Turn History"
          aria-label="View turn history"
          aria-pressed={isTurnHistoryOpen}
        >
          <TurnHistoryIcon />
        </button>
      )}
      {showBoardPeekButton && onBoardPeekHoldChange && (
        <button
          type="button"
          className={[
            'utility-action-button',
            'history-toolbar-button',
            'board-peek-button',
            isBoardPeekActive ? 'board-peek-button--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title="Hold to view board"
          aria-label="Hold to hide panels and view board"
          aria-pressed={isBoardPeekActive}
          onPointerDown={e => {
            if (e.button !== 0) return
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            onBoardPeekHoldChange(true)
          }}
          onPointerUp={e => endBoardPeekHold(e.currentTarget, e.pointerId)}
          onPointerCancel={e => endBoardPeekHold(e.currentTarget, e.pointerId)}
          onLostPointerCapture={() => onBoardPeekHoldChange(false)}
        >
          <BoardPeekIcon />
        </button>
      )}
      <LeaderImageModal
        leader={player.leader}
        isOpen={isLeaderImageOpen}
        onClose={() => setIsLeaderImageOpen(false)}
      />
    </div>
  )
}

export default PlayFooterToolbar
