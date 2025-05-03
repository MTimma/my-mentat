import React from 'react'
import { Player } from '../types/GameTypes'

interface PlayerAreaProps {
  player: Player
  isActive: boolean
  isStartingPlayer: boolean
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ 
  player, 
  isActive, 
  isStartingPlayer
}) => {

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
          </div>
        </div>
        <div className="leader-ability">
          <span className="ability-name">{player.leader.ability.name}</span>
          <div className="ability-description">{player.leader.ability.description}</div>
        </div>
        <div className="signet-ring">
          <span className="ability-label">Signet Ring:</span> {player.leader.signetRingText}
        </div>
      </div>
      <div className="resources">
        <div>VP: {player.victoryPoints}</div>
        <div>Spice: {player.spice}</div>
        <div>Water: {player.water}</div>
        <div>Solari: {player.solari}</div>
        <div>Troops: {player.troops}</div>
        <div>Persuasion: {player.persuasion}</div>
        <div>Combat: {player.combatValue}</div>
        <div>Intrigue: {player.intrigueCount}</div>
        <div className={`agents ${player.agents === 0 ? 'depleted' : ''}`}>
          Agents: {player.agents}
        </div>
        <div>Hand Size: {player.handCount}</div>
        <div>Deck Size: {player.deck.length}</div>
        <div>Discard: {player.discardPile.length}</div>
      </div>
      <div className="play-area">
        <h4>Play Area</h4>
        <div className="played-cards">
          {player.playArea.map((card) => (
            <div
              key={card.id}
              className="game-card played"
            >
              <div className="card-header">
                <h4>{card.name}</h4>
                {card.persuasion && <div className="persuasion">⚖️ {card.persuasion}</div>}
              </div>
              <div className="card-content">
                <div className="agent-placement">
                  {card.agentIcons.map((area, index) => (
                    <div 
                      key={index} 
                      className={`placement-dot ${area}`}
                    />
                  ))}
                </div>
                {card.swordIcon && <div className="sword-icon">⚔️</div>}
                {card.resources && (
                  <div className="card-resources">
                    {card.resources.spice && <div>🌶️ {card.resources.spice}</div>}
                    {card.resources.water && <div>💧 {card.resources.water}</div>}
                    {card.resources.solari && <div>💰 {card.resources.solari}</div>}
                    {card.resources.troops && <div>⚔️ {card.resources.troops}</div>}
                  </div>
                )}
                {card.effect && <div className="card-effect">{card.effect}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PlayerArea 