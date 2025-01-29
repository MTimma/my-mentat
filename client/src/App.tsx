import { useState, useEffect } from 'react'
import './App.css'
import GameBoard from './components/GameBoard'
import PlayerArea from './components/PlayerArea'
import { 
  Player, 
  Card, 
  AgentSpaceType, 
  Leader, 
  PlayerColor, 
  GameState,
  TurnType,
  GameTurn
} from './types/GameTypes'
import ImperiumRow from './components/ImperiumRow'
import TurnHistory from './components/TurnHistory'
import { boardSpaces } from './components/GameBoard'

// Sample starting cards
const startingCards: Card[] = [
  { 
    id: 1, 
    name: "Seek Allies", 
    persuasion: 1, 
    effect: "Draw 1 card",
    agentSpaceTypes: [AgentSpaceType.LANDSRAAD]
  },
  { 
    id: 2, 
    name: "Dagger", 
    swordIcon: true, 
    effect: "Add 1 combat strength",
    agentSpaceTypes: [AgentSpaceType.LANDSRAAD, AgentSpaceType.POPULATED_AREAS] 
  },
  { 
    id: 3, 
    name: "Convincing Argument", 
    persuasion: 2,
    agentSpaceTypes: [AgentSpaceType.EMPEROR, AgentSpaceType.BENE_GESSERIT] 
  },
  { 
    id: 4, 
    name: "Reconnaissance", 
    resources: { troops: 1 },
    agentSpaceTypes: [AgentSpaceType.DESERTS] 
  },
  { 
    id: 5, 
    name: "Diplomacy", 
    resources: { solari: 1 }, 
    effect: "Gain influence with one faction",
    agentSpaceTypes: [AgentSpaceType.SPACING_GUILD, AgentSpaceType.EMPEROR]
  }
]

const imperiumRowCards: Card[] = [
  {
    id: 101,
    name: "Bene Gesserit Sister",
    persuasion: 2,
    effect: "Draw 1 card if you have at least 2 Influence with the Bene Gesserit.",
    agentSpaceTypes: [AgentSpaceType.BENE_GESSERIT]
  },
  {
    id: 102,
    name: "Sardaukar Legion",
    persuasion: 3,
    swordIcon: true,
    effect: "Gain 2 troops.",
    agentSpaceTypes: [AgentSpaceType.EMPEROR]
  },
  {
    id: 103,
    name: "Spice Trader",
    persuasion: 3,
    effect: "Acquire 1 spice OR Pay 2 spice to draw 2 cards.",
    agentSpaceTypes: [AgentSpaceType.SPACING_GUILD]
  },
  {
    id: 104,
    name: "Stillsuit Manufacturer",
    persuasion: 2,
    effect: "Gain 1 water and 1 Solari.",
    agentSpaceTypes: [AgentSpaceType.FREMEN]
  },
  {
    id: 105,
    name: "Guild Administrator",
    persuasion: 2,
    effect: "Gain 2 Solari if you have at least 2 Influence with the Spacing Guild.",
    agentSpaceTypes: [AgentSpaceType.SPACING_GUILD]
  }
]

const leaders: Leader[] = [
  {
    name: "Duke Leto Atreides",
    ability: {
      name: "Tactical Approach",
      description: "Draw 1 card when you deploy an agent to a conflict."
    },
    signetRing: "Start the game with 1 additional Solari."
  },
  {
    name: "Baron Vladimir Harkonnen",
    ability: {
      name: "Master Manipulator",
      description: "Start the game with 1 additional Intrigue card."
    },
    signetRing: "Start with 2 troops in your garrison."
  },
  {
    name: "Glossu \"The Beast\" Rabban",
    ability: {
      name: "Brutality",
      description: "When you acquire a card with at least one Sword icon, gain 1 Solari."
    },
    signetRing: "Start the game with 1 Sword token."
  },
  {
    name: "Paul Atreides",
    ability: {
      name: "Prescience",
      description: "Look at the top card of your deck before each Reveal turn."
    },
    signetRing: "Start with 1 Water and 1 Spice."
  }
]

function App() {
  const [players, setPlayers] = useState<Player[]>([
    { 
      id: 1, 
      leader: leaders[0],
      color: PlayerColor.RED,
      spice: 0, 
      water: 0, 
      solari: 0, 
      troops: 3,
      combatValue: 0,
      agents: 2, 
      hand: [...startingCards], 
      selectedCard: null 
    },
    { 
      id: 2, 
      leader: leaders[1],
      color: PlayerColor.GREEN,
      spice: 0, 
      water: 0, 
      solari: 0, 
      troops: 3,
      combatValue: 0,
      agents: 2, 
      hand: [...startingCards], 
      selectedCard: null 
    },
    { 
      id: 3, 
      leader: leaders[2],
      color: PlayerColor.YELLOW,
      spice: 0, 
      water: 0, 
      solari: 0, 
      troops: 3,
      combatValue: 0,
      agents: 2, 
      hand: [...startingCards], 
      selectedCard: null 
    },
    { 
      id: 4, 
      leader: leaders[3],
      color: PlayerColor.BLUE,
      spice: 0, 
      water: 0, 
      solari: 0, 
      troops: 3,
      combatValue: 0,
      agents: 2, 
      hand: [...startingCards], 
      selectedCard: null 
    }
  ])
  
  const [gameState, setGameState] = useState<GameState>({
    startingPlayerId: 1,
    currentRound: 1,
    activePlayerId: 1,
    combatCardId: null,
    lastTurn: null
  })

  const [turnHistory, setTurnHistory] = useState<GameTurn[]>([])
  
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0)
  const [occupiedSpaces, setOccupiedSpaces] = useState<Record<number, number[]>>({})

  const [currentTurn, setCurrentTurn] = useState<GameTurn>({
    playerId: 1, 
    canDeployTroops: false, 
    troopLimit: 0,
    removableTroops: 0
  })

  const [combatTroops, setCombatTroops] = useState<Record<number, number>>({})

  // Update currentTurn when active player changes
  useEffect(() => {
    setCurrentTurn({
      playerId: gameState.activePlayerId,
      canDeployTroops: false,
      troopLimit: 0,
      removableTroops: 0
    })
  }, [gameState.activePlayerId])

  const handleCardSelect = (playerId: number, cardId: number) => {
    setPlayers(players.map(player => {
      if (player.id === playerId) {
        return {
          ...player,
          selectedCard: player.selectedCard === cardId ? null : cardId
        }
      }
      return player
    }))
  }

  const handleEndTurn = (playerId: number) => {
    // Add current turn to history
    setTurnHistory(prev => [...prev, currentTurn])
    setCurrentTurnIndex(prev => prev + 1)

    // Find next player (circular)
    const nextPlayerId = playerId >= players.length ? 1 : playerId + 1

    // Update game state
    setGameState(prev => ({
      ...prev,
      activePlayerId: nextPlayerId,
      lastTurn: currentTurn
    }))

    // New turn will be created by the useEffect when activePlayerId changes
  }

  const getSelectedCardPlacement = (): AgentSpaceType[] | null => {
    const activePlayer = players.find(p => p.id === gameState.activePlayerId)
    if (!activePlayer?.selectedCard) return null
    const selectedCard = activePlayer.hand.find(c => c.id === activePlayer.selectedCard)
    return selectedCard?.agentSpaceTypes || null
  }

  const handleSpaceClick = (spaceId: number) => {
    const activePlayer = players.find(p => p.id === gameState.activePlayerId)
    if (!activePlayer?.selectedCard || activePlayer.agents <= 0) return

    const space = boardSpaces.find(s => s.id === spaceId)
    if (!space) return

    setCurrentTurn(prev => {
      const baseTurn = {
        ...prev,
        playerId: gameState.activePlayerId,
        canDeployTroops: space.conflictMarker,
        troopLimit: space.conflictMarker ? 2 : 0
      }
      
      return {
        ...baseTurn,
        type: TurnType.ACTION,
        cardId: activePlayer.selectedCard,
        agentSpaceId: spaceId,
        agentSpaceType: space.agentPlacementArea
      } as GameTurn
    })

    setOccupiedSpaces(prev => ({
      ...prev,
      [spaceId]: [...(prev[spaceId] || []), gameState.activePlayerId]
    }))

    setPlayers(players.map(player => {
      if (player.id === gameState.activePlayerId) {
        return {
          ...player,
          agents: player.agents - 1,
          selectedCard: null,
          troops: player.troops
        }
      }
      return player
    }))

  }

  const activePlayer = players.find(p => p.id === gameState.activePlayerId)
  const hasAgents = (activePlayer?.agents || 0) > 0

  const handleAddTroop = () => {
    const playerId = gameState.activePlayerId;
    const activePlayer = players.find(p => p.id === playerId)
    if (!activePlayer || activePlayer.troops <= 0) return

    setCombatTroops(prev => ({
      ...prev,
      [playerId]: (prev[playerId] || 0) + 1
    }))

    setPlayers(players.map(p => {
      if (p.id === playerId) {
        return { 
          ...p, 
          troops: p.troops - 1,
          combatValue: p.combatValue + 2
        }
      }
      return p
    }))

    setCurrentTurn(prev => ({
      ...prev,
      removableTroops: (prev.removableTroops || 0) + 1
    }))
  }

  const handleRemoveTroop = () => {
    const playerId = gameState.activePlayerId;
    const activePlayer = players.find(p => p.id === playerId)
    if (!activePlayer || !currentTurn.removableTroops) return

    setCombatTroops(prev => ({
      ...prev,
      [playerId]: prev[playerId] - 1
    }))

    setPlayers(players.map(p => {
      if (p.id === playerId) {
        return { 
          ...p, 
          troops: p.troops + 1,
          combatValue: p.combatValue - 2
        }
      }
      return p
    }))

    setCurrentTurn(prev => ({
      ...prev,
      removableTroops: prev.removableTroops - 1
    }))
  }

  return (
    <div className="game-container">
      <div className="turn-history-container">
        <TurnHistory 
          turns={turnHistory} 
          currentTurn={currentTurnIndex}
          players={players}
        />
      </div>
      <div className="imperium-row-container">
        <ImperiumRow cards={imperiumRowCards} />
      </div>
      <div className="main-area">
        <GameBoard 
          currentPlayer={gameState.activePlayerId}
          highlightedAreas={getSelectedCardPlacement()}
          onSpaceClick={handleSpaceClick}
          occupiedSpaces={occupiedSpaces}
          hasAgents={hasAgents}
          combatTroops={combatTroops}
          players={players}
        />
        <div className="players-area">
          {players.map((player) => (
            <PlayerArea 
              key={player.id} 
              player={player} 
              isActive={gameState.activePlayerId === player.id}
              isStartingPlayer={gameState.startingPlayerId === player.id}
              onSelectCard={handleCardSelect}
              onEndTurn={handleEndTurn}
              onAddTroop={handleAddTroop}
              onRemoveTroop={handleRemoveTroop}
              canDeployTroops={currentTurn.canDeployTroops}
              removableTroops={currentTurn.removableTroops}
              troopLimit={currentTurn.troopLimit}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
