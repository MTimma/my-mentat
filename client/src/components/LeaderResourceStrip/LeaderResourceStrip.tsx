import { Player } from '../../types/GameTypes'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import { GameState } from '../../types/GameTypes'
import './LeaderResourceStrip.css'

interface LeaderResourceStripProps {
  player: Player
  gameState?: GameState
  leaderName?: string
  /** Omit leader name and tighten spacing (e.g. history banner). */
  compact?: boolean
}

const LeaderResourceStrip = ({ player, gameState, leaderName, compact }: LeaderResourceStripProps) => {
  const vp = gameState ? getTotalVictoryPoints(player, gameState) : player.victoryPoints

  return (
    <div
      className={`leader-resource-strip${compact ? ' leader-resource-strip--compact' : ''}`}
      aria-label={`${leaderName ?? player.leader.name} resources`}
    >
      {leaderName && !compact && <span className="leader-resource-strip-name">{leaderName}</span>}
      <span className="leader-resource-item" title="Victory points">
        <img src="/icon/vp.png" alt="" className="leader-resource-icon" />
        <span className="leader-resource-value">{vp}</span>
      </span>
      <span className="leader-resource-item" title="Spice">
        <img src="/icon/spice.png" alt="" className="leader-resource-icon" />
        <span className="leader-resource-value">{player.spice}</span>
      </span>
      <span className="leader-resource-item" title="Water">
        <img src="/icon/water.png" alt="" className="leader-resource-icon" />
        <span className="leader-resource-value">{player.water}</span>
      </span>
      <span className="leader-resource-item" title="Solari">
        <img src="/icon/solari.png" alt="" className="leader-resource-icon" />
        <span className="leader-resource-value">{player.solari}</span>
      </span>
      <span className="leader-resource-item" title="Garrison troops">
        <img src="/icon/troop.png" alt="" className="leader-resource-icon" />
        <span className="leader-resource-value">{player.troops}</span>
      </span>
    </div>
  )
}

export default LeaderResourceStrip
