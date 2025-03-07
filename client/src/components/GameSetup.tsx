import React, { useState } from 'react'
import { Leader, PlayerColor, PlayerSetup } from '../types/GameTypes'
import { LEADERS } from '../data/leaders'
import { motion } from 'framer-motion'

interface GameSetupProps {
  onComplete: (playerSetups: PlayerSetup[]) => void
}

const GameSetup: React.FC<GameSetupProps> = ({ onComplete }) => {
  const [gameName, setGameName] = useState('')
  const [playerCount, setPlayerCount] = useState<number>(2)
  const [players, setPlayers] = useState<PlayerSetup[]>([
    { playerNumber: 1, color: PlayerColor.RED, leader: LEADERS[0] },
    { playerNumber: 2, color: PlayerColor.GREEN, leader: LEADERS[1] }
  ])

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count)
    const newPlayers = Array.from({ length: count }, (_, i) => ({
      playerNumber: i + 1,
      color: Object.values(PlayerColor)[i],
      leader: LEADERS[i]
    }))
    setPlayers(newPlayers)
  }

  const handlePlayerChange = (index: number, field: keyof PlayerSetup, value: any) => {
    const newPlayers = [...players]
    newPlayers[index] = { ...newPlayers[index], [field]: value }
    setPlayers(newPlayers)
  }

  const getAvailableColors = (currentIndex: number) => {
    const usedColors = players
      .filter((_, i) => i !== currentIndex)
      .map(p => p.color)
    return Object.values(PlayerColor).filter(color => !usedColors.includes(color))
  }

  const isSetupComplete = () => {
    return gameName.trim() !== '' && 
           players.every(p => p.color && p.leader)
  }

  return (
    <motion.div 
      className="game-setup"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="setup-container">
        <h1>Dune: Imperium</h1>
        <p className="game-description">
          Lead your house to victory through strategic card play, 
          careful resource management, and political influence.
        </p>

        <div className="setup-section">
          <label>
            Game Name:
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Enter game name..."
              className="game-name-input"
            />
          </label>
        </div>

        <div className="setup-section">
          <label>
            Number of Players:
            <select 
              value={playerCount}
              onChange={(e) => handlePlayerCountChange(Number(e.target.value))}
              className="player-count-select"
            >
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
            </select>
          </label>
        </div>

        <div className="players-setup">
          {players.map((player, index) => (
            <div key={index} className="player-setup-row">
              <h3>Player {index + 1}</h3>
              
              <div className="player-options">
                <select
                  value={player.color}
                  onChange={(e) => handlePlayerChange(index, 'color', e.target.value)}
                  className={`color-select ${player.color.toLowerCase()}`}
                >
                  {getAvailableColors(index).map(color => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>

                <select
                  value={player.leader.name}
                  onChange={(e) => {
                    const selectedLeader = LEADERS.find(l => l.name === e.target.value)
                    if (selectedLeader) {
                      handlePlayerChange(index, 'leader', selectedLeader)
                    }
                  }}
                  className="leader-select"
                >
                  {LEADERS.map(leader => (
                    <option key={leader.name} value={leader.name}>
                      {leader.name} ({leader.ability.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button
          className="start-game-button"
          disabled={!isSetupComplete()}
          onClick={() => onComplete(players)}
        >
          Start Game
        </button>
      </div>
    </motion.div>
  )
}

export default GameSetup 