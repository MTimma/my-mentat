import React from 'react'
import { SpaceProps, AgentIcon, Player, ConflictCard, FactionType } from '../types/GameTypes'
import BoardSpace from './BoardSpace'
import CombatArea from './CombatArea'

export const boardSpaces: SpaceProps[] = [
  // City Spaces
  {
    id: 1,
    name: "Carthag",
    conflictMarker: false,
    agentIcon: AgentIcon.CITY,
    resources: { solari: 2 }
  },
  {
    id: 2,
    name: "Arrakeen",
    conflictMarker: false,
    agentIcon: AgentIcon.CITY,
    resources: { water: 1, troops: 1 }
  },

  // Spice Trade Spaces
  {
    id: 3,
    name: "Imperial Basin",
    conflictMarker: true,
    agentIcon: AgentIcon.SPICE_TRADE,
    resources: { spice: 1 },
    bonusSpice: 0
  },
  {
    id: 4,
    name: "The Great Flat",
    conflictMarker: true,
    agentIcon: AgentIcon.SPICE_TRADE,
    resources: { spice: 2 },
    bonusSpice: 0
  },

  // Landsraad Spaces
  {
    id: 5,
    name: "High Council",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    cost: { solari: 5 },
    oneTimeUse: true
  },
  {
    id: 6,
    name: "Mentat",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    cost: { solari: 2 }
  },

  // Faction Spaces
  {
    id: 7,
    name: "Conspire",
    conflictMarker: false,
    agentIcon: AgentIcon.EMPEROR,
    cost: { spice: 4 },
    influence: { faction: FactionType.EMPEROR, amount: 1 }
  },
  {
    id: 8,
    name: "Heighliner",
    conflictMarker: true,
    agentIcon: AgentIcon.SPACING_GUILD,
    cost: { spice: 6 },
    influence: { faction: FactionType.SPACING_GUILD, amount: 1 }
  },
  {
    id: 9,
    name: "Selective Breeding",
    conflictMarker: false,
    agentIcon: AgentIcon.BENE_GESSERIT,
    cost: { spice: 2 },
    influence: { faction: FactionType.BENE_GESSERIT, amount: 1 }
  },
  {
    id: 10,
    name: "Sietch Tabr",
    conflictMarker: true,
    agentIcon: AgentIcon.FREMEN,
    requiresInfluence: { faction: FactionType.FREMEN, amount: 2 },
    influence: { faction: FactionType.FREMEN, amount: 1 }
  }
]

interface GameBoardProps {
  currentPlayer: number
  highlightedAreas: AgentIcon[] | null
  onSpaceClick: (spaceId: number) => void
  occupiedSpaces: Record<number, number[]>
  hasAgents: boolean
  combatTroops: Record<number, number>
  players: Player[]
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
  currentConflict
}) => {
  const canPlaceAgent = (space: SpaceProps): boolean => {
    // Check if space is already occupied
    if (occupiedSpaces[space.id]?.length > 0) return false
    
    // Check if player has required influence
    if (space.requiresInfluence) {
      const player = players.find(p => p.id === currentPlayer)
      // This will need to access the actual influence value from GameState
      return false // Placeholder
    }

    // Check if one-time use space has been used
    if (space.oneTimeUse) {
      const player = players.find(p => p.id === currentPlayer)
      if (space.name === "High Council" && player?.hasHighCouncilSeat) return false
    }

    // Check if player can pay the cost
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
      {currentConflict && (
        <div className="current-conflict">
          <h3>{currentConflict.name}</h3>
          <div className="conflict-rewards">
            <div className="first-place">
              {currentConflict.rewards.first.map((reward, i) => (
                <span key={i} className="reward">
                  {reward.type === 'victory-points' && `${reward.amount}VP`}
                  {reward.type === 'control' && '🏰'}
                </span>
              ))}
            </div>
            {/* Add second and third place rewards */}
          </div>
        </div>
      )}
      <div className="board-spaces">
        {boardSpaces.map((space) => (
          <BoardSpace 
            key={space.id}
            {...space}
            isHighlighted={highlightedAreas?.includes(space.agentIcon)}
            onSpaceClick={() => onSpaceClick(space.id)}
            activePlayerId={currentPlayer}
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