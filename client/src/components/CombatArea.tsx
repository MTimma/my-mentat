import React from 'react'

interface CombatAreaProps {
  troops: Record<number, number>  // playerId -> troops in combat
  onAddTroop?: () => void
  canDeploy: boolean
}

const CombatArea: React.FC<CombatAreaProps> = ({ troops, onAddTroop, canDeploy}) => {
  return (
    <div className="combat-area">
      <div className="combat-grid">
        {/* Top row */}
        <div className="combat-cell top-left">
          {Array(troops[1] || 0).fill(0).map((_, i) => (
            <div key={i} className="troop-marker player-1" />
          ))}
        </div>
        <div className="combat-cell top-right">
          {Array(troops[2] || 0).fill(0).map((_, i) => (
            <div key={i} className="troop-marker player-2" />
          ))}
        </div>

        {/* Bottom row */}
        <div className="combat-cell bottom-left">
          {Array(troops[4] || 0).fill(0).map((_, i) => (
            <div key={i} className="troop-marker player-4" />
          ))}
        </div>
        <div className="combat-cell bottom-right">
          {Array(troops[3] || 0).fill(0).map((_, i) => (
            <div key={i} className="troop-marker player-3" />
          ))}
        </div>

        {/* Add troop button */}
        {onAddTroop && (
          <button 
            className="add-troop-button"
            onClick={() => onAddTroop()}
            disabled={!canDeploy}
          >
            Add Troop
          </button>
        )}
      </div>
    </div>
  )
}

export default CombatArea 