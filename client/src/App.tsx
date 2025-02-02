import React, { useState } from 'react'
import './App.css'
import GameBoard from './components/GameBoard'
import PlayerArea from './components/PlayerArea'
import ImperiumRow from './components/ImperiumRow'
import TurnHistory from './components/TurnHistory'
import { GameProvider } from './contexts/GameContext'
import { useGame } from './contexts/GameContext'
import GameSetup from './components/GameSetup'
import DeckSetup from './components/DeckSetup'
import LeaderSetupChoices from './components/LeaderSetupChoices'
import { LEADERS } from './data/leaders'

const GameContent = () => {
  const { 
    gameState, 
    players, 
    dispatch,
    currentConflict,
    imperiumRow
  } = useGame()

  console.log('Players:', players)

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
          turns={[]} // Will be implemented
          currentTurn={0}
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
              canDeployTroops={true}
              removableTroops={0}
              troopLimit={2}
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

  const handleLeaderChoicesComplete = (choices: LeaderChoices) => {
    // Save leader choices and move to next player or deck setup
    if (currentPlayerIndex < playerSetups.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1)
    } else {
      setGameState('deckSetup')
      setCurrentPlayerIndex(0)
    }
  }

  const handleDeckSetupComplete = (selectedCards: Card[]) => {
    // Save deck choices and move to next player or start game
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

      {gameState === 'leaderChoices' && playerSetups[currentPlayerIndex] && (
        <LeaderSetupChoices
          leader={LEADERS.find(l => l.name === playerSetups[currentPlayerIndex].leaderId)!}
          onComplete={handleLeaderChoicesComplete}
        />
      )}

      {gameState === 'deckSetup' && playerSetups[currentPlayerIndex] && (
        <DeckSetup
          player={{
            id: currentPlayerIndex + 1,
            leader: LEADERS.find(l => l.name === playerSetups[currentPlayerIndex].leaderId)!,
            color: playerSetups[currentPlayerIndex].color
          }}
          onComplete={handleDeckSetupComplete}
        />
      )}

      {gameState === 'game' && (
        <GameProvider>
          <GameContent />
        </GameProvider>
      )}
    </div>
  )
}

export default App
