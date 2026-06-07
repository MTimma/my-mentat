import React from 'react'
import type { Player } from '../../types/GameTypes'
import { getLeaderIconPath } from '../../data/leaders'
import { getDreadnoughtsInConflict } from '../../utils/dreadnoughts'

type ResourceDef = {
  icon: string
  title: string
  getValue: (player: Player) => number
}

const CURRENCY_RESOURCES: ResourceDef[] = [
  { icon: '/icon/spice.png', title: 'Spice', getValue: player => player.spice },
  { icon: '/icon/water.png', title: 'Water', getValue: player => player.water },
  { icon: '/icon/solari.png', title: 'Solari', getValue: player => player.solari },
]

const PLAYER_RESOURCES: ResourceDef[] = [
  { icon: '/icon/troop.png', title: 'Garrison troops', getValue: player => player.troops },
  { icon: '/icon/draw.png', title: 'Cards in hand', getValue: player => player.handCount },
  { icon: '/icon/intrigue.png', title: 'Intrigue cards', getValue: player => player.intrigueCount },
]

function renderResourceRow(resources: ResourceDef[], player: Player) {
  return (
    <div className="image-board__combat-stat-resources">
      {resources.map(resource => (
        <span
          key={resource.title}
          className="image-board__combat-stat-resource"
          title={resource.title}
        >
          <img
            src={resource.icon}
            alt=""
            className="image-board__combat-stat-icon"
            aria-hidden="true"
          />
          <span className="image-board__combat-stat-value">{resource.getValue(player)}</span>
        </span>
      ))}
    </div>
  )
}

export interface CombatPlayerStatProps {
  player: Player
  troops: number
  strength: number
  /** Centered in a conflict ring on the board art. */
  layout?: 'ring' | 'inline'
  className?: string
  style?: React.CSSProperties
  'data-marker'?: string
  'data-player-id'?: number
}

const CombatPlayerStat: React.FC<CombatPlayerStatProps> = ({
  player,
  troops,
  strength,
  layout = 'inline',
  className,
  style,
  'data-marker': dataMarker,
  'data-player-id': dataPlayerId,
}) => {
  const dreadnoughts = getDreadnoughtsInConflict(player)
  const leaderIconPath = getLeaderIconPath(player.leader.name)
  const titleParts = [
    `${player.leader.name}:`,
    `${player.spice} spice`,
    `${player.water} water`,
    `${player.solari} solari`,
    `${player.troops} garrison troops`,
    `${player.handCount} in hand`,
    `${player.intrigueCount} intrigue cards`,
    `${troops} troops in conflict`,
    dreadnoughts > 0 ? `${dreadnoughts} dreadnoughts` : null,
    `${strength} combat strength`,
  ].filter(Boolean)

  const rootClass = [
    className,
    layout === 'ring' ? 'image-board__combat-stat--ring' : '',
    layout === 'ring' ? `image-board__combat-stat--${player.color}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      style={style}
      data-marker={dataMarker}
      data-player-id={dataPlayerId}
      title={titleParts.join(', ')}
    >
      <span
        className={`image-board__combat-stat-leader leader-avatar-btn ${player.color}`}
        aria-hidden="true"
      >
        {leaderIconPath ? (
          <img
            src={leaderIconPath}
            alt=""
            className="image-board__combat-stat-leader-icon"
            draggable={false}
          />
        ) : (
          <span className="image-board__combat-stat-leader-fallback">
            {player.leader.name.charAt(0)}
          </span>
        )}
      </span>
      <div className="image-board__combat-stat-body" aria-hidden="true">
        <div className="image-board__combat-stat-panel">
          {renderResourceRow(CURRENCY_RESOURCES, player)}
          {renderResourceRow(PLAYER_RESOURCES, player)}
          <div className="image-board__combat-stat-combat">
            <span className="image-board__combat-stat-deployed">
              <span className="image-board__combat-stat-item">
                <img
                  src="/icon/troop.png"
                  alt=""
                  className="image-board__combat-stat-icon"
                  aria-hidden="true"
                />
                {troops}
              </span>
              {dreadnoughts > 0 ? (
                <span className="image-board__combat-stat-item">
                  <img
                    src="/icon/dreadnought.svg"
                    alt=""
                    className="image-board__combat-stat-icon image-board__combat-stat-icon--dreadnought"
                    aria-hidden="true"
                  />
                  {dreadnoughts}
                </span>
              ) : null}
            </span>
            <span className="image-board__combat-stat-strength">
              <span className="image-board__combat-stat-item image-board__combat-stat-item--strength">
                <img
                  src="/icon/dagger.png"
                  alt=""
                  className="image-board__combat-stat-icon"
                  aria-hidden="true"
                />
                {strength}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CombatPlayerStat
