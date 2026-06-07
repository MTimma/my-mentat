import { Gain } from '../../types/GameTypes'
import { RevealTurnStats } from '../../utils/revealTurnStats'
import {
  excludeAcquireEffectGains,
  getAcquireEffectGainsForCard,
} from '../../utils/turnGainsDisplay'
import TurnGainsDisplay from '../TurnGainsDisplay/TurnGainsDisplay'
import './RevealTurnStatsPanel.css'

interface RevealTurnStatsPanelProps {
  stats: RevealTurnStats
  compact?: boolean
  /** Only render the Acquired section (e.g. agent-turn intrigue acquire). */
  acquiredOnly?: boolean
  /** Turn-scoped gains for persuasion / resource totals. */
  gains?: Gain[]
  troopsDeployedToConflict?: number
  troopsRetreatedFromConflict?: number
  resolveCard?: (cardId: number, name: string) => import('../../types/GameTypes').Card | undefined
}

const RevealTurnStatsPanel = ({
  stats,
  compact = false,
  acquiredOnly = false,
  gains = [],
  troopsDeployedToConflict = 0,
  troopsRetreatedFromConflict = 0,
  resolveCard,
}: RevealTurnStatsPanelProps) => {
  const acquiredLabel =
    stats.acquiredCards.length === 0
      ? 'None'
      : stats.acquiredCards.map(card => card.name).join(', ')

  const acquiredCardIds = stats.acquiredCards.map(card => card.id)
  const totalsGains = excludeAcquireEffectGains(gains, acquiredCardIds)

  const revealedCards = (
    <div className="reveal-turn-revealed-cards" aria-label="Revealed cards">
      {stats.revealedCards.map(card => (
        <span key={card.id} className="reveal-turn-revealed-card" title={card.name}>
          {card.image ? (
            <img src={card.image} alt="" className="reveal-turn-revealed-thumb" draggable={false} />
          ) : (
            <span className="reveal-turn-revealed-fallback">{card.name}</span>
          )}
        </span>
      ))}
    </div>
  )

  const acquiredCards = (
    <>
      {stats.acquiredCards.length === 0 ? (
        <span className="reveal-turn-stat-empty">None</span>
      ) : (
        stats.acquiredCards.map(card => {
          const acquireGains = getAcquireEffectGainsForCard(gains, card.id)
          return (
            <span key={card.id} className="reveal-turn-acquired-card">
              {card.image ? (
                <img src={card.image} alt="" className="reveal-turn-acquired-thumb" />
              ) : null}
              <span className="reveal-turn-acquired-name">{card.name}</span>
              {card.cost != null && card.cost > 0 && (
                <span className="reveal-turn-acquired-cost">{card.cost}</span>
              )}
              {acquireGains.length > 0 ? (
                <span className="reveal-turn-acquired-effects">
                  <TurnGainsDisplay gains={acquireGains} totalsOnly showTotals resolveCard={resolveCard} />
                </span>
              ) : null}
            </span>
          )
        })
      )}
    </>
  )

  const totalsRow =
    totalsGains.length > 0 || troopsDeployedToConflict > 0 || troopsRetreatedFromConflict > 0 ? (
      <TurnGainsDisplay
        gains={totalsGains}
        totalsOnly
        showTotals
        resolveCard={resolveCard}
        troopsDeployedToConflict={troopsDeployedToConflict}
        troopsRetreatedFromConflict={troopsRetreatedFromConflict}
      />
    ) : null

  if (acquiredOnly) {
    if (stats.acquiredCards.length === 0) return null
    return (
      <div
        className="reveal-turn-stats-panel reveal-turn-stats-panel--compact reveal-turn-stats-panel--history reveal-turn-stats-panel--acquired-only"
        aria-label="Acquired cards"
      >
        <div className="reveal-turn-acquired-section">
          <span className="reveal-turn-stat-label">Acquired</span>
          <div className="reveal-turn-stat-value reveal-turn-stat-acquired-list" title={acquiredLabel}>
            {acquiredCards}
          </div>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div
        className="reveal-turn-stats-panel reveal-turn-stats-panel--compact reveal-turn-stats-panel--history"
        aria-label="Reveal turn summary"
      >
        {stats.revealedCards.length > 0 ? revealedCards : null}
        {totalsRow}
        {stats.acquiredCards.length > 0 ? (
          <div className="reveal-turn-acquired-section">
            <span className="reveal-turn-stat-label">Acquired</span>
            <div className="reveal-turn-stat-value reveal-turn-stat-acquired-list" title={acquiredLabel}>
              {acquiredCards}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="reveal-turn-stats-panel" aria-label="Reveal turn statistics">
      {stats.revealedCards.length > 0 ? (
        <div className="reveal-turn-stat reveal-turn-stat--revealed">
          <span className="reveal-turn-stat-label">Revealed</span>
          <div className="reveal-turn-stat-value">{revealedCards}</div>
        </div>
      ) : null}
      {totalsRow ? (
        <div className="reveal-turn-stat reveal-turn-stat--totals">
          <span className="reveal-turn-stat-label">Totals</span>
          <div className="reveal-turn-stat-value reveal-turn-stat-totals-wrap">{totalsRow}</div>
        </div>
      ) : null}
      <div className="reveal-turn-stat reveal-turn-stat--acquired">
        <span className="reveal-turn-stat-label">Acquired</span>
        <span className="reveal-turn-stat-value reveal-turn-stat-acquired-list" title={acquiredLabel}>
          {acquiredCards}
        </span>
      </div>
    </div>
  )
}

export default RevealTurnStatsPanel
