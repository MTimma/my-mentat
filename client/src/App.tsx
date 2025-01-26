import { useState } from 'react'
import './App.css'
import GameBoard from './components/GameBoard'
import PlayerArea from './components/PlayerArea'
import { 
  Player, 
  Card, 
  AgentPlacementColor, 
  Leader, 
  PlayerColor, 
  GameState,
  TurnType,
  ActionTurn 
} from './types/GameTypes'

// Sample starting cards
const startingCards: Card[] = [
  { 
    id: 1, 
    name: "Seek Allies", 
    persuasion: 1, 
    effect: "Draw 1 card",
    agentPlacement: [AgentPlacementColor.GREEN] // Landsraad only
  },
  { 
    id: 2, 
    name: "Dagger", 
    swordIcon: true, 
    effect: "Add 1 combat strength",
    agentPlacement: [AgentPlacementColor.GREEN] // Landsraad only
  },
  { 
    id: 3, 
    name: "Convincing Argument", 
    persuasion: 2,
    agentPlacement: [AgentPlacementColor.GRAY, AgentPlacementColor.PURPLE] // Emperor and Bene Gesserit
  },
  { 
    id: 4, 
    name: "Reconnaissance", 
    resources: { troops: 1 },
    agentPlacement: [AgentPlacementColor.YELLOW] // Desert areas only
  },
  { 
    id: 5, 
    name: "Diplomacy", 
    resources: { solari: 1 }, 
    effect: "Gain influence with one faction",
    agentPlacement: [AgentPlacementColor.RED, AgentPlacementColor.GRAY] // Spacing Guild and Emperor
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
      troops: 0, 
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
      troops: 0, 
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
      troops: 0, 
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
      troops: 0, 
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
    // Record the last turn
    const newTurn: ActionTurn = {
      type: TurnType.ACTION,
      playerId: playerId,
      cardId: -1,  // Placeholder
      agentFieldId: -1  // Placeholder
    }

    // Find next player (circular)
    const nextPlayerId = playerId >= players.length ? 1 : playerId + 1

    // Update game state
    setGameState(prev => ({
      ...prev,
      activePlayerId: nextPlayerId,
      lastTurn: newTurn
    }))
  }

  return (
    <div className="game-container">
      <h1>Dune: Imperium</h1>
      <div className="main-area">
        <GameBoard currentPlayer={gameState.activePlayerId} />
        <div className="players-area">
          {players.map((player) => (
            <PlayerArea 
              key={player.id} 
              player={player} 
              isActive={gameState.activePlayerId === player.id}
              isStartingPlayer={gameState.startingPlayerId === player.id}
              onSelectCard={handleCardSelect}
              onEndTurn={handleEndTurn}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
