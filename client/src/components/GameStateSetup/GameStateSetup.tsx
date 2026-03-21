import React, { useState } from 'react'
import { PlayerSetup, Player, Card } from '../../types/GameTypes'
import { motion } from 'framer-motion'
import { getStartingSpice, getStartingSolari } from '../../data/leaderAbilities/beastSetup'
import StarterDeckEditor from '../StarterDeckEditor/StarterDeckEditor'
import { buildSetupImperiumDeck } from '../../services/starterDeckSetup'
import './GameStateSetup.css'

interface GameStateSetupProps {
  playerSetups: PlayerSetup[]
  onComplete: (initialState: {
    players: Player[]
    currentRound: number
    imperiumRowDeck: Card[]
  }) => void
  onOpenCardCreator: () => void
}

const GameStateSetup: React.FC<GameStateSetupProps> = ({
  playerSetups,
  onComplete,
  onOpenCardCreator,
}) => {
  const [currentRound, setCurrentRound] = useState(1)
  const [showResourceEditor, setShowResourceEditor] = useState(false)
  const [showStarterDeckEditor, setShowStarterDeckEditor] = useState(false)
  const [editablePlayerSetups, setEditablePlayerSetups] = useState<PlayerSetup[]>(
    playerSetups.map(setup => ({
      ...setup,
      deck: [...setup.deck],
      startingHand: [...setup.startingHand]
    }))
  )
  const [playerStates, setPlayerStates] = useState<Player[]>(
    playerSetups.map((setup, index) => ({
      id: index,
      leader: setup.leader,
      color: setup.color,
      spice: getStartingSpice(setup.leader),
      water: 1,
      solari: getStartingSolari(setup.leader),
      troops: 3,
      combatValue: 0,
      agents: 2,
      handCount: 5,
      intrigueCount: 0,
      deck: [...setup.deck],
      discardPile: [],
      trash: [],
      hasHighCouncilSeat: false,
      hasSwordmaster: false,
      playArea: [],
      persuasion: 0,
      victoryPoints: 1,
      revealed: false,
    }))
  )

  const handleResourceChange = (playerId: number, resource: keyof Player, value: number) => {
    setPlayerStates(prev => prev.map(player => 
      player.id === playerId 
        ? { ...player, [resource]: value }
        : player
    ))
  }

  const handleStarterDeckChange = (playerIndex: number, deck: Card[]) => {
    setEditablePlayerSetups(prev =>
      prev.map((setup, index) => (
        index === playerIndex
          ? { ...setup, deck: [...deck] }
          : setup
      ))
    )

    setPlayerStates(prev =>
      prev.map(player => (
        player.id === playerIndex
          ? { ...player, deck: [...deck] }
          : player
      ))
    )
  }

  const handleSubmit = () => {
    onComplete({
      players: playerStates.map(player => ({
        ...player,
        deck: [...player.deck],
        discardPile: [...player.discardPile],
        trash: [...player.trash],
        playArea: [...player.playArea]
      })),
      currentRound,
      imperiumRowDeck: buildSetupImperiumDeck(editablePlayerSetups.map(setup => setup.deck))
    })
  }

  return (
    <motion.div 
      className="game-state-setup"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="setup-container">
        <h1>Customize Game State</h1>
        <p className="game-description">
          Set initial resources and game state for each player
        </p>

          <div className="setup-section">
            <label>
              Starting Round:
              <input
                type="number"
                min="1"
                value={currentRound}
                onChange={(e) => setCurrentRound(Number(e.target.value))}
                className="round-input"
              />
            </label>
          </div>

          <div className="setup-actions">
            <button
              className="toggle-editor-button"
              onClick={() => setShowResourceEditor(prev => !prev)}
            >
              {showResourceEditor ? 'Hide player starting resources' : 'Edit player starting resources'}
            </button>
            <button
              className="toggle-editor-button"
              type="button"
              onClick={onOpenCardCreator}
            >
              Open card creator
              onClick={() => setShowStarterDeckEditor(prev => !prev)}
            >
              {showStarterDeckEditor ? 'Hide player starter decks' : 'Edit player starter decks'}
            </button>
          </div>

          {showResourceEditor && (
            <div className="players-setup">
              {playerStates.map((player) => (
                <div key={player.id} className="player-setup-row">
                  <h3>Player {player.id + 1} - {player.leader.name}</h3>
                  
                  <div className="resource-grid">
                    <div className="resource-input">
                      <label>Spice:</label>
                      <input
                        type="number"
                        min="0"
                        value={player.spice}
                        onChange={(e) => handleResourceChange(player.id, 'spice', Number(e.target.value))}
                      />
                    </div>

                    <div className="resource-input">
                      <label>Water:</label>
                      <input
                        type="number"
                        min="0"
                        value={player.water}
                        onChange={(e) => handleResourceChange(player.id, 'water', Number(e.target.value))}
                      />
                    </div>

                    <div className="resource-input">
                      <label>Solari:</label>
                      <input
                        type="number"
                        min="0"
                        value={player.solari}
                        onChange={(e) => handleResourceChange(player.id, 'solari', Number(e.target.value))}
                      />
                    </div>

                    <div className="resource-input">
                      <label>Troops:</label>
                      <input
                        type="number"
                        min="0"
                        value={player.troops}
                        onChange={(e) => handleResourceChange(player.id, 'troops', Number(e.target.value))}
                      />
                    </div>

                    <div className="resource-input">
                      <label>Victory Points:</label>
                      <input
                        type="number"
                        min="0"
                        value={player.victoryPoints}
                        onChange={(e) => handleResourceChange(player.id, 'victoryPoints', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showStarterDeckEditor && (
            <div className="setup-editor-panel">
              <StarterDeckEditor
                playerSetups={editablePlayerSetups}
                onPlayerDeckChange={handleStarterDeckChange}
              />
            </div>
          )}

          <button
            className="start-game-button"
            onClick={handleSubmit}
          >
            Start Game
          </button>
      </div>
    </motion.div>
  )
}

export default GameStateSetup 