
import './App.css'
import GameBoard from './components/GameBoard'
import PlayerArea from './components/PlayerArea'
import ImperiumRow from './components/ImperiumRow'
import TurnHistory from './components/TurnHistory'
import { GameProvider } from './contexts/GameContext'
import { useGame } from './contexts/GameContext'

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
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  )
}

export default App
