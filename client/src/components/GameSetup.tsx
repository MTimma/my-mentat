import React, { useEffect, useMemo, useState } from 'react'
import { PlayerColor, PlayerSetup } from '../types/GameTypes'
import { getLeaderPool } from '../data/leaders'
import LeaderSelect from './LeaderSelect/LeaderSelect'
import { motion } from 'framer-motion'
import { buildStartingDeck } from '../services/starterDeckSetup'
import SaveDocImportPanel from './SaveDocImportPanel/SaveDocImportPanel'
import GamePackEditor from './GamePackEditor/GamePackEditor'
import type { SaveDoc } from '../save/types'
import { getSelectableGamePacks } from '../gamePacks/registry'
import { subscribeGamePacks } from '../gamePacks/customGamePacks'
import { expansionsForGamePack } from '../gamePacks/resolveGamePack'
import { DEFAULT_PLAYER_COLORS } from '../utils/playerColors'
import {
  swapPlayerColorInSetups,
  swapPlayerLeaderInSetups,
} from '../utils/playerIdentitySwap'
import './GameSetup/GameSetup.css'

interface GameSetupProps {
  gamePackId: string
  onGamePackChange: (gamePackId: string) => void
  onComplete: (playerSetups: PlayerSetup[], gamePackId: string) => void
  /** Start sandbox mode: straight to the board with default state, configure everything there. */
  onSandbox: (playerSetups: PlayerSetup[], gamePackId: string) => void
  onLoadSave?: (doc: SaveDoc) => void
}

const createPlayerSetup = (playerNumber: number, color: PlayerColor, leaderIndex: number, gamePackId: string): PlayerSetup => {
  const expansions = expansionsForGamePack(gamePackId)
  const leaders = getLeaderPool(expansions)
  return {
    playerNumber,
    color,
    leader: leaderIndex === 4 ? leaders[4] : leaders[leaderIndex],
    deck: buildStartingDeck(gamePackId),
    startingHand: []
  }
}

const GameSetup: React.FC<GameSetupProps> = ({
  gamePackId,
  onGamePackChange,
  onComplete,
  onSandbox,
  onLoadSave,
}) => {
  const [gameName, setGameName] = useState('Test Game')
  const [playerCount, setPlayerCount] = useState<number>(4)
  const [editorOpen, setEditorOpen] = useState(false)
  const [packListVersion, setPackListVersion] = useState(0)
  const selectablePacks = useMemo(() => getSelectableGamePacks(), [packListVersion])
  const expansions = useMemo(() => expansionsForGamePack(gamePackId), [gamePackId])
  const [players, setPlayers] = useState<PlayerSetup[]>([
    createPlayerSetup(1, DEFAULT_PLAYER_COLORS[0], 1, gamePackId),
    createPlayerSetup(2, DEFAULT_PLAYER_COLORS[1], 0, gamePackId),
    createPlayerSetup(3, DEFAULT_PLAYER_COLORS[2], 2, gamePackId),
    createPlayerSetup(4, DEFAULT_PLAYER_COLORS[3], 3, gamePackId),
  ])

  useEffect(() => subscribeGamePacks(() => setPackListVersion(v => v + 1)), [])

  useEffect(() => {
    setPlayers(prev =>
      prev.map((player, index) => {
        const leaders = getLeaderPool(expansions)
        const leaderStillValid = leaders.some(l => l.name === player.leader.name)
        const leaderIndex = leaderStillValid
          ? leaders.findIndex(l => l.name === player.leader.name)
          : Math.min(index, leaders.length - 1)
        return {
          ...player,
          leader: leaders[leaderIndex] ?? leaders[0],
          deck: buildStartingDeck(gamePackId),
        }
      })
    )
  }, [gamePackId, expansions])

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count)
    const newPlayers = Array.from({ length: count }, (_, i) => ({
      ...createPlayerSetup(
        i + 1,
        DEFAULT_PLAYER_COLORS[i],
        i === 0 ? 1 : i - 1,
        gamePackId
      ),
    }))
    setPlayers(newPlayers)
  }

  const handleColorChange = (index: number, color: PlayerColor) => {
    setPlayers(prev => swapPlayerColorInSetups(prev, index, color))
  }

  const handleLeaderChange = (index: number, leader: PlayerSetup['leader']) => {
    setPlayers(prev => swapPlayerLeaderInSetups(prev, index, leader))
  }

  const leaderPool = useMemo(() => getLeaderPool(expansions), [expansions])

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
          <label className="setup-field setup-field--compact">
            <span className="setup-field-label">Game pack</span>
            <select
              value={gamePackId}
              onChange={(e) => onGamePackChange(e.target.value)}
              className="game-pack-select"
              aria-label="Game pack"
            >
              {selectablePacks.map(pack => (
                <option key={pack.ref} value={pack.ref}>
                  {pack.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="setup-game-pack-actions">
          <button
            type="button"
            className="setup-game-pack-create-btn"
            onClick={() => setEditorOpen(true)}
          >
            Create new game pack from selected…
          </button>
        </div>

        <div className="players-setup">
          {players.map((player, index) => (
            <div key={index} className="player-setup-row">
              <span className="player-setup-label">P{index + 1}</span>
              <select
                value={player.color}
                onChange={(e) => handleColorChange(index, e.target.value as PlayerColor)}
                className={`color-select ${player.color.toLowerCase()}`}
                aria-label={`Player ${index + 1} color`}
              >
                {Object.values(PlayerColor).map(color => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
              <LeaderSelect
                leaders={leaderPool}
                value={player.leader}
                onChange={leader => handleLeaderChange(index, leader)}
                ariaLabel={`Player ${index + 1} leader`}
                variant="setup"
              />
            </div>
          ))}
        </div>
        </div>

        {onLoadSave && (
          <SaveDocImportPanel
            className="setup-load-save"
            variant="file"
            buttonLabel="Load saved game…"
            onLoad={onLoadSave}
          />
        )}

        <button
          className="start-game-button"
          disabled={!isSetupComplete()}
          onClick={() => onComplete(players, gamePackId)}
        >
          Start Game
        </button>
        <button
          className="start-game-button start-game-button--sandbox"
          disabled={!isSetupComplete()}
          onClick={() => onSandbox(players, gamePackId)}
          title="Skip setup screens — configure everything directly on the board"
        >
          Sandbox Mode
        </button>
      </div>

      {editorOpen && (
        <GamePackEditor
          parentPackId={gamePackId}
          onClose={() => setEditorOpen(false)}
          onSaved={ref => {
            onGamePackChange(ref)
            setEditorOpen(false)
          }}
        />
      )}
    </motion.div>
  )
}

export default GameSetup
