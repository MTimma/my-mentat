import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Card, Gain, IntrigueCard, Player, GameState, GamePhase, TurnType } from '../types/GameTypes'
import { findPlayerCardsByIds } from '../utils/playAreaDisplay'
import { BOARD_SPACES } from '../data/boardSpaces'
import { getLeaderIconPath } from '../data/leaders'
import {
  getGainsForHistoryRow,
  getGainsForTurnState,
  isCombatHistoryEntry,
  groupCombatHistoryGainsByPlayer,
  getOtherPlayersGainsForTurnState,
  getTroopsDeployedToConflict,
  getTroopsRetreatedFromConflict,
} from '../utils/turnGainsDisplay'
import {
  getHistoryRowBadge,
  getLivePlayerTurnNumber,
  getPlayerTurnNumber,
  isMetaHistoryEntry,
} from '../utils/turnHistoryDisplay'
import { resolveCardInSnapshot, resolveCardInSnapshotByName } from '../utils/revealTurnStats'
import { getRevealTurnStats, revealTurnStatsHasContent } from '../utils/revealTurnStats'
import RevealTurnStatsPanel from './RevealTurnStatsPanel/RevealTurnStatsPanel'
import TurnGainsDisplay from './TurnGainsDisplay/TurnGainsDisplay'
import './TurnHistory.css'

interface TurnHistoryProps {
  turns: GameState[]
  viewingTurnIndex: number | null
  players: Player[]
  currentGameState: GameState
  onTurnChange: (turnIndex: number) => void
  onReturnToCurrent: () => void
  onClose?: () => void
  /** Desktop: fixed sidebar column; mobile/tablet: overlay sheet */
  layout?: 'overlay' | 'docked'
  onUndo?: () => void
  canUndo?: boolean
  undoTitle?: string
  undoAriaLabel?: string
}

const DetailsIcon = () => (
  <svg className="turn-history-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <ellipse cx="12" cy="13.5" rx="5.5" ry="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    <path d="M7.5 10.5 5.5 6.5M16.5 10.5l2-2M9 8.5 8 4M15 8.5l1-4M6.5 14l-3 .5M17.5 14l3 .5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="9.75" cy="13" r="1" fill="currentColor" />
    <circle cx="14.25" cy="13" r="1" fill="currentColor" />
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

const TurnHistory: React.FC<TurnHistoryProps> = ({ 
  turns, 
  viewingTurnIndex,
  players, 
  currentGameState,
  onTurnChange, 
  onReturnToCurrent,
  onClose,
  layout = 'overlay',
  onUndo,
  canUndo = false,
  undoTitle,
  undoAriaLabel,
}) => {
  const isDocked = layout === 'docked'
  const [showDebugModal, setShowDebugModal] = useState(false)
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

  const makeResolveCard =
    (turn: GameState) =>
    (cardId: number, name: string): Card | undefined => {
      const playerId = turn.currTurn?.playerId ?? turn.activePlayerId
      if (playerId == null) return undefined
      return makeResolveCardForPlayer(turn, playerId)(cardId, name)
    }

  const makeResolveCardForPlayer =
    (turn: GameState, playerId: number) =>
    (cardId: number, name: string): Card | undefined =>
      resolveCardInSnapshot(turn, playerId, cardId) ??
      resolveCardInSnapshotByName(turn, playerId, name)

  const renderCombatGainsByPlayer = (turn: GameState, gains: Gain[]) => {
    const groups = groupCombatHistoryGainsByPlayer(gains)
    if (groups.length === 0) return null

    return (
      <div className="turn-history-combat-gains">
        {groups.map(({ playerId, gains: playerGains }) => {
          const player = turn.players.find(p => p.id === playerId) ?? players.find(p => p.id === playerId)
          return (
            <div key={`combat-gains-${playerId}`} className="turn-history-combat-player-gains">
              {renderPlayerBadge(player)}
              <TurnGainsDisplay
                gains={playerGains}
                showSourceTitles
                resolveCard={makeResolveCardForPlayer(turn, playerId)}
              />
            </div>
          )
        })}
      </div>
    )
  }

  const renderOtherPlayerGains = (turn: GameState) => {
    const groups = getOtherPlayersGainsForTurnState(turn)
    if (groups.length === 0) return null

    return (
      <div className="turn-history-other-gains">
        {groups.map(({ playerId, gains: otherGains }) => {
          const otherPlayer = turn.players.find(p => p.id === playerId) ?? players.find(p => p.id === playerId)
          return (
            <div key={`other-gains-${playerId}`} className="turn-history-other-player-gains">
              {renderPlayerBadge(otherPlayer)}
              <TurnGainsDisplay
                gains={otherGains}
                showSourceTitles
                inlineDiscards
                resolveCard={makeResolveCardForPlayer(turn, playerId)}
              />
            </div>
          )
        })}
      </div>
    )
  }

  const getHistoryRowTitle = (turn: GameState, index: number): string => {
    if (turn.historyEntryKind === 'combat') return 'Combat'
    if (turn.historyEntryKind === 'round-start') return `Round ${turn.currentRound} start`
    if (index === 0 || turn.historyEntryKind === 'setup') return 'Setup'
    return getTurnLabel(turn)
  }

  const getPlayedIntrigueForTurn = (turn: GameState): IntrigueCard[] => {
    if (isCombatHistoryEntry(turn)) return []
    const cardIds = turn.currTurn?.playedIntrigueCard?.map(entry => entry.cardId) ?? []
    if (cardIds.length === 0) return []
    const piles = [...(turn.intrigueDeck ?? []), ...(turn.intrigueDiscard ?? [])]
    const byId = new Map(piles.map(card => [card.id, card]))
    return cardIds.map(id => byId.get(id)).filter((card): card is IntrigueCard => card != null)
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

  const getTurnLabel = (turn: GameState): string => {
    if (turn.phase === GamePhase.COMBAT) return 'Combat'
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

  const renderIntrigueThumbs = (intrigueCards: IntrigueCard[]) => {
    if (intrigueCards.length === 0) return null
    return intrigueCards.map(card => (
      <span key={`intrigue-${card.id}`} className="turn-history-card-thumb turn-history-card-thumb--intrigue" title={card.name}>
        <img
          src={card.image}
          alt=""
          className="turn-history-card-thumb-img"
          draggable={false}
        />
      </span>
    ))
  }

  const effectiveViewIndex = viewingTurnIndex ?? turns.length
  const canGoToPreviousTurn = effectiveViewIndex > 0
  const canGoToNextTurn = viewingTurnIndex !== null && effectiveViewIndex < turns.length

  const goToPreviousTurn = useCallback(() => {
    if (!canGoToPreviousTurn) return
    onTurnChange(Math.max(0, effectiveViewIndex - 1))
  }, [canGoToPreviousTurn, effectiveViewIndex, onTurnChange])

  const goToNextTurn = useCallback(() => {
    if (!canGoToNextTurn) return
    if (effectiveViewIndex < turns.length) {
      onTurnChange(effectiveViewIndex + 1)
    } else {
      onReturnToCurrent()
    }
  }, [canGoToNextTurn, effectiveViewIndex, turns.length, onTurnChange, onReturnToCurrent])

  // Handle keyboard navigation (up/down and left/right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPreviousTurn()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        goToNextTurn()
        return
      }
      if (e.key === 'Escape') {
        if (isViewingHistory) {
          onReturnToCurrent()
        } else if (onClose) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isViewingHistory, onReturnToCurrent, goToPreviousTurn, goToNextTurn])

  // Handle clicking on a turn row
  const handleTurnClick = (index: number) => {
    if (index === turns.length) {
      // Clicking on "Current" pseudo-entry
      onReturnToCurrent()
    } else {
      onTurnChange(index)
    }
  }

  const getDockedHeaderTitle = (): string => {
    if (viewingTurnIndex === null) {
      return `Turn ${getLivePlayerTurnNumber(turns)}, round ${currentGameState.currentRound}`
    }
    const snapshot = turns[viewingTurnIndex]
    if (snapshot?.historyEntryKind === 'combat') return 'Combat'
    if (snapshot?.historyEntryKind === 'round-start') {
      return `Round ${snapshot.currentRound} start`
    }
    if (viewingTurnIndex === 0 || snapshot?.historyEntryKind === 'setup') return 'Setup'
    const round = snapshot?.currentRound ?? currentGameState.currentRound
    const turnNum = getPlayerTurnNumber(turns, viewingTurnIndex)
    return turnNum != null ? `Turn ${turnNum}, round ${round}` : `Turn ${viewingTurnIndex}, round ${round}`
  }

  const headerTitle = isDocked
    ? getDockedHeaderTitle()
    : isViewingHistory
      ? (() => {
          if (viewingTurnIndex === null) return `Turn ${getLivePlayerTurnNumber(turns)} (Current)`
          const snapshot = turns[viewingTurnIndex]
          if (snapshot?.historyEntryKind === 'combat') return 'Combat'
          if (snapshot?.historyEntryKind === 'round-start') {
            return `Round ${snapshot.currentRound} start`
          }
          if (viewingTurnIndex === 0 || snapshot?.historyEntryKind === 'setup') return 'Setup'
          const turnNum = getPlayerTurnNumber(turns, viewingTurnIndex)
          return turnNum != null ? `Turn ${turnNum}` : `Turn ${viewingTurnIndex}`
        })()
      : `Turn ${getLivePlayerTurnNumber(turns)} (Current)`

  const renderHeader = () => (
    <div className="turn-history-header">
      <div className="turn-history-nav" aria-label="Turn navigation">
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
      </div>
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
        {onUndo && (
          <button
            type="button"
            className="turn-history-icon-btn turn-history-icon-btn--undo"
            onClick={onUndo}
            disabled={!canUndo}
            title={undoTitle}
            aria-label={undoAriaLabel ?? undoTitle ?? 'Undo turn'}
          >
            <UndoIcon />
          </button>
        )}
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
  )

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
      <div className="turn-history-list" ref={listRef}>
        {turns.map((turn, index) => {
          const turnPlayer = getTurnPlayer(turn)
          const isCombatEntry = isCombatHistoryEntry(turn)
          const isMetaEntry = isMetaHistoryEntry(turn)
          const gains = getGainsForHistoryRow(turn)
          const otherPlayerGains = isCombatEntry ? [] : getOtherPlayersGainsForTurnState(turn)
          const playedIntrigue = getPlayedIntrigueForTurn(turn)
          const isViewing = viewingTurnIndex === index
          const revealStats =
            turn.currTurn?.type === TurnType.REVEAL && turn.currTurn.playerId != null
              ? getRevealTurnStats(turn, turn.currTurn.playerId)
              : null
          const isRevealTurn = turn.currTurn?.type === TurnType.REVEAL
          const showRevealSummary = revealStats != null && revealTurnStatsHasContent(revealStats)
          const troopsDeployed = getTroopsDeployedToConflict(turn)
          const troopsRetreated = getTroopsRetreatedFromConflict(turn)
          const showStandardGains =
            !isRevealTurn &&
            (gains.length > 0 || troopsDeployed > 0 || troopsRetreated > 0)
          const showRevealGains =
            isRevealTurn &&
            (showRevealSummary || gains.length > 0 || troopsDeployed > 0 || troopsRetreated > 0)
          
          return (
            <div
              key={index}
              data-turn-index={index}
              className={`turn-history-row ${isViewing ? 'viewing' : ''} ${isCombatEntry ? 'turn-history-row--combat' : ''}`}
              onClick={() => handleTurnClick(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleTurnClick(index)}
            >
              <div className="turn-history-row-header">
                <div className="turn-number">
                  {getHistoryRowBadge(turn, index, turns)}
                </div>
                {!isMetaEntry && renderPlayerBadge(turnPlayer)}
                {!isMetaEntry && renderTurnCardThumb(getPlayedCardForTurn(turn))}
                {renderIntrigueThumbs(playedIntrigue)}
                {!isMetaEntry && (
                  <span className="turn-label">{getHistoryRowTitle(turn, index)}</span>
                )}
                {isCombatEntry && (
                  <span className="turn-label turn-label--combat">Combat resolution</span>
                )}
                {turn.historyEntryKind === 'round-start' && (
                  <span className="turn-label">Round {turn.currentRound} start</span>
                )}
              </div>
              <div className="turn-history-row-body">
                {showStandardGains && (
                  <div className="turn-history-gains">
                    {isCombatEntry ? (
                      renderCombatGainsByPlayer(turn, gains)
                    ) : (
                      <TurnGainsDisplay
                        gains={gains}
                        resolveCard={makeResolveCard(turn)}
                        troopsDeployedToConflict={troopsDeployed}
                        troopsRetreatedFromConflict={troopsRetreated}
                      />
                    )}
                  </div>
                )}
                {otherPlayerGains.length > 0 && renderOtherPlayerGains(turn)}
                {showRevealGains && revealStats && (
                  <div className="turn-history-reveal-stats">
                    <RevealTurnStatsPanel
                      stats={revealStats}
                      gains={gains}
                      compact
                      resolveCard={makeResolveCard(turn)}
                      troopsDeployedToConflict={troopsDeployed}
                      troopsRetreatedFromConflict={troopsRetreated}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
        
        {/* Current turn pseudo-entry */}
        {(() => {
          const liveGains = getGainsForTurnState(currentGameState)
          const liveOtherPlayerGains = getOtherPlayersGainsForTurnState(currentGameState)
          const livePlayedIntrigue = getPlayedIntrigueForTurn(currentGameState)
          const liveRevealStats = currentGameState.currTurn?.type === TurnType.REVEAL
            ? getRevealTurnStats(currentGameState, currentGameState.currTurn.playerId)
            : null
          const liveIsRevealTurn = currentGameState.currTurn?.type === TurnType.REVEAL
          const liveShowRevealSummary =
            liveRevealStats != null && revealTurnStatsHasContent(liveRevealStats)
          const liveTroopsDeployed = getTroopsDeployedToConflict(currentGameState)
          const liveTroopsRetreated = getTroopsRetreatedFromConflict(currentGameState)
          const liveShowStandardGains =
            !liveIsRevealTurn &&
            (liveGains.length > 0 || liveTroopsDeployed > 0 || liveTroopsRetreated > 0)
          const liveShowRevealGains =
            liveIsRevealTurn &&
            (liveShowRevealSummary ||
              liveGains.length > 0 ||
              liveTroopsDeployed > 0 ||
              liveTroopsRetreated > 0)
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
          <div className="turn-history-row-header">
            <div className="turn-number">{getLivePlayerTurnNumber(turns)}</div>
            {renderPlayerBadge(
              players.find(p => p.id === currentGameState.activePlayerId)
            )}
            {currentGameState.phase !== GamePhase.COMBAT &&
              renderTurnCardThumb(getPlayedCardForTurn(currentGameState))}
            {currentGameState.phase !== GamePhase.COMBAT && renderIntrigueThumbs(livePlayedIntrigue)}
            {(currentGameState.phase === GamePhase.COMBAT || currentGameState.currTurn) && (
              <span className="turn-label">
                {getTurnLabel(currentGameState)}
              </span>
            )}
          </div>
          <div className="turn-history-row-body">
            {liveShowStandardGains && (
              <div className="turn-history-gains">
                <TurnGainsDisplay
                  gains={liveGains}
                  resolveCard={makeResolveCard(currentGameState)}
                  troopsDeployedToConflict={liveTroopsDeployed}
                  troopsRetreatedFromConflict={liveTroopsRetreated}
                />
              </div>
            )}
            {liveOtherPlayerGains.length > 0 && renderOtherPlayerGains(currentGameState)}
            {liveShowRevealGains && liveRevealStats && (
              <div className="turn-history-reveal-stats">
                <RevealTurnStatsPanel
                  stats={liveRevealStats}
                  gains={liveGains}
                  compact
                  resolveCard={makeResolveCard(currentGameState)}
                  troopsDeployedToConflict={liveTroopsDeployed}
                  troopsRetreatedFromConflict={liveTroopsRetreated}
                />
              </div>
            )}
          </div>
        </div>
          )
        })()}
      </div>

      {renderHeader()}

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

    </div>
  )
}

export default TurnHistory
