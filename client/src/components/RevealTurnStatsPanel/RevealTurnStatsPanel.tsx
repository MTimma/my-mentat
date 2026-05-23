import { RevealTurnStats } from '../../utils/revealTurnStats'
import './RevealTurnStatsPanel.css'

interface RevealTurnStatsPanelProps {
  stats: RevealTurnStats
  compact?: boolean
}

const RevealTurnStatsPanel = ({ stats, compact = false }: RevealTurnStatsPanelProps) => {
  const acquiredLabel =
    stats.acquiredCards.length === 0
      ? 'None'
      : stats.acquiredCards.map(card => card.name).join(', ')

  return (
    <div
      className={`reveal-turn-stats-panel ${compact ? 'reveal-turn-stats-panel--compact' : ''}`}
      aria-label="Reveal turn statistics"
    >
      <div className="reveal-turn-stat">
        <span className="reveal-turn-stat-label">Persuasion</span>
        <span className="reveal-turn-stat-value">
          <img src="/icon/persuasion.png" alt="" className="reveal-turn-stat-icon" />
          <span className="reveal-turn-stat-number">{stats.totalPersuasion}</span>
          <span className="reveal-turn-stat-meta">total</span>
          {stats.spentPersuasion > 0 && (
            <span className="reveal-turn-stat-meta">· {stats.spentPersuasion} spent</span>
          )}
        </span>
      </div>
      <div className="reveal-turn-stat reveal-turn-stat--acquired">
        <span className="reveal-turn-stat-label">Acquired</span>
        <span className="reveal-turn-stat-value reveal-turn-stat-acquired-list" title={acquiredLabel}>
          {stats.acquiredCards.length === 0 ? (
            <span className="reveal-turn-stat-empty">—</span>
          ) : (
            stats.acquiredCards.map(card => (
              <span key={card.id} className="reveal-turn-acquired-card">
                {card.image ? (
                  <img src={card.image} alt="" className="reveal-turn-acquired-thumb" />
                ) : null}
                <span className="reveal-turn-acquired-name">{card.name}</span>
                {card.cost != null && card.cost > 0 && (
                  <span className="reveal-turn-acquired-cost">{card.cost}</span>
                )}
              </span>
            ))
          )}
        </span>
      </div>
    </div>
  )
}

export default RevealTurnStatsPanel
