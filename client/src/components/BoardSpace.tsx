import React from 'react'
import { SpaceProps } from '../types/GameTypes'

interface BoardSpaceProps {
  space: SpaceProps
}

const BoardSpace: React.FC<BoardSpaceProps> = ({ space }) => {
  return (
    <div className={`board-space ${space.type}`}>
      <h3>{space.name}</h3>
      <div className="space-content">
        {space.resources && (
          <div className="resources">
            {space.resources.spice && <div className="resource spice">{space.resources.spice}🌶️</div>}
            {space.resources.water && <div className="resource water">{space.resources.water}💧</div>}
            {space.resources.solari && <div className="resource solari">{space.resources.solari}💰</div>}
            {space.resources.troops && <div className="resource troops">{space.resources.troops}⚔️</div>}
          </div>
        )}
        {space.influence && <div className="influence">{space.influence}</div>}
      </div>
    </div>
  )
}

export default BoardSpace 