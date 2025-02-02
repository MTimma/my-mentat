import React from 'react'
import { Player } from '../types/GameTypes'

interface PlayerAreaProps {
  player: Player
  isActive: boolean
  isStartingPlayer: boolean
  onSelectCard: (playerId: number, cardId: number) => void
  onEndTurn: (playerId: number) => void
  onAddTroop: () => void
  onRemoveTroop: () => void
  canDeployTroops: boolean
  removableTroops: number
  troopLimit: number
}

const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  isActive,
  isStartingPlayer,
  onSelectCard,
  onEndTurn,
  onAddTroop,
  onRemoveTroop,
  canDeployTroops,
  removableTroops,
  troopLimit
}) => {
  return (
    <div className={`player-area ${isActive ? 'active' : ''}`}>
      <div className="player-header">
        <h3>{player.leader.name}</h3>
        {isStartingPlayer && <span className="starting-player">★</span>}
      </div>
      
      <div className="player-resources">
        <div className="resource-item">
          <span>💧</span>
          <span>{player.water}</span>
        </div>
        <div className="resource-item">
          <span>🌶️</span>
          <span>{player.spice}</span>
        </div>
        <div className="resource-item">
          <span>💰</span>
          <span>{player.solari}</span>
        </div>
        <div className="resource-item">
          <span>⚔️</span>
          <span>{player.troops}</span>
        </div>
      </div>

      <div className="player-hand">
        {player.hand.map(card => (
          <div 
            key={card.id}
            className="card-preview"
            onClick={() => onSelectCard(player.id, card.id)}
          >
            {card.name}
          </div>
        ))}
      </div>

      {isActive && (
        <div className="player-actions">
          <button onClick={() => onEndTurn(player.id)}>End Turn</button>
          {canDeployTroops && (
            <button onClick={onAddTroop} disabled={player.troops >= troopLimit}>
              Deploy Troop
            </button>
          )}
          {removableTroops > 0 && (
            <button onClick={onRemoveTroop}>
              Remove Troop
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default PlayerArea 