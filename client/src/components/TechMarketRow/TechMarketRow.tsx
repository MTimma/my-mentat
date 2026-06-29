import React, { useMemo, useState } from 'react'
import type { TechTileId } from '../../data/techTiles'
import { getTechTile } from '../../data/techTiles'
import type { Player } from '../../types/GameTypes'
import { effectiveTechCost, techTilesAvailableForNextReveal } from '../../utils/techTiles'
import './TechMarketRow.css'

export interface TechMarketRowProps {
  stacks: TechTileId[][]
  players: Player[]
  player: Player
  discount: number
  paySolariInsteadOfSpice?: boolean
  onAcquire: (
    stackIndex: number,
    negotiatorsReturned: number,
    nextFaceUpTileId?: TechTileId
  ) => void
}

type AcquireStep = {
  stackIndex: number
  acquiredTileId: TechTileId
  availableIds: TechTileId[]
  negotiatorsReturned: number
}

const TechMarketRow: React.FC<TechMarketRowProps> = ({
  stacks,
  players,
  player,
  discount,
  paySolariInsteadOfSpice = false,
  onAcquire,
}) => {
  const [negotiatorsReturned, setNegotiatorsReturned] = useState(0)
  const [acquireStep, setAcquireStep] = useState<AcquireStep | null>(null)
  const [selectedNextTileId, setSelectedNextTileId] = useState<TechTileId | null>(null)

  const negotiatorsAvailable = player.negotiatorsOnIx ?? 0
  const currency = paySolariInsteadOfSpice ? player.solari : player.spice
  const currencyLabel = paySolariInsteadOfSpice ? 'solari' : 'spice'

  const maxReturnable = useMemo(() => {
    const tops = stacks.map(stack => (stack[0] ? getTechTile(stack[0]) : undefined))
    const minCostAfterDiscount = tops.reduce((min, tile) => {
      if (!tile) return min
      const afterDiscount = Math.max(0, tile.cost - discount)
      return Math.min(min, afterDiscount)
    }, Number.POSITIVE_INFINITY)
    if (!Number.isFinite(minCostAfterDiscount)) return 0
    return Math.min(negotiatorsAvailable, minCostAfterDiscount)
  }, [stacks, discount, negotiatorsAvailable])

  const clampedReturn = Math.min(negotiatorsReturned, maxReturnable)

  const beginAcquire = (stackIndex: number) => {
    const stack = stacks[stackIndex]
    const faceUpId = stack?.[0]
    if (!faceUpId) return
    const tile = getTechTile(faceUpId)
    if (!tile) return
    const cost = effectiveTechCost(tile.cost, discount, clampedReturn)
    if (currency < cost) return

    const availableIds = techTilesAvailableForNextReveal(stacks, players, faceUpId)
    if (availableIds.length <= 1) {
      onAcquire(stackIndex, clampedReturn, availableIds[0])
      return
    }

    setAcquireStep({
      stackIndex,
      acquiredTileId: faceUpId,
      availableIds,
      negotiatorsReturned: clampedReturn,
    })
    setSelectedNextTileId(null)
  }

  const confirmAcquireWithNext = () => {
    if (!acquireStep || !selectedNextTileId) return
    onAcquire(acquireStep.stackIndex, acquireStep.negotiatorsReturned, selectedNextTileId)
    setAcquireStep(null)
    setSelectedNextTileId(null)
  }

  const cancelAcquireStep = () => {
    setAcquireStep(null)
    setSelectedNextTileId(null)
  }

  if (acquireStep) {
    const acquiredTile = getTechTile(acquireStep.acquiredTileId)
    return (
      <div className="tech-market-section imperium-section imperium-section--acquire-mode">
        <div className="tech-market-section__header">
          <span className="tech-market-section__title">Choose next face-up tile</span>
          {acquiredTile ? (
            <span className="tech-market-section__discount">Acquiring {acquiredTile.name}</span>
          ) : null}
        </div>
        <p className="tech-market-section__hint">Pick which tile to reveal on stack {acquireStep.stackIndex + 1}.</p>
        <div className="tech-market-section__stacks" role="listbox" aria-label="Next face-up tile">
          {acquireStep.availableIds.map(tileId => {
            const tile = getTechTile(tileId)
            if (!tile) return null
            const selected = selectedNextTileId === tileId
            return (
              <button
                key={tileId}
                type="button"
                role="option"
                aria-selected={selected}
                className={[
                  'tech-market-tile',
                  selected ? 'tech-market-tile--selected' : 'tech-market-tile--pickable',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={tile.name}
                onClick={() => setSelectedNextTileId(tileId)}
              >
                <img src={tile.image} alt={tile.name} className="tech-market-tile__img" draggable={false} />
              </button>
            )
          })}
        </div>
        <div className="tech-market-section__actions">
          <button type="button" className="tech-market-section__cancel" onClick={cancelAcquireStep}>
            Cancel
          </button>
          <button
            type="button"
            className="tech-market-section__confirm"
            disabled={!selectedNextTileId}
            onClick={confirmAcquireWithNext}
          >
            Acquire
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tech-market-section imperium-section imperium-section--acquire-mode">
      <div className="tech-market-section__header">
        <span className="tech-market-section__title">Acquire Technology</span>
        <span className="tech-market-section__player-spice" aria-label={`Your ${currencyLabel}`}>
          <img
            src={paySolariInsteadOfSpice ? '/icon/solari.png' : '/icon/spice.png'}
            alt=""
            className="tech-market-section__currency-icon"
            aria-hidden
          />
          {currency}
        </span>
        {discount > 0 ? (
          <span className="tech-market-section__discount">−{discount} {currencyLabel}</span>
        ) : null}
      </div>

      {negotiatorsAvailable > 0 ? (
        <div className="tech-market-section__negotiators">
          <label htmlFor="tech-market-negotiators-returned">
            Return negotiators (1 {currencyLabel} each):
          </label>
          <input
            id="tech-market-negotiators-returned"
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
          <span className="tech-market-section__negotiators-total">
            ({negotiatorsAvailable} on Ix)
          </span>
        </div>
      ) : null}

      <div className="tech-market-section__stacks" role="list" aria-label="Technology stacks">
        {stacks.map((stack, stackIndex) => {
          const faceUpId = stack[0]
          const tile = faceUpId ? getTechTile(faceUpId) : undefined
          if (!tile) {
            return (
              <div
                key={`tech-stack-${stackIndex}`}
                className="tech-market-tile tech-market-tile--empty"
                role="listitem"
                aria-label={`Stack ${stackIndex + 1} empty`}
              />
            )
          }

          const cost = effectiveTechCost(tile.cost, discount, clampedReturn)
          const canAfford = currency >= cost

          return (
            <button
              key={`tech-stack-${stackIndex}`}
              type="button"
              role="listitem"
              className={[
                'tech-market-tile',
                canAfford ? 'tech-market-tile--affordable' : 'tech-market-tile--unaffordable',
              ]
                .filter(Boolean)
                .join(' ')}
              title={
                canAfford
                  ? `Acquire ${tile.name} for ${cost} ${currencyLabel}`
                  : `Cannot afford ${tile.name} (${cost} ${currencyLabel})`
              }
              disabled={!canAfford}
              onClick={() => beginAcquire(stackIndex)}
            >
              <img src={tile.image} alt={tile.name} className="tech-market-tile__img" draggable={false} />
              <span className="tech-market-tile__cost" aria-hidden="true">
                {cost}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TechMarketRow
