import React, { useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { Card, GameState, IntrigueCard, Player } from '../../types/GameTypes'
import CardSearch from '../CardSearch/CardSearch'
import { getLeaderIconPath, getLeaderImage } from '../../data/leaders'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import { endgameRevealIncomplete } from '../../utils/endgameResolution'
import {
  buildEndgameAnalytics,
  buildEndgameGameStatistics,
  collectBoardVisitRows,
  ENDGAME_ANALYTICS_SECTIONS,
  ENDGAME_RESOURCE_METRICS,
  type EndgameAnalyticsSection,
  type EndgameResourceMetric,
  type NamedCardStat,
  type PlayerGameStatistics,
} from '../../utils/endgameAnalytics'
import './EndgameOverlay.css'

export interface EndgameOverlayProps {
  gameState: GameState
  /** Full live state for analytics when replaying a history snapshot. */
  analyticsSourceState?: GameState
  isVisible: boolean
  readOnly?: boolean
  containerRef?: RefObject<HTMLElement | null>
  onRevealIntrigue: (playerId: number, cardIds: number[]) => void
}

type EndgameTab = 'results' | 'analytics'

interface PlayerStanding {
  player: Player
  rank: number
  vp: number
  spice: number
  solari: number
  water: number
  troops: number
  isWinner: boolean
}

function buildStandings(gameState: GameState): PlayerStanding[] {
  const withVp = gameState.players.map(player => ({
    player,
    vp: getTotalVictoryPoints(player, gameState),
    spice: player.spice + (gameState.endgameTiebreakerSpice?.[player.id] ?? 0),
    solari: player.solari,
    water: player.water,
    troops: player.troops,
  }))
  withVp.sort((a, b) => {
    if (b.vp !== a.vp) return b.vp - a.vp
    if (b.spice !== a.spice) return b.spice - a.spice
    if (b.solari !== a.solari) return b.solari - a.solari
    if (b.water !== a.water) return b.water - a.water
    return b.troops - a.troops
  })

  const winners = new Set(gameState.endgameWinners ?? [])
  return withVp.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isWinner: winners.has(entry.player.id),
  }))
}

function ResourceCell({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0
  return (
    <span className="endgame-analytics-bar-cell">
      <span className="endgame-analytics-bar" style={{ width: `${width}%` }} aria-hidden="true" />
      <span className="endgame-analytics-value">{value}</span>
    </span>
  )
}

function EndgameLeaderAvatar({
  player,
  variant = 'icon',
  className = '',
}: {
  player: Player
  variant?: 'icon' | 'portrait'
  className?: string
}) {
  const portrait = getLeaderImage(player.leader.name)
  const icon = getLeaderIconPath(player.leader.name)

  if (variant === 'portrait' && portrait) {
    return (
      <img
        src={portrait}
        alt={player.leader.name}
        className={`endgame-leader-portrait ${className}`.trim()}
        draggable={false}
      />
    )
  }

  if (icon) {
    return (
      <img
        src={icon}
        alt=""
        className={`endgame-leader-icon ${className}`.trim()}
        draggable={false}
        title={player.leader.name}
      />
    )
  }

  return (
    <span className={`endgame-leader-fallback ${className}`.trim()} aria-hidden="true">
      {player.leader.name.charAt(0)}
    </span>
  )
}

function CardThumbGrid({ cards, intrigue = false }: { cards: NamedCardStat[] | Card[]; intrigue?: boolean }) {
  if (cards.length === 0) {
    return <p className="endgame-empty-stat">None</p>
  }

  return (
    <div className="endgame-card-thumb-grid">
      {cards.map(card => {
        const count = 'count' in card ? card.count : 1
        const key = `${card.id}-${card.name}`
        return (
          <figure key={key} className="endgame-card-thumb" title={card.name}>
            {card.image ? (
              <img src={card.image} alt="" className="endgame-card-thumb-img" draggable={false} />
            ) : (
              <span className="endgame-card-thumb-fallback">{card.name}</span>
            )}
            {count > 1 ? <figcaption className="endgame-card-thumb-count">×{count}</figcaption> : null}
            {intrigue ? <span className="endgame-card-thumb-badge">Intrigue</span> : null}
          </figure>
        )
      })}
    </div>
  )
}

function PlayerStatBlock({
  player,
  children,
  summary,
}: {
  player: Player
  summary?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={`endgame-player-stat-block endgame-player-stat-block--${player.color}`}>
      <header className="endgame-player-stat-header">
        <EndgameLeaderAvatar player={player} variant="portrait" />
        <div className="endgame-player-stat-heading">
          <h4 className="endgame-player-stat-name">{player.leader.name}</h4>
          {summary ? <div className="endgame-player-stat-summary">{summary}</div> : null}
        </div>
      </header>
      {children}
    </section>
  )
}

function renderDecksSection(players: Player[], gameStats: Record<number, PlayerGameStatistics>) {
  return players.map(player => {
    const snapshot = gameStats[player.id]?.deckSnapshot
    if (!snapshot) return null
    return (
      <PlayerStatBlock
        key={player.id}
        player={player}
        summary={
          <>
            <span>Hand {snapshot.handCount}</span>
            <span>Deck {snapshot.deck.length}</span>
            <span>Discard {snapshot.discard.length}</span>
            <span>Trash {snapshot.trash.length}</span>
          </>
        }
      >
        {snapshot.deck.length > 0 ? (
          <>
            <h5 className="endgame-pile-title">Deck</h5>
            <CardThumbGrid cards={snapshot.deck} />
          </>
        ) : null}
        {snapshot.discard.length > 0 ? (
          <>
            <h5 className="endgame-pile-title">Discard</h5>
            <CardThumbGrid cards={snapshot.discard} />
          </>
        ) : null}
        {snapshot.trash.length > 0 ? (
          <>
            <h5 className="endgame-pile-title">Trash</h5>
            <CardThumbGrid cards={snapshot.trash} />
          </>
        ) : null}
      </PlayerStatBlock>
    )
  })
}

function renderIntrigueSection(players: Player[], gameStats: Record<number, PlayerGameStatistics>) {
  return players.map(player => {
    const stats = gameStats[player.id]
    if (!stats) return null
    return (
      <PlayerStatBlock
        key={player.id}
        player={player}
        summary={<span>{stats.intriguePlayed.length} played during game</span>}
      >
        <h5 className="endgame-pile-title">Played intrigue</h5>
        <CardThumbGrid cards={stats.intriguePlayed} intrigue />
        {stats.intrigueRevealed.length > 0 ? (
          <>
            <h5 className="endgame-pile-title">Revealed at endgame</h5>
            <CardThumbGrid cards={stats.intrigueRevealed} intrigue />
          </>
        ) : null}
      </PlayerStatBlock>
    )
  })
}

function renderCardPlaysSection(players: Player[], gameStats: Record<number, PlayerGameStatistics>) {
  return players.map(player => {
    const stats = gameStats[player.id]
    if (!stats) return null
    return (
      <PlayerStatBlock
        key={player.id}
        player={player}
        summary={
          <>
            <span>{stats.agentTurns} agent turns</span>
            <span>{stats.cardsPlayed.length} unique cards</span>
          </>
        }
      >
        <CardThumbGrid cards={stats.cardsPlayed} />
      </PlayerStatBlock>
    )
  })
}

function renderAcquireRevealSection(players: Player[], gameStats: Record<number, PlayerGameStatistics>) {
  return players.map(player => {
    const stats = gameStats[player.id]
    if (!stats) return null
    return (
      <PlayerStatBlock
        key={player.id}
        player={player}
        summary={
          <>
            <span>{stats.revealTurns} reveal turns</span>
            <span>{stats.cardsAcquired.length} acquisitions</span>
          </>
        }
      >
        <h5 className="endgame-pile-title">Acquired</h5>
        <CardThumbGrid cards={stats.cardsAcquired} />
        <h5 className="endgame-pile-title">Revealed from hand</h5>
        <CardThumbGrid cards={stats.cardsRevealed} />
      </PlayerStatBlock>
    )
  })
}

const EndgameOverlay: React.FC<EndgameOverlayProps> = ({
  gameState,
  analyticsSourceState,
  isVisible,
  readOnly = false,
  containerRef,
  onRevealIntrigue,
}) => {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [activeTab, setActiveTab] = useState<EndgameTab>('results')
  const [analyticsSection, setAnalyticsSection] = useState<EndgameAnalyticsSection>('resources')
  const [isRevealPickerOpen, setIsRevealPickerOpen] = useState(false)
  const [analyticsMetric, setAnalyticsMetric] = useState<EndgameResourceMetric>('vp')

  useLayoutEffect(() => {
    if (!isVisible) {
      setPortalTarget(null)
      setIsRevealPickerOpen(false)
      return
    }
    setPortalTarget(containerRef?.current ?? null)
  }, [containerRef, isVisible])

  useLayoutEffect(() => {
    if (readOnly) setIsRevealPickerOpen(false)
  }, [readOnly])

  const analyticsState = analyticsSourceState ?? gameState
  const revealIncomplete = !readOnly && endgameRevealIncomplete(gameState)
  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId)
  const standings = useMemo(() => buildStandings(gameState), [gameState])
  const analytics = useMemo(
    () => buildEndgameAnalytics(analyticsState.history, analyticsState),
    [analyticsState.history, analyticsState]
  )
  const gameStats = useMemo(
    () => buildEndgameGameStatistics(analyticsState.history, analyticsState),
    [analyticsState.history, analyticsState]
  )
  const boardVisitRows = useMemo(() => collectBoardVisitRows(gameStats), [gameStats])
  const revealedByPlayer = gameState.endgameRevealedIntrigue ?? {}
  const winners = gameState.endgameWinners ?? []

  const handleRevealConfirm = (selected: IntrigueCard[]) => {
    if (!activePlayer) return
    setIsRevealPickerOpen(false)
    onRevealIntrigue(
      activePlayer.id,
      selected.map(c => c.id)
    )
  }

  if (!isVisible) return null

  const overlay = (
    <div
      className={[
        'endgame-overlay',
        portalTarget ? 'endgame-overlay--board-scoped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Endgame"
    >
      <div className="endgame-modal">
        <div className="endgame-modal-header">
          <h2 className="endgame-modal-title">Endgame</h2>
          <div className="endgame-tabs" role="tablist" aria-label="Endgame views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'results'}
              className={[
                'endgame-tab',
                activeTab === 'results' ? 'endgame-tab--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'analytics'}
              className={[
                'endgame-tab',
                activeTab === 'analytics' ? 'endgame-tab--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>

        {activeTab === 'results' ? (
          <div className="endgame-results" role="tabpanel">
            {revealIncomplete && activePlayer ? (
              <div className="endgame-reveal-prompt">
                <div className="endgame-active-player">
                  <EndgameLeaderAvatar player={activePlayer} variant="portrait" />
                  <span>
                    {activePlayer.leader.name}
                    {activePlayer.intrigueCount > 0 ? (
                      <span className="endgame-active-label">
                        {' '}
                        — select {activePlayer.intrigueCount} intrigue card
                        {activePlayer.intrigueCount === 1 ? '' : 's'} to reveal
                      </span>
                    ) : (
                      <span className="endgame-active-label"> — no intrigue to reveal</span>
                    )}
                  </span>
                </div>
                {activePlayer.intrigueCount > 0 ? (
                  <button
                    type="button"
                    className="endgame-reveal-button"
                    onClick={() => setIsRevealPickerOpen(true)}
                  >
                    Choose intrigue cards
                  </button>
                ) : null}
              </div>
            ) : null}

            {winners.length > 0 ? (
              <div className="endgame-winners-banner">
                Winner{winners.length > 1 ? 's' : ''}:{' '}
                {winners
                  .map(id => gameState.players.find(p => p.id === id)?.leader.name || `P${id}`)
                  .join(', ')}
              </div>
            ) : revealIncomplete ? (
              <p className="endgame-hint">
                Reveal remaining intrigue cards in first-player order. Tiebreakers use spice, solari,
                water, then garrison troops.
              </p>
            ) : (
              <p className="endgame-hint">Resolving endgame effects…</p>
            )}

            <div className="endgame-standings" aria-label="Final standings">
              {standings.map(({ player, rank, vp, spice, solari, water, troops, isWinner }) => (
                <div
                  key={player.id}
                  className={[
                    'endgame-standing',
                    `endgame-standing--place-${Math.min(rank, 4)}`,
                    isWinner ? 'endgame-standing--winner' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="endgame-standing-rank">{rank}.</span>
                  <EndgameLeaderAvatar player={player} variant="portrait" />
                  <span className="endgame-standing-name">{player.leader.name}</span>
                  <span className="endgame-standing-vp" title="Victory points">
                    <img src="/icon/vp.png" alt="" className="endgame-resource-icon" aria-hidden="true" />
                    {vp}
                  </span>
                  <div className="endgame-standing-resources" aria-label="Tiebreaker resources">
                    <span title="Spice (incl. tiebreaker bonus)">
                      <img src="/icon/spice.png" alt="" className="endgame-resource-icon" aria-hidden="true" />
                      {spice}
                    </span>
                    <span title="Solari">
                      <img src="/icon/solari.png" alt="" className="endgame-resource-icon" aria-hidden="true" />
                      {solari}
                    </span>
                    <span title="Water">
                      <img src="/icon/water.png" alt="" className="endgame-resource-icon" aria-hidden="true" />
                      {water}
                    </span>
                    <span title="Garrison troops">
                      <img src="/icon/troop.png" alt="" className="endgame-resource-icon" aria-hidden="true" />
                      {troops}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(revealedByPlayer).length > 0 ? (
              <div className="endgame-revealed-section" aria-label="Revealed intrigue cards">
                <h3 className="endgame-section-title">Revealed intrigue</h3>
                {gameState.players.map(player => {
                  const cards = revealedByPlayer[player.id] ?? []
                  if (cards.length === 0) return null
                  return (
                    <div key={player.id} className="endgame-revealed-row">
                      <EndgameLeaderAvatar player={player} variant="portrait" />
                      <span className="endgame-revealed-name">{player.leader.name}</span>
                      <div className="endgame-revealed-cards">
                        {cards.map(card => (
                          <img
                            key={card.id}
                            src={card.image}
                            alt={card.name}
                            className="endgame-revealed-card"
                            title={card.name}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="endgame-analytics" role="tabpanel">
            <div className="endgame-analytics-section-tabs">
              {ENDGAME_ANALYTICS_SECTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={[
                    'endgame-analytics-section-tab',
                    analyticsSection === key ? 'endgame-analytics-section-tab--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setAnalyticsSection(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {analyticsSection === 'resources' ? (
              <>
                <div className="endgame-analytics-metric-tabs">
                  {ENDGAME_RESOURCE_METRICS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={[
                        'endgame-analytics-metric-tab',
                        analyticsMetric === key ? 'endgame-analytics-metric-tab--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setAnalyticsMetric(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="endgame-analytics-table-wrap">
                  <table className="endgame-analytics-table">
                    <thead>
                      <tr>
                        <th scope="col">Point</th>
                        {gameState.players.map(player => (
                          <th key={player.id} scope="col">
                            <span className="endgame-analytics-player-head">
                              <EndgameLeaderAvatar player={player} variant="icon" />
                              {player.leader.name}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map(point => {
                        const max = Math.max(
                          ...point.players.map(snapshot => snapshot[analyticsMetric]),
                          1
                        )
                        return (
                          <tr key={point.index}>
                            <th scope="row">{point.label}</th>
                            {gameState.players.map(player => {
                              const snapshot = point.players.find(p => p.playerId === player.id)
                              const value = snapshot?.[analyticsMetric] ?? 0
                              return (
                                <td key={player.id}>
                                  <ResourceCell value={value} max={max} />
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {analyticsSection === 'decks' ? (
              <div className="endgame-analytics-player-sections">
                {renderDecksSection(gameState.players, gameStats)}
              </div>
            ) : null}

            {analyticsSection === 'intrigues' ? (
              <div className="endgame-analytics-player-sections">
                {renderIntrigueSection(gameState.players, gameStats)}
              </div>
            ) : null}

            {analyticsSection === 'card-plays' ? (
              <div className="endgame-analytics-player-sections">
                {renderCardPlaysSection(gameState.players, gameStats)}
              </div>
            ) : null}

            {analyticsSection === 'acquire-reveal' ? (
              <div className="endgame-analytics-player-sections">
                {renderAcquireRevealSection(gameState.players, gameStats)}
              </div>
            ) : null}

            {analyticsSection === 'board-visits' ? (
              <div className="endgame-analytics-table-wrap">
                <table className="endgame-analytics-table endgame-analytics-table--board">
                  <thead>
                    <tr>
                      <th scope="col">Board space</th>
                      {gameState.players.map(player => (
                        <th key={player.id} scope="col">
                          <span className="endgame-analytics-player-head">
                            <EndgameLeaderAvatar player={player} variant="icon" />
                            {player.leader.name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boardVisitRows.length === 0 ? (
                      <tr>
                        <td colSpan={gameState.players.length + 1} className="endgame-empty-stat">
                          No agent placements recorded.
                        </td>
                      </tr>
                    ) : (
                      boardVisitRows.map(row => (
                        <tr key={row.spaceId}>
                          <th scope="row">{row.spaceName}</th>
                          {gameState.players.map(player => {
                            const count =
                              gameStats[player.id]?.boardVisits.find(v => v.spaceId === row.spaceId)
                                ?.count ?? 0
                            return <td key={player.id}>{count > 0 ? count : '—'}</td>
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}

        {isRevealPickerOpen && activePlayer && activePlayer.intrigueCount > 0 ? (
          <div className="endgame-reveal-picker">
            <CardSearch
              embedded
              isOpen
              cards={gameState.intrigueDeck}
              selectionCount={activePlayer.intrigueCount}
              onSelect={handleRevealConfirm}
              onCancel={() => setIsRevealPickerOpen(false)}
              isRevealTurn={false}
              text={`Reveal ${activePlayer.intrigueCount} intrigue card${activePlayer.intrigueCount === 1 ? '' : 's'}`}
              showSelectionPreview
              cancelButtonText="Cancel"
            />
          </div>
        ) : null}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return overlay
  if (!portalTarget) return null
  return createPortal(overlay, portalTarget)
}

export default EndgameOverlay
