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
import TurnControls from './components/TurnControls/TurnControls'

const GameContent = () => {
  const { 
    gameState, 
    dispatch,
    currentConflict,
    imperiumRow
  } = useGame()

  const handleCardSelect = (playerId: number, cardId: number) => {
    dispatch({ type: 'PLAY_CARD', playerId, cardId })
  }

  const handleRevealCards = (playerId: number, cardIds: number[]) => {
    dispatch({ type: 'REVEAL_CARDS', playerId, cardIds })
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
    const player = gameState.players.find(p => p.id === playerId)
    if (!gameState.selectedCard || !player) return null
    const selectedCard = player.deck.find(c => c.id === gameState.selectedCard)
    return selectedCard?.agentSpaceTypes || null
  }

  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId) || null

  return (
    <div className="game-container">
      <div className="turn-history-container">
        <TurnHistory 
          turns={gameState.turns}
          currentTurn={gameState.turns.length}
          players={gameState.players}
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
            type: 'PLACE_AGENT',
            playerId: gameState.activePlayerId, 
            spaceId 
          })}
          occupiedSpaces={gameState.occupiedSpaces} 
          canPlaceAgent={!gameState.canEndTurn} 
          combatTroops={gameState.combatTroops}
          players={gameState.players}
          factionInfluence={gameState.factionInfluence}
          currentConflict={currentConflict}
        />
        <div className="players-area">
          {gameState.players.map((player) => (
            <PlayerArea 
              key={player.id} 
              player={player} 
              isActive={gameState.activePlayerId === player.id}
              isStartingPlayer={gameState.startingPlayerId === player.id}
            />
          ))}
        </div>
      </div>
      <div className="turn-controls-container">
        <TurnControls
          activePlayer={activePlayer}
          canEndTurn={gameState.canEndTurn}
          onPlayCard={handleCardSelect}
          onReveal={handleRevealCards}
          onEndTurn={handleEndTurn}
          canDeployTroops={gameState.currTurn?.canDeployTroops || false}
          onAddTroop={handleAddTroop}
          onRemoveTroop={handleRemoveTroop}
          removableTroops={gameState.currTurn?.removableTroops || 0}
          troopLimit={gameState.currTurn?.troopLimit || 2}
        />
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
            intrigueCount: 0,
            handCount: 5,
            hand: setup.startingHand || [],
            intrigueCards: [],
            deck: setup.deck|| [],
            discardPile: [],
            hasHighCouncilSeat: false,
            hasSwordmaster: false,
            playArea: [],
            persuasion: 0,
            victoryPoints: 0
          }))
        }}>
          <GameContent />
        </GameProvider>
      )}
    </div>
  )
}

export default App
