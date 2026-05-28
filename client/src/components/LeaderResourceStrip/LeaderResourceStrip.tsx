import { FactionType, Player } from '../../types/GameTypes'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import { GameState } from '../../types/GameTypes'
import { OptionalCostResourceKind } from '../../utils/influenceChoices'
import './LeaderResourceStrip.css'

interface LeaderResourceStripProps {
  player: Player
  gameState?: GameState
  leaderName?: string
  /** Omit leader name and tighten spacing (e.g. history banner). */
  compact?: boolean
  /** When set, only these resources are shown (e.g. costs the player cannot pay). */
  onlyResources?: OptionalCostResourceKind[]
}

const ALL_FACTIONS: FactionType[] = [
  FactionType.EMPEROR,
  FactionType.SPACING_GUILD,
  FactionType.BENE_GESSERIT,
  FactionType.FREMEN,
]

const LeaderResourceStrip = ({
  player,
  gameState,
  leaderName,
  compact,
  onlyResources,
}: LeaderResourceStripProps) => {
  const vp = gameState ? getTotalVictoryPoints(player, gameState) : player.victoryPoints
  const show = (kind: OptionalCostResourceKind | 'vp') =>
    !onlyResources || onlyResources.includes(kind as OptionalCostResourceKind)
  const showVp = !onlyResources

  const showCardPiles = !onlyResources

  const maxInfluence =
    gameState &&
    Math.max(
      0,
      ...ALL_FACTIONS.map(f => gameState.factionInfluence[f]?.[player.id] ?? 0)
    )

  if (onlyResources && onlyResources.length === 0) {
    return null
  }

  return (
    <div
      className={`leader-resource-strip${compact ? ' leader-resource-strip--compact' : ''}`}
      aria-label={
        onlyResources
          ? `Insufficient resources: ${onlyResources.join(', ')}`
          : `${leaderName ?? player.leader.name} resources`
      }
    >
      {leaderName && !compact && <span className="leader-resource-strip-name">{leaderName}</span>}
      {showVp && (
        <span className="leader-resource-item" title="Victory points">
          <img src="/icon/vp.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{vp}</span>
        </span>
      )}
      {show('spice') && (
        <span className="leader-resource-item" title="Spice">
          <img src="/icon/spice.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.spice}</span>
        </span>
      )}
      {show('water') && (
        <span className="leader-resource-item" title="Water">
          <img src="/icon/water.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.water}</span>
        </span>
      )}
      {show('solari') && (
        <span className="leader-resource-item" title="Solari">
          <img src="/icon/solari.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.solari}</span>
        </span>
      )}
      {show('troops') && (
        <span className="leader-resource-item" title="Garrison troops">
          <img src="/icon/troop.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.troops}</span>
        </span>
      )}
      {showCardPiles && (
        <>
          <span className="leader-resource-item" title="Cards in hand">
            <img src="/icon/draw.png" alt="" className="leader-resource-icon" />
            <span className="leader-resource-value">{player.handCount}</span>
          </span>
          <span className="leader-resource-item" title="Deck">
            <span className="leader-resource-abbr" aria-hidden="true">
              D
            </span>
            <span className="leader-resource-value">{player.deck.length}</span>
          </span>
          <span className="leader-resource-item" title="Discard pile">
            <span className="leader-resource-abbr" aria-hidden="true">
              Dc
            </span>
            <span className="leader-resource-value">{player.discardPile.length}</span>
          </span>
          <span className="leader-resource-item" title="Trashed cards">
            <img src="/icon/trash.png" alt="" className="leader-resource-icon" />
            <span className="leader-resource-value">{player.trash.length}</span>
          </span>
        </>
      )}
      {onlyResources?.includes('influence') && (
        <span className="leader-resource-item" title="Highest faction influence">
          <img src="/icon/bump.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{maxInfluence ?? 0}</span>
        </span>
      )}
    </div>
  )
}

export default LeaderResourceStrip
