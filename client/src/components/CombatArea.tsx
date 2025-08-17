import React from 'react'
import { Player } from '../types/GameTypes'

interface CombatAreaProps {
  troops: Record<number, number>  // playerId -> number of troops
  players: Player[]
  combatStrength?: Record<number, number>  // playerId -> total strength
}

const CombatArea: React.FC<CombatAreaProps> = ({
  troops,
  players,
  combatStrength = {}
}) => {
  const renderTroops = (playerId: number) => {
    const troopCount = troops[playerId] || 0
    if (troopCount === 0) return null

    return (
      <div className={`troop-marker player-${playerId}`}>
        <span className="troop-count">{troopCount}</span>
      </div>
    )
  }

  const renderStrength = (playerId: number) => {
    const strength = combatStrength[playerId] || 0
    if (strength === 0) return null

    return (
      <div className="combat-strength">
        <span className="strength-value">⚔️ {strength}</span>
      </div>
    )
  }

  return (
    <div className="combat-area">
      <div className="combat-grid">
          <div key={players[0].id} className="combat-cell">
            {renderTroops(players[0].id)}
            {renderStrength(players[0].id)}
          </div>
          <div key={players[1].id} className="combat-cell">
            {renderTroops(players[1].id)}
            {renderStrength(players[1].id)}
          </div>  
          <div key={players[3].id} className="combat-cell">
            {renderTroops(players[3].id)}
            {renderStrength(players[3].id)}
          </div>  
          <div key={players[2].id} className="combat-cell">
            {renderTroops(players[2].id)}
            {renderStrength(players[2].id)}
          </div>  
      </div>
    </div>
  )
}

export default CombatArea 