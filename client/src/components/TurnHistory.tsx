import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Card, Gain, IntrigueCard, Player, GameState, GamePhase, TurnType, AcquiredTechTileSnapshot } from '../types/GameTypes'
import { getLeaderIconPath } from '../data/leaders'
import { conflictCardImageSrc } from '../data/conflictCardImages'
import {
  computeTurnGainTotals,
  excludeAcquiredGainsFromDisplay,
  getGainsForHistoryRow,
  getGainsForTurnState,
  isCombatHistoryEntry,
  isEndgameHistoryEntry,
  groupCombatHistoryGainsByPlayer,
  getOtherPlayersGainsForTurnState,
  getTroopsDeployedToConflict,
  getTroopsRetreatedFromConflict,
} from '../utils/turnGainsDisplay'
import {
  getHistoryRowBadge,
  getLivePlayerTurnNumber,
  getPlayerTurnNumber,
  getRoundStartLabel,
  getTurnActionLabel,
  isMetaHistoryEntry,
  isRoundStartHistoryEntry,
} from '../utils/turnHistoryDisplay'
import {
  hasEndgameRowContent,
  isLiveEndgameEntry,
  mergeEndgameHistoryRow,
  shouldHideLiveHistoryEntry,
} from '../utils/endgameHistoryDisplay'
import {
  getAcquiredCardsForTurn,
  getAcquiredTechTilesForTurn,
  getRevealTurnStats,
  resolveCardInSnapshot,
  resolveCardInSnapshotByName,
  resolvePlayedCardsForTurn,
  revealTurnStatsHasContent,
} from '../utils/revealTurnStats'
import RevealTurnStatsPanel from './RevealTurnStatsPanel/RevealTurnStatsPanel'
import { withImageZoomHint } from './AltImagePreview/imageZoomHint'
import {
  cyclePlayChromeTheme,
  getPlayChromeTheme,
  PLAY_CHROME_THEME_LABELS,
  type PlayChromeTheme,
} from '../utils/playChromeTheme'
import SetupSnapshotPreview from './SetupSnapshotPreview/SetupSnapshotPreview'
import TurnGainsDisplay from './TurnGainsDisplay/TurnGainsDisplay'
import { type LoadSaveFn } from '../api/gamesApi'
import TurnHistoryNav from './TurnHistoryNav/TurnHistoryNav'
import { TurnHistoryUndoButton } from './TurnHistoryUndoButton'
import { TurnHistoryDebugButton } from './TurnHistoryDebugButton'
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
  onOpenPlayerOverview?: () => void
  /** Rendered at the top of the panel (e.g. sandbox setup controls). */
  topSlot?: React.ReactNode
  /** Replace the current session with a loaded SaveDoc (in-game debug load). */
  onLoadSave?: LoadSaveFn
  hideLiveTurn?: boolean
}

const PlayerOverviewIcon = () => (
  <svg className="turn-history-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="7.25" cy="7.25" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
    <path d="M3.75 13.25c.6-1.85 1.85-2.75 3.5-2.75s2.9.9 3.5 2.75" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="15.75" cy="6.75" r="1.85" fill="none" stroke="currentColor" strokeWidth="1.75" />
    <path d="M12.85 11.75c.5-1.35 1.5-2 2.9-2s2.4.65 2.9 2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M5 20v-3.25M11 20v-5.25M17 20v-7.25M3.5 20h16.75" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
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
  onOpenPlayerOverview,
  topSlot,
  onLoadSave,
  hideLiveTurn = false,
}) => {
  const isDocked = layout === 'docked'
  /** Birds-eye: history list gains collapsed by default (dock seats show gains). */
  const [showHistoryGains, setShowHistoryGains] = useState(false)
  const [playChromeTheme, setPlayChromeTheme] = useState<PlayChromeTheme>(() => getPlayChromeTheme())
  const listRef = useRef<HTMLDivElement>(null)
  const liveEntryRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const prevIsViewingHistoryRef = useRef(false)
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
      prevIsViewingHistoryRef.current = true
      return
    }

    const returnedToLive = prevIsViewingHistoryRef.current
    prevIsViewingHistoryRef.current = false

    if (returnedToLive) {
      stickToBottomRef.current = true
      scrollTurnIntoView('live')
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

  const makeResolveCard =
    (turn: GameState) =>
    (cardId: number, name: string): Card | undefined => {
      const playerId = turn.currTurn?.playerId ?? turn.activePlayerId
      if (playerId == null) return undefined
      return makeResolveCardForPlayer(turn, playerId)(cardId, name)
    }

  const makeResolveCardForPlayer =
    (turn: GameState, playerId: number) =>
    (cardId: number, name: string): Card | undefined => {
      const byName = name ? resolveCardInSnapshotByName(turn, playerId, name) : undefined
      const byId = resolveCardInSnapshot(turn, playerId, cardId)
      return byId ?? byName
    }

  const renderEndgameRevealsByPlayer = (turn: GameState) => {
    const revealed = turn.endgameRevealedIntrigue
    if (!revealed) return null
    const playerIds = Object.keys(revealed)
      .map(Number)
      .sort((a, b) => a - b)
    if (playerIds.length === 0) return null

    return (
      <div className="turn-history-endgame-reveals">
        {playerIds.map(playerId => {
          const cards = revealed[playerId] ?? []
          if (cards.length === 0) return null
          const player = turn.players.find(p => p.id === playerId) ?? players.find(p => p.id === playerId)
          return (
            <div key={`endgame-reveal-${playerId}`} className="turn-history-endgame-player-reveal">
              {renderPlayerBadge(player)}
              {renderIntrigueInline(cards)}
            </div>
          )
        })}
      </div>
    )
  }

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
                playerId={playerId}
                playerColor={player?.color}
                showSourceTitles
                inlineTrash
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
                playerId={playerId}
                playerColor={otherPlayer?.color}
                showSourceTitles
                inlineDiscards
                inlineTrash
                resolveCard={makeResolveCardForPlayer(turn, playerId)}
              />
            </div>
          )
        })}
      </div>
    )
  }

  const getHistoryRowTitle = (turn: GameState, index: number): string => {
    if (turn.historyEntryKind === 'endgame') return 'Endgame'
    if (turn.historyEntryKind === 'combat') return 'Combat'
    if (isRoundStartHistoryEntry(turn)) return getRoundStartLabel(turn)
    if (index === 0 || turn.historyEntryKind === 'setup') return 'Setup'
    return getTurnActionLabel(turn)
  }

  const getPlayedIntrigueForTurn = (turn: GameState): IntrigueCard[] => {
    if (isCombatHistoryEntry(turn)) return []
    const cardIds = turn.currTurn?.playedIntrigueCard?.map(entry => entry.cardId) ?? []
    if (cardIds.length === 0) return []
    const piles = [...(turn.intrigueDeck ?? []), ...(turn.intrigueDiscard ?? [])]
    const byId = new Map(piles.map(card => [card.id, card]))
    return cardIds.map(id => byId.get(id)).filter((card): card is IntrigueCard => card != null)
  }

  const renderTurnCardThumb = (card: Card | null, primary = false) => {
    if (!card) return null
    return (
      <span
        className={[
          'turn-history-card-thumb',
          primary ? 'turn-history-card-thumb--primary' : '',
          !card.image ? 'turn-history-card-thumb--fallback' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={card.image ? withImageZoomHint(card.name) : card.name}
      >
        {card.image ? (
          <img
            src={card.image}
            alt=""
            className="turn-history-card-thumb-img"
            draggable={false}
            data-preview-src={card.image}
          />
        ) : (
          <span className="turn-history-card-thumb-fallback">{card.name}</span>
        )}
      </span>
    )
  }

  // const renderRevealCardsInline = (turn: GameState) => {
  //   if (turn.currTurn?.type !== TurnType.REVEAL || turn.currTurn.playerId == null) return null
  //   const stats = getRevealTurnStats(turn, turn.currTurn.playerId)
  //   if (!stats?.revealedCards.length) return null
  //   return (
  //     <div className="turn-history-reveal-cards turn-history-reveal-cards--inline" aria-label="Revealed cards">
  //       {stats.revealedCards.map(card => (
  //         <React.Fragment key={`reveal-thumb-${card.id}`}>
  //           {renderTurnCardThumb(card, true)}
  //         </React.Fragment>
  //       ))}
  //     </div>
  //   )
  // }

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
      <span key={`intrigue-${card.id}`} className="turn-history-card-thumb turn-history-card-thumb--intrigue" title={withImageZoomHint(card.name)}>
        <img
          src={card.image}
          alt=""
          className="turn-history-card-thumb-img"
          draggable={false}
          data-preview-src={card.image}
        />
      </span>
    ))
  }

  const renderIntrigueInline = (intrigueCards: IntrigueCard[]) => {
    if (intrigueCards.length === 0) return null
    return (
      <div className="turn-history-intrigue-inline" aria-label="Intrigue played this turn">
        {renderIntrigueThumbs(intrigueCards)}
      </div>
    )
  }

  const renderTurnNumber = (badge: React.ReactNode) => (
    <div className="turn-number">{badge}</div>
  )

  const renderAgentActionBand = (
    turn: GameState,
    destinationLabel: string,
    _intrigueCards: IntrigueCard[]
  ) => {
    const playedCards = resolvePlayedCardsForTurn(turn)
    const playedLabel = playedCards.map(c => c.name).join(' + ') || 'card'
    return (
      <div className="turn-history-action-band">
        <div className="turn-history-action-flow" aria-label={`Played ${playedLabel} at ${destinationLabel}`}>
          {playedCards.map(card => (
            // <React.Fragment key={`played-${card.id}`}>
            //   {/* {renderTurnCardThumb(card, true)} */}
              
            // </React.Fragment>
            <span className="turn-history-action-destination">{card.name}</span>
          ))}
          <span className="turn-history-action-arrow" aria-hidden="true">
            →
          </span>
          <span className="turn-history-action-destination">{destinationLabel}</span>
        </div>
        {/* {renderIntrigueInline(_intrigueCards)} */}
      </div>
    )
  }

  const renderRevealActionBand = (turn: GameState) => (
    <div className="turn-history-action-band turn-history-action-band--reveal">
      <span className="turn-history-action-kind">Reveal</span>
      {/* {renderRevealCardsInline(turn)} */}
    </div>
  )

  const renderStandardGainsBlock = (
    turn: GameState,
    options: {
      groupGainsByPlayer: boolean
      gains: Gain[]
      gainsForDisplay: Gain[]
      troopsDeployed: number
      troopsRetreated: number
      acquiredCards: Card[]
      acquiredTechTiles: AcquiredTechTileSnapshot[]
    }
  ) => {
    const {
      groupGainsByPlayer,
      gains,
      gainsForDisplay,
      troopsDeployed,
      troopsRetreated,
      acquiredCards,
      acquiredTechTiles,
    } = options
    const hasAcquired = acquiredCards.length > 0 || acquiredTechTiles.length > 0
    return (
      <div className="turn-history-gains">
        {groupGainsByPlayer ? (
          renderCombatGainsByPlayer(turn, gains)
        ) : (
          <>
            <TurnGainsDisplay
              gains={gainsForDisplay}
              playerId={turn.currPlayer}
              playerColor={
                (turn.players.find(p => p.id === turn.currPlayer) ??
                  players.find(p => p.id === turn.currPlayer))?.color
              }
              resolveCard={makeResolveCard(turn)}
              troopsDeployedToConflict={troopsDeployed}
              troopsRetreatedFromConflict={troopsRetreated}
              showSourceTitles
              inlineTrash
            />
            {hasAcquired && (
              <RevealTurnStatsPanel
                stats={{
                  revealedCards: [],
                  acquiredCards,
                  acquiredTechTiles,
                  totals: computeTurnGainTotals(gains),
                }}
                gains={gains}
                compact
                acquiredOnly
                hideAcquiredNames
                resolveCard={makeResolveCard(turn)}
              />
            )}
          </>
        )}
      </div>
    )
  }

  interface PlayerTurnRowContentProps {
    turn: GameState
    turnPlayer: Player | undefined
    badge: React.ReactNode
    isCombatEntry: boolean
    isEndgameEntry: boolean
    isMetaEntry: boolean
    isRoundStartEntry: boolean
    isSetupEntry: boolean
    isRevealTurn: boolean
    isAgentTurn: boolean
    playedIntrigue: IntrigueCard[]
    title: string
    gains: Gain[]
    gainsForDisplay: Gain[]
    otherPlayerGains: ReturnType<typeof getOtherPlayersGainsForTurnState>
    revealStats: ReturnType<typeof getRevealTurnStats> | null
    acquiredCards: Card[]
    acquiredTechTiles: AcquiredTechTileSnapshot[]
    showStandardGains: boolean
    showRevealGains: boolean
    troopsDeployed: number
    troopsRetreated: number
  }

  const renderPlayerTurnRowContent = ({
    turn,
    turnPlayer,
    badge,
    isCombatEntry,
    isEndgameEntry,
    isMetaEntry,
    isRoundStartEntry,
    isSetupEntry,
    isRevealTurn,
    isAgentTurn,
    playedIntrigue,
    title,
    gains,
    gainsForDisplay,
    otherPlayerGains,
    revealStats,
    acquiredCards,
    acquiredTechTiles,
    showStandardGains,
    showRevealGains,
    troopsDeployed,
    troopsRetreated,
  }: PlayerTurnRowContentProps) => {
    const outcomes = (
      <>
        {isSetupEntry ? (
          <SetupSnapshotPreview imperiumRow={turn.imperiumRow} currentConflict={turn.currentConflict} />
        ) : null}
        {isEndgameEntry && renderEndgameRevealsByPlayer(turn)}
        {showHistoryGains && showStandardGains &&
          renderStandardGainsBlock(turn, {
            groupGainsByPlayer: isCombatEntry || isEndgameEntry,
            gains,
            gainsForDisplay,
            troopsDeployed,
            troopsRetreated,
            acquiredCards,
            acquiredTechTiles,
          })}
        {isEndgameEntry && turn.endgameWinners && turn.endgameWinners.length > 0 ? (
          <div className="turn-history-endgame-winners">
            Winner{turn.endgameWinners.length > 1 ? 's' : ''}:{' '}
            {turn.endgameWinners
              .map(id => turn.players.find(p => p.id === id)?.leader.name ?? `P${id}`)
              .join(', ')}
          </div>
        ) : null}
        {showHistoryGains && otherPlayerGains.length > 0 && renderOtherPlayerGains(turn)}
        {showHistoryGains && showRevealGains && revealStats && (
          <div className="turn-history-reveal-stats">
            <RevealTurnStatsPanel
              stats={revealStats}
              gains={gains}
              compact
              hideRevealedCards
              hideAcquiredNames
              resolveCard={makeResolveCard(turn)}
              troopsDeployedToConflict={troopsDeployed}
              troopsRetreatedFromConflict={troopsRetreated}
            />
          </div>
        )}
      </>
    )

    const actionBand = isEndgameEntry ? (
      <div className="turn-history-action-band turn-history-action-band--meta">
        <span className="turn-history-action-kind turn-history-action-kind--endgame">
          {turn.endgameWinners?.length ? 'Endgame' : 'Endgame intrigue reveal'}
        </span>
      </div>
    ) : isCombatEntry ? (
      <div className="turn-history-action-band turn-history-action-band--meta">
        <span className="turn-history-action-kind turn-history-action-kind--combat">Combat</span>
      </div>
    ) : isRevealTurn ? (
      renderRevealActionBand(turn)
    ) : isAgentTurn ? (
      renderAgentActionBand(turn, title, playedIntrigue)
    ) : (
      <div className="turn-history-action-band turn-history-action-band--meta">
        <span className="turn-history-action-kind">{title}</span>
      </div>
    )

    if (isDocked && !isMetaEntry && !isSetupEntry) {
      return (
        <div className="turn-history-row-grid">
          {renderTurnNumber(badge)}
          <div className="turn-history-row-main">
            <div className="turn-history-row-summary">
              {turnPlayer != null ? renderPlayerBadge(turnPlayer) : null}
              {actionBand}
            </div>
            <div className="turn-history-row-body">{outcomes}</div>
          </div>
        </div>
      )
    }

    return (
      <div className={isRoundStartEntry ? undefined : 'turn-history-row-grid'}>
        {!isRoundStartEntry && renderTurnNumber(badge)}
        <div className="turn-history-row-main">
          <div className="turn-history-row-header">
            {!isMetaEntry && renderPlayerBadge(turnPlayer)}
            {!isMetaEntry && !isRevealTurn && resolvePlayedCardsForTurn(turn).map(card => (
              <React.Fragment key={`header-played-${card.id}`}>
                {renderTurnCardThumb(card, true)}
              </React.Fragment>
            ))}
            {!isMetaEntry && isAgentTurn && (
              <span className="turn-history-action-arrow" aria-hidden="true">
                →
              </span>
            )}
            {!isMetaEntry && <span className="turn-label">{title}</span>}
            {isCombatEntry && <span className="turn-label turn-label--combat">{
            conflictCardImageSrc(turn.currentConflict.id) && <img style={{ width: '30px', height: '42px' }}
            src={conflictCardImageSrc(turn.currentConflict.id)?? undefined}
            alt={turn.currentConflict.name}
            title={withImageZoomHint(turn.currentConflict.name)}
            className="conflict-card-image"
            draggable={false}
            data-preview-src={conflictCardImageSrc(turn.currentConflict.id) ?? undefined}
          />
            }</span>}
            {isEndgameEntry && (
              <span className="turn-label turn-label--endgame">
                {turn.endgameWinners?.length ? 'Endgame' : 'Endgame intrigue reveal'}
              </span>
            )}
            {isRoundStartEntry && (
              <span className="turn-label">{getRoundStartLabel(turn)}</span>
            )}
          </div>
          <div className="turn-history-row-body">{outcomes}</div>
        </div>
      </div>
    )
  }

  const turnNumberOffset = currentGameState.playerTurnNumberOffset ?? 0
  const inSandboxSetup = Boolean(currentGameState.sandboxSetup)

  const effectiveViewIndex = viewingTurnIndex ?? turns.length
  const lastVisibleIndex = hideLiveTurn ? Math.max(-1, turns.length - 1) : turns.length
  const canGoToPreviousTurn = !inSandboxSetup && effectiveViewIndex > 0
  const canGoToNextTurn =
    !inSandboxSetup && viewingTurnIndex !== null && effectiveViewIndex < lastVisibleIndex

  const goToPreviousTurn = useCallback(() => {
    if (!canGoToPreviousTurn) return
    onTurnChange(Math.max(0, effectiveViewIndex - 1))
  }, [canGoToPreviousTurn, effectiveViewIndex, onTurnChange])

  const goToNextTurn = useCallback(() => {
    if (!canGoToNextTurn) return
    if (effectiveViewIndex < lastVisibleIndex) {
      onTurnChange(effectiveViewIndex + 1)
    } else {
      onReturnToCurrent()
    }
  }, [canGoToNextTurn, effectiveViewIndex, lastVisibleIndex, onTurnChange, onReturnToCurrent])

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
    if (inSandboxSetup) return

    if (index === turns.length) {
      if (hideLiveTurn) return
      onReturnToCurrent()
      return
    }

    const turn = turns[index]
    const isReplayMetaRow =
      turn.historyEntryKind === 'combat' || turn.historyEntryKind === 'endgame'
    if (isReplayMetaRow && viewingTurnIndex === index) {
      if (!hideLiveTurn) onReturnToCurrent()
      return
    }

    onTurnChange(index)
  }

  const headerTitle = isDocked
    ? null
    : isViewingHistory
      ? (() => {
          if (viewingTurnIndex === null) {
            return inSandboxSetup ? 'Setup' : `Turn ${getLivePlayerTurnNumber(turns)} (Current)`
          }
          const snapshot = turns[viewingTurnIndex]
          if (snapshot?.historyEntryKind === 'combat') return 'Combat'
          if (snapshot?.historyEntryKind === 'endgame') return 'Endgame'
          if (snapshot && isRoundStartHistoryEntry(snapshot)) {
            return getRoundStartLabel(snapshot)
          }
          if (viewingTurnIndex === 0 || snapshot?.historyEntryKind === 'setup') return 'Setup'
          const turnNum = getPlayerTurnNumber(turns, viewingTurnIndex)
          return turnNum != null ? `Turn ${turnNum}` : `Turn ${viewingTurnIndex}`
        })()
      : inSandboxSetup
        ? 'Setup'
        : `Turn ${getLivePlayerTurnNumber(turns)} (Current)`

  const renderHeader = () => (
    <div className="turn-history-header">
      <TurnHistoryNav
        viewingTurnIndex={viewingTurnIndex}
        historyLength={turns.length}
        inSandboxSetup={inSandboxSetup}
        isViewingHistory={isViewingHistory}
        onTurnChange={onTurnChange}
        onReturnToCurrent={onReturnToCurrent}
        hideLiveTurn={hideLiveTurn}
      />
      {headerTitle != null ? (
        <span className="turn-history-header-title">{headerTitle}</span>
      ) : null}
      <div className="turn-history-header-actions">
        <button
          type="button"
          className={[
            'turn-history-icon-btn',
            'turn-history-gains-toggle',
            showHistoryGains ? 'turn-history-gains-toggle--on' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setShowHistoryGains(v => !v)}
          title={showHistoryGains ? 'Hide gains in history' : 'Show gains in history'}
          aria-label={showHistoryGains ? 'Hide gains in history' : 'Show gains in history'}
          aria-pressed={showHistoryGains}
        >
          {showHistoryGains ? 'Gains' : 'Gains'}
        </button>
        <TurnHistoryUndoButton
          onUndo={onUndo}
          canUndo={canUndo}
          undoTitle={undoTitle}
          undoAriaLabel={undoAriaLabel}
        />
        {/* {onOpenPlayerOverview && (
          <button
            type="button"
            className="turn-history-icon-btn turn-history-icon-btn--overview"
            onClick={onOpenPlayerOverview}
            title="View player overview and stats"
            aria-label="View player overview and stats"
          >
            <PlayerOverviewIcon />
          </button>
        )} */}
        <button
          type="button"
          className="turn-history-icon-btn turn-history-icon-btn--theme"
          onClick={() => setPlayChromeTheme(cyclePlayChromeTheme())}
          title={`UI theme: ${PLAY_CHROME_THEME_LABELS[playChromeTheme]}`}
          aria-label={`Switch UI theme (current: ${PLAY_CHROME_THEME_LABELS[playChromeTheme]})`}
        >
          <span className="turn-history-theme-btn-label" aria-hidden="true">
            {playChromeTheme === 'void' ? 'V' : 'B'}
          </span>
        </button>
        <TurnHistoryDebugButton onLoadSave={onLoadSave} />
        {isViewingHistory && !isDocked && !hideLiveTurn && (
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
      {topSlot ? <div className="turn-history-top-slot">{topSlot}</div> : null}
      <div className="turn-history-list" ref={listRef}>
        {turns.map((turn, index) => {
          const isLastHistoryRow = index === turns.length - 1
          const displayTurn = isEndgameHistoryEntry(turn)
            ? mergeEndgameHistoryRow(turn, currentGameState, isLastHistoryRow)
            : turn

          if (
            isEndgameHistoryEntry(displayTurn) &&
            !hasEndgameRowContent(displayTurn) &&
            (isLiveEndgameEntry(currentGameState) || !isLastHistoryRow)
          ) {
            return null
          }

          const turnPlayer = getTurnPlayer(displayTurn)
          const isCombatEntry = isCombatHistoryEntry(displayTurn)
          const isEndgameEntry = isEndgameHistoryEntry(displayTurn)
          const isMetaEntry = isMetaHistoryEntry(displayTurn)
          const isRoundStartEntry = isRoundStartHistoryEntry(displayTurn)
          const gains = getGainsForHistoryRow(displayTurn)
          const otherPlayerGains =
            isCombatEntry || isEndgameEntry ? [] : getOtherPlayersGainsForTurnState(displayTurn)
          const playedIntrigue = getPlayedIntrigueForTurn(displayTurn)
          const isViewing = viewingTurnIndex === index
          const revealStats =
            displayTurn.currTurn?.type === TurnType.REVEAL && displayTurn.currTurn.playerId != null
              ? getRevealTurnStats(displayTurn, displayTurn.currTurn.playerId)
              : null
          const isSetupEntry = index === 0 || displayTurn.historyEntryKind === 'setup'
          const isRevealTurn = displayTurn.currTurn?.type === TurnType.REVEAL
          const isAgentTurn = displayTurn.currTurn?.type === TurnType.ACTION
          const acquiredCards =
            isAgentTurn && displayTurn.currTurn?.playerId != null
              ? getAcquiredCardsForTurn(displayTurn, displayTurn.currTurn.playerId)
              : []
          const acquiredTechTiles =
            isAgentTurn && displayTurn.currTurn?.playerId != null
              ? getAcquiredTechTilesForTurn(displayTurn, displayTurn.currTurn.playerId)
              : []
          const gainsForDisplay =
            acquiredCards.length > 0 || acquiredTechTiles.length > 0
              ? excludeAcquiredGainsFromDisplay(
                  gains,
                  acquiredCards.map(c => c.id),
                  acquiredTechTiles.map(t => t.id)
                )
              : gains
          const showRevealSummary = revealStats != null && revealTurnStatsHasContent(revealStats)
          const troopsDeployed = getTroopsDeployedToConflict(displayTurn)
          const troopsRetreated = getTroopsRetreatedFromConflict(displayTurn)
          const showStandardGains = isEndgameEntry
            ? gains.length > 0
            : !isRevealTurn &&
              (gainsForDisplay.length > 0 ||
                troopsDeployed > 0 ||
                troopsRetreated > 0 ||
                acquiredCards.length > 0 ||
                acquiredTechTiles.length > 0)
          const showRevealGains =
            isRevealTurn &&
            (showRevealSummary || gains.length > 0 || troopsDeployed > 0 || troopsRetreated > 0)
          const isRowClickable = !inSandboxSetup

          return (
            <div
              key={index}
              data-turn-index={index}
              className={[
                'turn-history-row',
                isViewing ? 'viewing' : '',
                isCombatEntry ? 'turn-history-row--combat' : '',
                isEndgameEntry ? 'turn-history-row--endgame' : '',
                isSetupEntry ? 'turn-history-row--setup' : '',
                isRoundStartEntry ? 'turn-history-row--round-start' : '',
                isMetaEntry ? 'turn-history-row--meta' : '',
                isRevealTurn ? 'turn-history-row--reveal' : '',
                isAgentTurn ? 'turn-history-row--agent' : '',
                isDocked ? 'turn-history-row--docked-layout' : '',
                !isRowClickable ? 'turn-history-row--static' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={isRowClickable ? () => handleTurnClick(index) : undefined}
              role={isRowClickable ? 'button' : undefined}
              tabIndex={isRowClickable ? 0 : undefined}
              onKeyDown={
                isRowClickable
                  ? (e) => e.key === 'Enter' && handleTurnClick(index)
                  : undefined
              }
            >
              {renderPlayerTurnRowContent({
                turn: displayTurn,
                turnPlayer,
                badge: getHistoryRowBadge(displayTurn, index, turns),
                isCombatEntry,
                isEndgameEntry,
                isMetaEntry,
                isRoundStartEntry,
                isSetupEntry,
                isRevealTurn,
                isAgentTurn,
                playedIntrigue,
                title: getHistoryRowTitle(displayTurn, index),
                gains,
                gainsForDisplay,
                otherPlayerGains,
                revealStats,
                acquiredCards,
                acquiredTechTiles,
                showStandardGains,
                showRevealGains,
                troopsDeployed,
                troopsRetreated,
              })}
            </div>
          )
        })}
        
        {/* Current turn pseudo-entry — hidden during sandbox setup until Begin turns */}
        {!inSandboxSetup &&
          !hideLiveTurn &&
          !shouldHideLiveHistoryEntry(turns, currentGameState) && (() => {
          const liveIsEndgame = isLiveEndgameEntry(currentGameState)
          const liveGains = getGainsForTurnState(currentGameState)
          const liveOtherPlayerGains = getOtherPlayersGainsForTurnState(currentGameState)
          const livePlayedIntrigue = getPlayedIntrigueForTurn(currentGameState)
          const liveRevealStats =
            currentGameState.currTurn?.type === TurnType.REVEAL &&
            currentGameState.currTurn.playerId != null
              ? getRevealTurnStats(currentGameState, currentGameState.currTurn.playerId)
              : null
          const liveIsRevealTurn = currentGameState.currTurn?.type === TurnType.REVEAL
          const liveIsAgentTurn = currentGameState.currTurn?.type === TurnType.ACTION
          const liveAcquiredCards =
            liveIsAgentTurn && currentGameState.currTurn?.playerId != null
              ? getAcquiredCardsForTurn(currentGameState, currentGameState.currTurn.playerId)
              : []
          const liveAcquiredTechTiles =
            liveIsAgentTurn && currentGameState.currTurn?.playerId != null
              ? getAcquiredTechTilesForTurn(currentGameState, currentGameState.currTurn.playerId)
              : []
          const liveGainsForDisplay =
            liveAcquiredCards.length > 0 || liveAcquiredTechTiles.length > 0
              ? excludeAcquiredGainsFromDisplay(
                  liveGains,
                  liveAcquiredCards.map(c => c.id),
                  liveAcquiredTechTiles.map(t => t.id)
                )
              : liveGains
          const liveShowRevealSummary =
            liveRevealStats != null && revealTurnStatsHasContent(liveRevealStats)
          const liveTroopsDeployed = getTroopsDeployedToConflict(currentGameState)
          const liveTroopsRetreated = getTroopsRetreatedFromConflict(currentGameState)
          const liveShowStandardGains =
            !liveIsRevealTurn &&
            (liveGainsForDisplay.length > 0 ||
              liveTroopsDeployed > 0 ||
              liveTroopsRetreated > 0 ||
              liveAcquiredCards.length > 0 ||
              liveAcquiredTechTiles.length > 0)
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
          className={[
            'turn-history-row',
            'current-turn-entry',
            !isViewingHistory ? 'viewing' : '',
            liveIsEndgame ? 'turn-history-row--endgame turn-history-row--meta' : '',
            liveIsRevealTurn ? 'turn-history-row--reveal' : '',
            liveIsAgentTurn ? 'turn-history-row--agent' : '',
            isDocked ? 'turn-history-row--docked-layout' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onReturnToCurrent()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onReturnToCurrent()}
        >
          {renderPlayerTurnRowContent({
            turn: currentGameState,
            turnPlayer: players.find(p => p.id === currentGameState.activePlayerId),
            badge: liveIsEndgame ? 'Endgame' : getLivePlayerTurnNumber(turns, turnNumberOffset),
            isCombatEntry: currentGameState.phase === GamePhase.COMBAT,
            isEndgameEntry: liveIsEndgame,
            isMetaEntry: liveIsEndgame,
            isRoundStartEntry: false,
            isSetupEntry: false,
            isRevealTurn: liveIsRevealTurn,
            isAgentTurn: liveIsAgentTurn,
            playedIntrigue: livePlayedIntrigue,
            title: getTurnActionLabel(currentGameState),
            gains: liveGains,
            gainsForDisplay: liveGainsForDisplay,
            otherPlayerGains: liveOtherPlayerGains,
            revealStats: liveRevealStats,
            acquiredCards: liveAcquiredCards,
            acquiredTechTiles: liveAcquiredTechTiles,
            showStandardGains: liveShowStandardGains,
            showRevealGains: liveShowRevealGains,
            troopsDeployed: liveTroopsDeployed,
            troopsRetreated: liveTroopsRetreated,
          })}
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

    </div>
  )
}

export default TurnHistory
