import React, { useState } from 'react'
import { Expansions, PlayerColor, PlayerSetup } from '../types/GameTypes'
import { getLeaderPool } from '../data/leaders'
import { motion } from 'framer-motion'
import { buildStartingDeck } from '../services/starterDeckSetup'
import SaveDocImportPanel from './SaveDocImportPanel/SaveDocImportPanel'
import type { SaveDoc } from '../save/types'
import './GameSetup/GameSetup.css'

interface GameSetupProps {
  expansions: Expansions
  onExpansionsChange: (expansions: Expansions) => void
  onComplete: (playerSetups: PlayerSetup[], expansions: Expansions) => void
  /** Start sandbox mode: straight to the board with default state, configure everything there. */
  onSandbox: (playerSetups: PlayerSetup[], expansions: Expansions) => void
  onLoadSave?: (doc: SaveDoc) => void
}

const createPlayerSetup = (playerNumber: number, color: PlayerColor, leaderIndex: number, expansions: Expansions): PlayerSetup => {
  const leaders = getLeaderPool(expansions)
  return {
    playerNumber,
    color,
    leader: leaderIndex === 4 ? leaders[4] : leaders[leaderIndex],
    deck: buildStartingDeck(),
    startingHand: []
  }
}

const GameSetup: React.FC<GameSetupProps> = ({
  expansions,
  onExpansionsChange,
  onComplete,
  onSandbox,
  onLoadSave,
}) => {
  const [gameName, setGameName] = useState('Test Game')
  const [playerCount, setPlayerCount] = useState<number>(4)
  const [loadSectionOpen, setLoadSectionOpen] = useState(false)
  const [players, setPlayers] = useState<PlayerSetup[]>([
    createPlayerSetup(1, PlayerColor.RED, 1, expansions),
    createPlayerSetup(2, PlayerColor.GREEN, 0, expansions),
    createPlayerSetup(3, PlayerColor.YELLOW, 2, expansions),
    createPlayerSetup(4, PlayerColor.BLUE, 3, expansions)
  ])

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count)
    const newPlayers = Array.from({ length: count }, (_, i) => ({
      ...createPlayerSetup(i + 1, Object.values(PlayerColor)[i], i === 0 ? 1 : i - 1, expansions)
    }))
    setPlayers(newPlayers)
  }

  const handlePlayerChange = (index: number, field: keyof PlayerSetup, value: PlayerSetup[keyof PlayerSetup]) => {
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

  const getAvailableLeaders = (currentIndex: number) => {
    const usedLeaders = players
      .filter((_, i) => i !== currentIndex)
      .map(p => p.leader.name)
    return getLeaderPool(expansions).filter(leader => !usedLeaders.includes(leader.name))
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
        <div className="setup-container-scroll">
        <header className="setup-header">
          <h1>Dune: Imperium</h1>
          <p className="game-description">
            Lead your house to victory through strategic card play and political influence.
          </p>
        </header>

        <div className="setup-meta-row">
          <label className="setup-field">
            <span className="setup-field-label">Game Name</span>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Enter game name..."
              className="game-name-input"
            />
          </label>
          <label className="setup-field setup-field--compact">
            <span className="setup-field-label">Players</span>
            <select
              value={playerCount}
              onChange={(e) => handlePlayerCountChange(Number(e.target.value))}
              className="player-count-select"
            >
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <label className="setup-field setup-field--compact riseofix-toggle">
            <span className="setup-field-label">Rise of Ix</span>
            <input
              type="checkbox"
              checked={expansions.riseOfIx}
              onChange={(e) => onExpansionsChange({ ...expansions, riseOfIx: e.target.checked })}
            />
          </label>
        </div>

        <div className="players-setup">
          {players.map((player, index) => (
            <div key={index} className="player-setup-row">
              <span className="player-setup-label">P{index + 1}</span>
              <select
                value={player.color}
                onChange={(e) => handlePlayerChange(index, 'color', e.target.value as PlayerColor)}
                className={`color-select ${player.color.toLowerCase()}`}
                aria-label={`Player ${index + 1} color`}
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
                  const selectedLeader = getLeaderPool(expansions).find(l => l.name === e.target.value)
                  if (selectedLeader) {
                    handlePlayerChange(index, 'leader', selectedLeader)
                  }
                }}
                className="leader-select"
                aria-label={`Player ${index + 1} leader`}
              >
                {getAvailableLeaders(index).map(leader => (
                  <option key={leader.name} value={leader.name}>
                    {leader.name} ({leader.ability.name})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        </div>

        {onLoadSave && (
          <details
            className="setup-load-save"
            open={loadSectionOpen}
            onToggle={e => setLoadSectionOpen(e.currentTarget.open)}
          >
            <summary className="setup-load-save-summary">Load saved game</summary>
            <SaveDocImportPanel onLoad={onLoadSave} />
          </details>
        )}

        <button
          className="start-game-button"
          disabled={!isSetupComplete()}
          onClick={() => onComplete(players, expansions)}
        >
          Start Game
        </button>
        <button
          className="start-game-button start-game-button--sandbox"
          disabled={!isSetupComplete()}
          onClick={() => onSandbox(players, expansions)}
          title="Skip setup screens — configure everything directly on the board"
        >
          Sandbox Mode
        </button>
      </div>
    </motion.div>
  )
}

export default GameSetup 