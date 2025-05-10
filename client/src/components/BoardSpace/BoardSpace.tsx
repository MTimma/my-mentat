import React from 'react'
import { SpaceProps } from '../../types/GameTypes'
import './BoardSpace.css'

interface BoardSpaceProps extends SpaceProps {
  isHighlighted: boolean
  onSpaceClick: () => void
  occupiedBy: number[]
  isDisabled: boolean
  bonusSpice: number
}

const BoardSpace: React.FC<BoardSpaceProps> = ({
  name,
  agentIcon,
  reward,
  influence,
  cost,
  bonusSpice,
  requiresInfluence,
  isHighlighted,
  onSpaceClick,
  occupiedBy,
  conflictMarker,
  isDisabled,
  makerSpace,
  image
}) => {
  const renderCost = () => {
    if (!cost) return null
    return (
      <div className="space-cost">
        {cost.solari && <span className="solari-cost">Solari: {cost.solari}</span>}
        {cost.spice && <span className="spice-cost">Spice: {cost.spice}</span>}
        {cost.water && <span className="water-cost">Water: {cost.water}</span>}
      </div>
    )
  }

  const renderRewards = () => {
    if (!reward) return null
    return (
      <div className="space-rewards">
        {reward.solari && <span className="solari">Solari:{reward.solari}</span>}
        {reward.spice && <span className="spice">Spice: {reward.spice}</span>}
        {reward.water && <span className="water">Water: {reward.water}</span>}
        {reward.troops && <span className="troops">Troops: {reward.troops}</span>}
        {reward.persuasion && <span className="persuasion">Persuasion: {reward.persuasion}</span>}
      </div>
    )
  }

  const renderInfluence = () => {
    if (!influence) return null
    return (
      <div className="space-influence">
        <span className={`influence-icon ${influence.faction}`}>
          Influence: {influence.amount}
        </span>
      </div>
    )
  }

  const renderBonusSpice = () => {
    if (typeof bonusSpice !== 'number') return null
    return makerSpace ? (
      <div className="bonus-spice">
        + Bonus Spice: {bonusSpice}
      </div>
    ) : null
  }

  const renderRequirement = () => {
    if (!requiresInfluence) return null
    return (
      <div className="space-requirement">
        Requires {requiresInfluence.amount} {requiresInfluence.faction} influence
      </div>
    )
  }

  return (
    <>
    {image && <div 
      className={`
        board-space 
        ${agentIcon} 
        ${isHighlighted ? 'highlighted' : ''} 
        ${conflictMarker ? 'combat-space' : ''}
        ${isDisabled ? 'disabled' : ''}
      `}
      onClick={onSpaceClick}
      style={{
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {image && (
        <img 
          src={image} 
          alt={name}
          className="board-space-image"
        />
      )}
      <div className="agents-container">
    {occupiedBy.map((playerId) => (
      <div 
        key={playerId} 
        className={`agent player-${playerId}`} 
      />
    ))}
  </div>
    </div>}
    {!image && <div 
      className={`
        board-space 
        ${agentIcon} 
        ${isHighlighted ? 'highlighted' : ''} 
        ${conflictMarker ? 'combat-space' : ''}
        ${isDisabled ? 'disabled' : ''}
      `}
      onClick={onSpaceClick}
      style={{
        backgroundImage: image ? `url(${image})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="space-content">
        <div className="space-header">
          <span className="space-name">{name}</span>
          {renderCost()}
        </div>
        {renderRequirement()}
        {renderRewards()}
        {renderInfluence()}
        {renderBonusSpice()}
      </div>
      <div className="agents-container">
        {occupiedBy.map((playerId) => (
          <div 
            key={playerId} 
            className={`agent player-${playerId}`} 
          />
        ))}
      </div>
    </div>
    }
    </>
  )
}

export default BoardSpace 