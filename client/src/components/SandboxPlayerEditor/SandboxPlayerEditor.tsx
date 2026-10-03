import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, ControlMarkerType, Expansions, FactionType, Player, PlayerColor } from '../../types/GameTypes'
import { applyLeaderStartingResourceDelta } from '../../data/leaderAbilities/beastSetup'
import {
  isTessiaLeader,
  hasOnTrackSnooper,
  recalculateTessiaSnooperRewardSlot,
  seedTessiaSnoopers,
} from '../../data/leaderAbilities/tessiaSnoopers'
import { getLeaderPool, isUnassignedLeader } from '../../data/leaders'
import LeaderSelect from '../LeaderSelect/LeaderSelect'
import AgentIcon from '../AgentIcon/AgentIcon'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import FreighterIcon from '../FreighterIcon/FreighterIcon'
import NegotiatorIcon from '../NegotiatorIcon/NegotiatorIcon'
import { defaultDreadnoughtsForExpansions } from '../../utils/dreadnoughts'
import { MAX_TROOPS_PER_PLAYER, seedTroopSupply } from '../../utils/troops'
import CardSearch from '../CardSearch/CardSearch'
import ValueStepper from '../ValueStepper/ValueStepper'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import { splitCardPool } from '../../utils/sandboxDeckPools'
import { MAX_INFLUENCE } from '../../utils/influenceVictoryPoints'
import {
  defaultSavedPlayerName,
  PLAYER_NAME_MAX_LENGTH,
  playerNameFieldValue,
  storedPlayerName,
} from '../../utils/playerName'
import type { TechTileId } from '../../data/techTiles'
import { TECH_TILES } from '../../data/techTiles'
import SandboxPlayerTechSelect from '../SandboxPlayerTechSelect/SandboxPlayerTechSelect'
import BeneTleilaxBoardPanel from '../ImageBoard/BeneTleilaxBoardPanel'
import { clampTleilaxuStep, TLEILAXU_TRACK_MAX_STEP } from '../../expansions/immortality/tleilaxuTrack'
import { RESEARCH_NODES, RESEARCH_START_NODE_ID } from '../../expansions/immortality/researchTrack'
import './SandboxPlayerEditor.css'

const RESEARCH_NODE_IDS = Object.keys(RESEARCH_NODES)

const CONTROL_SPACES: Array<{ type: ControlMarkerType; label: string }> = [
  { type: ControlMarkerType.ARRAKIN, label: 'Arrakeen' },
  { type: ControlMarkerType.CARTHAG, label: 'Carthag' },
  { type: ControlMarkerType.IMPERIAL_BASIN, label: 'Imperial Basin' },
]

interface SandboxPlayerEditorProps {
  player: Player
  expansions: Expansions
  /** Leaders already taken by other players (excluded from the leader picker). */
  usedLeaderNames: string[]
  /** Imperium deck pool available when editing this player's deck. */
  imperiumDeckCards: Card[]
  /** Reserve decks that may be added to a starter deck. */
  arrakisLiaisonCards: Card[]
  spiceMustFlowCards: Card[]
  foldspaceCards: Card[]
  controlMarkers: Record<ControlMarkerType, number | null>
  dreadnoughtCover?: Record<ControlMarkerType, number | null>
  mentatOwner: number | null
  playerInfluence: Record<FactionType, number>
  /** All seats, so research-track cubes for other leaders stay visible. */
  players: Player[]
  tleilaxuTrackBonusSpice?: number
  tleilaxuTrackBonusClaimed?: boolean
  /** Tech tiles on the Ix board or other players — unavailable for this player. */
  blockedTechTileIds?: TechTileId[]
  onUpdate: (patch: Partial<Player>) => void
  onInfluenceUpdate: (faction: FactionType, value: number) => void
  onSetControl: (space: ControlMarkerType, playerId: number | null) => void
  onSetDreadnoughtControl: (space: ControlMarkerType, playerId: number | null) => void
  onSetMentatOwner: (playerId: number | null) => void
  onClose: () => void
}

type NumericField = {
  key: keyof Pick<
    Player,
    'spice' | 'water' | 'solari' | 'troops' | 'victoryPoints' | 'agents' | 'handCount' | 'intrigueCount'
  >
  label: string
  icon?: string
}

const INFLUENCE_FIELDS: Array<{ faction: FactionType; label: string }> = [
  { faction: FactionType.EMPEROR, label: 'Emperor' },
  { faction: FactionType.SPACING_GUILD, label: 'Guild' },
  { faction: FactionType.BENE_GESSERIT, label: 'Bene G.' },
  { faction: FactionType.FREMEN, label: 'Fremen' },
]

const NUMERIC_FIELDS: NumericField[] = [
  { key: 'spice', label: 'Spice', icon: '/icon/spice.png' },
  { key: 'water', label: 'Water', icon: '/icon/water.png' },
  { key: 'solari', label: 'Solari', icon: '/icon/solari.png' },
  { key: 'troops', label: 'Garrison', icon: '/icon/troop.png' },
  { key: 'victoryPoints', label: 'VP', icon: '/icon/vp.png' },
  { key: 'agents', label: 'Agents' },
  { key: 'handCount', label: 'Hand', icon: '/icon/draw.png' },
  { key: 'intrigueCount', label: 'Intrigue', icon: '/icon/intrigue.png' },
]

type NumericKey = NumericField['key']

const sortCards = (cards: Card[]): Card[] =>
  [...cards].sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name)
    return nameCompare !== 0 ? nameCompare : a.id - b.id
  })

function pickNumericDraft(player: Player): Record<NumericKey, number> {
  return {
    spice: player.spice,
    water: player.water,
    solari: player.solari,
    troops: player.troops,
    victoryPoints: player.victoryPoints,
    agents: player.agents,
    handCount: player.handCount,
    intrigueCount: player.intrigueCount,
  }
}

type PileEditor = 'deck' | 'discard' | 'trash'

const SandboxPlayerEditor: React.FC<SandboxPlayerEditorProps> = ({
  player,
  expansions,
  usedLeaderNames,
  imperiumDeckCards,
  arrakisLiaisonCards,
  spiceMustFlowCards,
  foldspaceCards,
  controlMarkers,
  dreadnoughtCover,
  mentatOwner,
  playerInfluence,
  players,
  tleilaxuTrackBonusSpice = 0,
  tleilaxuTrackBonusClaimed = false,
  blockedTechTileIds = [],
  onUpdate,
  onInfluenceUpdate,
  onSetControl,
  onSetDreadnoughtControl,
  onSetMentatOwner,
  onClose,
}) => {
  const nameFocusedRef = useRef(false)
  const [nameDraft, setNameDraft] = useState(() => playerNameFieldValue(player))
  const [pileEditor, setPileEditor] = useState<PileEditor | null>(null)
  const [techEditorOpen, setTechEditorOpen] = useState(false)
  const [researchPickerOpen, setResearchPickerOpen] = useState(false)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  const [selectedPileCards, setSelectedPileCards] = useState<Card[]>([])
  const [numericDraft, setNumericDraft] = useState(() => pickNumericDraft(player))
  const [influenceDraft, setInfluenceDraft] = useState(() => ({ ...playerInfluence }))
  const [dreadnoughtGarrisonDraft, setDreadnoughtGarrisonDraft] = useState(
    () => player.dreadnoughts?.garrison ?? 0
  )
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(true)

  // Re-sync when opening for another player or when leader/resources change in game state.
  useEffect(() => {
    setNumericDraft(pickNumericDraft(player))
  }, [
    player.id,
    player.leader.name,
    player.spice,
    player.solari,
    player.water,
    player.troops,
    player.victoryPoints,
    player.agents,
    player.handCount,
    player.intrigueCount,
  ])

  useEffect(() => {
    setInfluenceDraft({ ...playerInfluence })
  }, [
    player.id,
    playerInfluence[FactionType.EMPEROR],
    playerInfluence[FactionType.SPACING_GUILD],
    playerInfluence[FactionType.BENE_GESSERIT],
    playerInfluence[FactionType.FREMEN],
  ])

  useEffect(() => {
    setDreadnoughtGarrisonDraft(player.dreadnoughts?.garrison ?? 0)
  }, [player.id, player.dreadnoughts?.garrison])

  useEffect(() => {
    nameFocusedRef.current = false
    setNameDraft(playerNameFieldValue(player))
  }, [player.id])

  useEffect(() => {
    if (nameFocusedRef.current) return
    setNameDraft(playerNameFieldValue(player))
  }, [player.name, player.leader.name])

  useEffect(() => {
    if (!colorMenuOpen) return
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (colorMenuRef.current?.contains(event.target as Node)) return
      setColorMenuOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColorMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [colorMenuOpen])

  const availableLeaders = useMemo(() => {
    const pool = getLeaderPool(expansions)
    if (isUnassignedLeader(player.leader)) return pool
    if (pool.some(leader => leader.name === player.leader.name)) return pool
    return [player.leader, ...pool]
  }, [expansions, player.leader])

  useEffect(() => {
    if (!isUnassignedLeader(player.leader)) return
    const pick = availableLeaders.find(leader => !usedLeaderNames.includes(leader.name))
    if (!pick) return
    const { spice, solari, water, intrigueCount } = applyLeaderStartingResourceDelta(player, pick)
    setNumericDraft(prev => ({ ...prev, spice, solari, water, intrigueCount }))
    onUpdate(
      seedTessiaSnoopers(
        { ...player, leader: pick, spice, solari, water, intrigueCount },
        expansions.riseOfIx
      )
    )
  }, [player.id])

  const deckEditorCards = useMemo(
    () =>
      sortCards([
        ...player.deck,
        ...imperiumDeckCards,
        ...arrakisLiaisonCards,
        ...spiceMustFlowCards,
        ...foldspaceCards,
      ]),
    [player.deck, imperiumDeckCards, arrakisLiaisonCards, spiceMustFlowCards, foldspaceCards]
  )

  const discardEditorPool = useMemo(
    () => sortCards([...player.deck, ...player.discardPile]),
    [player.deck, player.discardPile]
  )

  const trashEditorPool = useMemo(
    () => sortCards([...player.deck, ...player.trash]),
    [player.deck, player.trash]
  )

  const pileEditorConfig = useMemo(() => {
    switch (pileEditor) {
      case 'deck':
        return {
          title: `Edit Player ${player.id + 1} deck`,
          description:
            "Select the cards in this player's deck (the default rules deck is 20 cards, but you can use any size). Available cards include the current deck, the Imperium deck, and reserve cards (Arrakis Liaison, Spice Must Flow, Foldspace).",
          cards: deckEditorCards,
          initialSelected: player.deck,
          selectionCount: deckEditorCards.length,
          allowPartialSelection: true,
          showSelectionPreview: false,
        }
      case 'discard':
        return {
          title: `Edit Player ${player.id + 1} discard`,
          description:
            'Select cards for the discard pile. Any card not selected stays in the deck.',
          cards: discardEditorPool,
          initialSelected: player.discardPile,
          selectionCount: discardEditorPool.length,
          allowPartialSelection: true,
        }
      case 'trash':
        return {
          title: `Edit Player ${player.id + 1} trash`,
          description:
            'Select cards for the trash pile. Any card not selected stays in the deck.',
          cards: trashEditorPool,
          initialSelected: player.trash,
          selectionCount: trashEditorPool.length,
          allowPartialSelection: true,
        }
      default:
        return null
    }
  }, [
    pileEditor,
    player.id,
    player.deck,
    player.discardPile,
    player.trash,
    deckEditorCards,
    discardEditorPool,
    trashEditorPool,
  ])

  if (waitForBoardTarget) return null

  const commitNameDraft = () => {
    const leaderName = defaultSavedPlayerName(player)
    const stored = nameDraft.trim() === leaderName ? leaderName : storedPlayerName(nameDraft, player)
    const current = playerNameFieldValue(player)
    if (stored !== current) onUpdate({ name: stored })
    setNameDraft(stored)
  }

  const handleColorChange = (color: PlayerColor) => {
    if (color === player.color) return
    onUpdate({ color })
  }

  const handleLeaderChange = (leader: typeof player.leader) => {
    if (leader.name === player.leader.name) return

    if (usedLeaderNames.includes(leader.name)) {
      onUpdate({ leader })
      return
    }

    const { spice, solari, water, intrigueCount } = applyLeaderStartingResourceDelta(player, leader)
    setNumericDraft(prev => ({ ...prev, spice, solari, water, intrigueCount }))
    onUpdate(
      seedTessiaSnoopers({ ...player, leader, spice, solari, water, intrigueCount }, expansions.riseOfIx)
    )
  }

  const commitNumericDraft = (keys?: NumericKey[]) => {
    const fields = keys ?? NUMERIC_FIELDS.map(field => field.key)
    const patch: Partial<Player> = {}
    for (const key of fields) {
      if (numericDraft[key] !== player[key]) {
        patch[key] = numericDraft[key]
      }
    }
    if (Object.keys(patch).length > 0) {
      onUpdate(patch)
    }
  }

  const adjustNumeric = (key: NumericKey, value: number) => {
    const next = Math.max(0, value)
    setNumericDraft(prev => ({ ...prev, [key]: next }))
    if (next !== player[key]) {
      const patch: Partial<Player> = { [key]: next }
      if (key === 'troops') {
        Object.assign(patch, seedTroopSupply({ ...player, troops: next }))
      }
      onUpdate(patch)
    }
  }

  const clampInfluence = (value: number) => Math.max(0, Math.min(MAX_INFLUENCE, value))

  const commitInfluenceDraft = (factions?: FactionType[]) => {
    const fields = factions ?? INFLUENCE_FIELDS.map(field => field.faction)
    for (const faction of fields) {
      const value = clampInfluence(influenceDraft[faction] ?? 0)
      if (value !== (playerInfluence[faction] ?? 0)) {
        onInfluenceUpdate(faction, value)
      }
    }
  }

  const adjustInfluence = (faction: FactionType, value: number) => {
    const next = clampInfluence(value)
    setInfluenceDraft(prev => ({ ...prev, [faction]: next }))
    if (next !== (playerInfluence[faction] ?? 0)) {
      onInfluenceUpdate(faction, next)
    }
  }

  const handleClose = () => {
    commitNameDraft()
    commitNumericDraft()
    commitInfluenceDraft()
    onClose()
  }

  const closePileEditor = () => {
    setPileEditor(null)
    setSelectedPileCards([])
  }

  const closeTechEditor = () => {
    setTechEditorOpen(false)
  }

  const handleTechConfirm = (tech: NonNullable<Player['tech']>) => {
    onUpdate({ tech })
    closeTechEditor()
  }

  const openPileEditor = (editor: PileEditor) => {
    const initial =
      editor === 'deck'
        ? player.deck
        : editor === 'discard'
          ? player.discardPile
          : player.trash
    setSelectedPileCards(initial)
    setPileEditor(editor)
  }

  const handlePileConfirm = (selected: Card[]) => {
    if (pileEditor === 'deck') {
      onUpdate({ deck: selected })
    } else if (pileEditor === 'discard') {
      const { inPile, remainder } = splitCardPool(discardEditorPool, selected)
      onUpdate({ deck: remainder, discardPile: inPile })
    } else if (pileEditor === 'trash') {
      const { inPile, remainder } = splitCardPool(trashEditorPool, selected)
      onUpdate({ deck: remainder, trash: inPile })
    }
    closePileEditor()
  }

  const adjustDreadnoughtGarrison = (value: number) => {
    const base = player.dreadnoughts ?? defaultDreadnoughtsForExpansions(expansions) ?? {
      supply: 0,
      garrison: 0,
      conflict: 0,
      control: [],
    }
    const conflict = base.conflict ?? 0
    const controlCount = base.control?.length ?? 0
    const maxGarrison = Math.max(0, 2 - conflict - controlCount)
    const next = Math.max(0, Math.min(maxGarrison, value))
    const supply = Math.max(0, 2 - next - conflict - controlCount)
    setDreadnoughtGarrisonDraft(next)
    if (next !== (player.dreadnoughts?.garrison ?? 0)) {
      onUpdate({
        dreadnoughts: {
          ...base,
          garrison: next,
          supply,
          conflict,
          control: base.control ?? [],
        },
      })
    }
  }

  const overlay = (
    <div
      className={['sandbox-player-editor-overlay', scopedClass].filter(Boolean).join(' ')}
      onClick={handleClose}
    >
      <div
        className="sandbox-player-editor"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Player setup"
      >
        <div className="sandbox-player-editor__body">
          <div className="sandbox-player-editor__name-row">
            <label className="sandbox-player-editor__name" htmlFor="sandbox-player-name">
              <span className="sandbox-player-editor__name-label">Player name</span>
              <input
                id="sandbox-player-name"
                className="sandbox-player-editor__name-input"
                value={nameDraft}
                placeholder="Empty will use leader name"
                maxLength={Math.max(PLAYER_NAME_MAX_LENGTH, nameDraft.length)}
                autoComplete="off"
                spellCheck={false}
                onFocus={() => {
                  nameFocusedRef.current = true
                }}
                onBlur={() => {
                  nameFocusedRef.current = false
                  commitNameDraft()
                }}
                onChange={event => {
                  const next = event.target.value
                  const leaderName = defaultSavedPlayerName(player)
                  setNameDraft(
                    next === leaderName || next.length <= PLAYER_NAME_MAX_LENGTH
                      ? next
                      : next.slice(0, PLAYER_NAME_MAX_LENGTH)
                  )
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                }}
              />
            </label>
            <div className="sandbox-player-editor__color" ref={colorMenuRef}>
              <button
                type="button"
                className="sandbox-player-editor__color-select"
                aria-label="Player color"
                aria-haspopup="listbox"
                aria-expanded={colorMenuOpen}
                onClick={() => setColorMenuOpen(open => !open)}
              >
                <AgentIcon
                  playerId={player.id}
                  color={player.color}
                  className="sandbox-player-editor__color-agent"
                />
              </button>
              {colorMenuOpen ? (
                <div className="sandbox-player-editor__color-menu" role="listbox" aria-label="Player color">
                  {Object.values(PlayerColor).map(color => (
                    <button
                      key={color}
                      type="button"
                      role="option"
                      aria-selected={color === player.color}
                      aria-label={color}
                      className={[
                        'sandbox-player-editor__color-option',
                        color === player.color ? 'sandbox-player-editor__color-option--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        handleColorChange(color)
                        setColorMenuOpen(false)
                      }}
                    >
                      <AgentIcon
                        playerId={player.id}
                        color={color}
                        className="sandbox-player-editor__color-agent"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="sandbox-player-editor__leader-row">
            <LeaderSelect
              leaders={availableLeaders}
              value={player.leader}
              onChange={handleLeaderChange}
              ariaLabel="Leader"
            />
            <div className="sandbox-player-editor__pile-buttons">
              <button
                type="button"
                className="sandbox-player-editor__deck-button"
                onClick={() => openPileEditor('deck')}
              >
                Edit deck {player.deck.length}
              </button>
              <button
                type="button"
                className="sandbox-player-editor__deck-button"
                onClick={() => openPileEditor('discard')}
                disabled={discardEditorPool.length === 0}
              >
                Edit discard {player.discardPile.length}
              </button>
              <button
                type="button"
                className="sandbox-player-editor__deck-button"
                onClick={() => openPileEditor('trash')}
                disabled={trashEditorPool.length === 0}
              >
                Edit trash {player.trash.length}
              </button>
              {expansions.riseOfIx ? (
                <button
                  type="button"
                  className="sandbox-player-editor__deck-button"
                  onClick={() => setTechEditorOpen(true)}
                >
                  Edit tech {player.tech?.length ?? 0}
                </button>
              ) : null}
            </div>
          </div>

          <div className="sandbox-player-editor__control-row">
            <div className="sandbox-player-editor__control-toggles">
              <label className="sandbox-player-editor__control-toggle">
                <input
                  type="checkbox"
                  checked={player.hasHighCouncilSeat}
                  onChange={() =>
                    onUpdate({ hasHighCouncilSeat: !player.hasHighCouncilSeat })
                  }
                />
                <span>High Council</span>
              </label>
              <label className="sandbox-player-editor__control-toggle">
                <input
                  type="checkbox"
                  checked={mentatOwner === player.id}
                  onChange={() =>
                    onSetMentatOwner(mentatOwner === player.id ? null : player.id)
                  }
                />
                <span>Mentat</span>
              </label>
            </div>
          </div>

          <div className="sandbox-player-editor__control-row">
            <span className="sandbox-player-editor__control-heading">Board control</span>
            <div className="sandbox-player-editor__control-spaces">
              {CONTROL_SPACES.map(space => {
                const held = controlMarkers[space.type] === player.id
                const dreadnoughtHeld = dreadnoughtCover?.[space.type] === player.id
                return (
                  <div key={space.type} className="sandbox-player-editor__control-space">
                    <label className="sandbox-player-editor__control-toggle">
                      <input
                        type="checkbox"
                        checked={held}
                        onChange={() => onSetControl(space.type, held ? null : player.id)}
                      />
                      <span>{space.label}</span>
                    </label>
                    {expansions.riseOfIx ? (
                      <label className="sandbox-player-editor__control-toggle sandbox-player-editor__control-toggle--dreadnought">
                        <input
                          type="checkbox"
                          checked={dreadnoughtHeld}
                          aria-label={`${space.label} dreadnought`}
                          onChange={() =>
                            onSetDreadnoughtControl(space.type, dreadnoughtHeld ? null : player.id)
                          }
                        />
                        <DreadnoughtIcon
                          playerId={player.id}
                          color={player.color}
                          appearance="control"
                          className="sandbox-player-editor__dreadnought-control-icon"
                        />
                      </label>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="sandbox-player-editor__counters">
            {NUMERIC_FIELDS.map(field => (
              <ValueStepper
                key={field.key}
                compact
                value={numericDraft[field.key]}
                onChange={value => adjustNumeric(field.key, value)}
                icon={
                  field.key === 'agents' ? (
                    <AgentIcon
                      playerId={player.id}
                      color={player.color}
                      className="sandbox-player-editor__agent-icon"
                    />
                  ) : field.icon ? (
                    <img src={field.icon} alt="" aria-hidden="true" />
                  ) : undefined
                }
                decreaseLabel={`Decrease ${field.label}`}
                increaseLabel={`Increase ${field.label}`}
              />
            ))}
            {expansions.riseOfIx ? (
              <ValueStepper
                compact
                max={2}
                value={dreadnoughtGarrisonDraft}
                onChange={adjustDreadnoughtGarrison}
                icon={
                  <DreadnoughtIcon
                    playerId={player.id}
                    className="sandbox-player-editor__dreadnought-icon"
                  />
                }
                decreaseLabel="Decrease dreadnought garrison"
                increaseLabel="Increase dreadnought garrison"
              />
            ) : null}
            {expansions.riseOfIx ? (
              <ValueStepper
                compact
                min={0}
                max={3}
                value={player.freighterStep ?? 0}
                onChange={value =>
                  onUpdate({ freighterStep: Math.max(0, Math.min(3, value)) as 0 | 1 | 2 | 3 })
                }
                icon={<FreighterIcon size="lg" title="Shipping track" />}
                decreaseLabel="Decrease shipping track position"
                increaseLabel="Increase shipping track position"
              />
            ) : null}
            {expansions.riseOfIx ? (
              <ValueStepper
                compact
                max={12}
                value={player.negotiatorsOnIx ?? 0}
                onChange={value => {
                  const next = Math.max(0, value)
                  const seeded = seedTroopSupply({ ...player, negotiatorsOnIx: next })
                  onUpdate({
                    negotiatorsOnIx: next,
                    troopSupply: seeded.troopSupply,
                  })
                }}
                icon={<NegotiatorIcon playerId={player.id} color={player.color} size="md" />}
                decreaseLabel="Decrease tech negotiators on Ix"
                increaseLabel="Increase tech negotiators on Ix"
              />
            ) : null}
            {expansions.immortality ? (
              <ValueStepper
                compact
                max={MAX_TROOPS_PER_PLAYER}
                value={player.specimens ?? 0}
                onChange={value => {
                  const next = Math.max(0, Math.min(MAX_TROOPS_PER_PLAYER, value))
                  const seeded = seedTroopSupply({ ...player, specimens: next })
                  onUpdate({
                    specimens: next,
                    troopSupply: seeded.troopSupply,
                  })
                }}
                icon={<img src="/icon/specimen.png" alt="" aria-hidden="true" />}
                decreaseLabel="Decrease specimens"
                increaseLabel="Increase specimens"
              />
            ) : null}
            {expansions.immortality ? (
              <ValueStepper
                compact
                max={TLEILAXU_TRACK_MAX_STEP}
                value={player.tleilaxuStep ?? 0}
                onChange={value => onUpdate({ tleilaxuStep: clampTleilaxuStep(value) })}
                icon={<img src="/icon/tleilaxu.png" alt="" aria-hidden="true" />}
                decreaseLabel="Decrease Tleilaxu track"
                increaseLabel="Increase Tleilaxu track"
              />
            ) : null}
            {expansions.immortality ? (
              <button
                type="button"
                className="sandbox-player-editor__research-pick"
                onClick={() => setResearchPickerOpen(true)}
                aria-label="Set research track"
                title="Set research track"
              >
                <span className="sandbox-player-editor__research-pick-icon">
                  <img src="/icon/research.png" alt="" aria-hidden="true" />
                </span>
                <span className="sandbox-player-editor__research-pick-value">
                  {player.researchNodeId ?? RESEARCH_START_NODE_ID}
                </span>
              </button>
            ) : null}
            {INFLUENCE_FIELDS.map(field => (
              <ValueStepper
                key={field.faction}
                compact
                max={MAX_INFLUENCE}
                value={influenceDraft[field.faction] ?? 0}
                onChange={value => adjustInfluence(field.faction, value)}
                icon={<img src={`/icon/${field.faction}.png`} alt="" aria-hidden="true" />}
                decreaseLabel={`Decrease ${field.label} influence`}
                increaseLabel={`Increase ${field.label} influence`}
              />
            ))}
            {expansions.riseOfIx && isTessiaLeader(player.leader) ? (
              <div className="sandbox-player-editor__snoopers">
                <span className="sandbox-player-editor__snoopers-label">Snoopers on track</span>
                {INFLUENCE_FIELDS.map(field => (
                  <label key={`snooper-${field.faction}`} className="sandbox-player-editor__snooper-toggle">
                    <input
                      type="checkbox"
                      checked={hasOnTrackSnooper(player, field.faction)}
                      onChange={event => {
                        const onTrack = event.target.checked
                        const snoopers = { ...player.snoopers, [field.faction]: onTrack }
                        const tessiaSnoopers = {
                          ...(player.leader.tessiaSnoopers ?? {}),
                          [field.faction]: onTrack
                            ? false
                            : Boolean(player.leader.tessiaSnoopers?.[field.faction]),
                        }
                        const leader = recalculateTessiaSnooperRewardSlot(
                          { ...player.leader, tessiaSnoopers },
                          { ...player, snoopers }
                        )
                        onUpdate({ snoopers, leader })
                      }}
                    />
                    <img src="/icon/snooper.png" alt="" aria-hidden="true" />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <button type="button" className="sandbox-player-editor__close" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>

      {pileEditor && pileEditorConfig && (
        <div
          className="sandbox-player-editor__deck-overlay"
          onClick={event => event.stopPropagation()}
        >
          <div className="sandbox-player-editor__deck-dialog">
            <header className="sandbox-player-editor__deck-header">
              <h3>{pileEditorConfig.title}</h3>
              <p>{pileEditorConfig.description}</p>
              <div className="sandbox-player-editor__deck-count">
                {pileEditor === 'deck' ? (
                  <>{selectedPileCards.length} cards in deck</>
                ) : (
                  <>{selectedPileCards.length} in pile</>
                )}
              </div>
            </header>
            <div className="sandbox-player-editor__deck-search">
              <CardSearch
                isOpen={true}
                cards={pileEditorConfig.cards}
                onSelect={handlePileConfirm}
                onCancel={closePileEditor}
                isRevealTurn={true}
                selectionCount={
                  pileEditorConfig.allowPartialSelection
                    ? Math.max(1, pileEditorConfig.selectionCount)
                    : pileEditorConfig.selectionCount
                }
                allowPartialSelection={pileEditorConfig.allowPartialSelection}
                showSelectionPreview={pileEditorConfig.showSelectionPreview}
                text={pileEditorConfig.title}
                onSelectionChange={setSelectedPileCards}
                hideTitle={true}
                initialSelectedCards={pileEditorConfig.initialSelected}
                cancelButtonText="Cancel"
                embedded
              />
            </div>
          </div>
        </div>
      )}

      {researchPickerOpen && expansions.immortality ? (
        <div
          className="sandbox-player-editor__deck-overlay"
          onClick={event => {
            event.stopPropagation()
            setResearchPickerOpen(false)
          }}
        >
          <div
            className="sandbox-player-editor__research-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Place research tracker"
            onClick={event => event.stopPropagation()}
          >
            <h3>Place research tracker</h3>
            <BeneTleilaxBoardPanel
              players={players}
              currentPlayerId={player.id}
              tleilaxuTrackBonusSpice={tleilaxuTrackBonusSpice}
              tleilaxuTrackBonusClaimed={tleilaxuTrackBonusClaimed}
              choiceNodeIds={RESEARCH_NODE_IDS}
              showChoiceLabels={false}
              onResearchNodeSelect={(_playerId, nodeId) => {
                if (!RESEARCH_NODES[nodeId]) return
                onUpdate({ researchNodeId: nodeId })
              }}
            />
            <button
              type="button"
              className="sandbox-player-editor__research-close"
              onClick={() => setResearchPickerOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {techEditorOpen && expansions.riseOfIx ? (
        <div
          className="sandbox-player-editor__deck-overlay"
          onClick={event => event.stopPropagation()}
        >
          <div className="sandbox-player-editor__deck-dialog">
            <SandboxPlayerTechSelect
              tiles={TECH_TILES}
              blockedTileIds={blockedTechTileIds}
              initialSelected={player.tech}
              onConfirm={handleTechConfirm}
              onCancel={closeTechEditor}
            />
          </div>
        </div>
      ) : null}
    </div>
  )

  return portalNode(overlay)
}

export default SandboxPlayerEditor
