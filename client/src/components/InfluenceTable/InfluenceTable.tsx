import React from 'react'
import { Player, FactionType } from '../../types/GameTypes'
import './InfluenceTable.css'

interface InfluenceTableProps {
  players: Player[]
  factionInfluence: Record<FactionType, Record<number, number>>
}

const InfluenceTable: React.FC<InfluenceTableProps> = ({ players, factionInfluence }) => {
  const factions = [
    { type: FactionType.EMPEROR, name: 'Emperor' },
    { type: FactionType.SPACING_GUILD, name: 'Spacing Guild' },
    { type: FactionType.BENE_GESSERIT, name: 'Bene Gesserit' },
    { type: FactionType.FREMEN, name: 'Fremen' }
  ]

  const getPlayerInfluence = (playerId: number, faction: FactionType): number => {
    return factionInfluence[faction]?.[playerId] || 0
  }

  const getHighestInfluence = (faction: FactionType): number => {
    return Math.max(
      ...players.map(player => getPlayerInfluence(player.id, faction)),
      0
    )
  }

  const isHighest = (playerId: number, faction: FactionType): boolean => {
    const highest = getHighestInfluence(faction)
    return highest > 0 && getPlayerInfluence(playerId, faction) === highest
  }

  return (
    <div className="influence-table-container">
      <h3 className="influence-table-title">Faction Influence</h3>
      <table className="influence-table">
        <thead>
          <tr>
            <th className="influence-table-player-col">Player</th>
            {factions.map(({ type, name }) => (
              <th key={type} className="influence-table-faction-col">
                <div className="faction-header">
                  <img className="faction-header-icon" src={`icon/${type}.png`} alt={name} />
                  <span>{name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} className={`influence-table-row player-${player.color}`}>
              <td className="influence-table-player-cell">
                <div className="player-cell-content">
                  <div className={`color-indicator ${player.color}`}></div>
                  <span className="player-name">{player.leader.name}</span>
                </div>
              </td>
              {factions.map(({ type }) => {
                const influence = getPlayerInfluence(player.id, type)
                const highest = isHighest(player.id, type)
                return (
                  <td
                    key={type}
                    className={`influence-table-cell ${highest ? 'highest-influence' : ''}`}
                  >
                    {influence}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default InfluenceTable
