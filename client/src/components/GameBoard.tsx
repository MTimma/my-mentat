import React from 'react'
import { SpaceProps, AgentIcon, Player, FactionType, ConflictCard, MakerSpace } from '../types/GameTypes'
import BoardSpace from './BoardSpace/BoardSpace'
import CombatArea from './CombatArea'
import { BOARD_SPACES } from '../data/boardSpaces'
import ConflictSummary from './ConflictSummary/ConflictSummary'

interface GameBoardProps {
  currentPlayer: number
  highlightedAreas: AgentIcon[] | null
  onSpaceClick: (spaceId: number) => void
  occupiedSpaces: Record<number, number[]>
  canPlaceAgent: boolean
  combatTroops: Record<number, number>
  players: Player[]
  factionInfluence: Record<FactionType, Record<number, number>>
  currentConflict: ConflictCard
  bonusSpice: Record<MakerSpace, number>
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  currentPlayer, 
  highlightedAreas,
  onSpaceClick,
  occupiedSpaces,
  canPlaceAgent,
  combatTroops,
  players,
  factionInfluence,
  bonusSpice,
  currentConflict
}) => {
  const canPayCosts = (space: SpaceProps): boolean => {
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

  // Split spaces for custom layout
  const firstRowSpaces = BOARD_SPACES.slice(0, 3);
  const restSpaces = BOARD_SPACES.slice(3);

  // Helper to chunk array into rows of 5
  const chunk = (arr: SpaceProps[], size: number): SpaceProps[][] => arr.length === 0 ? [] : [arr.slice(0, size), ...chunk(arr.slice(size), size)];
  const restRows = chunk(restSpaces, 5);

  return (
    <div className="game-board">
      <div className="board-spaces">
        {firstRowSpaces.map((space, idx) => (
          <BoardSpace
            key={space.id}
            {...space}
            isHighlighted={highlightedAreas?.includes(space.agentIcon) || false}
            onSpaceClick={() => onSpaceClick(space.id)}
            occupiedBy={occupiedSpaces[space.id] || []}
            isDisabled={!canPayCosts(space) || !canPlaceAgent}
            bonusSpice={space.makerSpace ? bonusSpice[space.makerSpace as MakerSpace] : 0}
            makerSpace={space.makerSpace}
            wide={idx === 0 || idx === 2}
          />
        ))}
      </div>
      {restRows.map((row, i) => (
        <div className="board-spaces" key={i}>
          {row.map((space: SpaceProps) => (
            <BoardSpace
              key={space.id}
              {...space}
              isHighlighted={highlightedAreas?.includes(space.agentIcon) || false}
              onSpaceClick={() => onSpaceClick(space.id)}
              occupiedBy={occupiedSpaces[space.id] || []}
              isDisabled={!canPayCosts(space) || !canPlaceAgent}
              bonusSpice={space.makerSpace ? bonusSpice[space.makerSpace as MakerSpace] : 0}
              makerSpace={space.makerSpace}
            />
          ))}
        </div>
      ))}
      <ConflictSummary currentConflict={currentConflict} />
      <CombatArea
        troops={combatTroops}
        players={players}
      />
    </div>
  )
}

export default GameBoard 