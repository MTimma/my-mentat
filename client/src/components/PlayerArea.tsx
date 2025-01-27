import React from 'react'
import { Player } from '../types/GameTypes'
import CardHand from './CardHand'

interface PlayerAreaProps {
  player: Player
  isActive: boolean
  isStartingPlayer: boolean
  onSelectCard: (playerId: number, cardId: number) => void
  onEndTurn: (playerId: number) => void
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isActive, isStartingPlayer, onSelectCard, onEndTurn }) => {
  return (
    <div className={`player-area ${isActive ? 'active' : ''}`}>
      <div className="player-header">
        <div className="name-with-indicators">
          <div className="name-with-color">
            <div className={`color-indicator ${player.color}`}></div>
            <h3>{player.leader.name}</h3>
          </div>
          <div className="player-indicators">
            {isStartingPlayer && <div className="starting-player-indicator">🪱</div>}
            {isActive && (
              <button 
                className="end-turn-button"
                onClick={() => onEndTurn(player.id)}
              >
                End Turn
              </button>
            )}
          </div>
        </div>
        <div className="leader-ability">
          <span className="ability-name">{player.leader.ability.name}</span>
          <div className="ability-description">{player.leader.ability.description}</div>
        </div>
        <div className="signet-ring">
          <span className="ability-label">Signet Ring:</span> {player.leader.signetRing}
        </div>
      </div>
      <div className="resources">
        <div>Spice: {player.spice}🌶️</div>
        <div>Water: {player.water}💧</div>
        <div>Solari: {player.solari}💰</div>
        <div>Troops: {player.troops}⚔️</div>
        <div className={`agents ${player.agents === 0 ? 'depleted' : ''}`}>
          Agents: {player.agents}👥
        </div>
      </div>
      <CardHand 
        cards={player.hand}
        selectedCard={player.selectedCard}
        onSelectCard={(cardId) => onSelectCard(player.id, cardId)}
      />
    </div>
  )
}

export default PlayerArea 