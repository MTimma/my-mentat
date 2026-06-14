import React from 'react'
import { PlayerColor, type Player } from '../../types/GameTypes'
import { getDreadnoughtsInConflict } from '../../utils/dreadnoughts'
/** Same seat order as the 2×2 combat grid: red, green, blue, yellow. */
const COMBAT_STATUS_ORDER: PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.GREEN,
  PlayerColor.BLUE,
  PlayerColor.YELLOW,
]

export function PlayerCombatSlot({
  player,
  troops,
  strength,
  isActive,
}: {
  player: Player
  troops: number
  strength: number
  isActive: boolean
}) {
  const dreadnoughts = getDreadnoughtsInConflict(player)

  return (
    <div
      className={[
        'combat-status-strip__slot',
        `combat-status-strip__slot--${player.color}`,
        isActive ? 'combat-status-strip__slot--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${player.leader.name}: ${troops} troops, ${strength} strength`}
      aria-label={`${player.leader.name}, ${troops} troops in conflict${
        dreadnoughts > 0 ? `, ${dreadnoughts} dreadnoughts` : ''
      }, ${strength} strength`}
    >
      <span className="combat-status-strip__color" aria-hidden="true" />
      <span className="combat-status-strip__stats">
        <span className="combat-status-strip__stat">
          <img src="/icon/troop.png" alt="" className="combat-status-strip__icon" aria-hidden="true" />
          <span className="combat-status-strip__value">{troops}</span>
        </span>
        {dreadnoughts > 0 ? (
          <span className="combat-status-strip__stat">
            <img
              src="/icon/dreadnought.svg"
              alt=""
              className="combat-status-strip__icon combat-status-strip__icon--dreadnought"
              aria-hidden="true"
            />
            <span className="combat-status-strip__value">{dreadnoughts}</span>
          </span>
        ) : null}
        <span className="combat-status-strip__stat combat-status-strip__stat--strength">
          <img src="/icon/dagger.png" alt="" className="combat-status-strip__icon" aria-hidden="true" />
          <span className="combat-status-strip__value">{strength}</span>
        </span>
      </span>
    </div>
  )
}

export interface CombatStatusStripProps {
  players: Player[]
  troops: Record<number, number>
  strength: Record<number, number>
  activePlayerId: number
}

const CombatStatusStrip: React.FC<CombatStatusStripProps> = ({
  players,
  troops,
  strength,
  activePlayerId,
}) => {
  const playerByColor = new Map(players.map(p => [p.color, p]))

  return (
    <div className="combat-status-strip" data-marker="combat-status">
      {COMBAT_STATUS_ORDER.map(color => {
        const player = playerByColor.get(color)
        if (!player) return null

        return (
          <PlayerCombatSlot
            key={color}
            player={player}
            troops={troops[player.id] ?? 0}
            strength={strength[player.id] ?? 0}
            isActive={player.id === activePlayerId}
          />
        )
      })}
    </div>
  )
}

export default CombatStatusStrip
