import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Card, Player, GameState, Gain, RewardType, TurnType } from '../types/GameTypes'
import { findPlayerCardsByIds } from '../utils/playAreaDisplay'
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
  <svg
    className="turn-history-action-icon turn-history-action-icon--undo"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
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
  const listRef = useRef<HTMLDivElement>(null)
  const liveEntryRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const prevTurnsLengthRef = useRef(turns.length)

  // Determine which turn is being viewed (null means current/live)
  const isViewingHistory = viewingTurnIndex !== null

  const scrollListToBottom = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const apply = () => {
      list.scrollTop = list.scrollHeight
    }
    apply()
    requestAnimationFrame(apply)
  }, [])

  const scrollTurnIntoView = useCallback(
    (turnIndex: number | 'live') => {
      const scrollEl =
        turnIndex === 'live'
          ? liveEntryRef.current
          : listRef.current?.querySelector<HTMLElement>(`[data-turn-index="${turnIndex}"]`)
      if (scrollEl) {
        scrollEl.scrollIntoView({ block: 'nearest', behavior: 'auto' })
        requestAnimationFrame(() => {
          scrollEl.scrollIntoView({ block: 'nearest', behavior: 'auto' })
        })
        return
      }
      scrollListToBottom()
    },
    [scrollListToBottom]
  )

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const onScroll = () => {
      const distFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight
      stickToBottomRef.current = distFromBottom < 40
    }
    list.addEventListener('scroll', onScroll, { passive: true })
    return () => list.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isViewingHistory) {
      stickToBottomRef.current = true
    }
  }, [isViewingHistory])

  const liveTurnSignature = [
    currentGameState.currTurn?.type,
    currentGameState.currTurn?.playerId,
    currentGameState.currTurn?.agentSpaceId,
    currentGameState.gains?.length,
  ].join(':')

  useLayoutEffect(() => {
    if (turns.length > prevTurnsLengthRef.current) {
      stickToBottomRef.current = true
      scrollListToBottom()
    }
    prevTurnsLengthRef.current = turns.length
  }, [turns.length, scrollListToBottom])

  useLayoutEffect(() => {
    if (isViewingHistory) {
      if (viewingTurnIndex !== null) {
        scrollTurnIntoView(viewingTurnIndex)
      }
      return
    }
    if (stickToBottomRef.current) {
      scrollTurnIntoView('live')
    }
  }, [
    isViewingHistory,
    viewingTurnIndex,
    liveTurnSignature,
    scrollTurnIntoView,
    scrollListToBottom,
  ])

  const getTurnPlayer = (turn: GameState): Player | undefined => {
    const playerId = turn.currTurn?.playerId
    if (playerId == null) return undefined
    return players.find(p => p.id === playerId)
  }

  const getPlayedCardForTurn = (turn: GameState): Card | null => {
    const curr = turn.currTurn
    if (!curr?.cardId || curr.type !== TurnType.ACTION) return null
    const player = turn.players.find(p => p.id === curr.playerId)
    if (!player) return null
    const [card] = findPlayerCardsByIds(player, [curr.cardId])
    return card ?? null
  }

  const renderTurnCardThumb = (card: Card | null) => {
    if (!card?.image) return null
    return (
      <span className="turn-history-card-thumb" title={card.name}>
        <img
          src={card.image}
          alt=""
          className="turn-history-card-thumb-img"
          draggable={false}
        />
      </span>
    )
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

  const getResourceIconCountVariant = (type: RewardType): 'light' | 'dark' | null => {
    switch (type) {
      case RewardType.SPICE:
        return 'light'
      case RewardType.SOLARI:
        return 'dark'
      default:
        return null
    }
  }

  /** Troops, draws, and water show one icon per unit (not ×N or a count badge). */
  const shouldShowRepeatedIcons = (type: RewardType, amount: number): boolean => {
    if (Math.abs(amount) < 2) return false
    return (
      type === RewardType.TROOPS ||
      type === RewardType.CARD ||
      type === RewardType.DRAW ||
      type === RewardType.WATER
    )
  }

  const renderGainMultiplier = (amount: number) => {
    const absAmount = Math.abs(amount)
    if (absAmount < 2) return null
    return <span className="gain-multiplier">×{absAmount}</span>
  }

  const renderGainIcon = (iconPath: string, displayName: string, className = 'gain-icon') => (
    <img
      src={iconPath}
      alt=""
      className={className}
      aria-hidden="true"
      onError={e => {
        e.currentTarget.style.display = 'none'
        const parent = e.currentTarget.parentElement
        if (!parent || parent.querySelector('.gain-text-fallback')) return
        const textSpan = document.createElement('span')
        textSpan.className = 'gain-text-fallback'
        textSpan.textContent = displayName
        parent.appendChild(textSpan)
      }}
    />
  )

  const renderResourceIconWithCount = (
    iconPath: string,
    amount: number,
    variant: 'light' | 'dark',
    displayName: string
  ) => {
    const absAmount = Math.abs(amount)
    return (
      <span className="gain-icon-badge" title={displayName} aria-hidden="true">
        {renderGainIcon(iconPath, displayName, 'gain-icon gain-icon--badge')}
        <span className={`gain-icon-count gain-icon-count--${variant}`}>{absAmount}</span>
      </span>
    )
  }

  const renderResourceGain = (gain: AggregatedResourceGain, index: number) => {
    const rewardType = gain.type as RewardType
    const iconPath = getRewardIcon(rewardType)
    const displayName = getRewardDisplayName(rewardType, gain.name)
    const isNegative = gain.amount < 0
    const absAmount = Math.abs(gain.amount)
    const iconCountVariant = getResourceIconCountVariant(rewardType)
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
          <span className="gain-persuasion-badge" title={displayName} aria-hidden="true">
            <span className="gain-persuasion-diamond" />
            <span className="gain-persuasion-count">{absAmount}</span>
          </span>
        ) : iconPath && shouldShowRepeatedIcons(rewardType, gain.amount) ? (
          Array.from({ length: absAmount }, (_, i) => (
            <React.Fragment key={i}>{renderGainIcon(iconPath, displayName)}</React.Fragment>
          ))
        ) : iconPath && iconCountVariant ? (
          renderResourceIconWithCount(iconPath, gain.amount, iconCountVariant, displayName)
        ) : iconPath ? (
          <>
            {renderGainIcon(iconPath, displayName)}
            {renderGainMultiplier(gain.amount)}
          </>
        ) : (
          <span className="gain-text-fallback">{displayName}</span>
        )}
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

  const getDockedHeaderTitle = (): string => {
    if (viewingTurnIndex === 0) return 'Initial state'
    if (viewingTurnIndex === null) {
      return `Turn ${turns.length}, round ${currentGameState.currentRound}`
    }
    const snapshot = turns[viewingTurnIndex]
    const round = snapshot?.currentRound ?? currentGameState.currentRound
    return `Turn ${viewingTurnIndex}, round ${round}`
  }

  const headerTitle = isDocked
    ? getDockedHeaderTitle()
    : isViewingHistory
      ? viewingTurnIndex === 0
        ? 'Initial State'
        : `Turn ${viewingTurnIndex}`
      : `Turn ${turns.length} (Current)`

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
        <span
          className={[
            'turn-history-header-title',
            isDocked ? 'turn-history-header-title--turn-round' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {headerTitle}
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
          {isViewingHistory && !isDocked && (
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

      <div className="turn-history-list" ref={listRef}>
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
              data-turn-index={index}
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
                <div className="turn-history-main">
                  <div className="turn-history-summary-line">
                    {renderPlayerBadge(turnPlayer)}
                    {renderTurnCardThumb(getPlayedCardForTurn(turn))}
                    <span className="turn-label">{getTurnLabel(turn, index)}</span>
                  </div>
                  {gains.length > 0 && (
                    <div className="turn-history-gains" onClick={e => e.stopPropagation()}>
                      {renderTurnGains(gains)}
                    </div>
                  )}
                  {revealStats && revealStats.acquiredCards.length > 0 && (
                    <div className="turn-history-reveal-stats" onClick={e => e.stopPropagation()}>
                      <RevealTurnStatsPanel stats={revealStats} compact />
                    </div>
                  )}
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
          ref={liveEntryRef}
          data-turn-index="live"
          className={`turn-history-row current-turn-entry ${!isViewingHistory ? 'viewing' : ''}`}
          onClick={() => onReturnToCurrent()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onReturnToCurrent()}
        >
          <div className="turn-history-row-top">
            <div className="turn-number">{turns.length}</div>
            <div className="turn-history-main">
              <div className="turn-history-summary-line">
                {renderPlayerBadge(
                  players.find(p => p.id === currentGameState.activePlayerId)
                )}
                {renderTurnCardThumb(getPlayedCardForTurn(currentGameState))}
                {currentGameState.currTurn && (
                  <span className="turn-label">
                    {getTurnLabel(currentGameState, turns.length)}
                  </span>
                )}
              </div>
              {liveGains.length > 0 && (
                <div className="turn-history-gains" onClick={e => e.stopPropagation()}>
                  {renderTurnGains(liveGains)}
                </div>
              )}
              {liveRevealStats && liveRevealStats.acquiredCards.length > 0 && (
                <div className="turn-history-reveal-stats" onClick={e => e.stopPropagation()}>
                  <RevealTurnStatsPanel stats={liveRevealStats} compact />
                </div>
              )}
            </div>
          </div>
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
