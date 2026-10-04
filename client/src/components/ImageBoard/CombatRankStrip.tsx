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

function memberForcesLabel(entry: CombatRankEntry, riseOfIx: boolean): string {
  return `${entry.troops} troops${riseOfIx ? `, ${entry.dreadnoughts} dreadnoughts` : ''}`
}

/** One reward box. Tied players stack inside it and share one strength. */
const BoardRankBox: React.FC<{
  entries: CombatRankEntry[]
  riseOfIx: boolean
  activePlayerId: number
}> = ({ entries, riseOfIx, activePlayerId }) => {
  const place = entries[0]?.place ?? 0
  const total = entries[0]?.strength ?? 0
  const tied = entries.length > 1
  const solo = entries.length === 1 ? entries[0] : null
  const title = entries
    .map(entry => `${entry.player.leader.name}: ${memberForcesLabel(entry, riseOfIx)}`)
    .join('; ')
  return (
    <div
      className={[
        'combat-rank-strip__chip',
        solo ? `combat-rank-strip__chip--${solo.player.color}` : '',
        tied ? 'combat-rank-strip__chip--tied' : '',
        entries.some(entry => entry.player.id === activePlayerId)
          ? 'combat-rank-strip__chip--active'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${place}. ${title}, ${total} strength`}
      data-place={place}
      data-tie-count={entries.length}
    >
      <span className="combat-rank-strip__strength" aria-hidden="true">
        <img src="/icon/sword.png" alt="" className="combat-rank-strip__icon" />
        <span className="combat-rank-strip__value combat-rank-strip__value--strength">{total}</span>
      </span>
      <span className="combat-rank-strip__members">
        {entries.map(entry => {
          const iconPath = getLeaderIconPath(entry.player.leader.name)
          return (
            <span
              key={entry.player.id}
              className={[
                'combat-rank-strip__member',
                `combat-rank-strip__member--${entry.player.color}`,
                entry.player.id === activePlayerId ? 'combat-rank-strip__member--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-player-id={entry.player.id}
            >
              <span className={`combat-rank-strip__leader leader-avatar-btn ${entry.player.color}`}>
                {iconPath ? (
                  <img
                    src={iconPath}
                    alt=""
                    className="combat-rank-strip__leader-icon"
                    draggable={false}
                  />
                ) : (
                  <span className="combat-rank-strip__leader-fallback">
                    {entry.player.leader.name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="combat-rank-strip__forces" aria-hidden="true">
                <span className="combat-rank-strip__stat">
                  <img src="/icon/troop.png" alt="" className="combat-rank-strip__icon" />
                  <span className="combat-rank-strip__value">{entry.troops}</span>
                </span>
                {riseOfIx ? (
                  <span className="combat-rank-strip__stat">
                    <DreadnoughtIcon
                      playerId={entry.player.id}
                      className="combat-rank-strip__icon combat-rank-strip__icon--dreadnought"
                    />
                    <span className="combat-rank-strip__value">{entry.dreadnoughts}</span>
                  </span>
                ) : null}
              </span>
            </span>
          )
        })}
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

  // Slot data is place 4 → place 1. The column reads top → bottom, place 1 first.
  const slotsTopFirst = [...slots].reverse()

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
      {slotsTopFirst.map(slot => {
        const { slotPlace, entries } = slot
        const occupiedLabel =
          entries.length > 0
            ? `${placeOrdinal(entries[0].place)} place, ${entries
                .map(entry => `${entry.player.leader.name}, ${memberForcesLabel(entry, riseOfIx)}`)
                .join('; ')}, ${entries[0].strength} strength`
            : `${placeOrdinal(slotPlace)} place, empty`
        return (
          <div
            key={slotPlace}
            className={`combat-rank-strip__slot combat-rank-strip__slot--place-${slotPlace}`}
            data-slot-place={slotPlace}
            data-reward-place={entries[0]?.place ?? undefined}
            role="listitem"
            aria-label={occupiedLabel}
          >
            {entries.length > 1 ? (
              <BoardRankBox
                entries={entries}
                riseOfIx={riseOfIx}
                activePlayerId={activePlayerId}
              />
            ) : entries.length === 1 ? (
              <CombatRankChip
                entry={entries[0]}
                riseOfIx={riseOfIx}
                isActive={entries[0].player.id === activePlayerId}
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
