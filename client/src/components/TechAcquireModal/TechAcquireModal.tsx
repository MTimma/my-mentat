import React, { useEffect, useMemo, useState } from 'react'
import type { TechAcquireSourceOption } from '../../components/GameContext/riseOfIx/techAcquireOffer'
import type { TechTileId } from '../../data/techTiles'
import { getTechTile } from '../../data/techTiles'
import type { Player } from '../../types/GameTypes'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import {
  canPlayerAffordTechTile,
  effectiveTechCost,
  techTilesAvailableForNextReveal,
} from '../../utils/techTiles'
import NegotiatorIcon from '../NegotiatorIcon/NegotiatorIcon'
import '../ImperiumRow/ImperiumRow.css'
import './TechAcquireModal.css'

export interface TechAcquireModalProps {
  isOpen: boolean
  /** When null, show all three face-up stacks to pick from first. */
  stackIndex: number | null
  stacks: TechTileId[][]
  players: Player[]
  player: Player
  /** When false, modal is view-only (tile info + resources). */
  canAcquire: boolean
  acquireSources: TechAcquireSourceOption[]
  /** Pre-select acquire source (e.g. play-area button tied to one reward). */
  initialSourceId?: string | null
  onAcquire: (
    stackIndex: number,
    negotiatorsReturned: number,
    sourceId: string,
    nextFaceUpTileId?: TechTileId
  ) => void
  onClose: () => void
}

type AcquireStep = {
  acquiredTileId: TechTileId
  availableIds: TechTileId[]
  negotiatorsReturned: number
}

const TechAcquireModal: React.FC<TechAcquireModalProps> = ({
  isOpen,
  stackIndex,
  stacks,
  players,
  player,
  canAcquire,
  acquireSources,
  initialSourceId = null,
  onAcquire,
  onClose,
}) => {
  const [activeStackIndex, setActiveStackIndex] = useState<number | null>(stackIndex)
  const [negotiatorsReturned, setNegotiatorsReturned] = useState(0)
  const [acquireStep, setAcquireStep] = useState<AcquireStep | null>(null)
  const [selectedNextTileId, setSelectedNextTileId] = useState<TechTileId | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(initialSourceId)
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isOpen)

  useEffect(() => {
    if (!isOpen) return
    setActiveStackIndex(stackIndex)
    setNegotiatorsReturned(0)
    setAcquireStep(null)
    setSelectedNextTileId(null)
    setSelectedSourceId(initialSourceId)
  }, [isOpen, stackIndex, initialSourceId])

  const activeSource =
    acquireSources.find(source => source.id === selectedSourceId) ??
    (acquireSources.length === 1 ? acquireSources[0] : undefined)

  const discount = activeSource?.discount ?? 0
  const paySolariInsteadOfSpice = activeSource?.paySolariInsteadOfSpice ?? false

  const negotiatorsAvailable = player.negotiatorsOnIx ?? 0
  const currency = paySolariInsteadOfSpice ? player.solari : player.spice
  const currencyLabel = paySolariInsteadOfSpice ? 'solari' : 'spice'

  const faceUpId =
    activeStackIndex != null ? stacks[activeStackIndex]?.[0] : undefined
  const tile = faceUpId ? getTechTile(faceUpId) : undefined

  const maxReturnable = useMemo(() => {
    if (!tile) return 0
    const afterDiscount = Math.max(0, tile.cost - discount)
    return Math.min(negotiatorsAvailable, afterDiscount)
  }, [tile, discount, negotiatorsAvailable])

  const clampedReturn = Math.min(negotiatorsReturned, maxReturnable)
  const effectiveCost = tile ? effectiveTechCost(tile.cost, discount, clampedReturn) : 0
  const canAfford = tile ? currency >= effectiveCost : false
  const sourceReady = canAcquire && acquireSources.length > 0 && activeSource != null
  const acquireEnabled = sourceReady && canAfford
  const showStackPicker = activeStackIndex == null

  const stackPickerEntries = useMemo(
    () =>
      stacks.map((stack, index) => {
        const tileId = stack[0]
        const stackTile = tileId ? getTechTile(tileId) : undefined
        const affordable =
          stackTile && activeSource
            ? canPlayerAffordTechTile(player, stackTile.cost, {
                discount: activeSource.discount,
                paySolariInsteadOfSpice: activeSource.paySolariInsteadOfSpice,
              })
            : false
        return { index, tileId, stackTile, affordable }
      }),
    [stacks, player, activeSource]
  )

  if (!isOpen || waitForBoardTarget) return null
  if (!showStackPicker && !tile) return null

  const resetAndClose = () => {
    setActiveStackIndex(stackIndex)
    setNegotiatorsReturned(0)
    setAcquireStep(null)
    setSelectedNextTileId(null)
    setSelectedSourceId(initialSourceId)
    onClose()
  }

  const confirmAcquire = (nextFaceUpTileId?: TechTileId) => {
    if (!activeSource || activeStackIndex == null) return
    onAcquire(activeStackIndex, clampedReturn, activeSource.id, nextFaceUpTileId)
    setNegotiatorsReturned(0)
    setAcquireStep(null)
    setSelectedNextTileId(null)
  }

  const handleAcquire = () => {
    if (!acquireEnabled || !tile) return
    const availableIds = techTilesAvailableForNextReveal(stacks, players, tile.id)
    if (availableIds.length <= 1) {
      confirmAcquire(availableIds[0])
      return
    }
    setAcquireStep({
      acquiredTileId: tile.id,
      availableIds,
      negotiatorsReturned: clampedReturn,
    })
    setSelectedNextTileId(null)
  }

  const handleConfirmNextTile = () => {
    if (!acquireStep || !selectedNextTileId || !activeSource || activeStackIndex == null) return
    onAcquire(
      activeStackIndex,
      acquireStep.negotiatorsReturned,
      activeSource.id,
      selectedNextTileId
    )
    setNegotiatorsReturned(0)
    setAcquireStep(null)
    setSelectedNextTileId(null)
  }

  const renderSourcePicker = () =>
    acquireSources.length > 1 ? (
      <div className="tech-acquire-modal__sources" aria-label="Acquire tech using">
        <span className="tech-acquire-modal__sources-label">Acquire using</span>
        <div className="tech-acquire-modal__source-list" role="radiogroup" aria-label="Acquire source">
          {acquireSources.map(source => {
            const selected = activeSource?.id === source.id
            return (
              <button
                key={source.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={[
                  'tech-acquire-modal__source',
                  selected ? 'tech-acquire-modal__source--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setSelectedSourceId(source.id)
                  setNegotiatorsReturned(0)
                }}
              >
                <img
                  src={source.icon}
                  alt=""
                  className="tech-acquire-modal__source-icon"
                  aria-hidden
                />
                <span className="tech-acquire-modal__source-label">{source.label}</span>
                {source.discount > 0 ? (
                  <span className="tech-acquire-modal__source-discount">−{source.discount} spice</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    ) : null

  const overlay = (
    <div
      className={['imperium-preview-overlay', 'tech-acquire-overlay', scopedClass]
        .filter(Boolean)
        .join(' ')}
      onClick={resetAndClose}
    >
      <div
        className="imperium-preview-modal tech-acquire-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          showStackPicker
            ? 'Choose tech to acquire'
            : canAcquire && tile
              ? `Acquire ${tile.name}`
              : tile
                ? `View ${tile.name}`
                : 'Acquire tech'
        }
        onClick={event => event.stopPropagation()}
      >
        {showStackPicker ? (
          <>
            <h3 className="tech-acquire-modal__title">Buy tech</h3>
            <p className="tech-acquire-modal__subtitle">Choose a face-up tech tile to acquire.</p>
            {renderSourcePicker()}
            {!sourceReady ? (
              <p className="tech-acquire-modal__view-only-hint">
                {acquireSources.length > 1
                  ? 'Choose whether to acquire with your board space discount or Signet Ring.'
                  : 'Acquire an Acquire Tech reward to purchase from the market.'}
              </p>
            ) : null}
            <div
              className="tech-acquire-modal__stack-picker"
              role="listbox"
              aria-label="Face-up tech tiles"
            >
              {stackPickerEntries.map(entry => {
                if (!entry.stackTile || !entry.tileId) {
                  return (
                    <div
                      key={`empty-${entry.index}`}
                      className="tech-acquire-modal__stack-slot tech-acquire-modal__stack-slot--empty"
                      aria-hidden
                    />
                  )
                }
                const entryCost = effectiveTechCost(entry.stackTile.cost, discount, 0)
                const disabled = !sourceReady || !entry.affordable
                return (
                  <button
                    key={entry.tileId}
                    type="button"
                    role="option"
                    aria-disabled={disabled}
                    disabled={disabled}
                    className={[
                      'tech-acquire-modal__stack-slot',
                      disabled ? 'tech-acquire-modal__stack-slot--disabled' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={
                      disabled
                        ? `Need ${entryCost} ${currencyLabel} (you have ${currency})`
                        : `${entry.stackTile.name} — ${entryCost} ${currencyLabel}`
                    }
                    onClick={() => {
                      if (disabled) return
                      setActiveStackIndex(entry.index)
                      setNegotiatorsReturned(0)
                    }}
                  >
                    <img
                      src={entry.stackTile.image}
                      alt={entry.stackTile.name}
                      className="tech-acquire-modal__stack-slot-img"
                      draggable={false}
                    />
                    <span className="tech-acquire-modal__stack-slot-name">{entry.stackTile.name}</span>
                    <span className="tech-acquire-modal__stack-slot-cost">
                      {entryCost} {currencyLabel}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="imperium-preview-actions tech-acquire-modal__actions">
              <button type="button" className="imperium-preview-cancel" onClick={resetAndClose}>
                Cancel
              </button>
            </div>
          </>
        ) : acquireStep ? (
          <>
            <h3 className="tech-acquire-modal__title">Choose next face-up tile</h3>
            <p className="tech-acquire-modal__subtitle">
              Acquiring {tile!.name} — pick which tile to reveal on stack {activeStackIndex! + 1}.
            </p>
            <div className="tech-acquire-modal__pick-grid" role="listbox" aria-label="Next face-up tile">
              {acquireStep.availableIds.map(tileId => {
                const pickTile = getTechTile(tileId)
                if (!pickTile) return null
                const selected = selectedNextTileId === tileId
                return (
                  <button
                    key={tileId}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={[
                      'tech-acquire-modal__pick-tile',
                      selected ? 'tech-acquire-modal__pick-tile--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={pickTile.name}
                    onClick={() => setSelectedNextTileId(tileId)}
                  >
                    <img src={pickTile.image} alt={pickTile.name} draggable={false} />
                  </button>
                )
              })}
            </div>
            <div className="imperium-preview-actions tech-acquire-modal__actions">
              <button type="button" className="imperium-preview-cancel" onClick={() => setAcquireStep(null)}>
                Back
              </button>
              <button
                type="button"
                className="imperium-preview-acquire"
                disabled={!selectedNextTileId}
                onClick={handleConfirmNextTile}
              >
                Acquire
              </button>
            </div>
          </>
        ) : (
          <>
            <img
              src={tile!.image}
              alt={tile!.name}
              className="imperium-preview-image tech-acquire-modal__tile-img"
              draggable={false}
            />
            <div className="tech-acquire-modal__meta">
              <span className="tech-acquire-modal__tile-name">{tile!.name}</span>
              <span className="tech-acquire-modal__cost">
                {effectiveCost} {currencyLabel}
                {effectiveCost !== tile!.cost ? (
                  <span className="tech-acquire-modal__cost-base"> (base {tile!.cost})</span>
                ) : null}
              </span>
            </div>

            <div className="tech-acquire-modal__resources" aria-label="Your resources">
              <span className="tech-acquire-modal__resource">
                <img src="/icon/spice.png" alt="" className="tech-acquire-modal__resource-icon" aria-hidden />
                {paySolariInsteadOfSpice ? player.spice : currency} {currencyLabel}
              </span>
              {paySolariInsteadOfSpice ? (
                <span className="tech-acquire-modal__resource">
                  Paying with solari ({player.solari} available)
                </span>
              ) : null}
              <span className="tech-acquire-modal__resource">
                <NegotiatorIcon
                  playerId={player.id}
                  color={player.color}
                  size="md"
                  className="tech-acquire-modal__resource-icon"
                />
                {negotiatorsAvailable} negotiator{negotiatorsAvailable === 1 ? '' : 's'} on Ix
              </span>
            </div>

            {sourceReady || acquireSources.length > 0 ? (
              <div className="tech-acquire-modal__sources" aria-label="Acquire tech using">
                <span className="tech-acquire-modal__sources-label">Acquire using</span>
                <div className="tech-acquire-modal__source-list" role="radiogroup" aria-label="Acquire source">
                  {acquireSources.map(source => {
                    const selected = activeSource?.id === source.id
                    return (
                      <button
                        key={source.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={[
                          'tech-acquire-modal__source',
                          selected ? 'tech-acquire-modal__source--selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setSelectedSourceId(source.id)
                          setNegotiatorsReturned(0)
                        }}
                      >
                        <img
                          src={source.icon}
                          alt=""
                          className="tech-acquire-modal__source-icon"
                          aria-hidden
                        />
                        <span className="tech-acquire-modal__source-label">{source.label}</span>
                        {source.discount > 0 ? (
                          <span className="tech-acquire-modal__source-discount">
                            −{source.discount} spice
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {sourceReady && discount > 0 ? (
              <p className="tech-acquire-modal__discount">Board discount: −{discount} {currencyLabel}</p>
            ) : null}

            {sourceReady && negotiatorsAvailable > 0 ? (
              <div className="tech-acquire-modal__negotiators">
                <label htmlFor="tech-acquire-negotiators-returned">
                  Return negotiators (1 {currencyLabel} discount each):
                </label>
                <input
                  id="tech-acquire-negotiators-returned"
                  type="number"
                  min={0}
                  max={maxReturnable}
                  value={clampedReturn}
                  onChange={event =>
                    setNegotiatorsReturned(
                      Math.max(0, Math.min(maxReturnable, Number(event.target.value) || 0))
                    )
                  }
                />
                <span className="tech-acquire-modal__negotiators-hint">
                  Up to {maxReturnable} for this tile
                </span>
              </div>
            ) : null}

            {!sourceReady ? (
              <p className="tech-acquire-modal__view-only-hint">
                {acquireSources.length > 1
                  ? 'Choose whether to acquire with your board space discount or Signet Ring.'
                  : 'Acquire an Acquire Tech reward to purchase from the market.'}
              </p>
            ) : null}

            <p className="tech-acquire-modal__description">{tile!.description}</p>

            <div className="imperium-preview-actions tech-acquire-modal__actions">
              <button
                type="button"
                className="imperium-preview-cancel"
                onClick={() => {
                  if (stackIndex == null) {
                    setActiveStackIndex(null)
                    setAcquireStep(null)
                    setNegotiatorsReturned(0)
                    return
                  }
                  resetAndClose()
                }}
              >
                {stackIndex == null ? 'Back' : acquireSources.length > 0 ? 'Cancel' : 'Close'}
              </button>
              {sourceReady ? (
                <button
                  type="button"
                  className="imperium-preview-acquire"
                  disabled={!acquireEnabled}
                  title={
                    acquireEnabled
                      ? `Acquire for ${effectiveCost} ${currencyLabel}`
                      : `Need ${effectiveCost} ${currencyLabel} (you have ${currency})`
                  }
                  onClick={handleAcquire}
                >
                  Acquire
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )

  return portalNode(overlay)
}

export default TechAcquireModal
