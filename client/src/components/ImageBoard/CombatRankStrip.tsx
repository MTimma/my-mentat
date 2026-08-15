import React, { useMemo } from 'react'
import type { Player } from '../../types/GameTypes'
import { getLeaderIconPath } from '../../data/leaders'
import { buildCombatRankSlots, type CombatRankEntry } from '../../utils/combatRankStrip'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import './CombatRankStrip.css'

export interface CombatRankStripProps {
  players: Player[]
  troops: Record<number, number>
  strength: Record<number, number>
  activePlayerId: number
  riseOfIx?: boolean
  className?: string
  style?: React.CSSProperties
}

function placeOrdinal(place: number): string {
  if (place === 1) return '1st'
  if (place === 2) return '2nd'
  if (place === 3) return '3rd'
  return `${place}th`
}

export const CombatRankChip: React.FC<{
  entry: CombatRankEntry
  riseOfIx: boolean
  isActive: boolean
}> = ({ entry, riseOfIx, isActive }) => {
  const { player, place, troops: troopCount, dreadnoughts, strength: total } = entry
  const iconPath = getLeaderIconPath(player.leader.name)
  return (
    <div
      className={[
        'combat-rank-strip__chip',
        `combat-rank-strip__chip--${player.color}`,
        isActive ? 'combat-rank-strip__chip--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${place}. ${player.leader.name}: ${troopCount} troops${
        riseOfIx ? `, ${dreadnoughts} dreadnoughts` : ''
      }, ${total} strength`}
      data-player-id={player.id}
      data-place={place}
    >
      <span className="combat-rank-strip__body" aria-hidden="true">
        <span className={`combat-rank-strip__leader leader-avatar-btn ${player.color}`}>
          {iconPath ? (
            <img
              src={iconPath}
              alt=""
              className="combat-rank-strip__leader-icon"
              draggable={false}
            />
          ) : (
            <span className="combat-rank-strip__leader-fallback">
              {player.leader.name.charAt(0)}
            </span>
          )}
        </span>
        <span className="combat-rank-strip__strength">
          <img src="/icon/sword.png" alt="" className="combat-rank-strip__icon" />
          <span className="combat-rank-strip__value combat-rank-strip__value--strength">{total}</span>
        </span>
      </span>
      <span className="combat-rank-strip__rule" aria-hidden="true" />
      <span className="combat-rank-strip__forces" aria-hidden="true">
        <span className="combat-rank-strip__stat">
          <img src="/icon/troop.png" alt="" className="combat-rank-strip__icon" />
          <span className="combat-rank-strip__value">{troopCount}</span>
        </span>
        {riseOfIx ? (
          <span className="combat-rank-strip__stat">
            <DreadnoughtIcon
              playerId={player.id}
              className="combat-rank-strip__icon combat-rank-strip__icon--dreadnought"
            />
            <span className="combat-rank-strip__value">{dreadnoughts}</span>
          </span>
        ) : null}
      </span>
    </div>
  )
}

const CombatRankStrip: React.FC<CombatRankStripProps> = ({
  players,
  troops,
  strength,
  activePlayerId,
  riseOfIx = false,
  className,
  style,
}) => {
  const slots = useMemo(
    () => buildCombatRankSlots({ players, troops, strength, riseOfIx }),
    [players, troops, strength, riseOfIx]
  )

  const occupied = slots.some(slot => slot.entry != null)
  if (!occupied) return null

  return (
    <div
      className={['combat-rank-strip', 'combat-rank-strip--board', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      data-marker="combat-rank-strip"
      data-slot-count={slots.length}
      role="list"
      aria-label="Combat rankings"
    >
      {slots.map(slot => {
        const { slotPlace, entry } = slot
        const occupiedLabel = entry
          ? `${placeOrdinal(entry.place)} place, ${entry.player.leader.name}, ${entry.troops} troops${
              riseOfIx ? `, ${entry.dreadnoughts} dreadnoughts` : ''
            }, ${entry.strength} strength`
          : `${placeOrdinal(slotPlace)} place, empty`
        return (
          <div
            key={slotPlace}
            className={`combat-rank-strip__slot combat-rank-strip__slot--place-${slotPlace}`}
            data-slot-place={slotPlace}
            role="listitem"
            aria-label={occupiedLabel}
          >
            <span
              className={`combat-rank-strip__slot-label combat-rank-strip__slot-label--${slotPlace}`}
              aria-hidden="true"
            >
              {slotPlace}
            </span>
            {entry ? (
              <CombatRankChip
                entry={entry}
                riseOfIx={riseOfIx}
                isActive={entry.player.id === activePlayerId}
              />
            ) : (
              <div className="combat-rank-strip__chip combat-rank-strip__chip--empty" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default CombatRankStrip
