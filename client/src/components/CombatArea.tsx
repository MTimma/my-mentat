import React from 'react'
import { Player } from '../types/GameTypes'

interface CombatAreaProps {
  troops: Record<number, number>  // playerId -> troops in combat
  players: Player[]  // Add players prop
}

const CombatArea: React.FC<CombatAreaProps> = ({ troops }) => {
  const renderCombatCell = (playerId: number) => {
    const troopCount = troops[playerId] || 0
    if (troopCount === 0) return null

    return (
      <div className={`troop-marker player-${playerId}`}>
        <span className="troop-count">{troopCount}</span>
      </div>
    )
  }

  return (
    <div className="combat-area">
      <div className="combat-grid">
        <div className="combat-cell top-left">
          {renderCombatCell(1)}
        </div>
        <div className="combat-cell top-right">
          {renderCombatCell(2)}
        </div>
        <div className="combat-cell bottom-left">
          {renderCombatCell(4)}
        </div>
        <div className="combat-cell bottom-right">
          {renderCombatCell(3)}
        </div>
      </div>
    </div>
  )
}

export default CombatArea 