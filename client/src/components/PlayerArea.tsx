import React from 'react'
import { Player, FactionType } from '../types/GameTypes'

interface PlayerAreaProps {
  player: Player
  isActive: boolean
  isStartingPlayer: boolean
  isOpen: boolean
  onToggle: () => void
  factionInfluence?: Record<FactionType, Record<number, number>>
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ 
  player, 
  isActive, 
  isStartingPlayer,
  isOpen,
  onToggle,
  factionInfluence
}) => {
  const getPlayerInfluence = (faction: FactionType): number => {
    if (!factionInfluence) return 0
    return factionInfluence[faction]?.[player.id] || 0
  }

  const renderInfluenceIcons = () => {
    const factions = [
      { type: FactionType.EMPEROR, name: 'Emperor' },
      { type: FactionType.SPACING_GUILD, name: 'Spacing Guild' },
      { type: FactionType.BENE_GESSERIT, name: 'Bene Gesserit' },
      { type: FactionType.FREMEN, name: 'Fremen' }
    ]

    return (
      <div className="influence-row">
        {factions.map(({ type, name }) => {
          const influence = getPlayerInfluence(type)
          if (influence === 0) return null
          return (
            <div key={type} className="resource-stack">
              <span>{influence}</span>
              <img className="resource-icon" src={`icon/${type}.png`} alt={name} />
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <>
    {!isOpen && <div className={`player-area-toggle ${isActive ? 'active' : ''}`} onClick={onToggle}>
        <div className="player-header">
          <div className="name-with-indicators">
            <div className="name-with-color">
              <div className={`color-indicator ${player.color}`}></div>
              <div>
                <div className="resource-row">
                  <div className="resource-stack">
                    <span>{player.victoryPoints}</span>
                    <img className="resource-icon" src={"icon/vp.png"} alt="vp" />
                  </div>
                  <div className="resource-stack">
                    <span>{player.spice}</span>
                    <img className="resource-icon" src={"icon/spice.png"} alt="spice" />
                  </div>
                  <div className="resource-stack">
                    <span>{player.water}</span>
                    <img className="resource-icon" src={"icon/water.png"} alt="water" />
                  </div>
                  <div className="resource-stack">
                    <span>{player.solari}</span>
                    <img className="resource-icon" src={"icon/solari.png"} alt="solari" />
                  </div>
                </div>
                {renderInfluenceIcons()}
              </div>
            </div>
            <div className="player-indicators">
              {isStartingPlayer && <div className="starting-player-indicator">🪱</div>}
            </div>
          </div>
        </div>
    </div>}
    {isOpen && <div className="player-area-toggle" onClick={onToggle}>
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
        <div>Trash: {player.trash.length}</div>
      </div>
      <div className="influence-section">
        <h4>Influence</h4>
        <div className="influence-list">
          <div className="influence-item">
            <img className="influence-icon" src="icon/emperor.png" alt="Emperor" />
            <span>Emperor: {getPlayerInfluence(FactionType.EMPEROR)}</span>
          </div>
          <div className="influence-item">
            <img className="influence-icon" src="icon/spacing-guild.png" alt="Spacing Guild" />
            <span>Spacing Guild: {getPlayerInfluence(FactionType.SPACING_GUILD)}</span>
          </div>
          <div className="influence-item">
            <img className="influence-icon" src="icon/bene-gesserit.png" alt="Bene Gesserit" />
            <span>Bene Gesserit: {getPlayerInfluence(FactionType.BENE_GESSERIT)}</span>
          </div>
          <div className="influence-item">
            <img className="influence-icon" src="icon/fremen.png" alt="Fremen" />
            <span>Fremen: {getPlayerInfluence(FactionType.FREMEN)}</span>
          </div>
        </div>
      </div>
      <div className="play-area">
        <h4>Play Area</h4>
        <div className="played-cards">
          {player.playArea.map((card) => (
            <img
              key={card.id}
              src={card.image}
              alt={card.name}
              className="play-area-card-image"
              style={{ height: '100px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            />
          ))}
        </div>
      </div>
      </div>
    </div>}
      
    </>
  )
}

export default PlayerArea 