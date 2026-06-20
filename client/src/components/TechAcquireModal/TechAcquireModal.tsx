import React, { useMemo, useState } from 'react'
import type { TechTileId } from '../../data/techTiles'
import { getTechTile } from '../../data/techTiles'
import type { Player } from '../../types/GameTypes'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import { effectiveTechCost } from '../../utils/techTiles'
import '../ImperiumRow/ImperiumRow.css'
import './TechAcquireModal.css'

export interface TechAcquireModalProps {
  isOpen: boolean
  stackIndex: number
  stacks: TechTileId[][]
  player: Player
  /** When false, modal is view-only (tile info + resources). */
  canAcquire: boolean
  discount: number
  paySolariInsteadOfSpice?: boolean
  onAcquire: (
    stackIndex: number,
    negotiatorsReturned: number,
    nextFaceUpTileId?: TechTileId
  ) => void
  onClose: () => void
}

type AcquireStep = {
  acquiredTileId: TechTileId
  faceDownIds: TechTileId[]
  negotiatorsReturned: number
}

const TechAcquireModal: React.FC<TechAcquireModalProps> = ({
  isOpen,
  stackIndex,
  stacks,
  player,
  canAcquire,
  discount,
  paySolariInsteadOfSpice = false,
  onAcquire,
  onClose,
}) => {
  const [negotiatorsReturned, setNegotiatorsReturned] = useState(0)
  const [acquireStep, setAcquireStep] = useState<AcquireStep | null>(null)
  const [selectedNextTileId, setSelectedNextTileId] = useState<TechTileId | null>(null)
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isOpen)

  const negotiatorsAvailable = player.negotiatorsOnIx ?? 0
  const currency = paySolariInsteadOfSpice ? player.solari : player.spice
  const currencyLabel = paySolariInsteadOfSpice ? 'solari' : 'spice'

  const faceUpId = stacks[stackIndex]?.[0]
  const tile = faceUpId ? getTechTile(faceUpId) : undefined

  const maxReturnable = useMemo(() => {
    if (!tile) return 0
    const afterDiscount = Math.max(0, tile.cost - discount)
    return Math.min(negotiatorsAvailable, afterDiscount)
  }, [tile, discount, negotiatorsAvailable])

  const clampedReturn = Math.min(negotiatorsReturned, maxReturnable)
  const effectiveCost = tile ? effectiveTechCost(tile.cost, discount, clampedReturn) : 0
  const canAfford = tile ? currency >= effectiveCost : false
  const acquireEnabled = canAcquire && canAfford

  if (!isOpen || !tile || waitForBoardTarget) return null

  const resetAndClose = () => {
    setNegotiatorsReturned(0)
    setAcquireStep(null)
    setSelectedNextTileId(null)
    onClose()
  }

  const confirmAcquire = (nextFaceUpTileId?: TechTileId) => {
    onAcquire(stackIndex, clampedReturn, nextFaceUpTileId)
    setNegotiatorsReturned(0)
    setAcquireStep(null)
    setSelectedNextTileId(null)
  }

  const handleAcquire = () => {
    if (!acquireEnabled) return
    const faceDownIds = stacks[stackIndex]?.slice(1) ?? []
    if (faceDownIds.length <= 1) {
      confirmAcquire(faceDownIds[0])
      return
    }
    setAcquireStep({
      acquiredTileId: tile.id,
      faceDownIds,
      negotiatorsReturned: clampedReturn,
    })
    setSelectedNextTileId(null)
  }

  const handleConfirmNextTile = () => {
    if (!acquireStep || !selectedNextTileId) return
    onAcquire(stackIndex, acquireStep.negotiatorsReturned, selectedNextTileId)
    setNegotiatorsReturned(0)
    setAcquireStep(null)
    setSelectedNextTileId(null)
  }

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
        aria-label={canAcquire ? `Acquire ${tile.name}` : `View ${tile.name}`}
        onClick={event => event.stopPropagation()}
      >
        {acquireStep ? (
          <>
            <h3 className="tech-acquire-modal__title">Choose next face-up tile</h3>
            <p className="tech-acquire-modal__subtitle">
              Acquiring {tile.name} — pick which tile to reveal on stack {stackIndex + 1}.
            </p>
            <div className="tech-acquire-modal__pick-grid" role="listbox" aria-label="Next face-up tile">
              {acquireStep.faceDownIds.map(tileId => {
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
              src={tile.image}
              alt={tile.name}
              className="imperium-preview-image tech-acquire-modal__tile-img"
              draggable={false}
            />
            <div className="tech-acquire-modal__meta">
              <span className="tech-acquire-modal__tile-name">{tile.name}</span>
              <span className="tech-acquire-modal__cost">
                {effectiveCost} {currencyLabel}
                {effectiveCost !== tile.cost ? (
                  <span className="tech-acquire-modal__cost-base"> (base {tile.cost})</span>
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
                <img src="/icon/negotiator.svg" alt="" className="tech-acquire-modal__resource-icon" aria-hidden />
                {negotiatorsAvailable} negotiator{negotiatorsAvailable === 1 ? '' : 's'} on Ix
              </span>
            </div>

            {canAcquire && discount > 0 ? (
              <p className="tech-acquire-modal__discount">Acquire discount: −{discount} {currencyLabel}</p>
            ) : null}

            {canAcquire && negotiatorsAvailable > 0 ? (
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

            {!canAcquire ? (
              <p className="tech-acquire-modal__view-only-hint">
                Acquire an Acquire Tech reward to purchase from the market.
              </p>
            ) : null}

            <p className="tech-acquire-modal__description">{tile.description}</p>

            <div className="imperium-preview-actions tech-acquire-modal__actions">
              <button type="button" className="imperium-preview-cancel" onClick={resetAndClose}>
                {canAcquire ? 'Cancel' : 'Close'}
              </button>
              {canAcquire ? (
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
