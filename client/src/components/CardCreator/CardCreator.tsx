import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AgentIcon,
  ALL_AGENT_ICONS,
  CustomEffect,
  EffectTiming,
  FactionType,
  GamePhase,
  InfluenceAmounts,
} from '../../types/GameTypes'
import './CardCreator.css'

type NumericValue = number | ''
type InfluenceFieldKey =
  | 'spice'
  | 'water'
  | 'solari'
  | 'trash'
  | 'troops'
  | 'retreatTroops'
  | 'retreatUnits'
  | 'deployTroops'
type RewardNumericField =
  | 'persuasion'
  | 'combat'
  | 'spice'
  | 'water'
  | 'solari'
  | 'troops'
  | 'drawCards'
  | 'victoryPoints'
  | 'intrigueCards'
  | 'trash'
  | 'retreatTroops'
  | 'retreatUnits'
  | 'deployTroops'
  | 'tiebreakerSpice'
type AcquireEffectNumericField = 'victoryPoints' | 'spice' | 'troops' | 'trash' | 'water'

interface InfluenceAmountEditor {
  id: string
  faction: FactionType
  amount: NumericValue
}

interface InfluenceListEditor {
  enabled: boolean
  chooseOne: boolean
  amounts: InfluenceAmountEditor[]
}

interface RequirementOptionEditor {
  id: string
  alliance: FactionType | ''
  specificFaction: FactionType | ''
  influenceEnabled: boolean
  influenceFaction: FactionType
  influenceAmount: NumericValue
}

interface RequirementEditor extends RequirementOptionEditor {
  enabled: boolean
  orRequirements: RequirementOptionEditor[]
}

interface CostEditor {
  enabled: boolean
  spice: NumericValue
  water: NumericValue
  solari: NumericValue
  trashThisCard: boolean
  trash: NumericValue
  discard: NumericValue
  troops: NumericValue
  retreatTroops: NumericValue
  retreatUnits: NumericValue
  deployTroops: NumericValue
  custom: string
  influence: InfluenceListEditor
}

interface RewardEditor {
  persuasion: NumericValue
  combat: NumericValue
  spice: NumericValue
  water: NumericValue
  solari: NumericValue
  troops: NumericValue
  drawCards: NumericValue
  victoryPoints: NumericValue
  intrigueCards: NumericValue
  trash: NumericValue
  trashThisCard: boolean
  retreatTroops: NumericValue
  retreatUnits: NumericValue
  deployTroops: NumericValue
  mentat: boolean
  acquireToTopThisRound: boolean
  tiebreakerSpice: NumericValue
  custom: CustomEffect | ''
  influence: InfluenceListEditor
  acquireLimit: NumericValue
}

interface AcquireEffectEditor {
  enabled: boolean
  victoryPoints: NumericValue
  spice: NumericValue
  troops: NumericValue
  trash: NumericValue
  water: NumericValue
  influence: InfluenceListEditor
}

interface EffectEditor {
  id: string
  choiceOpt: boolean
  timing: EffectTiming | ''
  phases: GamePhase[]
  beforePlaceAgentRecall: boolean
  requirement: RequirementEditor
  cost: CostEditor
  reward: RewardEditor
}

interface CardCreatorState {
  id: NumericValue
  name: string
  image: string
  cost: NumericValue
  infiltrate: boolean
  faction: FactionType[]
  agentIcons: AgentIcon[]
  playEffect: EffectEditor[]
  revealEffect: EffectEditor[]
  acquireEffect: AcquireEffectEditor
}

interface CardCreatorProps {
  onBack: () => void
}

const STORAGE_NOTE =
  'Image upload is local preview only for now. It does not send files to any server.'

const COST_FIELD_CONFIG: Array<{ key: InfluenceFieldKey | 'discard'; label: string }> = [
  { key: 'spice', label: 'Spice' },
  { key: 'water', label: 'Water' },
  { key: 'solari', label: 'Solari' },
  { key: 'trash', label: 'Trash cards' },
  { key: 'discard', label: 'Discard cards' },
  { key: 'troops', label: 'Troops' },
  { key: 'retreatTroops', label: 'Retreat troops' },
  { key: 'retreatUnits', label: 'Retreat units' },
  { key: 'deployTroops', label: 'Deploy troops' },
]

const REWARD_FIELD_CONFIG: Array<{ key: RewardNumericField; label: string }> = [
  { key: 'persuasion', label: 'Persuasion' },
  { key: 'combat', label: 'Combat' },
  { key: 'spice', label: 'Spice' },
  { key: 'water', label: 'Water' },
  { key: 'solari', label: 'Solari' },
  { key: 'troops', label: 'Troops' },
  { key: 'drawCards', label: 'Draw cards' },
  { key: 'victoryPoints', label: 'Victory points' },
  { key: 'intrigueCards', label: 'Intrigue cards' },
  { key: 'trash', label: 'Trash cards' },
  { key: 'retreatTroops', label: 'Retreat troops' },
  { key: 'retreatUnits', label: 'Retreat units' },
  { key: 'deployTroops', label: 'Deploy troops' },
  { key: 'tiebreakerSpice', label: 'Tiebreaker spice' },
]

const ACQUIRE_EFFECT_CONFIG: Array<{ key: AcquireEffectNumericField; label: string }> = [
  { key: 'victoryPoints', label: 'Victory points' },
  { key: 'spice', label: 'Spice' },
  { key: 'troops', label: 'Troops' },
  { key: 'trash', label: 'Trash cards' },
  { key: 'water', label: 'Water' },
]

const createEditorId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const parseNumericValue = (value: string): NumericValue => {
  if (value === '') {
    return ''
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? '' : parsed
}

const formatLabel = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

const createInfluenceAmountEditor = (): InfluenceAmountEditor => ({
  id: createEditorId('influence'),
  faction: FactionType.EMPEROR,
  amount: 1,
})

const createInfluenceListEditor = (): InfluenceListEditor => ({
  enabled: false,
  chooseOne: false,
  amounts: [createInfluenceAmountEditor()],
})

const createRequirementOptionEditor = (): RequirementOptionEditor => ({
  id: createEditorId('requirement'),
  alliance: '',
  specificFaction: '',
  influenceEnabled: false,
  influenceFaction: FactionType.EMPEROR,
  influenceAmount: 1,
})

const createRequirementEditor = (): RequirementEditor => ({
  ...createRequirementOptionEditor(),
  enabled: false,
  orRequirements: [],
})

const createCostEditor = (): CostEditor => ({
  enabled: false,
  spice: '',
  water: '',
  solari: '',
  trashThisCard: false,
  trash: '',
  discard: '',
  troops: '',
  retreatTroops: '',
  retreatUnits: '',
  deployTroops: '',
  custom: '',
  influence: createInfluenceListEditor(),
})

const createRewardEditor = (): RewardEditor => ({
  persuasion: '',
  combat: '',
  spice: '',
  water: '',
  solari: '',
  troops: '',
  drawCards: '',
  victoryPoints: '',
  intrigueCards: '',
  trash: '',
  trashThisCard: false,
  retreatTroops: '',
  retreatUnits: '',
  deployTroops: '',
  mentat: false,
  acquireToTopThisRound: false,
  tiebreakerSpice: '',
  custom: '',
  influence: createInfluenceListEditor(),
  acquireLimit: '',
})

const createAcquireEffectEditor = (): AcquireEffectEditor => ({
  enabled: false,
  victoryPoints: '',
  spice: '',
  troops: '',
  trash: '',
  water: '',
  influence: createInfluenceListEditor(),
})

const createEffectEditor = (): EffectEditor => ({
  id: createEditorId('effect'),
  choiceOpt: false,
  timing: '',
  phases: [],
  beforePlaceAgentRecall: false,
  requirement: createRequirementEditor(),
  cost: createCostEditor(),
  reward: createRewardEditor(),
})

const createInitialCardState = (): CardCreatorState => ({
  id: '',
  name: '',
  image: '',
  cost: '',
  infiltrate: false,
  faction: [],
  agentIcons: [],
  playEffect: [createEffectEditor()],
  revealEffect: [createEffectEditor()],
  acquireEffect: createAcquireEffectEditor(),
})

const isDefined = <T,>(value: T | undefined): value is T => value !== undefined

const hasNumericValue = (value: NumericValue): value is number => value !== ''

const toggleArrayValue = <T,>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter(item => item !== value) : [...values, value]

const buildInfluenceAmounts = (editor: InfluenceListEditor): InfluenceAmounts | undefined => {
  if (!editor.enabled) {
    return undefined
  }

  const amounts = editor.amounts
    .filter(amount => hasNumericValue(amount.amount))
    .map(amount => ({
      faction: amount.faction,
      amount: Number(amount.amount),
    }))

  if (!amounts.length) {
    return undefined
  }

  return editor.chooseOne ? { chooseOne: true, amounts } : { amounts }
}

const buildRequirementOption = (
  editor: RequirementOptionEditor,
  specificKey: 'inPlay' | 'bond'
): Record<string, unknown> | undefined => {
  const requirement: Record<string, unknown> = {}

  if (editor.alliance) {
    requirement.alliance = editor.alliance
  }

  if (editor.specificFaction) {
    requirement[specificKey] = editor.specificFaction
  }

  if (editor.influenceEnabled && hasNumericValue(editor.influenceAmount)) {
    requirement.influence = {
      faction: editor.influenceFaction,
      amount: Number(editor.influenceAmount),
    }
  }

  return Object.keys(requirement).length ? requirement : undefined
}

const buildRequirement = (
  editor: RequirementEditor,
  specificKey: 'inPlay' | 'bond'
): Record<string, unknown> | undefined => {
  if (!editor.enabled) {
    return undefined
  }

  const requirement: Record<string, unknown> = buildRequirementOption(editor, specificKey) ?? {}
  const orRequirements = editor.orRequirements
    .map(option => buildRequirementOption(option, specificKey))
    .filter(isDefined)

  if (orRequirements.length) {
    requirement.or = orRequirements
  }

  return Object.keys(requirement).length ? requirement : undefined
}

const buildCost = (editor: CostEditor): Record<string, unknown> | undefined => {
  if (!editor.enabled) {
    return undefined
  }

  const cost: Record<string, unknown> = {}

  COST_FIELD_CONFIG.forEach(field => {
    const value = editor[field.key]
    if (hasNumericValue(value)) {
      cost[field.key] = Number(value)
    }
  })

  if (editor.trashThisCard) {
    cost.trashThisCard = true
  }

  if (editor.custom.trim()) {
    cost.custom = editor.custom.trim()
  }

  const influence = buildInfluenceAmounts(editor.influence)
  if (influence) {
    cost.influence = influence
  }

  return Object.keys(cost).length ? cost : undefined
}

const buildReward = (editor: RewardEditor): Record<string, unknown> => {
  const reward: Record<string, unknown> = {}

  REWARD_FIELD_CONFIG.forEach(field => {
    const value = editor[field.key]
    if (hasNumericValue(value as NumericValue)) {
      reward[field.key] = Number(value)
    }
  })

  if (editor.trashThisCard) {
    reward.trashThisCard = true
  }

  if (editor.mentat) {
    reward.mentat = true
  }

  if (editor.acquireToTopThisRound) {
    reward.acquireToTopThisRound = true
  }

  if (editor.custom) {
    reward.custom = editor.custom
  }

  const influence = buildInfluenceAmounts(editor.influence)
  if (influence) {
    reward.influence = influence
  }

  if (hasNumericValue(editor.acquireLimit)) {
    reward.acquire = {
      limit: Number(editor.acquireLimit),
    }
  }

  return reward
}

const buildAcquireEffect = (editor: AcquireEffectEditor): Record<string, unknown> | undefined => {
  if (!editor.enabled) {
    return undefined
  }

  const acquireEffect: Record<string, unknown> = {}

  ACQUIRE_EFFECT_CONFIG.forEach(field => {
    const value = editor[field.key]
    if (hasNumericValue(value as NumericValue)) {
      acquireEffect[field.key] = Number(value)
    }
  })

  const influence = buildInfluenceAmounts(editor.influence)
  if (influence) {
    acquireEffect.influence = influence
  }

  return Object.keys(acquireEffect).length ? acquireEffect : undefined
}

const buildEffects = (
  effects: EffectEditor[],
  specificKey: 'inPlay' | 'bond',
  isPlayEffect: boolean
): Array<Record<string, unknown>> =>
  effects.map(effect => {
    const builtEffect: Record<string, unknown> = {
      reward: buildReward(effect.reward),
    }

    const requirement = buildRequirement(effect.requirement, specificKey)
    if (requirement) {
      builtEffect.requirement = requirement
    }

    const cost = buildCost(effect.cost)
    if (cost) {
      builtEffect.cost = cost
    }

    if (effect.choiceOpt) {
      builtEffect.choiceOpt = true
    }

    if (effect.timing) {
      builtEffect.timing = effect.timing
    }

    if (effect.phases.length === 1) {
      builtEffect.phase = effect.phases[0]
    } else if (effect.phases.length > 1) {
      builtEffect.phase = effect.phases
    }

    if (isPlayEffect && effect.beforePlaceAgentRecall) {
      builtEffect.beforePlaceAgent = {
        recallAgent: true,
      }
    }

    return builtEffect
  })

const summariseObject = (value: Record<string, unknown>): string[] =>
  Object.entries(value).map(([key, entry]) => {
    if (typeof entry === 'boolean') {
      return formatLabel(key)
    }

    if (Array.isArray(entry)) {
      return `${formatLabel(key)}: ${entry.map(item => formatLabel(String(item))).join(', ')}`
    }

    if (entry && typeof entry === 'object') {
      return `${formatLabel(key)}: ${JSON.stringify(entry)}`
    }

    return `${formatLabel(key)}: ${String(entry)}`
  })

const InfluenceEditorPanel = ({
  title,
  editor,
  onChange,
}: {
  title: string
  editor: InfluenceListEditor
  onChange: (nextValue: InfluenceListEditor) => void
}) => (
  <div className="card-creator-subsection">
    <div className="card-creator-toggle-row">
      <label className="card-creator-checkbox">
        <input
          type="checkbox"
          checked={editor.enabled}
          onChange={event =>
            onChange({
              ...editor,
              enabled: event.target.checked,
            })
          }
        />
        {title}
      </label>
      {editor.enabled && (
        <label className="card-creator-checkbox">
          <input
            type="checkbox"
            checked={editor.chooseOne}
            onChange={event =>
              onChange({
                ...editor,
                chooseOne: event.target.checked,
              })
            }
          />
          Choose one
        </label>
      )}
    </div>

    {editor.enabled && (
      <>
        <div className="card-creator-list">
          {editor.amounts.map(amount => (
            <div key={amount.id} className="card-creator-inline-grid">
              <label>
                Faction
                <select
                  value={amount.faction}
                  onChange={event =>
                    onChange({
                      ...editor,
                      amounts: editor.amounts.map(entry =>
                        entry.id === amount.id
                          ? {
                              ...entry,
                              faction: event.target.value as FactionType,
                            }
                          : entry
                      ),
                    })
                  }
                >
                  {Object.values(FactionType).map(faction => (
                    <option key={faction} value={faction}>
                      {formatLabel(faction)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  value={amount.amount}
                  onChange={event =>
                    onChange({
                      ...editor,
                      amounts: editor.amounts.map(entry =>
                        entry.id === amount.id
                          ? {
                              ...entry,
                              amount: parseNumericValue(event.target.value),
                            }
                          : entry
                      ),
                    })
                  }
                />
              </label>

              <button
                className="card-creator-ghost-button"
                type="button"
                onClick={() =>
                  onChange({
                    ...editor,
                    amounts:
                      editor.amounts.length === 1
                        ? [createInfluenceAmountEditor()]
                        : editor.amounts.filter(entry => entry.id !== amount.id),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          className="card-creator-secondary-button"
          type="button"
          onClick={() =>
            onChange({
              ...editor,
              amounts: [...editor.amounts, createInfluenceAmountEditor()],
            })
          }
        >
          Add influence entry
        </button>
      </>
    )}
  </div>
)

const CardCreator: React.FC<CardCreatorProps> = ({ onBack }) => {
  const [cardState, setCardState] = useState<CardCreatorState>(createInitialCardState)
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null)
  const [localImageName, setLocalImageName] = useState<string>('')
  const [copyFeedback, setCopyFeedback] = useState<string>('')

  useEffect(() => {
    return () => {
      if (localImagePreview) {
        URL.revokeObjectURL(localImagePreview)
      }
    }
  }, [localImagePreview])

  const generatedCard = useMemo(() => {
    const nextCard: Record<string, unknown> = {
      id: hasNumericValue(cardState.id) ? Number(cardState.id) : 0,
      name: cardState.name.trim(),
      image: cardState.image.trim(),
      agentIcons: cardState.agentIcons,
    }

    if (cardState.faction.length) {
      nextCard.faction = cardState.faction
    }

    if (hasNumericValue(cardState.cost)) {
      nextCard.cost = Number(cardState.cost)
    }

    if (cardState.infiltrate) {
      nextCard.infiltrate = true
    }

    const playEffects = buildEffects(cardState.playEffect, 'inPlay', true)
    if (playEffects.length) {
      nextCard.playEffect = playEffects
    }

    const revealEffects = buildEffects(cardState.revealEffect, 'bond', false)
    if (revealEffects.length) {
      nextCard.revealEffect = revealEffects
    }

    const acquireEffect = buildAcquireEffect(cardState.acquireEffect)
    if (acquireEffect) {
      nextCard.acquireEffect = acquireEffect
    }

    return nextCard
  }, [cardState])

  const jsonPreview = useMemo(() => JSON.stringify(generatedCard, null, 2), [generatedCard])

  const previewImageSource = localImagePreview ?? cardState.image.trim()

  const warnings = useMemo(() => {
    const nextWarnings: string[] = []

    if (!cardState.name.trim()) {
      nextWarnings.push('Name is empty.')
    }

    if (!hasNumericValue(cardState.id)) {
      nextWarnings.push('ID is unset, so JSON currently falls back to 0.')
    }

    if (localImagePreview && !cardState.image.trim()) {
      nextWarnings.push('Local upload previews only; set the image field if you need a path in JSON.')
    }

    return nextWarnings
  }, [cardState.id, cardState.image, cardState.name, localImagePreview])

  const updateCardState = (updater: (current: CardCreatorState) => CardCreatorState) => {
    setCardState(current => updater(current))
  }

  const updateEffectList = (
    effectType: 'playEffect' | 'revealEffect',
    effectId: string,
    updater: (effect: EffectEditor) => EffectEditor
  ) => {
    updateCardState(current => ({
      ...current,
      [effectType]: current[effectType].map(effect =>
        effect.id === effectId ? updater(effect) : effect
      ),
    }))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (localImagePreview) {
      URL.revokeObjectURL(localImagePreview)
    }

    const previewUrl = URL.createObjectURL(file)
    setLocalImagePreview(previewUrl)
    setLocalImageName(file.name)

    updateCardState(current => ({
      ...current,
      image: current.image.trim() ? current.image : file.name,
    }))
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonPreview)
      setCopyFeedback('Copied JSON.')
    } catch {
      setCopyFeedback('Clipboard copy failed.')
    }
  }

  const handleDownload = () => {
    const fileName = (cardState.name.trim() || 'card')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const blob = new Blob([jsonPreview], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName || 'card'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const resetBuilder = () => {
    if (localImagePreview) {
      URL.revokeObjectURL(localImagePreview)
    }
    setLocalImagePreview(null)
    setLocalImageName('')
    setCopyFeedback('')
    setCardState(createInitialCardState())
  }

  return (
    <motion.div className="card-creator-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card-creator-shell">
        <div className="card-creator-header">
          <div>
            <p className="card-creator-kicker">Separate UI app</p>
            <h1>Card creator</h1>
            <p className="card-creator-description">
              Build card JSON with structured play, reveal, reward, acquire, and image fields.
            </p>
          </div>

          <div className="card-creator-header-actions">
            <button className="card-creator-ghost-button" type="button" onClick={onBack}>
              Back
            </button>
            <button className="card-creator-secondary-button" type="button" onClick={resetBuilder}>
              Reset draft
            </button>
          </div>
        </div>

        <div className="card-creator-layout">
          <div className="card-creator-main-column">
            <section className="card-creator-section">
              <h2>Card basics</h2>
              <div className="card-creator-grid two-columns">
                <label>
                  Card ID
                  <input
                    type="number"
                    min="0"
                    value={cardState.id}
                    onChange={event =>
                      updateCardState(current => ({
                        ...current,
                        id: parseNumericValue(event.target.value),
                      }))
                    }
                  />
                </label>

                <label>
                  Card name
                  <input
                    type="text"
                    value={cardState.name}
                    onChange={event =>
                      updateCardState(current => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Guild Ambassador"
                  />
                </label>

                <label>
                  Image path / asset key
                  <input
                    type="text"
                    value={cardState.image}
                    onChange={event =>
                      updateCardState(current => ({
                        ...current,
                        image: event.target.value,
                      }))
                    }
                    placeholder="imperium_row/guild_ambassador.avif"
                  />
                </label>

                <label>
                  Persuasion cost
                  <input
                    type="number"
                    min="0"
                    value={cardState.cost}
                    onChange={event =>
                      updateCardState(current => ({
                        ...current,
                        cost: parseNumericValue(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              <div className="card-creator-toggle-row">
                <label className="card-creator-checkbox">
                  <input
                    type="checkbox"
                    checked={cardState.infiltrate}
                    onChange={event =>
                      updateCardState(current => ({
                        ...current,
                        infiltrate: event.target.checked,
                      }))
                    }
                  />
                  Infiltrate
                </label>
              </div>

              <div className="card-creator-subsection">
                <h3>Faction tags</h3>
                <div className="card-creator-chip-group">
                  {Object.values(FactionType).map(faction => (
                    <button
                      key={faction}
                      className={`card-creator-chip ${
                        cardState.faction.includes(faction) ? 'selected' : ''
                      }`}
                      type="button"
                      onClick={() =>
                        updateCardState(current => ({
                          ...current,
                          faction: toggleArrayValue(current.faction, faction),
                        }))
                      }
                    >
                      {formatLabel(faction)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-creator-subsection">
                <h3>Agent icons</h3>
                <div className="card-creator-chip-group">
                  {ALL_AGENT_ICONS.map(icon => (
                    <button
                      key={icon}
                      className={`card-creator-chip ${
                        cardState.agentIcons.includes(icon) ? 'selected' : ''
                      }`}
                      type="button"
                      onClick={() =>
                        updateCardState(current => ({
                          ...current,
                          agentIcons: toggleArrayValue(current.agentIcons, icon),
                        }))
                      }
                    >
                      {formatLabel(icon)}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="card-creator-section">
              <div className="card-creator-section-header">
                <div>
                  <h2>Image upload</h2>
                  <p>{STORAGE_NOTE}</p>
                </div>
              </div>

              <div className="card-creator-upload-row">
                <label className="card-creator-upload-box">
                  <span>Choose local image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </label>
                {localImageName && <span className="card-creator-upload-name">{localImageName}</span>}
              </div>
            </section>

            {(['playEffect', 'revealEffect'] as const).map(effectType => {
              const isPlayEffect = effectType === 'playEffect'
              const effects = cardState[effectType]
              const specificLabel = isPlayEffect ? 'Card in play' : 'Bond'

              return (
                <section key={effectType} className="card-creator-section">
                  <div className="card-creator-section-header">
                    <div>
                      <h2>{isPlayEffect ? 'Play effects' : 'Reveal effects'}</h2>
                      <p>Build each effect block the same way the current JSON is shaped.</p>
                    </div>
                    <button
                      className="card-creator-secondary-button"
                      type="button"
                      onClick={() =>
                        updateCardState(current => ({
                          ...current,
                          [effectType]: [...current[effectType], createEffectEditor()],
                        }))
                      }
                    >
                      Add {isPlayEffect ? 'play' : 'reveal'} effect
                    </button>
                  </div>

                  <div className="card-creator-list">
                    {effects.map((effect, index) => {
                      const rewardSummary = summariseObject(buildReward(effect.reward))
                      const costSummary = buildCost(effect.cost)
                      const requirementSummary = buildRequirement(
                        effect.requirement,
                        isPlayEffect ? 'inPlay' : 'bond'
                      )

                      return (
                        <article key={effect.id} className="card-creator-effect-card">
                          <div className="card-creator-effect-header">
                            <div>
                              <h3>
                                {isPlayEffect ? 'Play' : 'Reveal'} effect {index + 1}
                              </h3>
                              <div className="card-creator-summary-list">
                                {rewardSummary.length === 0 && (
                                  <span className="card-creator-summary-pill empty">Empty reward</span>
                                )}
                                {rewardSummary.map(summary => (
                                  <span key={summary} className="card-creator-summary-pill">
                                    {summary}
                                  </span>
                                ))}
                                {costSummary &&
                                  summariseObject(costSummary).map(summary => (
                                    <span
                                      key={`cost-${summary}`}
                                      className="card-creator-summary-pill subdued"
                                    >
                                      Cost: {summary}
                                    </span>
                                  ))}
                                {requirementSummary &&
                                  summariseObject(requirementSummary).map(summary => (
                                    <span
                                      key={`requirement-${summary}`}
                                      className="card-creator-summary-pill subdued"
                                    >
                                      Req: {summary}
                                    </span>
                                  ))}
                              </div>
                            </div>

                            <button
                              className="card-creator-ghost-button"
                              type="button"
                              onClick={() =>
                                updateCardState(current => ({
                                  ...current,
                                  [effectType]:
                                    current[effectType].length === 1
                                      ? [createEffectEditor()]
                                      : current[effectType].filter(item => item.id !== effect.id),
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>

                          <div className="card-creator-toggle-row">
                            <label className="card-creator-checkbox">
                              <input
                                type="checkbox"
                                checked={effect.choiceOpt}
                                onChange={event =>
                                  updateEffectList(effectType, effect.id, currentEffect => ({
                                    ...currentEffect,
                                    choiceOpt: event.target.checked,
                                  }))
                                }
                              />
                              Choice option
                            </label>

                            {isPlayEffect && (
                              <label className="card-creator-checkbox">
                                <input
                                  type="checkbox"
                                  checked={effect.beforePlaceAgentRecall}
                                  onChange={event =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      beforePlaceAgentRecall: event.target.checked,
                                    }))
                                  }
                                />
                                Recall an agent before placement
                              </label>
                            )}
                          </div>

                          <div className="card-creator-grid two-columns">
                            <label>
                              Timing
                              <select
                                value={effect.timing}
                                onChange={event =>
                                  updateEffectList(effectType, effect.id, currentEffect => ({
                                    ...currentEffect,
                                    timing: event.target.value as EffectTiming | '',
                                  }))
                                }
                              >
                                <option value="">None</option>
                                {Object.values(EffectTiming).map(timing => (
                                  <option key={timing} value={timing}>
                                    {formatLabel(timing)}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div>
                              <span className="card-creator-field-label">Phase limit</span>
                              <div className="card-creator-chip-group compact">
                                {Object.values(GamePhase).map(phase => (
                                  <button
                                    key={phase}
                                    className={`card-creator-chip ${
                                      effect.phases.includes(phase) ? 'selected' : ''
                                    }`}
                                    type="button"
                                    onClick={() =>
                                      updateEffectList(effectType, effect.id, currentEffect => ({
                                        ...currentEffect,
                                        phases: toggleArrayValue(currentEffect.phases, phase),
                                      }))
                                    }
                                  >
                                    {formatLabel(phase)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="card-creator-subsection">
                            <div className="card-creator-toggle-row">
                              <label className="card-creator-checkbox">
                                <input
                                  type="checkbox"
                                  checked={effect.requirement.enabled}
                                  onChange={event =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      requirement: {
                                        ...currentEffect.requirement,
                                        enabled: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Requirement block
                              </label>
                              {effect.requirement.enabled && (
                                <button
                                  className="card-creator-secondary-button"
                                  type="button"
                                  onClick={() =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      requirement: {
                                        ...currentEffect.requirement,
                                        orRequirements: [
                                          ...currentEffect.requirement.orRequirements,
                                          createRequirementOptionEditor(),
                                        ],
                                      },
                                    }))
                                  }
                                >
                                  Add OR group
                                </button>
                              )}
                            </div>

                            {effect.requirement.enabled && (
                              <>
                                <div className="card-creator-inline-grid">
                                  <label>
                                    Alliance
                                    <select
                                      value={effect.requirement.alliance}
                                      onChange={event =>
                                        updateEffectList(effectType, effect.id, currentEffect => ({
                                          ...currentEffect,
                                          requirement: {
                                            ...currentEffect.requirement,
                                            alliance: event.target.value as FactionType | '',
                                          },
                                        }))
                                      }
                                    >
                                      <option value="">None</option>
                                      {Object.values(FactionType).map(faction => (
                                        <option key={faction} value={faction}>
                                          {formatLabel(faction)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    {specificLabel}
                                    <select
                                      value={effect.requirement.specificFaction}
                                      onChange={event =>
                                        updateEffectList(effectType, effect.id, currentEffect => ({
                                          ...currentEffect,
                                          requirement: {
                                            ...currentEffect.requirement,
                                            specificFaction:
                                              event.target.value as FactionType | '',
                                          },
                                        }))
                                      }
                                    >
                                      <option value="">None</option>
                                      {Object.values(FactionType).map(faction => (
                                        <option key={faction} value={faction}>
                                          {formatLabel(faction)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                <div className="card-creator-toggle-row">
                                  <label className="card-creator-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={effect.requirement.influenceEnabled}
                                      onChange={event =>
                                        updateEffectList(effectType, effect.id, currentEffect => ({
                                          ...currentEffect,
                                          requirement: {
                                            ...currentEffect.requirement,
                                            influenceEnabled: event.target.checked,
                                          },
                                        }))
                                      }
                                    />
                                    Influence requirement
                                  </label>
                                </div>

                                {effect.requirement.influenceEnabled && (
                                  <div className="card-creator-inline-grid">
                                    <label>
                                      Faction
                                      <select
                                        value={effect.requirement.influenceFaction}
                                        onChange={event =>
                                          updateEffectList(effectType, effect.id, currentEffect => ({
                                            ...currentEffect,
                                            requirement: {
                                              ...currentEffect.requirement,
                                              influenceFaction:
                                                event.target.value as FactionType,
                                            },
                                          }))
                                        }
                                      >
                                        {Object.values(FactionType).map(faction => (
                                          <option key={faction} value={faction}>
                                            {formatLabel(faction)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label>
                                      Amount
                                      <input
                                        type="number"
                                        min="0"
                                        value={effect.requirement.influenceAmount}
                                        onChange={event =>
                                          updateEffectList(effectType, effect.id, currentEffect => ({
                                            ...currentEffect,
                                            requirement: {
                                              ...currentEffect.requirement,
                                              influenceAmount: parseNumericValue(
                                                event.target.value
                                              ),
                                            },
                                          }))
                                        }
                                      />
                                    </label>
                                  </div>
                                )}

                                {effect.requirement.orRequirements.length > 0 && (
                                  <div className="card-creator-list nested">
                                    {effect.requirement.orRequirements.map(option => (
                                      <div key={option.id} className="card-creator-or-card">
                                        <div className="card-creator-effect-header compact">
                                          <h4>OR option</h4>
                                          <button
                                            className="card-creator-ghost-button"
                                            type="button"
                                            onClick={() =>
                                              updateEffectList(
                                                effectType,
                                                effect.id,
                                                currentEffect => ({
                                                  ...currentEffect,
                                                  requirement: {
                                                    ...currentEffect.requirement,
                                                    orRequirements:
                                                      currentEffect.requirement.orRequirements.filter(
                                                        entry => entry.id !== option.id
                                                      ),
                                                  },
                                                })
                                              )
                                            }
                                          >
                                            Remove
                                          </button>
                                        </div>

                                        <div className="card-creator-inline-grid">
                                          <label>
                                            Alliance
                                            <select
                                              value={option.alliance}
                                              onChange={event =>
                                                updateEffectList(
                                                  effectType,
                                                  effect.id,
                                                  currentEffect => ({
                                                    ...currentEffect,
                                                    requirement: {
                                                      ...currentEffect.requirement,
                                                      orRequirements:
                                                        currentEffect.requirement.orRequirements.map(
                                                          entry =>
                                                            entry.id === option.id
                                                              ? {
                                                                  ...entry,
                                                                  alliance:
                                                                    event.target.value as
                                                                      | FactionType
                                                                      | '',
                                                                }
                                                              : entry
                                                        ),
                                                    },
                                                  })
                                                )
                                              }
                                            >
                                              <option value="">None</option>
                                              {Object.values(FactionType).map(faction => (
                                                <option key={faction} value={faction}>
                                                  {formatLabel(faction)}
                                                </option>
                                              ))}
                                            </select>
                                          </label>

                                          <label>
                                            {specificLabel}
                                            <select
                                              value={option.specificFaction}
                                              onChange={event =>
                                                updateEffectList(
                                                  effectType,
                                                  effect.id,
                                                  currentEffect => ({
                                                    ...currentEffect,
                                                    requirement: {
                                                      ...currentEffect.requirement,
                                                      orRequirements:
                                                        currentEffect.requirement.orRequirements.map(
                                                          entry =>
                                                            entry.id === option.id
                                                              ? {
                                                                  ...entry,
                                                                  specificFaction:
                                                                    event.target.value as
                                                                      | FactionType
                                                                      | '',
                                                                }
                                                              : entry
                                                        ),
                                                    },
                                                  })
                                                )
                                              }
                                            >
                                              <option value="">None</option>
                                              {Object.values(FactionType).map(faction => (
                                                <option key={faction} value={faction}>
                                                  {formatLabel(faction)}
                                                </option>
                                              ))}
                                            </select>
                                          </label>
                                        </div>

                                        <div className="card-creator-toggle-row">
                                          <label className="card-creator-checkbox">
                                            <input
                                              type="checkbox"
                                              checked={option.influenceEnabled}
                                              onChange={event =>
                                                updateEffectList(
                                                  effectType,
                                                  effect.id,
                                                  currentEffect => ({
                                                    ...currentEffect,
                                                    requirement: {
                                                      ...currentEffect.requirement,
                                                      orRequirements:
                                                        currentEffect.requirement.orRequirements.map(
                                                          entry =>
                                                            entry.id === option.id
                                                              ? {
                                                                  ...entry,
                                                                  influenceEnabled:
                                                                    event.target.checked,
                                                                }
                                                              : entry
                                                        ),
                                                    },
                                                  })
                                                )
                                              }
                                            />
                                            Influence requirement
                                          </label>
                                        </div>

                                        {option.influenceEnabled && (
                                          <div className="card-creator-inline-grid">
                                            <label>
                                              Faction
                                              <select
                                                value={option.influenceFaction}
                                                onChange={event =>
                                                  updateEffectList(
                                                    effectType,
                                                    effect.id,
                                                    currentEffect => ({
                                                      ...currentEffect,
                                                      requirement: {
                                                        ...currentEffect.requirement,
                                                        orRequirements:
                                                          currentEffect.requirement.orRequirements.map(
                                                            entry =>
                                                              entry.id === option.id
                                                                ? {
                                                                    ...entry,
                                                                    influenceFaction:
                                                                      event.target.value as FactionType,
                                                                  }
                                                                : entry
                                                          ),
                                                      },
                                                    })
                                                  )
                                                }
                                              >
                                                {Object.values(FactionType).map(faction => (
                                                  <option key={faction} value={faction}>
                                                    {formatLabel(faction)}
                                                  </option>
                                                ))}
                                              </select>
                                            </label>

                                            <label>
                                              Amount
                                              <input
                                                type="number"
                                                min="0"
                                                value={option.influenceAmount}
                                                onChange={event =>
                                                  updateEffectList(
                                                    effectType,
                                                    effect.id,
                                                    currentEffect => ({
                                                      ...currentEffect,
                                                      requirement: {
                                                        ...currentEffect.requirement,
                                                        orRequirements:
                                                          currentEffect.requirement.orRequirements.map(
                                                            entry =>
                                                              entry.id === option.id
                                                                ? {
                                                                    ...entry,
                                                                    influenceAmount:
                                                                      parseNumericValue(
                                                                        event.target.value
                                                                      ),
                                                                  }
                                                                : entry
                                                          ),
                                                      },
                                                    })
                                                  )
                                                }
                                              />
                                            </label>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <div className="card-creator-subsection">
                            <div className="card-creator-toggle-row">
                              <label className="card-creator-checkbox">
                                <input
                                  type="checkbox"
                                  checked={effect.cost.enabled}
                                  onChange={event =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      cost: {
                                        ...currentEffect.cost,
                                        enabled: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Cost block
                              </label>
                            </div>

                            {effect.cost.enabled && (
                              <>
                                <div className="card-creator-grid three-columns">
                                  {COST_FIELD_CONFIG.map(field => (
                                    <label key={field.key}>
                                      {field.label}
                                      <input
                                        type="number"
                                        min="0"
                                        value={effect.cost[field.key]}
                                        onChange={event =>
                                          updateEffectList(effectType, effect.id, currentEffect => ({
                                            ...currentEffect,
                                            cost: {
                                              ...currentEffect.cost,
                                              [field.key]: parseNumericValue(event.target.value),
                                            },
                                          }))
                                        }
                                      />
                                    </label>
                                  ))}
                                </div>

                                <div className="card-creator-grid two-columns">
                                  <label>
                                    Custom cost note
                                    <input
                                      type="text"
                                      value={effect.cost.custom}
                                      onChange={event =>
                                        updateEffectList(effectType, effect.id, currentEffect => ({
                                          ...currentEffect,
                                          cost: {
                                            ...currentEffect.cost,
                                            custom: event.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Optional custom cost string"
                                    />
                                  </label>

                                  <label className="card-creator-checkbox align-end">
                                    <input
                                      type="checkbox"
                                      checked={effect.cost.trashThisCard}
                                      onChange={event =>
                                        updateEffectList(effectType, effect.id, currentEffect => ({
                                          ...currentEffect,
                                          cost: {
                                            ...currentEffect.cost,
                                            trashThisCard: event.target.checked,
                                          },
                                        }))
                                      }
                                    />
                                    Trash this card
                                  </label>
                                </div>

                                <InfluenceEditorPanel
                                  title="Influence cost"
                                  editor={effect.cost.influence}
                                  onChange={nextValue =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      cost: {
                                        ...currentEffect.cost,
                                        influence: nextValue,
                                      },
                                    }))
                                  }
                                />
                              </>
                            )}
                          </div>

                          <div className="card-creator-subsection">
                            <h4>Reward</h4>
                            <div className="card-creator-grid three-columns">
                              {REWARD_FIELD_CONFIG.map(field => (
                                <label key={field.key}>
                                  {field.label}
                                  <input
                                    type="number"
                                    min="0"
                                    value={effect.reward[field.key] as NumericValue}
                                    onChange={event =>
                                      updateEffectList(effectType, effect.id, currentEffect => ({
                                        ...currentEffect,
                                        reward: {
                                          ...currentEffect.reward,
                                          [field.key]: parseNumericValue(event.target.value),
                                        },
                                      }))
                                    }
                                  />
                                </label>
                              ))}

                              <label>
                                Acquire limit
                                <input
                                  type="number"
                                  min="0"
                                  value={effect.reward.acquireLimit}
                                  onChange={event =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      reward: {
                                        ...currentEffect.reward,
                                        acquireLimit: parseNumericValue(event.target.value),
                                      },
                                    }))
                                  }
                                />
                              </label>

                              <label>
                                Custom effect
                                <select
                                  value={effect.reward.custom}
                                  onChange={event =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      reward: {
                                        ...currentEffect.reward,
                                        custom: event.target.value as CustomEffect | '',
                                      },
                                    }))
                                  }
                                >
                                  <option value="">None</option>
                                  {Object.values(CustomEffect).map(customEffect => (
                                    <option key={customEffect} value={customEffect}>
                                      {formatLabel(customEffect)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <div className="card-creator-toggle-row">
                              <label className="card-creator-checkbox">
                                <input
                                  type="checkbox"
                                  checked={effect.reward.trashThisCard}
                                  onChange={event =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      reward: {
                                        ...currentEffect.reward,
                                        trashThisCard: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Trash this card
                              </label>

                              <label className="card-creator-checkbox">
                                <input
                                  type="checkbox"
                                  checked={effect.reward.mentat}
                                  onChange={event =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      reward: {
                                        ...currentEffect.reward,
                                        mentat: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Mentat
                              </label>

                              <label className="card-creator-checkbox">
                                <input
                                  type="checkbox"
                                  checked={effect.reward.acquireToTopThisRound}
                                  onChange={event =>
                                    updateEffectList(effectType, effect.id, currentEffect => ({
                                      ...currentEffect,
                                      reward: {
                                        ...currentEffect.reward,
                                        acquireToTopThisRound: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Acquire to top this round
                              </label>
                            </div>

                            <InfluenceEditorPanel
                              title="Influence reward"
                              editor={effect.reward.influence}
                              onChange={nextValue =>
                                updateEffectList(effectType, effect.id, currentEffect => ({
                                  ...currentEffect,
                                  reward: {
                                    ...currentEffect.reward,
                                    influence: nextValue,
                                  },
                                }))
                              }
                            />
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            <section className="card-creator-section">
              <div className="card-creator-section-header">
                <div>
                  <h2>Acquire effect</h2>
                  <p>Optional reward block triggered when the card is purchased.</p>
                </div>
              </div>

              <div className="card-creator-toggle-row">
                <label className="card-creator-checkbox">
                  <input
                    type="checkbox"
                    checked={cardState.acquireEffect.enabled}
                    onChange={event =>
                      updateCardState(current => ({
                        ...current,
                        acquireEffect: {
                          ...current.acquireEffect,
                          enabled: event.target.checked,
                        },
                      }))
                    }
                  />
                  Enable acquire effect
                </label>
              </div>

              {cardState.acquireEffect.enabled && (
                <>
                  <div className="card-creator-grid three-columns">
                    {ACQUIRE_EFFECT_CONFIG.map(field => (
                      <label key={field.key}>
                        {field.label}
                        <input
                          type="number"
                          min="0"
                          value={cardState.acquireEffect[field.key] as NumericValue}
                          onChange={event =>
                            updateCardState(current => ({
                              ...current,
                              acquireEffect: {
                                ...current.acquireEffect,
                                [field.key]: parseNumericValue(event.target.value),
                              },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <InfluenceEditorPanel
                    title="Influence reward"
                    editor={cardState.acquireEffect.influence}
                    onChange={nextValue =>
                      updateCardState(current => ({
                        ...current,
                        acquireEffect: {
                          ...current.acquireEffect,
                          influence: nextValue,
                        },
                      }))
                    }
                  />
                </>
              )}
            </section>
          </div>

          <aside className="card-creator-sidebar">
            <section className="card-creator-preview-card">
              <div className="card-creator-preview-image-frame">
                {previewImageSource ? (
                  <img src={previewImageSource} alt={cardState.name || 'Card preview'} />
                ) : (
                  <div className="card-creator-image-placeholder">No image selected</div>
                )}
              </div>

              <div className="card-creator-preview-content">
                <h2>{cardState.name || 'Untitled card'}</h2>
                <div className="card-creator-chip-group compact">
                  <span className="card-creator-summary-pill">ID: {generatedCard.id as number}</span>
                  <span className="card-creator-summary-pill">
                    Play: {cardState.playEffect.length}
                  </span>
                  <span className="card-creator-summary-pill">
                    Reveal: {cardState.revealEffect.length}
                  </span>
                  <span className="card-creator-summary-pill">
                    Acquire: {cardState.acquireEffect.enabled ? 'On' : 'Off'}
                  </span>
                </div>

                <p className="card-creator-note">{STORAGE_NOTE}</p>

                {warnings.length > 0 && (
                  <div className="card-creator-warning-box">
                    <h3>Draft notes</h3>
                    <ul>
                      {warnings.map(warning => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <section className="card-creator-preview-card">
              <div className="card-creator-section-header">
                <div>
                  <h2>Generated JSON</h2>
                  <p>Copy or download the current draft.</p>
                </div>
              </div>

              <div className="card-creator-sidebar-actions">
                <button className="card-creator-secondary-button" type="button" onClick={handleCopy}>
                  Copy JSON
                </button>
                <button className="card-creator-secondary-button" type="button" onClick={handleDownload}>
                  Download JSON
                </button>
              </div>

              {copyFeedback && <p className="card-creator-copy-feedback">{copyFeedback}</p>}

              <pre className="card-creator-json-preview">{jsonPreview}</pre>
            </section>
          </aside>
        </div>
      </div>
    </motion.div>
  )
}

export default CardCreator
