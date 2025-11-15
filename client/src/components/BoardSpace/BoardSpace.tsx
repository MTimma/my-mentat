import React from 'react'
import { SpaceProps } from '../../types/GameTypes'
import AgentIcon from '../AgentIcon/AgentIcon'
import './BoardSpace.css'

interface BoardSpaceProps extends SpaceProps {
  isHighlighted: boolean
  onSpaceClick: () => void
  occupiedBy: number[]
  isEnabled: boolean
  bonusSpice: number
  wide?: boolean
  isVoiceSelectable?: boolean
  voiceBlockedBy?: number | null
}

// Helper function to get player color matching AgentIcon.css
const getPlayerColor = (playerId: number): string => {
  const colors: Record<number, string> = {
    0: '#d32f2f', // red
    1: '#388e3c', // green
    2: '#fbc02d', // yellow
    3: '#1976d2', // blue
  }
  return colors[playerId] || '#8b4513' // fallback to default brown
}

// Generate border styles based on occupied players
const generateBorderStyles = (occupiedBy: number[]): React.CSSProperties => {
  if (occupiedBy.length === 0) {
    return {}
  }

  // Background color from first player (semi-transparent)
  const firstPlayerColor = getPlayerColor(occupiedBy[0])
  const backgroundColor = `${firstPlayerColor}80` // 50% opacity (less transparent)

  // Generate concentric borders using box-shadow
  const boxShadow = occupiedBy
    .map((playerId, index) => {
      const color = getPlayerColor(playerId)
      const offset = (index + 1) * 4 // 4px per border layer
      return `0 0 0 ${offset}px ${color}`
    })
    .join(', ')

  return {
    backgroundColor,
    boxShadow,
  }
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
  isEnabled,
  makerSpace,
  image,
  wide = false,
  isVoiceSelectable = false,
  voiceBlockedBy = null
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

  const playerBorderStyles = generateBorderStyles(occupiedBy)

  return (
    <>
    {image && <div 
      className={`
        board-space 
        ${agentIcon} 
        ${isHighlighted ? 'highlighted' : ''} 
        ${conflictMarker ? 'combat-space' : ''}
        ${!isEnabled ? 'disabled' : ''}
        ${wide ? 'wide' : ''}
        ${isVoiceSelectable ? 'voice-selectable' : ''}
        ${voiceBlockedBy !== null ? 'voice-blocked' : ''}
      `}
      onClick={isEnabled ? onSpaceClick : undefined}
      style={{
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...playerBorderStyles
      }}
    >
      {image && (
        <img 
          src={image} 
          alt={name}
          className="board-space-image"
        />
      )}
      {voiceBlockedBy !== null && (
        <div className="voice-block-indicator" title="Blocked by The Voice" />
      )}
      <div className="agents-container">
        {occupiedBy.map((playerId) => (
          <AgentIcon 
            key={playerId} 
            playerId={playerId}
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
        ${!isEnabled ? 'disabled' : ''}
        ${wide ? 'wide' : ''}
        ${isVoiceSelectable ? 'voice-selectable' : ''}
        ${voiceBlockedBy !== null ? 'voice-blocked' : ''}
      `}
      onClick={isEnabled ? onSpaceClick : undefined}
      style={{
        backgroundImage: image ? `url(${image})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...playerBorderStyles
      }}
    >
      {voiceBlockedBy !== null && (
        <div className="voice-block-indicator" title="Blocked by The Voice" />
      )}
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
          <AgentIcon 
            key={playerId} 
            playerId={playerId}
          />
        ))}
      </div>
    </div>
    }
    </>
  )
}

export default BoardSpace 