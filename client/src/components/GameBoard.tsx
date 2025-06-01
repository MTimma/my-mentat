import React, { useState } from 'react'
import { SpaceProps, AgentIcon, Player, ConflictCard, MakerSpace, Card } from '../types/GameTypes'
import BoardSpace from './BoardSpace/BoardSpace'
import CombatArea from './CombatArea'
import { BOARD_SPACES } from '../data/boardSpaces'
import ConflictSummary from './ConflictSummary/ConflictSummary'
import SellMelangePopup from './SellMelangePopup/SellMelangePopup'
import SelectiveBreedingPopup from './SelectiveBreedingPopup/SelectiveBreedingPopup'

interface SellMelangeData {
  spiceCost: number;
  solariReward: number;
}
interface SelectiveBreedingData {
  trashedCardId: number;
}

type ExtraSpaceData = SellMelangeData | SelectiveBreedingData | undefined;

interface GameBoardProps {
  currentPlayer: number;
  highlightedAreas: AgentIcon[];
  onSpaceClick: (spaceId: number, extraData?: ExtraSpaceData) => void;
  occupiedSpaces: { [key: number]: number[] };
  canPlaceAgent: boolean;
  combatTroops: Record<number, number>;
  players: Player[];
  factionInfluence: { [key: string]: { [key: number]: number } };
  currentConflict?: ConflictCard;
  bonusSpice: { [key: string]: number };
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
  const [showSellMelangePopup, setShowSellMelangePopup] = useState(false)
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)
  const [showSelectiveBreedingPopup, setShowSelectiveBreedingPopup] = useState(false)

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

  const handleSpaceClick = (spaceId: number) => {
    const space = BOARD_SPACES.find(s => s.id === spaceId)
    if (space?.name === "Sell Melange") {
      setSelectedSpaceId(spaceId)
      setShowSellMelangePopup(true)
    } else if (space?.specialEffect === 'selectiveBreeding') {
      setSelectedSpaceId(spaceId)
      setShowSelectiveBreedingPopup(true)
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

  const handleSelectiveBreedingSelect = (card: Card) => {
    if (selectedSpaceId) {
      onSpaceClick(selectedSpaceId, { trashedCardId: card.id });
      setShowSelectiveBreedingPopup(false);
      setSelectedSpaceId(null);
    }
  }

  const handleSelectiveBreedingCancel = () => {
    setShowSelectiveBreedingPopup(false);
    setSelectedSpaceId(null);
  }

  const currentPlayerData = players.find(p => p.id === currentPlayer)
  const selectiveBreedingCards = currentPlayerData
    ? [
        ...currentPlayerData.deck,
        ...currentPlayerData.discardPile,
        ...currentPlayerData.playArea
      ]
    : []

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
            isDisabled={!canPayCosts(space) || !canPlaceAgent || !highlightedAreas?.includes(space.agentIcon)}
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
              isDisabled={!canPayCosts(space) || !canPlaceAgent || !highlightedAreas?.includes(space.agentIcon)}
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
      {showSellMelangePopup && currentPlayerData && (
        <SellMelangePopup
          playerSpice={currentPlayerData.spice}
          onOptionSelect={handleSellMelangeOptionSelect}
          onClose={() => {
            setShowSellMelangePopup(false)
            setSelectedSpaceId(null)
          }}
        />
      )}
      {showSelectiveBreedingPopup && currentPlayerData && (
        <SelectiveBreedingPopup
          isOpen={showSelectiveBreedingPopup}
          cards={selectiveBreedingCards}
          onSelect={handleSelectiveBreedingSelect}
          onCancel={handleSelectiveBreedingCancel}
        />
      )}
    </div>
  )
}

export default GameBoard 