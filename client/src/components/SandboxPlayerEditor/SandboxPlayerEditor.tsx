import React, { useEffect, useMemo, useState } from 'react'
import { Card, ControlMarkerType, FactionType, Player } from '../../types/GameTypes'
import { applyLeaderStartingResourceDelta } from '../../data/leaderAbilities/beastSetup'
import { LEADERS, getLeaderImage } from '../../data/leaders'
import AgentIcon from '../AgentIcon/AgentIcon'
import CardSearch from '../CardSearch/CardSearch'
import ValueStepper from '../ValueStepper/ValueStepper'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import { splitCardPool } from '../../utils/sandboxDeckPools'
import { MAX_INFLUENCE } from '../../utils/influenceVictoryPoints'
import './SandboxPlayerEditor.css'

const CONTROL_SPACES: Array<{ type: ControlMarkerType; label: string }> = [
  { type: ControlMarkerType.ARRAKIN, label: 'Arrakeen' },
  { type: ControlMarkerType.CARTHAG, label: 'Carthag' },
  { type: ControlMarkerType.IMPERIAL_BASIN, label: 'Imperial Basin' },
]

interface SandboxPlayerEditorProps {
  player: Player
  /** Leaders already taken by other players (excluded from the leader picker). */
  usedLeaderNames: string[]
  /** Imperium deck pool available when editing this player's deck. */
  imperiumDeckCards: Card[]
  /** Reserve decks that may be added to a starter deck. */
  arrakisLiaisonCards: Card[]
  spiceMustFlowCards: Card[]
  foldspaceCards: Card[]
  controlMarkers: Record<ControlMarkerType, number | null>
  playerInfluence: Record<FactionType, number>
  onUpdate: (patch: Partial<Player>) => void
  onInfluenceUpdate: (faction: FactionType, value: number) => void
  onSetControl: (space: ControlMarkerType, playerId: number | null) => void
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
  usedLeaderNames,
  imperiumDeckCards,
  arrakisLiaisonCards,
  spiceMustFlowCards,
  foldspaceCards,
  controlMarkers,
  playerInfluence,
  onUpdate,
  onInfluenceUpdate,
  onSetControl,
  onClose,
}) => {
  const [pileEditor, setPileEditor] = useState<PileEditor | null>(null)
  const [selectedPileCards, setSelectedPileCards] = useState<Card[]>([])
  const [numericDraft, setNumericDraft] = useState(() => pickNumericDraft(player))
  const [influenceDraft, setInfluenceDraft] = useState(() => ({ ...playerInfluence }))
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

  const availableLeaders = useMemo(
    () => LEADERS.filter(leader => !usedLeaderNames.includes(leader.name)),
    [usedLeaderNames]
  )

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

  const leaderImage = getLeaderImage(player.leader.name)

  const handleLeaderChange = (leaderName: string) => {
    const leader = LEADERS.find(l => l.name === leaderName)
    if (!leader || leader.name === player.leader.name) return

    const { spice, solari } = applyLeaderStartingResourceDelta(player, leader)
    setNumericDraft(prev => ({ ...prev, spice, solari }))
    onUpdate({ leader, spice, solari })
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
      onUpdate({ [key]: next })
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
    commitNumericDraft()
    commitInfluenceDraft()
    onClose()
  }

  const closePileEditor = () => {
    setPileEditor(null)
    setSelectedPileCards([])
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

  const overlay = (
    <div
      className={['sandbox-player-editor-overlay', scopedClass].filter(Boolean).join(' ')}
      onClick={handleClose}
    >
      <div
        className={`sandbox-player-editor sandbox-player-editor--${player.color}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sandbox-player-editor-title"
      >
        <header className="sandbox-player-editor__header">
          <h3 id="sandbox-player-editor-title">Player {player.id + 1} setup</h3>
          <button
            type="button"
            className="sandbox-player-editor__close"
            onClick={handleClose}
            aria-label="Close player setup"
          >
            ×
          </button>
        </header>

        <div className="sandbox-player-editor__body">
          <div className="sandbox-player-editor__leader-row">
            {leaderImage ? (
              <img
                src={leaderImage}
                alt={player.leader.name}
                className="sandbox-player-editor__leader-img"
                draggable={false}
              />
            ) : null}
            <label className="sandbox-player-editor__leader-select">
              <span>Leader</span>
              <select
                value={player.leader.name}
                onChange={e => handleLeaderChange(e.target.value)}
              >
                {availableLeaders.map(leader => (
                  <option key={leader.name} value={leader.name}>
                    {leader.name} ({leader.ability.name})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sandbox-player-editor__control-row">
            <span className="sandbox-player-editor__control-heading">Board</span>
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
              {CONTROL_SPACES.map(space => {
                const held = controlMarkers[space.type] === player.id
                return (
                  <label key={space.type} className="sandbox-player-editor__control-toggle">
                    <input
                      type="checkbox"
                      checked={held}
                      onChange={() => onSetControl(space.type, held ? null : player.id)}
                    />
                    <span>{space.label}</span>
                  </label>
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
                    <AgentIcon playerId={player.id} className="sandbox-player-editor__agent-icon" />
                  ) : field.icon ? (
                    <img src={field.icon} alt="" aria-hidden="true" />
                  ) : undefined
                }
                decreaseLabel={`Decrease ${field.label}`}
                increaseLabel={`Increase ${field.label}`}
              />
            ))}
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
          </div>

          <div className="sandbox-player-editor__deck-row">
            <span>
              {player.deck.length} deck · {player.discardPile.length} discard ·{' '}
              {player.trash.length} trash
            </span>
          </div>
          <div className="sandbox-player-editor__deck-actions">
            <button
              type="button"
              className="sandbox-player-editor__deck-button"
              onClick={() => openPileEditor('deck')}
            >
              Edit deck
            </button>
            <button
              type="button"
              className="sandbox-player-editor__deck-button"
              onClick={() => openPileEditor('discard')}
              disabled={discardEditorPool.length === 0}
            >
              Edit discard
            </button>
            <button
              type="button"
              className="sandbox-player-editor__deck-button"
              onClick={() => openPileEditor('trash')}
              disabled={trashEditorPool.length === 0}
            >
              Edit trash
            </button>
          </div>
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
    </div>
  )

  return portalNode(overlay)
}

export default SandboxPlayerEditor
