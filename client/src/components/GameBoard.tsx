import React from 'react'
import { SpaceProps, AgentIcon, Player, FactionType, ConflictCard } from '../types/GameTypes'
import BoardSpace from './BoardSpace'
import CombatArea from './CombatArea'
import { boardSpaces } from '../data/boardSpaces'

interface GameBoardProps {
  currentPlayer: number
  highlightedAreas: AgentIcon[] | null
  onSpaceClick: (spaceId: number) => void
  occupiedSpaces: Record<number, number[]>
  hasAgents: boolean
  combatTroops: Record<number, number>
  players: Player[]
  factionInfluence: Record<FactionType, Record<number, number>>
  currentConflict: ConflictCard | null
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  currentPlayer, 
  highlightedAreas,
  onSpaceClick,
  occupiedSpaces,
  hasAgents,
  combatTroops,
  players,
  factionInfluence
}) => {
  const canPlaceAgent = (space: SpaceProps): boolean => {
    if (occupiedSpaces[space.id]?.length > 0) return false
    
    if (space.requiresInfluence) {
      const player = players.find(p => p.id === currentPlayer)
      if (!player) return false
      const playerInfluence = factionInfluence[space.requiresInfluence.faction]?.[currentPlayer] || 0
      if (playerInfluence < space.requiresInfluence.amount) return false
    }

    if (space.name === "High Council") {
      const player = players.find(p => p.id === currentPlayer)
      if (player?.hasHighCouncilSeat) return false
    }

    if (space.cost) {
      const player = players.find(p => p.id === currentPlayer)
      if (!player) return false
      
      if (space.cost.solari && player.solari < space.cost.solari) return false
      if (space.cost.spice && player.spice < space.cost.spice) return false
      if (space.cost.water && player.water < space.cost.water) return false
    }

    return true
  }

  return (
    <div className="game-board">
      <div className="board-spaces">
        {boardSpaces.map((space) => (
          <BoardSpace 
            key={space.id}
            {...space}
            isHighlighted={highlightedAreas?.includes(space.agentIcon) || false}
            onSpaceClick={() => onSpaceClick(space.id)}
            occupiedBy={occupiedSpaces[space.id] || []}
            isDisabled={!canPlaceAgent(space) || !hasAgents}
          />
        ))}
      </div>
      <CombatArea 
        troops={combatTroops}
        players={players}
      />
    </div>
  )
}

export default GameBoard 