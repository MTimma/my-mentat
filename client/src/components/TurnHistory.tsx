import React, { useEffect, useState } from 'react'
import { Player, GameState, Gain, RewardType, TurnType } from '../types/GameTypes'
import { BOARD_SPACES } from '../data/boardSpaces'
import { getLeaderIconPath } from '../data/leaders'
import {
  factionFromInfluenceGainName,
  getAnyFactionInfluenceGainIcon,
  getAnyFactionInfluenceLossIcon,
  getFactionBumpIcon,
} from '../utils/influenceDisplay'
import { getRewardIcon, getRewardDisplayName } from '../utils/rewardIcons'
import { getRevealTurnStats } from '../utils/revealTurnStats'
import RevealTurnStatsPanel from './RevealTurnStatsPanel/RevealTurnStatsPanel'
import UndoConfirmDialog from './TimeTravel/UndoConfirmDialog'
import './TurnHistory.css'

interface TurnHistoryProps {
  turns: GameState[]
  viewingTurnIndex: number | null
  players: Player[]
  currentGameState: GameState
  onTurnChange: (turnIndex: number) => void
  onReturnToCurrent: () => void
  onUndoToTurn: (turnIndex: number) => void
  onClose?: () => void
  /** Desktop: fixed sidebar column; mobile/tablet: overlay sheet */
  layout?: 'overlay' | 'docked'
}

interface AggregatedResourceGain {
  type: RewardType | string
  amount: number
  name?: string
}

const DetailsIcon = () => (
  <svg className="turn-history-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <ellipse cx="12" cy="13.5" rx="5.5" ry="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    <path d="M7.5 10.5 5.5 6.5M16.5 10.5l2-2M9 8.5 8 4M15 8.5l1-4M6.5 14l-3 .5M17.5 14l3 .5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="9.75" cy="13" r="1" fill="currentColor" />
    <circle cx="14.25" cy="13" r="1" fill="currentColor" />
  </svg>
)

const UndoIcon = () => (
  <svg className="turn-history-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 5a7 7 0 1 1 0 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 5H5v3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const TurnHistory: React.FC<TurnHistoryProps> = ({ 
  turns, 
  viewingTurnIndex,
  players, 
  currentGameState,
  onTurnChange, 
  onReturnToCurrent,
  onUndoToTurn,
  onClose,
  layout = 'overlay',
}) => {
  const isDocked = layout === 'docked'
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [undoTargetIndex, setUndoTargetIndex] = useState<number | null>(null)

  // Determine which turn is being viewed (null means current/live)
  const isViewingHistory = viewingTurnIndex !== null

  const getTurnPlayer = (turn: GameState): Player | undefined => {
    const playerId = turn.currTurn?.playerId
    if (playerId == null) return undefined
    return players.find(p => p.id === playerId)
  }

  const getTurnLabel = (turn: GameState, index: number): string => {
    if (index === 0) return 'Setup'
    const curr = turn.currTurn
    if (!curr) return '—'
    if (curr.type === TurnType.ACTION) {
      const spaceId = curr.agentSpaceId
      if (spaceId != null) {
        const space = BOARD_SPACES.find(s => s.id === spaceId)
        if (space) return space.name
      }
      return 'Agent'
    }
    if (curr.type === TurnType.REVEAL) return 'Reveal'
    if (curr.type === TurnType.PASS) return 'Pass'
    return curr.type
  }

  // Gains for a turn snapshot or the live in-progress turn (gameState.gains until END_TURN).
  const getGainsForTurn = (turn: GameState): Gain[] => {
    const playerId = turn.currTurn?.playerId ?? turn.activePlayerId
    if (playerId == null) return []
    return turn.gains?.filter(gain => gain.playerId === playerId) || []
  }

  const aggregateResourceGains = (gains: Gain[]): AggregatedResourceGain[] => {
    const aggregated = new Map<string, AggregatedResourceGain>()

    gains.forEach(gain => {
      if (gain.type === RewardType.INFLUENCE || gain.amount === 0) return
      const key = gain.type === RewardType.CARD ? `card:${gain.name}` : gain.type
      const existing = aggregated.get(key)
      if (existing) {
        existing.amount += gain.amount
      } else {
        aggregated.set(key, {
          type: gain.type,
          amount: gain.amount,
          name: gain.type === RewardType.CARD ? gain.name : undefined,
        })
      }
    })

    return Array.from(aggregated.values()).filter(g => g.amount !== 0)
  }

  const aggregateInfluenceGains = (gains: Gain[]): Array<{ name: string; amount: number }> => {
    const aggregated = new Map<string, number>()
    gains.forEach(gain => {
      if (gain.type !== RewardType.INFLUENCE || gain.amount === 0) return
      aggregated.set(gain.name, (aggregated.get(gain.name) ?? 0) + gain.amount)
    })
    return Array.from(aggregated.entries())
      .map(([name, amount]) => ({ name, amount }))
      .filter(g => g.amount !== 0)
  }

  const renderPlayerBadge = (player: Player | undefined) => {
    const color = player?.color ?? 'gray'
    const leaderName = player?.leader.name ?? 'Player'
    const iconPath = player ? getLeaderIconPath(player.leader.name) : undefined

    return (
      <span
        className={`turn-history-player-badge leader-avatar-btn ${color}`}
        title={leaderName}
        aria-hidden="true"
      >
        {iconPath ? (
          <img src={iconPath} alt="" className="turn-history-player-icon" draggable={false} />
        ) : (
          <span className="turn-history-player-icon-fallback">{leaderName.charAt(0)}</span>
        )}
      </span>
    )
  }

  const renderGainMultiplier = (amount: number) => {
    const absAmount = Math.abs(amount)
    if (absAmount < 2) return null
    return <span className="gain-multiplier">×{absAmount}</span>
  }

  const renderResourceGain = (gain: AggregatedResourceGain, index: number) => {
    const rewardType = gain.type as RewardType
    const iconPath = getRewardIcon(rewardType)
    const displayName = getRewardDisplayName(rewardType, gain.name)
    const isNegative = gain.amount < 0
    const absAmount = Math.abs(gain.amount)
    const ariaLabel =
      absAmount === 1
        ? `${isNegative ? 'Lost' : 'Gained'} 1 ${displayName}`
        : `${isNegative ? 'Lost' : 'Gained'} ${absAmount} ${displayName}`

    return (
      <div
        key={`res-${index}`}
        className={`gain-item ${isNegative ? 'negative' : 'positive'}`}
        aria-label={ariaLabel}
      >
        {rewardType === RewardType.PERSUASION ? (
          <span className="gain-persuasion-diamond" title={displayName} aria-hidden="true" />
        ) : iconPath ? (
          <img
            src={iconPath}
            alt=""
            className="gain-icon"
            aria-hidden="true"
            onError={e => {
              e.currentTarget.style.display = 'none'
              const textSpan = document.createElement('span')
              textSpan.className = 'gain-text-fallback'
              textSpan.textContent = displayName
              e.currentTarget.parentElement?.appendChild(textSpan)
            }}
          />
        ) : (
          <span className="gain-text-fallback">{displayName}</span>
        )}
        {renderGainMultiplier(gain.amount)}
      </div>
    )
  }

  const renderInfluenceGain = (name: string, amount: number, index: number) => {
    const isNegative = amount < 0
    const absAmount = Math.abs(amount)
    const faction = factionFromInfluenceGainName(name)
    const iconPath = isNegative
      ? faction
        ? `/icon/${faction}.png`
        : getAnyFactionInfluenceLossIcon()
      : faction
        ? getFactionBumpIcon(faction)
        : getAnyFactionInfluenceGainIcon(absAmount)

    return (
      <div
        key={`inf-${index}`}
        className={`gain-item ${isNegative ? 'negative' : 'positive'}`}
        aria-label={
          absAmount === 1
            ? `${isNegative ? 'Lost' : 'Gained'} 1 influence`
            : `${isNegative ? 'Lost' : 'Gained'} ${absAmount} influence`
        }
      >
        <img src={iconPath} alt="" className="gain-icon gain-icon--influence" aria-hidden="true" />
        {renderGainMultiplier(amount)}
      </div>
    )
  }

  const renderTurnGains = (gains: Gain[]) => {
    const resourceGains = aggregateResourceGains(gains)
    const influenceGains = aggregateInfluenceGains(gains)
    return (
      <>
        {resourceGains.map((gain, idx) => renderResourceGain(gain, idx))}
        {influenceGains.map((gain, idx) => renderInfluenceGain(gain.name, gain.amount, idx))}
      </>
    )
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isViewingHistory) {
          onReturnToCurrent()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isViewingHistory, onReturnToCurrent])

  // Handle clicking on a turn row
  const handleTurnClick = (index: number) => {
    if (index === turns.length) {
      // Clicking on "Current" pseudo-entry
      onReturnToCurrent()
    } else {
      onTurnChange(index)
    }
  }

  // Handle undo button click
  const handleUndoClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setUndoTargetIndex(index)
  }

  // Confirm undo
  const handleUndoConfirm = () => {
    if (undoTargetIndex !== null) {
      onUndoToTurn(undoTargetIndex)
      setUndoTargetIndex(null)
    }
  }

  // Get target state for undo dialog
  const getUndoTargetState = (): GameState | null => {
    if (undoTargetIndex === null) return null
    if (undoTargetIndex >= 0 && undoTargetIndex < turns.length) {
      return turns[undoTargetIndex]
    }
    return null
  }

  return (
    <div
      id="turn-history-overlay"
      className={[
        'turn-history-overlay',
        isDocked ? 'turn-history-overlay--docked' : '',
        isViewingHistory ? 'viewing-history' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={isDocked ? 'complementary' : 'dialog'}
      aria-modal={isDocked ? undefined : true}
      aria-label="Turn history"
    >
      <div className="turn-history-header">
        <span className="turn-history-header-title">
          {isViewingHistory
            ? viewingTurnIndex === 0
              ? 'Initial State'
              : `Turn ${viewingTurnIndex}`
            : `Turn ${turns.length} (Current)`}
        </span>
        <div className="turn-history-header-actions">
          <button
            type="button"
            className="turn-history-icon-btn turn-history-icon-btn--details"
            onClick={() => setShowDebugModal(true)}
            title="View full game state (includes turn history)"
            aria-label="View full game state debug"
          >
            <DetailsIcon />
          </button>
          {isViewingHistory && (
            <button
              type="button"
              className="turn-history-header-live-btn"
              onClick={onReturnToCurrent}
            >
              Live
            </button>
          )}
        </div>
      </div>

      <div className="turn-history-list">
        {turns.map((turn, index) => {
          const turnPlayer = getTurnPlayer(turn)
          const gains = getGainsForTurn(turn)
          const isViewing = viewingTurnIndex === index
          const revealStats =
            turn.currTurn?.type === TurnType.REVEAL && turn.currTurn.playerId != null
              ? getRevealTurnStats(turn, turn.currTurn.playerId)
              : null
          
          return (
            <div 
              key={index} 
              className={`turn-history-row ${isViewing ? 'viewing' : ''}`}
              onClick={() => handleTurnClick(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleTurnClick(index)}
            >
              <div className="turn-history-row-top">
                <div className="turn-number">
                  {index === 0 ? 'Initial' : index}
                </div>
                {renderPlayerBadge(turnPlayer)}
                <div className="turn-summary">
                  <span className="turn-label">{getTurnLabel(turn, index)}</span>
                </div>
                <div className="turn-actions">
                  <button
                    type="button"
                    className="turn-history-icon-btn turn-history-icon-btn--undo"
                    onClick={(e) => handleUndoClick(index, e)}
                    title={index === 0 ? 'Reset to initial state' : `Undo to turn ${index}`}
                    aria-label={index === 0 ? 'Reset to initial state' : `Undo to turn ${index}`}
                  >
                    <UndoIcon />
                  </button>
                </div>
              </div>
              {gains.length > 0 && (
                <div className="turn-history-gains" onClick={e => e.stopPropagation()}>
                  {renderTurnGains(gains)}
                </div>
              )}
              {revealStats && (
                <div className="turn-history-reveal-stats" onClick={e => e.stopPropagation()}>
                  <RevealTurnStatsPanel stats={revealStats} compact />
                </div>
              )}
            </div>
          )
        })}
        
        {/* Current turn pseudo-entry */}
        {(() => {
          const liveGains = getGainsForTurn(currentGameState)
          const liveRevealStats = currentGameState.currTurn?.type === TurnType.REVEAL
            ? getRevealTurnStats(currentGameState, currentGameState.currTurn.playerId)
            : null
          return (
        <div 
          className={`turn-history-row current-turn-entry ${!isViewingHistory ? 'viewing' : ''}`}
          onClick={() => onReturnToCurrent()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onReturnToCurrent()}
        >
          <div className="turn-history-row-top">
            <div className="turn-number">{turns.length}</div>
            {renderPlayerBadge(players.find(p => p.id === currentGameState.activePlayerId))}
            <div className="turn-summary">
              {currentGameState.currTurn && (
                <span className="turn-label">
                  {getTurnLabel(currentGameState, turns.length)}
                </span>
              )}
            </div>
          </div>
          {liveGains.length > 0 && (
            <div className="turn-history-gains" onClick={e => e.stopPropagation()}>
              {renderTurnGains(liveGains)}
            </div>
          )}
          {liveRevealStats && (
            <div className="turn-history-reveal-stats" onClick={e => e.stopPropagation()}>
              <RevealTurnStatsPanel stats={liveRevealStats} compact />
            </div>
          )}
        </div>
          )
        })()}
      </div>

      {!isDocked && onClose && (
        <div className="turn-history-footer">
          <button
            type="button"
            className="turn-history-return-button"
            onClick={() => onClose()}
            aria-label="Return to game"
          >
            Return
          </button>
        </div>
      )}

      {/* Full game state debug (live snapshot includes history[]) */}
      {showDebugModal && (
        <div className="turn-details-modal">
          <div className="turn-details-content">
            <h3>Game state</h3>
            <pre>{JSON.stringify(currentGameState, null, 2)}</pre>
            <button type="button" className="close-button" onClick={() => setShowDebugModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Undo Confirmation Dialog */}
      <UndoConfirmDialog
        isOpen={undoTargetIndex !== null}
        targetTurnIndex={undoTargetIndex ?? 0}
        currentHistoryLength={turns.length}
        targetState={getUndoTargetState()}
        currentState={currentGameState}
        players={players}
        onConfirm={handleUndoConfirm}
        onCancel={() => setUndoTargetIndex(null)}
      />
    </div>
  )
}

export default TurnHistory
