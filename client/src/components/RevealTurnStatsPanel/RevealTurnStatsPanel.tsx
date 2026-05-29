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

  const acquiredCards = (
    <>
      {stats.acquiredCards.length === 0 ? (
        <span className="reveal-turn-stat-empty">None</span>
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
    </>
  )

  if (compact) {
    return (
      <div
        className="reveal-turn-stats-panel reveal-turn-stats-panel--compact reveal-turn-stats-panel--acquired-only"
        aria-label="Cards acquired on reveal"
      >
        <span className="reveal-turn-stat-label">Acquired</span>
        <div
          className="reveal-turn-stat-value reveal-turn-stat-acquired-list"
          title={acquiredLabel}
        >
          {acquiredCards}
        </div>
      </div>
    )
  }

  return (
    <div className="reveal-turn-stats-panel" aria-label="Reveal turn statistics">
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
