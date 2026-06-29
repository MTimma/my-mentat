import { Gain } from '../../types/GameTypes'
import { RevealTurnStats } from '../../utils/revealTurnStats'
import {
  excludeAcquiredGainsFromDisplay,
  getAcquireEffectGainsForCard,
  getAcquireEffectGainsForTechTile,
} from '../../utils/turnGainsDisplay'
import TurnGainsDisplay from '../TurnGainsDisplay/TurnGainsDisplay'
import './RevealTurnStatsPanel.css'

interface RevealTurnStatsPanelProps {
  stats: RevealTurnStats
  compact?: boolean
  /** Hide acquired card names; thumbnails and tooltips remain. */
  hideAcquiredNames?: boolean
  /** Only render the Acquired section (e.g. agent-turn intrigue acquire). */
  acquiredOnly?: boolean
  /** Turn-scoped gains for persuasion / resource totals. */
  gains?: Gain[]
  /** Omit revealed card row (e.g. turn history header already shows them). */
  hideRevealedCards?: boolean
  troopsDeployedToConflict?: number
  troopsRetreatedFromConflict?: number
  resolveCard?: (cardId: number, name: string) => import('../../types/GameTypes').Card | undefined
}

const RevealTurnStatsPanel = ({
  stats,
  compact = false,
  hideAcquiredNames = false,
  acquiredOnly = false,
  gains = [],
  troopsDeployedToConflict = 0,
  troopsRetreatedFromConflict = 0,
  resolveCard,
  hideRevealedCards = false,
}: RevealTurnStatsPanelProps) => {
  const acquiredCardIds = stats.acquiredCards.map(card => card.id)
  const acquiredTechTileIds = stats.acquiredTechTiles.map(tile => tile.id)
  const hasAcquiredCards = stats.acquiredCards.length > 0
  const hasAcquiredTech = stats.acquiredTechTiles.length > 0
  const hasAcquired = hasAcquiredCards || hasAcquiredTech

  const acquiredLabel = !hasAcquired
    ? 'None'
    : [...stats.acquiredCards.map(card => card.name), ...stats.acquiredTechTiles.map(tile => tile.name)].join(', ')

  const totalsGains = excludeAcquiredGainsFromDisplay(gains, acquiredCardIds, acquiredTechTileIds)

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
      {stats.acquiredCards.map(card => {
        const acquireGains = getAcquireEffectGainsForCard(gains, card.id)
        return (
          <span key={card.id} className="reveal-turn-acquired-card" title={card.name}>
            {card.image ? (
              <img src={card.image} alt="" className="reveal-turn-acquired-thumb" />
            ) : null}
            {!hideAcquiredNames ? (
              <span className="reveal-turn-acquired-name">{card.name}</span>
            ) : null}
            {card.cost != null && card.cost > 0 ? (
              <span className="reveal-turn-acquired-cost">{card.cost}</span>
            ) : null}
            {acquireGains.length > 0 ? (
              <span className="reveal-turn-acquired-effects">
                <TurnGainsDisplay
                  gains={acquireGains}
                  totalsOnly
                  showTotals
                  omitPositiveSign
                  resolveCard={resolveCard}
                />
              </span>
            ) : null}
          </span>
        )
      })}
      {stats.acquiredTechTiles.map(tile => {
        const acquireGains = getAcquireEffectGainsForTechTile(gains, tile.id)
        return (
          <span key={tile.id} className="reveal-turn-acquired-card reveal-turn-acquired-tech" title={tile.name}>
            {tile.image ? (
              <img src={tile.image} alt="" className="reveal-turn-acquired-thumb reveal-turn-acquired-thumb--tech" />
            ) : null}
            {!hideAcquiredNames ? (
              <span className="reveal-turn-acquired-name">{tile.name}</span>
            ) : null}
            {tile.cost > 0 ? <span className="reveal-turn-acquired-cost">{tile.cost}</span> : null}
            {acquireGains.length > 0 ? (
              <span className="reveal-turn-acquired-effects">
                <TurnGainsDisplay
                  gains={acquireGains}
                  totalsOnly
                  showTotals
                  omitPositiveSign
                  resolveCard={resolveCard}
                />
              </span>
            ) : null}
          </span>
        )
      })}
    </>
  )

  const acquiredSection = (
    <div className="reveal-turn-acquired-section">
      <span className="reveal-turn-stat-label">Acquired</span>
      <div className="reveal-turn-stat-value reveal-turn-stat-acquired-list" title={acquiredLabel}>
        {hasAcquired ? acquiredCards : <span className="reveal-turn-stat-empty">None</span>}
      </div>
    </div>
  )

  const totalsRow =
    totalsGains.length > 0 || troopsDeployedToConflict > 0 || troopsRetreatedFromConflict > 0 ? (
      <TurnGainsDisplay
        gains={totalsGains}
        totalsOnly
        showTotals
        omitPositiveSign
        resolveCard={resolveCard}
        troopsDeployedToConflict={troopsDeployedToConflict}
        troopsRetreatedFromConflict={troopsRetreatedFromConflict}
      />
    ) : null

  if (acquiredOnly) {
    if (!hasAcquired) return null
    return (
      <div
        className="reveal-turn-stats-panel reveal-turn-stats-panel--compact reveal-turn-stats-panel--history reveal-turn-stats-panel--acquired-only"
        aria-label="Acquired cards and tech"
      >
        {acquiredSection}
      </div>
    )
  }

  if (compact) {
    const extras = (
      <div className="reveal-turn-stats-panel__extras">
        {totalsRow}
        {hasAcquired ? acquiredSection : null}
      </div>
    )

    return (
      <div
        className="reveal-turn-stats-panel reveal-turn-stats-panel--compact reveal-turn-stats-panel--history"
        aria-label="Reveal turn summary"
      >
        {!hideRevealedCards && stats.revealedCards.length > 0 ? revealedCards : null}
        {extras}
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
          {hasAcquired ? acquiredCards : <span className="reveal-turn-stat-empty">None</span>}
        </span>
      </div>
    </div>
  )
}

export default RevealTurnStatsPanel
