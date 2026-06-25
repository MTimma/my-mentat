import React from 'react'
import './AgentIcon.css'

interface AgentIconProps {
  playerId: number
  className?: string
  variant?: 'troop' | 'dreadnought'
}

const AgentIcon: React.FC<AgentIconProps> = ({ playerId, className = '', variant = 'troop' }) => {
  if (variant === 'dreadnought') {
    return (
      <img
        className={`agent agent--dreadnought player-${playerId} ${className}`}
        src="/icon/dreadnought.png"
        alt=""
        draggable={false}
      />
    )
  }

  return (
    <svg
      className={`agent player-${playerId} ${className}`}
      viewBox="0 0 24 36"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2 C9 2 7 4 7 7 C7 9 8 10.5 9 11.5 L7 15 L5 28 C5 31 7 34 12 34 C17 34 19 31 19 28 L17 15 L15 11.5 C16 10.5 17 9 17 7 C17 4 15 2 12 2 Z"
        className="agent-fill"
      />
    </svg>
  )
}

export default AgentIcon

