import React from 'react'
import { useCombat } from '../hooks/useCombat'
import { IntrigueCard } from '../types/GameTypes'

interface CombatDialogProps {
  playerId: number
  onClose: () => void
}

const CombatDialog: React.FC<CombatDialogProps> = ({ playerId, onClose }) => {
  const { 
    getAvailableCombatCards, 
    playCombatIntrigue,
    passCombat,
    currentCombatPlayer
  } = useCombat()

  const combatCards: IntrigueCard[] = getAvailableCombatCards(playerId)
  const isPlayerTurn = currentCombatPlayer?.id === playerId

  if (!isPlayerTurn) return null

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div 
        className="combat-dialog" 
        onClick={e => e.stopPropagation()}
      >
        <h3>Combat Phase</h3>
        <div className="combat-options">
          {combatCards.length > 0 ? (
            <>
              <p>Play a Combat card:</p>
              {combatCards.map((card: IntrigueCard) => (
                <button 
                  key={card.id}
                  onClick={() => {
                    playCombatIntrigue(playerId, card.id)
                    onClose()
                  }}
                >
                  {card.name}
                </button>
              ))}
            </>
          ) : (
            <p>No Combat cards available</p>
          )}
          <button 
            onClick={() => {
              passCombat(playerId)
              onClose()
            }}
          >
            Pass
          </button>
        </div>
      </div>
    </div>
  )
}

export default CombatDialog 