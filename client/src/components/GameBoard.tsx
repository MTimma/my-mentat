import React from 'react'
import { SpaceProps } from '../types/GameTypes'
import BoardSpace from './BoardSpace'

interface GameBoardProps {
  currentPlayer: number
}

const GameBoard: React.FC<GameBoardProps> = ({ currentPlayer }) => {
  const spaces: SpaceProps[] = [
    {
      name: "Arrakeen",
      type: "influence",
      influence: "Emperor",
      maxAgents: 2,
      resources: { solari: 2 }
    },
    {
      name: "Carthag",
      type: "resource",
      maxAgents: 2,
      resources: { spice: 1, troops: 1 }
    },
    {
      name: "Imperial Basin",
      type: "conflict",
      maxAgents: 1,
      resources: { troops: 2 }
    },
    // Add more spaces as needed
  ]

  return (
    <div className="game-board">
      <div className="spaces-container">
        {spaces.map((space, index) => (
          <BoardSpace key={index} space={space} />
        ))}
      </div>
      <div className="conflict-area">
        {/* Conflict tracks will go here */}
      </div>
    </div>
  )
}

export default GameBoard 