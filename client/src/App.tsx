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
import { PlayerSetup,Card, Leader, FactionType } from './types/GameTypes'
import { STARTING_DECK } from './data/cards'
import TurnControls from './components/TurnControls/TurnControls'

const GameContent = () => {
  const {
    gameState,
    dispatch,
    currentConflict,
  } = useGame()

  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId) || null

  const handleCardSelect = (playerId: number, cardId: number) => {
    dispatch({ type: 'PLAY_CARD', playerId, cardId })
  }

  const handleRevealCards = (playerId: number, cardIds: number[]) => {
    dispatch({ type: 'REVEAL_CARDS', playerId, cardIds })
  }

  const handleEndTurn = (playerId: number) => {
    dispatch({ type: 'END_TURN', playerId })
    if(!gameState.players.find(p => !p.revealed)) {
      dispatch({ type: 'START_COMBAT_PHASE' })
    }
  }

  const handleAddTroop = (playerId: number) => {
    dispatch({ type: 'ADD_TROOP', playerId })
  }

  const handleRemoveTroop = (playerId: number) => {
    dispatch({ type: 'REMOVE_TROOP', playerId })
  }

  const handleAcquireCard = (cardId: number) => {
    dispatch({ type: 'ACQUIRE_CARD', playerId: activePlayer?.id || 0, cardId })
  }

  const handleAcquireArrakisLiaison = () => {
    dispatch({ type: 'ACQUIRE_AL', playerId: activePlayer?.id || 0 })
  }

  const handleAcquireSpiceMustFlow = () => {
    dispatch({ type: 'ACQUIRE_SMF', playerId: activePlayer?.id || 0 })
  }

  const getSelectedCardPlacement = (playerId: number) => {
    const player = gameState.players.find(p => p.id === playerId)
    if (!gameState.selectedCard || !player) return null
    const selectedCard = player.deck.find(c => c.id === gameState.selectedCard)
    return selectedCard?.agentIcons || null
  }

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
        <ImperiumRow 
        canAcquire={gameState.canAcquireIR}
        cards={gameState.imperiumRow} 
        alCount={gameState.arrakisLiaisonDeck.length} 
        smfCount={gameState.spiceMustFlowDeck.length} 
        persuasion={activePlayer?.persuasion || 0} 
        onAcquireArrakisLiaison={handleAcquireArrakisLiaison} 
        onAcquireSpiceMustFlow={handleAcquireSpiceMustFlow} 
        onAcquireCard={handleAcquireCard} />
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
          gains={gameState.gains}
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
            id: index,
            leader: setup.leader,
            color: setup.color,
            spice: 0,
            water: 1,
            solari: 0,
            troops: 3,
            combatValue: 0,
            agents: 2,
            handCount: 5,
            hand: setup.startingHand || [],
            intrigueCount: 0,
            intrigueCards: [],
            deck: setup.deck|| [],
            discardPile: [],
            trash: [],
            hasHighCouncilSeat: false,
            hasSwordmaster: false,
            playArea: [],
            persuasion: 0,
            victoryPoints: 0,
            revealed: false,
            gains: {}
          })),
        factionInfluence:{
          [FactionType.EMPEROR]: Object.fromEntries(playerSetups.map((p, i) => [i, 0])),
          [FactionType.SPACING_GUILD]: Object.fromEntries(playerSetups.map((p, i) => [i, 0])),
          [FactionType.BENE_GESSERIT]: Object.fromEntries(playerSetups.map((p, i) => [i, 0])),
          [FactionType.FREMEN]: Object.fromEntries(playerSetups.map((p, i) => [i, 0]))
        }
      }}>
          <GameContent />
        </GameProvider>
      )}
    </div>
  )
}

export default App
