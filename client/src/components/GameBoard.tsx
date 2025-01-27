import React from 'react'
import { SpaceProps, AgentSpaceType, Player } from '../types/GameTypes'
import BoardSpace from './BoardSpace'
import CombatArea from './CombatArea'

export const boardSpaces: SpaceProps[] = [
  // City Spaces (Populated Areas)
  {
    id: 1,
    name: "Carthag",
    conflictMarker: false,
    agentPlacementArea: AgentSpaceType.POPULATED_AREAS,
    resources: { solari: 2 }
  },
  {
    id: 2,
    name: "Arrakeen",
    conflictMarker: false,
    agentPlacementArea: AgentSpaceType.POPULATED_AREAS,
    resources: { water: 1, troops: 1 }
  },

  // Desert Spaces
  {
    id: 3,
    name: "Imperial Basin",
    conflictMarker: true,
    agentPlacementArea: AgentSpaceType.DESERTS,
    resources: { spice: 1 },
  },
  {
    id: 4,
    name: "The Great Flat",
    conflictMarker: true,
    agentPlacementArea: AgentSpaceType.DESERTS,
    resources: { spice: 2 },
  },

  // Landsraad Spaces
  {
    id: 5,
    name: "Landsraad Council",
    conflictMarker: false,
    agentPlacementArea: AgentSpaceType.LANDSRAAD,
    resources: { solari: 2 }
  },
  {
    id: 6,
    name: "Conspire",
    conflictMarker: false,
    agentPlacementArea: AgentSpaceType.LANDSRAAD,
    resources: { troops: 1 }
  },

  // Faction Spaces
  {
    id: 7,
    name: "Emperor",
    conflictMarker: false,
    agentPlacementArea: AgentSpaceType.EMPEROR,
    influence: { faction: "emperor", amount: 2 }
  },
  {
    id: 8,
    name: "Spacing Guild",
    conflictMarker: false,
    agentPlacementArea: AgentSpaceType.SPACING_GUILD,
    influence: { faction: "spacing-guild", amount: 2 }
  },
  {
    id: 9,
    name: "Bene Gesserit",
    conflictMarker: false,
    agentPlacementArea: AgentSpaceType.BENE_GESSERIT,
    influence: { faction: "bene-gesserit", amount: 2 }
  },
  {
    id: 10,
    name: "Fremen",
    conflictMarker: false,
    agentPlacementArea: AgentSpaceType.FREMEN,
    influence: { faction: "fremen", amount: 2 }
  }
]

interface GameBoardProps {
  currentPlayer: number
  highlightedAreas: AgentSpaceType[] | null
  onSpaceClick: (spaceId: number) => void
  occupiedSpaces: Record<number, number[]>
  hasAgents: boolean
  combatTroops: Record<number, number>
  onAddTroop?: () => void
  players: Player[]
  canDeploy: boolean
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  currentPlayer, 
  highlightedAreas,
  onSpaceClick,
  occupiedSpaces,
  hasAgents,
  combatTroops,
  onAddTroop,
  canDeploy
}) => {
  return (
    <div className="game-board">
      <div className="board-spaces">
        {boardSpaces.map((space) => (
          <BoardSpace 
            key={space.id}
            {...space}
            isHighlighted={highlightedAreas?.includes(space.agentPlacementArea)}
            onSpaceClick={() => onSpaceClick(space.id)}
            activePlayerId={currentPlayer}
            occupiedBy={occupiedSpaces[space.id] || []}
            isDisabled={!!occupiedSpaces[space.id]?.length || !hasAgents}
          />
        ))}
      </div>
      <CombatArea 
        troops={combatTroops}
        onAddTroop={onAddTroop}
        canDeploy={canDeploy}
      />
    </div>
  )
}

export default GameBoard 