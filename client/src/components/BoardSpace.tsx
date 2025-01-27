import React from 'react'
import { SpaceProps } from '../types/GameTypes'

interface BoardSpaceProps extends SpaceProps {
  isHighlighted?: boolean
  onSpaceClick?: () => void
  activePlayerId?: number
  isDisabled?: boolean
}

const BoardSpace: React.FC<BoardSpaceProps> = ({ 
  name, 
  type, 
  resources, 
  influence,
  agentPlacementArea,
  isHighlighted,
  onSpaceClick,
  activePlayerId,
  occupiedBy = [],
  isDisabled
}) => {
  return (
    <div 
      className={`board-space ${isHighlighted ? 'highlighted' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={() => !isDisabled && onSpaceClick?.()}
    >
      <div className="board-space-name">{name}</div>
      <div className="board-space-content">
        <div className={`placement-dot ${agentPlacementArea}`}></div>
        {resources && (
          <div className="board-space-resources">
            {resources.spice && <div>🌶️ {resources.spice}</div>}
            {resources.water && <div>💧 {resources.water}</div>}
            {resources.solari && <div>💰 {resources.solari}</div>}
            {resources.troops && <div>⚔️ {resources.troops}</div>}
          </div>
        )}
        {influence && (
          <div className="board-space-influence">
            {influence.amount} influence with {influence.faction}
          </div>
        )}
        <div className="board-space-type">{type}</div>
        <div className="agent-markers">
          {occupiedBy.map((playerId, index) => (
            <div key={index} className={`agent-marker player-${playerId}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default BoardSpace 