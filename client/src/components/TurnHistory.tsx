import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, Gain, IntrigueCard, Player, GameState, GamePhase, TurnType } from '../types/GameTypes'
import { getLeaderIconPath } from '../data/leaders'
import {
  computeTurnGainTotals,
  excludeAcquireEffectGains,
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
  formatTurnRoundHeader,
  getDisplayRound,
  getHistoryRowBadge,
  getLivePlayerTurnNumber,
  getPlayerTurnNumber,
  getTurnActionLabel,
  isMetaHistoryEntry,
} from '../utils/turnHistoryDisplay'
import {
  hasEndgameRowContent,
  isLiveEndgameEntry,
  mergeEndgameHistoryRow,
  shouldHideLiveHistoryEntry,
} from '../utils/endgameHistoryDisplay'
import {
  getAcquiredCardsForTurn,
  getRevealTurnStats,
  resolveCardInSnapshot,
  resolveCardInSnapshotByName,
  resolvePlayedCardForTurn,
  revealTurnStatsHasContent,
} from '../utils/revealTurnStats'
import RevealTurnStatsPanel from './RevealTurnStatsPanel/RevealTurnStatsPanel'
import {
  cyclePlayChromeTheme,
  getPlayChromeTheme,
  PLAY_CHROME_THEME_LABELS,
  type PlayChromeTheme,
} from '../utils/playChromeTheme'
import SetupSnapshotPreview from './SetupSnapshotPreview/SetupSnapshotPreview'
import TurnGainsDisplay from './TurnGainsDisplay/TurnGainsDisplay'
import { useGame } from './GameContext/GameContext'
import SaveDocImportPanel from './SaveDocImportPanel/SaveDocImportPanel'
import type { SaveDoc } from '../save/types'
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
  onLoadSave?: (doc: SaveDoc) => void
}

function slugifySaveFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug ? `${slug}.json` : `save-${Date.now()}.json`
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

const PlayerOverviewIcon = () => (
  <svg className="turn-history-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="7.25" cy="7.25" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
    <path d="M3.75 13.25c.6-1.85 1.85-2.75 3.5-2.75s2.9.9 3.5 2.75" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="15.75" cy="6.75" r="1.85" fill="none" stroke="currentColor" strokeWidth="1.75" />
    <path d="M12.85 11.75c.5-1.35 1.5-2 2.9-2s2.4.65 2.9 2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M5 20v-3.25M11 20v-5.25M17 20v-7.25M3.5 20h16.75" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
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
  onOpenPlayerOverview,
  topSlot,
  onLoadSave,
}) => {
  const isDocked = layout === 'docked'
  const { exportSaveDoc } = useGame()
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugView, setDebugView] = useState<'save' | 'runtime' | 'load'>('save')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [playChromeTheme, setPlayChromeTheme] = useState<PlayChromeTheme>(() => getPlayChromeTheme())
  const listRef = useRef<HTMLDivElement>(null)
  const liveEntryRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const prevTurnsLengthRef = useRef(turns.length)

  // Determine which turn is being viewed (null means current/live)
  const isViewingHistory = viewingTurnIndex !== null

  const debugJson = useMemo(() => {
    if (!showDebugModal) return ''
    if (debugView === 'save') {
      return JSON.stringify(exportSaveDoc(), null, 2)
    }
    const { history: _history, setupBaseline: _setupBaseline, ...runtime } = currentGameState
    return JSON.stringify(runtime, null, 2)
  }, [showDebugModal, debugView, exportSaveDoc, currentGameState])

  const handleCopySave = useCallback(async () => {
    const text = JSON.stringify(exportSaveDoc(), null, 2)
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback('Copied')
      window.setTimeout(() => setCopyFeedback(null), 2000)
    } catch {
      setCopyFeedback('Copy failed')
      window.setTimeout(() => setCopyFeedback(null), 2000)
    }
  }, [exportSaveDoc])

  const handleDownloadSave = useCallback(() => {
    const doc = exportSaveDoc()
    const json = JSON.stringify(doc, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = slugifySaveFilename(doc.meta.title)
    anchor.click()
    URL.revokeObjectURL(url)
  }, [exportSaveDoc])

  const handleLoadSaveFromPanel = useCallback(
    (doc: SaveDoc) => {
      if (!onLoadSave) return
      const current = exportSaveDoc()
      if (current.events.length > 0) {
        const ok = window.confirm(
          'Replace the current game with the pasted save? Unsaved progress in this session will be lost.'
        )
        if (!ok) return
      }
      onLoadSave(doc)
      setShowDebugModal(false)
    },
    [exportSaveDoc, onLoadSave]
  )

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
      if (byName && byId && byName.id !== byId.id) return byName
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
    if (turn.historyEntryKind === 'endgame') return 'Endgame'
    if (turn.historyEntryKind === 'combat') return 'Combat'
    if (turn.historyEntryKind === 'round-start') return `Round ${turn.currentRound} start`
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
        title={card.name}
      >
        {card.image ? (
          <img
            src={card.image}
            alt=""
            className="turn-history-card-thumb-img"
            draggable={false}
          />
        ) : (
          <span className="turn-history-card-thumb-fallback">{card.name}</span>
        )}
      </span>
    )
  }

  const renderRevealCardsInline = (turn: GameState) => {
    if (turn.currTurn?.type !== TurnType.REVEAL || turn.currTurn.playerId == null) return null
    const stats = getRevealTurnStats(turn, turn.currTurn.playerId)
    if (!stats?.revealedCards.length) return null
    return (
      <div className="turn-history-reveal-cards turn-history-reveal-cards--inline" aria-label="Revealed cards">
        {stats.revealedCards.map(card => (
          <React.Fragment key={`reveal-thumb-${card.id}`}>
            {renderTurnCardThumb(card, true)}
          </React.Fragment>
        ))}
      </div>
    )
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

  const renderIntrigueInline = (intrigueCards: IntrigueCard[]) => {
    if (intrigueCards.length === 0) return null
    return (
      <div className="turn-history-intrigue-inline" aria-label="Intrigue played this turn">
        {renderIntrigueThumbs(intrigueCards)}
      </div>
    )
  }

  const renderRowIdentity = (badge: React.ReactNode, player: Player | undefined) => (
    <div className="turn-history-row-identity">
      <div className="turn-number">{badge}</div>
      {player != null ? renderPlayerBadge(player) : null}
    </div>
  )

  const renderAgentActionBand = (
    turn: GameState,
    destinationLabel: string,
    intrigueCards: IntrigueCard[]
  ) => {
    const playedCard = resolvePlayedCardForTurn(turn)
    return (
      <div className="turn-history-action-band">
        <div className="turn-history-action-flow" aria-label={`Played ${playedCard?.name ?? 'card'} at ${destinationLabel}`}>
          {renderTurnCardThumb(playedCard, true)}
          <span className="turn-history-action-arrow" aria-hidden="true">
            →
          </span>
          <span className="turn-history-action-destination">{destinationLabel}</span>
        </div>
        {renderIntrigueInline(intrigueCards)}
      </div>
    )
  }

  const renderRevealActionBand = (turn: GameState) => (
    <div className="turn-history-action-band turn-history-action-band--reveal">
      <span className="turn-history-action-kind">Reveal</span>
      {renderRevealCardsInline(turn)}
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
    }
  ) => {
    const { groupGainsByPlayer, gains, gainsForDisplay, troopsDeployed, troopsRetreated, acquiredCards } =
      options
    return (
      <div className="turn-history-gains">
        {groupGainsByPlayer ? (
          renderCombatGainsByPlayer(turn, gains)
        ) : (
          <>
            <TurnGainsDisplay
              gains={gainsForDisplay}
              resolveCard={makeResolveCard(turn)}
              troopsDeployedToConflict={troopsDeployed}
              troopsRetreatedFromConflict={troopsRetreated}
              showSourceTitles
            />
            {acquiredCards.length > 0 && (
              <RevealTurnStatsPanel
                stats={{
                  revealedCards: [],
                  acquiredCards,
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
        {showStandardGains &&
          renderStandardGainsBlock(turn, {
            groupGainsByPlayer: isCombatEntry || isEndgameEntry,
            gains,
            gainsForDisplay,
            troopsDeployed,
            troopsRetreated,
            acquiredCards,
          })}
        {isEndgameEntry && turn.endgameWinners && turn.endgameWinners.length > 0 ? (
          <div className="turn-history-endgame-winners">
            Winner{turn.endgameWinners.length > 1 ? 's' : ''}:{' '}
            {turn.endgameWinners
              .map(id => turn.players.find(p => p.id === id)?.leader.name ?? `P${id}`)
              .join(', ')}
          </div>
        ) : null}
        {otherPlayerGains.length > 0 && renderOtherPlayerGains(turn)}
        {showRevealGains && revealStats && (
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

    if (isDocked && !isMetaEntry && !isSetupEntry) {
      return (
        <div className="turn-history-row-grid">
          {renderRowIdentity(badge, turnPlayer)}
          <div className="turn-history-row-main">
            {isEndgameEntry ? (
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
                {renderIntrigueInline(playedIntrigue)}
              </div>
            )}
            <div className="turn-history-row-body">{outcomes}</div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="turn-history-row-header">
          <div className="turn-number">{badge}</div>
          {!isMetaEntry && renderPlayerBadge(turnPlayer)}
          {!isMetaEntry && !isRevealTurn && renderTurnCardThumb(resolvePlayedCardForTurn(turn), true)}
          {!isMetaEntry && <span className="turn-label">{title}</span>}
          {isRevealTurn && renderRevealCardsInline(turn)}
          {!isMetaEntry && renderIntrigueInline(playedIntrigue)}
          {isCombatEntry && <span className="turn-label turn-label--combat">Combat resolution</span>}
          {isEndgameEntry && (
            <span className="turn-label turn-label--endgame">
              {turn.endgameWinners?.length ? 'Endgame' : 'Endgame intrigue reveal'}
            </span>
          )}
          {turn.historyEntryKind === 'round-start' && (
            <span className="turn-label">Round {turn.currentRound} start</span>
          )}
        </div>
        <div className="turn-history-row-body">{outcomes}</div>
      </>
    )
  }

  const turnNumberOffset = currentGameState.playerTurnNumberOffset ?? 0
  const inSandboxSetup = Boolean(currentGameState.sandboxSetup)

  const effectiveViewIndex = viewingTurnIndex ?? turns.length
  const canGoToPreviousTurn = !inSandboxSetup && effectiveViewIndex > 0
  const canGoToNextTurn =
    !inSandboxSetup && viewingTurnIndex !== null && effectiveViewIndex < turns.length

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
        if (showDebugModal) {
          setShowDebugModal(false)
          return
        }
        if (isViewingHistory) {
          onReturnToCurrent()
        } else if (onClose) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isViewingHistory, onReturnToCurrent, goToPreviousTurn, goToNextTurn, showDebugModal])

  // Handle clicking on a turn row
  const handleTurnClick = (index: number) => {
    if (inSandboxSetup) return

    if (index === turns.length) {
      onReturnToCurrent()
      return
    }

    const turn = turns[index]
    const isReplayMetaRow =
      turn.historyEntryKind === 'combat' || turn.historyEntryKind === 'endgame'
    if (isReplayMetaRow && viewingTurnIndex === index) {
      onReturnToCurrent()
      return
    }

    onTurnChange(index)
  }

  const getDockedHeaderTitle = (): string => {
    if (viewingTurnIndex === null) {
      if (inSandboxSetup) return 'Setup'
      return formatTurnRoundHeader(
        getLivePlayerTurnNumber(turns, turnNumberOffset),
        getDisplayRound(currentGameState)
      )
    }
    const snapshot = turns[viewingTurnIndex]
    if (snapshot?.historyEntryKind === 'combat') return 'Combat'
    if (snapshot?.historyEntryKind === 'endgame') return 'Endgame'
    if (snapshot?.historyEntryKind === 'round-start') {
      const round = getDisplayRound(snapshot) ?? snapshot.currentRound
      return round != null ? `Round ${round} start` : 'Round start'
    }
    if (viewingTurnIndex === 0 || snapshot?.historyEntryKind === 'setup') return 'Setup'
    const round = getDisplayRound(snapshot) ?? getDisplayRound(currentGameState) ?? snapshot?.currentRound
    const turnNum = getPlayerTurnNumber(turns, viewingTurnIndex)
    if (turnNum != null) {
      return round != null ? `Turn ${turnNum}, round ${round}` : `Turn ${turnNum}`
    }
    return round != null ? `Turn ${viewingTurnIndex}, round ${round}` : `Turn ${viewingTurnIndex}`
  }

  const headerTitle = isDocked
    ? getDockedHeaderTitle()
    : isViewingHistory
      ? (() => {
          if (viewingTurnIndex === null) {
            return inSandboxSetup ? 'Setup' : `Turn ${getLivePlayerTurnNumber(turns)} (Current)`
          }
          const snapshot = turns[viewingTurnIndex]
          if (snapshot?.historyEntryKind === 'combat') return 'Combat'
          if (snapshot?.historyEntryKind === 'endgame') return 'Endgame'
          if (snapshot?.historyEntryKind === 'round-start') {
            return `Round ${snapshot.currentRound} start`
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
        {onOpenPlayerOverview && (
          <button
            type="button"
            className="turn-history-icon-btn turn-history-icon-btn--overview"
            onClick={onOpenPlayerOverview}
            title="View player overview and stats"
            aria-label="View player overview and stats"
          >
            <PlayerOverviewIcon />
          </button>
        )}
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
        <button
          type="button"
          className="turn-history-icon-btn turn-history-icon-btn--details"
          onClick={() => {
            setDebugView('save')
            setShowDebugModal(true)
          }}
          title="View save document (setup + event log) or runtime state"
          aria-label="View save document debug"
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
      {topSlot}
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
          const gainsForDisplay =
            acquiredCards.length > 0
              ? excludeAcquireEffectGains(gains, acquiredCards.map(c => c.id))
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
                acquiredCards.length > 0)
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
                showStandardGains,
                showRevealGains,
                troopsDeployed,
                troopsRetreated,
              })}
            </div>
          )
        })}
        
        {/* Current turn pseudo-entry — hidden during sandbox setup until Begin turns */}
        {!inSandboxSetup && !shouldHideLiveHistoryEntry(turns, currentGameState) && (() => {
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
          const liveGainsForDisplay =
            liveAcquiredCards.length > 0
              ? excludeAcquireEffectGains(liveGains, liveAcquiredCards.map(c => c.id))
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
              liveAcquiredCards.length > 0)
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

      {showDebugModal &&
        createPortal(
          <div className="turn-details-modal" onClick={() => setShowDebugModal(false)}>
            <div className="turn-details-content" onClick={e => e.stopPropagation()}>
              <h3>Game data</h3>
              <div className="turn-details-tabs" role="tablist" aria-label="Debug view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={debugView === 'save'}
                  className={debugView === 'save' ? 'turn-details-tab turn-details-tab--active' : 'turn-details-tab'}
                  onClick={() => setDebugView('save')}
                >
                  Save
                </button>
                {onLoadSave && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={debugView === 'load'}
                    className={debugView === 'load' ? 'turn-details-tab turn-details-tab--active' : 'turn-details-tab'}
                    onClick={() => setDebugView('load')}
                  >
                    Load
                  </button>
                )}
                {/* <button
                  type="button"
                  role="tab"
                  aria-selected={debugView === 'runtime'}
                  className={debugView === 'runtime' ? 'turn-details-tab turn-details-tab--active' : 'turn-details-tab'}
                  onClick={() => setDebugView('runtime')}
                >
                  Runtime
                </button> */}
                
              </div>
              {debugView === 'load' && onLoadSave ? (
                <SaveDocImportPanel onLoad={handleLoadSaveFromPanel} buttonLabel="Load save" />
              ) : (
                <>
                  {debugView === 'save' && (
                    <div className="turn-details-export-actions">
                      <button type="button" className="turn-details-export-btn" onClick={handleCopySave}>
                        {copyFeedback ?? 'Copy to clipboard'}
                      </button>
                      <button type="button" className="turn-details-export-btn" onClick={handleDownloadSave}>
                        Download 
                      </button>
                    </div>
                  )}
                  <pre>{debugJson}</pre>
                </>
              )}
              {/* <button type="button" className="close-button" onClick={() => setShowDebugModal(false)}>
                Close
              </button> */}
            </div>
          </div>,
          document.body
        )}

    </div>
  )
}

export default TurnHistory
