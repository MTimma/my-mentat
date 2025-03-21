import { useState } from 'react'
import './App.css'
import GameBoard from './components/GameBoard'
import PlayerArea from './components/PlayerArea'
import ImperiumRow from './components/ImperiumRow'
import TurnHistory from './components/TurnHistory'
import { GameProvider } from './contexts/GameContext'
import { useGame } from './contexts/GameContext'
import GameSetup from './components/GameSetup'
import DeckSetup from './components/DeckSetup'
import LeaderSetupChoices from './components/LeaderSetupChoices/LeaderSetupChoices'
import { PlayerSetup,Card, Leader } from './types/GameTypes'
import { STARTING_DECK } from './data/cards'

const GameContent = () => {
  const { 
    gameState, 
    players, 
    dispatch,
    currentConflict,
    imperiumRow
  } = useGame()

  const handleCardSelect = (playerId: number, cardId: number) => {
    dispatch({ type: 'PLAY_CARD', playerId, cardId })
  }

  const handleEndTurn = (playerId: number) => {
    dispatch({ type: 'END_TURN', playerId })
  }

  const handleAddTroop = (playerId: number) => {
    dispatch({ type: 'ADD_TROOP', playerId })
  }

  const handleRemoveTroop = (playerId: number) => {
    dispatch({ type: 'REMOVE_TROOP', playerId })
  }

  const getSelectedCardPlacement = (playerId: number) => {
    const player = players.find(p => p.id === playerId)
    if (!player?.selectedCard) return null
    const selectedCard = player.hand.find(c => c.id === player.selectedCard)
    return selectedCard?.agentSpaceTypes || null
  }

  return (
    <div className="game-container">
      <div className="turn-history-container">
        <TurnHistory 
          turns={gameState.turns}
          currentTurn={gameState.turns.length}
          players={players}
        />
      </div>
      <div className="imperium-row-container">
        <ImperiumRow cards={imperiumRow} />
      </div>
      <div className="main-area">
        <GameBoard 
          currentPlayer={gameState.activePlayerId}
          highlightedAreas={getSelectedCardPlacement(gameState.activePlayerId)}
          onSpaceClick={(spaceId) => dispatch({ 
            type: 'DEPLOY_AGENT', 
            playerId: gameState.activePlayerId, 
            spaceId 
          })}
          occupiedSpaces={{}} // Will be tracked in GameState
          hasAgents={true} // Will be computed
          combatTroops={{}} // Will be tracked in GameState
          players={players}
          currentConflict={currentConflict}
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
              onAddTroop={() => handleAddTroop(player.id)}
              onRemoveTroop={() => handleRemoveTroop(player.id)}
              canDeployTroops={true} // Will be computed
              removableTroops={0} // Will be computed
              troopLimit={2} // Will be computed
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [gameState, setGameState] = useState<'setup' | 'leaderChoices' | 'deckSetup' | 'game'>('setup')
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)

  const handleSetupComplete = (setups: PlayerSetup[]) => {
    setPlayerSetups(setups)
    setGameState('leaderChoices')
  }

  const handleLeaderChoicesComplete = (leader: Leader) => {
    playerSetups[currentPlayerIndex].leader = leader;
    if (currentPlayerIndex < playerSetups.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1)
    } else {
      setGameState('deckSetup')
      setCurrentPlayerIndex(0)
    }
  }

  const renderLeaderChoices = () => {
    if (!playerSetups[currentPlayerIndex]) return null;

    const currentPlayer = playerSetups[currentPlayerIndex];
    
    if (!currentPlayer.leader.sogChoice) {
      handleLeaderChoicesComplete(currentPlayer.leader);
      return null;
    }

    return (
      <LeaderSetupChoices
        selectedLeader={currentPlayer.leader}
        onComplete={handleLeaderChoicesComplete}
      />
    );
  };

  const handleDeckSetupComplete = (selectedCards: Card[]) => {
    playerSetups[currentPlayerIndex].deck = STARTING_DECK
    playerSetups[currentPlayerIndex].startingHand = selectedCards
    if (currentPlayerIndex < playerSetups.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1)
    } else {
      setGameState('game')
    }

  }

  return (
    <div className="app">
      {gameState === 'setup' && (
        <GameSetup onComplete={handleSetupComplete} />
      )}

      {gameState === 'leaderChoices' && renderLeaderChoices()}

      {gameState === 'deckSetup' && playerSetups[currentPlayerIndex] && (
        <DeckSetup
          playerName={playerSetups[currentPlayerIndex].leader.name}
          onComplete={handleDeckSetupComplete}
        />
      )}

      {gameState === 'game' && (
        <GameProvider initialState={{
          players: playerSetups.map((setup, index) => ({
            id: index + 1,
            leader: setup.leader,
            color: setup.color,
            spice: 0,
            water: 1,
            solari: 0,
            troops: 3,
            combatValue: 0,
            agents: 2,
            hand: setup.startingHand || [],
            selectedCard: null,
            intrigueCards: [],
            deck: setup.deck|| [],
            discardPile: [],
            hasHighCouncilSeat: false,
            hasSwordmaster: false,
            playArea: []
          }))
        }}>
          <GameContent />
        </GameProvider>
      )}
    </div>
  )
}

export default App
