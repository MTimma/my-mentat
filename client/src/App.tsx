import { useEffect, useState } from 'react'
import './App.css'
import GameBoard from './components/GameBoard'
import PlayerArea from './components/PlayerArea'
import ImperiumRow from './components/ImperiumRow/ImperiumRow'
import TurnHistory from './components/TurnHistory'
import { GameProvider } from './components/GameContext/GameContext'
import { useGame } from './components/GameContext/GameContext'
import GameSetup from './components/GameSetup'
import LeaderSetupChoices from './components/LeaderSetupChoices/LeaderSetupChoices'
import { PlayerSetup, Leader, FactionType, GamePhase, ScreenState, Player, GameState, Card, AgentIcon, OptionalEffect, Reward, CustomEffect, ChoiceType, FixedOptionsChoice } from './types/GameTypes'
import TurnControls from './components/TurnControls/TurnControls'
import CombatResults from './components/CombatResults/CombatResults'
import { CONFLICTS } from './data/conflicts'
import ConflictSelect from './components/ConflictSelect/ConflictSelect'
import GameStateSetup from './components/GameStateSetup/GameStateSetup'
import ImperiumRowSelect from './components/ImperiumRowSelect/ImperiumRowSelect'
import { buildImperiumDeck } from './data/cards'

const GameContent = () => {
  const {
    gameState,
    dispatch,
  } = useGame()

  const [openPlayerIndex, setOpenPlayerIndex] = useState<number | null>(null)
  const [showSelectiveBreeding, setShowSelectiveBreeding] = useState(false)
  const [onSelectiveBreedingSelect, setOnSelectiveBreedingSelect] = useState<((card: Card) => void) | null>(null)
  const [voiceSelectionRewardId, setVoiceSelectionRewardId] = useState<string | null>(null)

  useEffect(() => {
    setVoiceSelectionRewardId(null)
  }, [gameState.activePlayerId])

  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId) || null

  const handleCardSelect = (playerId: number, cardId: number) => {
    dispatch({ type: 'PLAY_CARD', playerId, cardId })
  }
  
  const handleConflictSelect = (conflictId: number) => {
    dispatch({ type: 'SELECT_CONFLICT', conflictId })
  }

  const handlePlayCombatIntrigue = (playerId: number, cardId: number) => {
    dispatch({ type: 'PLAY_COMBAT_INTRIGUE', playerId, cardId })
  }

  const handlePlaceAgent = (spaceId: number, extraData?: { trashedCardId: number } | { spiceCost: number; solariReward: number }) => {
    if (!activePlayer) return;
    dispatch({
      type: 'PLACE_AGENT',
      playerId: activePlayer.id,
      spaceId,
      ...(extraData && 'trashedCardId' in extraData ? { selectiveBreedingData: extraData } : {}),
      ...(extraData && 'spiceCost' in extraData ? { sellMelangeData: extraData } : {}),
    });
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

  const handlePassCombat = (playerId: number) => {
    dispatch({ type: 'PASS_COMBAT', playerId })
  }
  const handleConfirmCombat = () => {
    dispatch({ type: 'RESOLVE_COMBAT' });
  }
  
  const handleAddTroop = (playerId: number) => {
    dispatch({ type: 'DEPLOY_TROOP', playerId })
  }

  const handleResolveChoice = (choiceId:string, reward: Reward, source?: { type: string; id: number; name: string }) => {
    if(!activePlayer) return;
    dispatch({ type:'RESOLVE_CHOICE', playerId: activePlayer.id, choiceId, reward, source })
  }

  const handleResolveCardSelect = (choiceId: string, cardIds: number[]) => {
    if(!activePlayer) return;
    dispatch({ type: 'RESOLVE_CARD_SELECT', playerId: activePlayer.id, choiceId, cardIds })
  }

  const handlePayCost = (effect: OptionalEffect) => {
    if(!activePlayer) return;
    dispatch({ type: 'PAY_COST', playerId: activePlayer.id, effect })
  }

  const handleRemoveTroop = (playerId: number) => {
    dispatch({ type: 'RETREAT_TROOP', playerId })
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

  const handleSelectiveBreedingRequested = (_cards: Card[], onSelect: (card: Card) => void) => {
    setOnSelectiveBreedingSelect(() => onSelect)
    setShowSelectiveBreeding(true)
  }

  const handleClaimReward = (rewardId: string, customData?: { [key: string]: unknown }) => {
    if (!activePlayer) return
    const hasVoiceSpace = Boolean(customData && typeof (customData as Record<string, unknown>).spaceId === 'number')
    if (voiceSelectionRewardId && rewardId !== voiceSelectionRewardId && !hasVoiceSpace) {
      return
    }
    dispatch({ type: 'CLAIM_REWARD', playerId: activePlayer.id, rewardId, customData })
  }

  const handleClaimAllRewards = () => {
    if (!activePlayer || voiceSelectionRewardId) return
    dispatch({ type: 'CLAIM_ALL_REWARDS', playerId: activePlayer.id })
  }

  const handleVoiceSelectionStart = (rewardId: string) => {
    setVoiceSelectionRewardId(rewardId)
  }

  const handleVoiceSpaceSelect = (spaceId: number) => {
    if (!activePlayer || !voiceSelectionRewardId) return
    handleClaimReward(voiceSelectionRewardId, { spaceId })
    setVoiceSelectionRewardId(null)
  }

  const handleVoiceSelectionCancel = () => setVoiceSelectionRewardId(null)

  const handleOpponentDiscardChoice = (opponentId: number, choice: 'discard' | 'loseTroop') => {
    if (!activePlayer) return
    dispatch({ type: 'OPPONENT_DISCARD_CHOICE', playerId: activePlayer.id, opponentId, choice })
  }

  const handleOpponentDiscardCard = (opponentId: number, cardId: number) => {
    if (!activePlayer) return
    dispatch({ type: 'OPPONENT_DISCARD_CARD', playerId: activePlayer.id, opponentId, cardId })
  }

  const handleOpponentNoCardAck = (opponentId: number) => {
    if (!activePlayer) return
    dispatch({ type: 'OPPONENT_NO_CARD_ACK', playerId: activePlayer.id, opponentId })
  }

  const handleAutoApplyRewards = () => {
    if (!activePlayer) return
    
    // Interactive custom effects that require user input
    const interactiveEffects = [
      CustomEffect.THE_VOICE,
      CustomEffect.REVEREND_MOTHER_MOHIAM,
      CustomEffect.TEST_OF_HUMANITY
    ]
    
    // Filter rewards to only include non-interactive ones
    const autoApplicableRewards = gameState.pendingRewards.filter(reward => {
      // Skip disabled rewards
      if (reward.disabled) return false
      
      // Skip trash rewards (require user selection)
      if (reward.isTrash) return false
      
      // Skip rewards with interactive custom effects
      if (reward.reward.custom && interactiveEffects.includes(reward.reward.custom)) {
        return false
      }
      
      // Skip rewards that are part of OR choices (pending choices)
      const isPartOfChoice = gameState.currTurn?.pendingChoices?.some(choice => 
        choice.type === ChoiceType.FIXED_OPTIONS &&
        (choice as FixedOptionsChoice).options.some(opt => 
          opt.source?.id === reward.source.id && opt.source?.type === reward.source.type
        )
      )
      if (isPartOfChoice) return false
      
      return true
    })
    
    // Dispatch CLAIM_REWARD for each auto-applicable reward
    autoApplicableRewards.forEach(reward => {
      dispatch({ type: 'CLAIM_REWARD', playerId: activePlayer.id, rewardId: reward.id })
    })
  }

  return (
    <div className="game-container">
      <div className="turn-history-container">
        <TurnHistory 
          turns={gameState.history}
          currentTurn={gameState.history.length}
          players={gameState.players}
          onTurnChange={() => {}}
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
          highlightedAreas={getSelectedCardAgentIcons(gameState)}
          infiltrate={getInfiltrate(gameState)}
          onSpaceClick={handlePlaceAgent}
          occupiedSpaces={gameState.occupiedSpaces}
          canPlaceAgent={!gameState.canEndTurn}
          combatTroops={gameState.combatTroops}
          players={gameState.players}
          factionInfluence={gameState.factionInfluence}
          currentConflict={gameState.currentConflict}
          bonusSpice={gameState.bonusSpice}
          onSelectiveBreedingRequested={handleSelectiveBreedingRequested}
          recallMode={Boolean(gameState.currTurn?.gainedEffects?.includes('RECALL_REQUIRED'))}
          ignoreCosts={Boolean(getSelectedCard(gameState)?.playEffect?.find(e => e.reward?.custom === CustomEffect.KWISATZ_HADERACH))}
          voiceSelectionActive={Boolean(voiceSelectionRewardId)}
          onVoiceSpaceSelect={handleVoiceSpaceSelect}
          blockedSpaces={gameState.blockedSpaces || []}
        />
        <div className="players-area">
          {gameState.players.map((player, idx) => (
            <PlayerArea 
              key={player.id} 
              player={player} 
              isActive={gameState.activePlayerId === player.id}
              isStartingPlayer={gameState.firstPlayerMarker === player.id}
              isOpen={openPlayerIndex === idx}
              onToggle={() => setOpenPlayerIndex(openPlayerIndex === idx ? null : idx)}
            />
          ))}
        </div>
      </div>
      <div className="round-start-container" hidden={gameState.phase !== GamePhase.ROUND_START}>
        <ConflictSelect conflicts={CONFLICTS.filter(c => !gameState.conflictsDiscard.includes(c))} handleConflictSelect={handleConflictSelect}/>
      </div>
      <div className="turn-controls-spacer" />
      <div className="turn-controls-container" hidden={gameState.phase !== GamePhase.PLAYER_TURNS && gameState.phase !== GamePhase.COMBAT}>
        <TurnControls
          activePlayer={activePlayer}
          canEndTurn={gameState.canEndTurn}
          onPlayCard={handleCardSelect}
          onPlayCombatIntrigue={handlePlayCombatIntrigue}
          onReveal={handleRevealCards}
          onEndTurn={handleEndTurn}
          onPassCombat={handlePassCombat}
          canDeployTroops={gameState.currTurn?.canDeployTroops || false}
          onAddTroop={handleAddTroop}
          onRemoveTroop={handleRemoveTroop}
          retreatableTroops={gameState.currTurn?.removableTroops || 0}
          deployableTroops={Math.min((gameState.currTurn?.troopLimit || 0) - (gameState.currTurn?.removableTroops || 0), activePlayer?.troops || 0)}
          isCombatPhase={gameState.phase === GamePhase.COMBAT}
          combatStrength={gameState.combatStrength}
          combatPasses={gameState.combatPasses}
          players={gameState.players}
          optionalEffects={gameState.currTurn?.optionalEffects || []}
          pendingChoices={gameState.currTurn?.pendingChoices || []}
          onResolveChoice={handleResolveChoice}
          onResolveCardSelect={handleResolveCardSelect}
          onPayCost={handlePayCost}
          showSelectiveBreeding={showSelectiveBreeding}
          selectedCard={getSelectedCard(gameState)}
          recallMode={Boolean(gameState.currTurn?.gainedEffects?.includes('RECALL_REQUIRED'))}
          onSelectiveBreedingSelect={card => {
            if (onSelectiveBreedingSelect) onSelectiveBreedingSelect(card)
            setShowSelectiveBreeding(false)
          }}
          onSelectiveBreedingCancel={() => setShowSelectiveBreeding(false)}
          pendingRewards={gameState.pendingRewards}
          onClaimReward={handleClaimReward}
          onClaimAllRewards={handleClaimAllRewards}
          onAutoApplyRewards={handleAutoApplyRewards}
          agentPlaced={Boolean(gameState.currTurn?.agentSpace)}
          opponentDiscardState={gameState.currTurn?.opponentDiscardState}
          onOpponentDiscardChoice={handleOpponentDiscardChoice}
          onOpponentDiscardCard={handleOpponentDiscardCard}
          combatTroops={gameState.combatTroops}
          onVoiceSelectionStart={handleVoiceSelectionStart}
          voiceSelectionActive={Boolean(voiceSelectionRewardId)}
          onVoiceSelectionCancel={handleVoiceSelectionCancel}
          onOpponentNoCardAck={handleOpponentNoCardAck}
        />
      </div>
      <div className="combat-results-container" hidden={gameState.phase !== GamePhase.COMBAT_REWARDS}>
        <CombatResults 
          players={gameState.players}
          combatStrength={gameState.combatStrength}
          history={gameState.history}
          onConfirm={handleConfirmCombat}
        />
      </div>
    </div>
  )
}

function getInfiltrate(gameState: GameState): boolean {
  return gameState.selectedCard ? gameState.players[gameState.activePlayerId].deck.find(c => c.id === gameState.selectedCard)?.infiltrate || false : false
}

function getSelectedCard(gameState: GameState): Card | null {
  return gameState.selectedCard ? gameState.players[gameState.activePlayerId].deck.find(c => c.id === gameState.selectedCard) || null : null
}

function getSelectedCardAgentIcons(gameState: GameState): AgentIcon[] {
  return getSelectedCard(gameState)?.agentIcons || []
}


function App() {
  const [screenState, setScreenState] = useState<ScreenState>(ScreenState.SETUP)
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [initialGameState, setInitialGameState] = useState<{
    players: Player[]
    currentRound: number
  } | null>(null)
  const [setupImperiumDeck] = useState<Card[]>(() => buildImperiumDeck())
  const [selectedImperiumRow, setSelectedImperiumRow] = useState<Card[] | null>(null)
  const [remainingImperiumDeck, setRemainingImperiumDeck] = useState<Card[] | null>(null)

  const handleSetupComplete = (setups: PlayerSetup[]) => {
    setPlayerSetups(setups)
    setScreenState(ScreenState.LEADER_CHOICES)
  }

  const handleLeaderChoicesComplete = (leader: Leader) => {
    playerSetups[currentPlayerIndex].leader = leader;
    if (currentPlayerIndex < playerSetups.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1)
    } else {
      setScreenState(ScreenState.GAME_STATE_SETUP)
      setCurrentPlayerIndex(0)
    }
  }

  const handleGameStateSetupComplete = (state: { players: Player[], currentRound: number }) => {
    setInitialGameState(state)
    setScreenState(ScreenState.IMPERIUM_ROW_SETUP)
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

  const handleImperiumRowSelectionComplete = (cardIds: number[]) => {
    const selected: Card[] = []
    const remaining: Card[] = []
    setupImperiumDeck.forEach(card => {
      if (cardIds.includes(card.id)) {
        selected.push(card)
      } else {
        remaining.push(card)
      }
    })
    setSelectedImperiumRow(selected)
    setRemainingImperiumDeck(remaining)
    setScreenState(ScreenState.GAME)
  }

  return (
    <div className="app">
      {screenState === ScreenState.SETUP && (
        <GameSetup onComplete={handleSetupComplete} />
      )}

      {screenState === ScreenState.LEADER_CHOICES && renderLeaderChoices()}

      {screenState === ScreenState.GAME_STATE_SETUP && (
        <GameStateSetup 
          playerSetups={playerSetups}
          onComplete={handleGameStateSetupComplete}
        />
      )}

      {screenState === ScreenState.IMPERIUM_ROW_SETUP && initialGameState && (
        <ImperiumRowSelect
          cards={setupImperiumDeck}
          requiredCount={5}
          onConfirm={handleImperiumRowSelectionComplete}
        />
      )}

      {screenState === ScreenState.GAME && initialGameState && selectedImperiumRow && remainingImperiumDeck && (
        <GameProvider initialState={{
          players: initialGameState.players,
          currentRound: initialGameState.currentRound,
          factionInfluence:{
            [FactionType.EMPEROR]: Object.fromEntries(playerSetups.map((_p, i) => [i, 0])),
            [FactionType.SPACING_GUILD]: Object.fromEntries(playerSetups.map((_p, i) => [i, 0])),
            [FactionType.BENE_GESSERIT]: Object.fromEntries(playerSetups.map((_p, i) => [i, 0])),
            [FactionType.FREMEN]: Object.fromEntries(playerSetups.map((_p, i) => [i, 0]))
          },
          phase: GamePhase.ROUND_START,
          imperiumRow: selectedImperiumRow,
          imperiumRowDeck: remainingImperiumDeck
        }}>
          <GameContent />
        </GameProvider>
      )}
    </div>
  )
}

export default App
