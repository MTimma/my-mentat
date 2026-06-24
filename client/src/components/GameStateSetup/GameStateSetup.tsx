import React, { useEffect, useMemo, useState } from 'react'
import { PlayerSetup, Player, Card } from '../../types/GameTypes'
import { motion } from 'framer-motion'
import { getStartingSpice, getStartingSolari } from '../../data/leaderAbilities/beastSetup'
import { getStartingWater } from '../../data/leaderAbilities/yunaSolariBonus'
import { applyHudroStartingIntrigue } from '../../data/leaderAbilities/hudroIntriguePeek'
import { seedTessiaSnoopers } from '../../data/leaderAbilities/tessiaSnoopers'
import StarterDeckEditor from '../StarterDeckEditor/StarterDeckEditor'
import ImperiumRowDeckCreator from '../ImperiumRowDeckCreator/ImperiumRowDeckCreator'
import { applyStarterDeckReservationToImperium } from '../../services/starterDeckSetup'
import { createCatalogRuntime } from '../../catalog/runtime'
import { resolveGamePack } from '../../gamePacks/resolveGamePack'
import { buildSetupBlockFromConfiguration } from '../../save/buildSetupBlock'
import { createGameInputDoc } from '../../save/createGameInput'
import {
  cyclePlayChromeTheme,
  getPlayChromeTheme,
  PLAY_CHROME_THEME_LABELS,
  type PlayChromeTheme,
} from '../../utils/playChromeTheme'
import { defaultDreadnoughtsForExpansions } from '../../utils/dreadnoughts'
import { seedTroopSupply } from '../../utils/troops'

interface GameStateSetupProps {
  playerSetups: PlayerSetup[]
  firstPlayer: number
  gamePackId: string
  onComplete: (initialState: {
    players: Player[]
    currentRound: number
    imperiumRowDeck: Card[]
  }) => void
  onOpenCardCreator: () => void
  autoApplyMandatoryRewards: boolean
  onAutoApplyMandatoryRewardsChange: (enabled: boolean) => void
}

const GameStateSetup: React.FC<GameStateSetupProps> = ({
  playerSetups,
  firstPlayer,
  gamePackId,
  onComplete,
  onOpenCardCreator,
  autoApplyMandatoryRewards,
  onAutoApplyMandatoryRewardsChange,
}) => {
  const catalogRuntime = useMemo(
    () => createCatalogRuntime(resolveGamePack(gamePackId)),
    [gamePackId]
  )
  const expansions = useMemo(
    () => resolveGamePack(gamePackId).structure.expansions,
    [gamePackId]
  )
  const [playChromeTheme, setPlayChromeTheme] = useState<PlayChromeTheme>(() => getPlayChromeTheme())
  const [currentRound, setCurrentRound] = useState(1)
  const [showResourceEditor, setShowResourceEditor] = useState(false)
  const [showStarterDeckEditor, setShowStarterDeckEditor] = useState(false)
  const [showImperiumDeckCreator, setShowImperiumDeckCreator] = useState(false)
  const [imperiumRowDeckDraft, setImperiumRowDeckDraft] = useState<Card[]>(() =>
    catalogRuntime.buildImperiumDeck(expansions)
  )

  useEffect(() => {
    setImperiumRowDeckDraft(catalogRuntime.buildImperiumDeck(expansions))
  }, [catalogRuntime, expansions])
  const [editablePlayerSetups, setEditablePlayerSetups] = useState<PlayerSetup[]>(
    playerSetups.map(setup => ({
      ...setup,
      deck: [...setup.deck],
      startingHand: [...setup.startingHand]
    }))
  )
  const [playerStates, setPlayerStates] = useState<Player[]>(
    playerSetups.map((setup, index) => {
      const base = applyHudroStartingIntrigue({
        id: index,
        leader: setup.leader,
        color: setup.color,
        spice: getStartingSpice(setup.leader),
        water: getStartingWater(setup.leader),
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
        ...(defaultDreadnoughtsForExpansions(expansions)
          ? { dreadnoughts: defaultDreadnoughtsForExpansions(expansions) }
          : {}),
        ...(expansions.riseOfIx
          ? { freighterStep: 0 as const, negotiatorsOnIx: 0, tech: [] as const }
          : {}),
      })
      return seedTessiaSnoopers(seedTroopSupply(applyHudroStartingIntrigue(base)), expansions.riseOfIx)
    })
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

  const [showGameInputJson, setShowGameInputJson] = useState(false)

  const previewGameInputJson = useMemo(() => {
    const imperiumRowDeck = applyStarterDeckReservationToImperium(
      imperiumRowDeckDraft,
      editablePlayerSetups.map(setup => setup.deck)
    )
    const { setup, unmapped } = buildSetupBlockFromConfiguration({
      players: playerStates,
      firstPlayer,
      imperiumRowDeck,
      currentRound,
      gamePackId,
    })
    const doc = createGameInputDoc(setup, {
      title: 'New game (preview)',
      notes: unmapped.length
        ? `Unmapped catalog entries: ${unmapped.join(', ')}`
        : undefined,
    })
    return JSON.stringify(doc, null, 2)
  }, [
    currentRound,
    editablePlayerSetups,
    gamePackId,
    firstPlayer,
    imperiumRowDeckDraft,
    playerStates,
  ])

  const handleCopyGameInput = async () => {
    try {
      await navigator.clipboard.writeText(previewGameInputJson)
    } catch {
      // Clipboard may be unavailable
    }
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
      imperiumRowDeck: applyStarterDeckReservationToImperium(
        imperiumRowDeckDraft,
        editablePlayerSetups.map(setup => setup.deck)
      )
    })
  }

  return (
    <motion.div 
      className="game-state-setup"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="setup-container">
        <div className="setup-container-scroll">
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

          <div className="setup-section setup-option-row">
            <div>
              <strong>Auto-apply mandatory rewards</strong>
              <p>Automatically claim non-interactive rewards during play.</p>
            </div>
            <button
              type="button"
              className={`setup-toggle-button ${autoApplyMandatoryRewards ? 'setup-toggle-button-on' : ''}`}
              onClick={() => onAutoApplyMandatoryRewardsChange(!autoApplyMandatoryRewards)}
              aria-pressed={autoApplyMandatoryRewards}
            >
              {autoApplyMandatoryRewards ? 'On' : 'Off'}
            </button>
          </div>

          <div className="setup-section setup-option-row">
            <div>
              <strong>Play UI theme</strong>
              <p>Warm void charcoal or cool blueish chrome around the board.</p>
            </div>
            <button
              type="button"
              className="setup-toggle-button setup-toggle-button-on"
              onClick={() => setPlayChromeTheme(cyclePlayChromeTheme())}
              aria-label={`Switch play UI theme (current: ${PLAY_CHROME_THEME_LABELS[playChromeTheme]})`}
            >
              {PLAY_CHROME_THEME_LABELS[playChromeTheme]}
            </button>
          </div>

          <div className="setup-section setup-option-row">
            <div>
              <strong>Game input (JSON)</strong>
              <p>Event-sourced setup document used when the game starts (catalog ids, no play events yet).</p>
            </div>
            <button
              type="button"
              className="toggle-editor-button"
              onClick={() => setShowGameInputJson(prev => !prev)}
            >
              {showGameInputJson ? 'Hide JSON' : 'Preview JSON'}
            </button>
          </div>

          {showGameInputJson && (
            <div className="setup-editor-panel setup-game-input-json">
              <button type="button" className="toggle-editor-button" onClick={handleCopyGameInput}>
                Copy to clipboard
              </button>
              <pre className="setup-game-input-pre">{previewGameInputJson}</pre>
            </div>
          )}

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
            </button>
            <button
              className="toggle-editor-button"
              type="button"
              onClick={() => setShowStarterDeckEditor(prev => !prev)}
            >
              {showStarterDeckEditor ? 'Hide player starter decks' : 'Edit player starter decks'}
            </button>
            <button
              className="toggle-editor-button"
              type="button"
              onClick={() => setShowImperiumDeckCreator(prev => !prev)}
            >
              {showImperiumDeckCreator ? 'Hide Imperium row deck' : 'Edit Imperium row deck'}
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
                imperiumBaseDeck={imperiumRowDeckDraft}
              />
            </div>
          )}

          {showImperiumDeckCreator && (
            <div className="setup-editor-panel setup-editor-panel-imperium">
              <p className="imperium-deck-setup-note">
                Cards on player starter decks are still removed from this Imperium deck when the game starts (same as
                before).
              </p>
              <ImperiumRowDeckCreator deck={imperiumRowDeckDraft} onDeckChange={setImperiumRowDeckDraft} />
            </div>
          )}
        </div>

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