import React, { useState } from 'react'
import { SpaceProps, AgentIcon, Player, ConflictCard, MakerSpace, Card } from '../types/GameTypes'
import BoardSpace from './BoardSpace/BoardSpace'
import CombatArea from './CombatArea'
import { BOARD_SPACES } from '../data/boardSpaces'
import ConflictSummary from './ConflictSummary/ConflictSummary'
import SellMelangePopup from './SellMelangePopup/SellMelangePopup'

interface SellMelangeData {
  spiceCost: number;
  solariReward: number;
}

type ExtraSpaceData = SellMelangeData | undefined;

interface GameBoardProps {
  currentPlayer: number;
  highlightedAreas: AgentIcon[];
  infiltrate: boolean;
  onSpaceClick: (spaceId: number, extraData?: ExtraSpaceData) => void;
  occupiedSpaces: { [key: number]: number[] };
  canPlaceAgent: boolean;
  combatTroops: Record<number, number>;
  players: Player[];
  factionInfluence: { [key: string]: { [key: number]: number } };
  currentConflict?: ConflictCard;
  bonusSpice: { [key: string]: number };
  onSelectiveBreedingRequested: (cards: Card[], onSelect: (card: Card) => void) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  currentPlayer, 
  highlightedAreas,
  infiltrate,
  onSpaceClick,
  occupiedSpaces,
  canPlaceAgent,
  combatTroops,
  players,
  factionInfluence,
  bonusSpice,
  currentConflict,
  onSelectiveBreedingRequested
}) => {
  const [showSellMelangePopup, setShowSellMelangePopup] = useState(false)
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)

  const canPayCosts = (space: SpaceProps): boolean => {
    const player = players.find(p => p.id === currentPlayer)
    if (!player) return false

    if (occupiedSpaces[space.id]?.length > 0 && !infiltrate) return false
    
    if (space.requiresInfluence) {
      const playerInfluence = factionInfluence[space.requiresInfluence.faction]?.[currentPlayer] || 0
      if (playerInfluence < space.requiresInfluence.amount) return false
    }

    if (space.name === "High Council") {
      if (player?.hasHighCouncilSeat) return false
    }

    if (space.cost) {
      if (space.cost.solari && player.solari < space.cost.solari) return false
      if (space.cost.spice && player.spice < space.cost.spice) return false
      if (space.cost.water && player.water < space.cost.water) return false
    }

    return true
  }

  const handleSpaceClick = (spaceId: number) => {
    const space = BOARD_SPACES.find(s => s.id === spaceId)
    if (space?.name === "Sell Melange") {
      setSelectedSpaceId(spaceId)
      setShowSellMelangePopup(true)
    } else {
      onSpaceClick(spaceId)
    }
  }

  const handleSellMelangeOptionSelect = (option: { spiceCost: number; solariReward: number }) => {
    if (selectedSpaceId) {
      onSpaceClick(selectedSpaceId, option);
      setShowSellMelangePopup(false);
      setSelectedSpaceId(null);
    }
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
            onSpaceClick={() => handleSpaceClick(space.id)}
            occupiedBy={occupiedSpaces[space.id] || []}
            isEnabled={canPayCosts(space) && canPlaceAgent && highlightedAreas?.includes(space.agentIcon)}
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
              onSpaceClick={() => handleSpaceClick(space.id)}
              occupiedBy={occupiedSpaces[space.id] || []}
              isEnabled={canPayCosts(space) && canPlaceAgent && highlightedAreas?.includes(space.agentIcon)}
              bonusSpice={space.makerSpace ? bonusSpice[space.makerSpace as MakerSpace] : 0}
              makerSpace={space.makerSpace}
            />
          ))}
        </div>
      ))}
      {currentConflict && <ConflictSummary currentConflict={currentConflict} />}
      <CombatArea
        troops={combatTroops}
        players={players}
      />
      {showSellMelangePopup && (
        <SellMelangePopup
          playerSpice={players.find(p => p.id === currentPlayer)?.spice || 0}
          onOptionSelect={handleSellMelangeOptionSelect}
          onClose={() => {
            setShowSellMelangePopup(false)
            setSelectedSpaceId(null)
          }}
        />
      )}
    </div>
  )
}

export default GameBoard 