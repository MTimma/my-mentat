import React from 'react'
import { SpaceProps, FactionType } from '../types/GameTypes'

interface BoardSpaceProps extends SpaceProps {
  isHighlighted: boolean
  onSpaceClick: () => void
  occupiedBy: number[]
  isDisabled: boolean
}

const BoardSpace: React.FC<BoardSpaceProps> = ({
  name,
  agentIcon,
  resources,
  influence,
  cost,
  bonusSpice,
  requiresInfluence,
  isHighlighted,
  onSpaceClick,
  occupiedBy,
  conflictMarker,
  isDisabled
}) => {
  const renderCost = () => {
    if (!cost) return null
    return (
      <div className="space-cost">
        {cost.solari && <span className="solari-cost">{cost.solari}💰</span>}
        {cost.spice && <span className="spice-cost">{cost.spice}🌶️</span>}
        {cost.water && <span className="water-cost">{cost.water}💧</span>}
      </div>
    )
  }

  const renderResources = () => {
    if (!resources) return null
    return (
      <div className="space-resources">
        {resources.solari && <span className="solari">{resources.solari}💰</span>}
        {resources.spice && <span className="spice">{resources.spice}🌶️</span>}
        {resources.water && <span className="water">{resources.water}💧</span>}
        {resources.troops && <span className="troops">{resources.troops}⚔️</span>}
      </div>
    )
  }

  const renderInfluence = () => {
    if (!influence) return null
    return (
      <div className="space-influence">
        <span className={`influence-icon ${influence.faction}`}>
          {influence.amount}
        </span>
      </div>
    )
  }

  const renderBonusSpice = () => {
    if (typeof bonusSpice !== 'number') return null
    return bonusSpice > 0 ? (
      <div className="bonus-spice">
        +{bonusSpice}🌶️
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
    <div 
      className={`
        board-space 
        ${agentIcon} 
        ${isHighlighted ? 'highlighted' : ''} 
        ${conflictMarker ? 'combat-space' : ''}
        ${isDisabled ? 'disabled' : ''}
      `}
      onClick={onSpaceClick}
    >
      <div className="space-header">
        <span className="space-name">{name}</span>
        {renderCost()}
      </div>
      {renderRequirement()}
      {renderResources()}
      {renderInfluence()}
      {renderBonusSpice()}
      <div className="agents-container">
        {occupiedBy.map((playerId) => (
          <div 
            key={playerId} 
            className={`agent player-${playerId}`} 
          />
        ))}
      </div>
    </div>
  )
}

export default BoardSpace 