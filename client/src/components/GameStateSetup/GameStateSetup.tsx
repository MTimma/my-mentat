import React, { useState } from 'react'
import { PlayerSetup, Player } from '../../types/GameTypes'
import { motion } from 'framer-motion'
import './GameStateSetup.css'

interface GameStateSetupProps {
  playerSetups: PlayerSetup[]
  onComplete: (initialState: {
    players: Player[]
    currentRound: number
  }) => void
}

const GameStateSetup: React.FC<GameStateSetupProps> = ({ playerSetups, onComplete }) => {
  const [currentRound, setCurrentRound] = useState(1)
  const [showResourceEditor, setShowResourceEditor] = useState(false)
  const [playerStates, setPlayerStates] = useState<Player[]>(
    playerSetups.map((setup, index) => ({
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
      intrigueCount: 0,
      deck: setup.deck,
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

  const handleSubmit = () => {
    onComplete({
      players: playerStates,
      currentRound
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
              disabled
            >
              Edit Imperium deck (coming soon)
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