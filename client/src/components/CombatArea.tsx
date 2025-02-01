import React from 'react'
import { Player, ConflictCard, FactionType } from '../types/GameTypes'

interface CombatAreaProps {
  troops: Record<number, number>  // playerId -> number of troops
  players: Player[]
  currentConflict?: ConflictCard | null
  combatStrength?: Record<number, number>  // playerId -> total strength
}

const CombatArea: React.FC<CombatAreaProps> = ({
  troops,
  players,
  currentConflict,
  combatStrength = {}
}) => {
  const renderTroops = (playerId: number) => {
    const troopCount = troops[playerId] || 0
    if (troopCount === 0) return null

    return (
      <div className="troop-marker player-${playerId}">
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

  const renderRewards = () => {
    if (!currentConflict) return null

    return (
      <div className="combat-rewards">
        <div className="first-place">
          {currentConflict.rewards.first.map((reward, index) => (
            <div key={index} className="reward">
              {reward.type === 'victory-points' && `${reward.amount}VP`}
              {reward.type === 'spice' && `${reward.amount}🌶️`}
              {reward.type === 'water' && `${reward.amount}💧`}
              {reward.type === 'solari' && `${reward.amount}💰`}
              {reward.type === 'troops' && `${reward.amount}⚔️`}
              {reward.type === 'influence' && 
                `${reward.amount} ${reward.faction} influence`}
              {reward.type === 'control' && 
                `Control of ${currentConflict.controlSpace}`}
            </div>
          ))}
        </div>
        <div className="second-place">
          {currentConflict.rewards.second.map((reward, index) => (
            <div key={index} className="reward">
              {/* Same reward rendering as above */}
            </div>
          ))}
        </div>
        {currentConflict.rewards.third && players.length === 4 && (
          <div className="third-place">
            {currentConflict.rewards.third.map((reward, index) => (
              <div key={index} className="reward">
                {/* Same reward rendering as above */}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="combat-area">
      <div className="combat-title">
        {currentConflict ? currentConflict.name : 'No Active Conflict'}
      </div>
      <div className="combat-grid">
        {players.map((player) => (
          <div key={player.id} className="combat-cell">
            {renderTroops(player.id)}
            {renderStrength(player.id)}
          </div>
        ))}
      </div>
      {renderRewards()}
    </div>
  )
}

export default CombatArea 