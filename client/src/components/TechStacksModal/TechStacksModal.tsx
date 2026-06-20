import React, { useMemo, useState } from 'react'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import { useGame } from '../GameContext/GameContext'
import { getTechTile } from '../../data/techTiles'
import type { TechTileId } from '../../data/techTiles'
import type { Player } from '../../types/GameTypes'
import { effectiveTechCost } from '../../utils/techTiles'
import './TechStacksModal.css'

interface TechStacksModalProps {
  isOpen: boolean
  onClose: () => void
  stacks: TechTileId[][]
  playerId: number
  players: Player[]
  /** Built-in discount from Acquire Tech reward (e.g. Tech Negotiation = 1). */
  acquireDiscount?: number
}

const TechStacksModal: React.FC<TechStacksModalProps> = ({
  isOpen,
  onClose,
  stacks,
  playerId,
  players,
  acquireDiscount = 0,
}) => {
  const { dispatch } = useGame()
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isOpen)
  const [negotiatorsReturned, setNegotiatorsReturned] = useState(0)

  const activePlayer = players.find(p => p.id === playerId)
  const negotiatorsAvailable = activePlayer?.negotiatorsOnIx ?? 0
  const playerSpice = activePlayer?.spice ?? 0

  const maxReturnable = useMemo(() => {
    const tops = stacks.map(stack => (stack[0] ? getTechTile(stack[0]) : undefined))
    const minCostAfterDiscount = tops.reduce((min, tile) => {
      if (!tile) return min
      const afterDiscount = Math.max(0, tile.cost - acquireDiscount)
      return Math.min(min, afterDiscount)
    }, Number.POSITIVE_INFINITY)
    if (!Number.isFinite(minCostAfterDiscount)) return 0
    return Math.min(negotiatorsAvailable, minCostAfterDiscount)
  }, [stacks, acquireDiscount, negotiatorsAvailable])

  if (!isOpen || waitForBoardTarget) return null

  const handleAcquire = (stackIndex: number, tileId: TechTileId, tileCost: number) => {
    dispatch({
      type: 'ACQUIRE_TECH',
      playerId,
      tileId,
      stackIndex,
      negotiatorsReturned,
      discount: 0,
    })
    setNegotiatorsReturned(0)
    onClose()
  }

  return portalNode(
    <div
      className={['tech-stacks-overlay', scopedClass].filter(Boolean).join(' ')}
      onClick={onClose}
    >
      <div className="tech-stacks-modal" onClick={event => event.stopPropagation()}>
        <div className="tech-stacks-modal__header">
          <h2>Technology market</h2>
          <button type="button" className="tech-stacks-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {acquireDiscount > 0 ? (
          <p className="tech-stacks-modal__discount">Acquire discount: −{acquireDiscount} spice</p>
        ) : null}

        {negotiatorsAvailable > 0 ? (
          <div className="tech-stacks-modal__negotiators">
            <span>Return negotiators (1 spice each):</span>
            <input
              type="number"
              min={0}
              max={maxReturnable}
              value={Math.min(negotiatorsReturned, maxReturnable)}
              onChange={event =>
                setNegotiatorsReturned(
                  Math.max(0, Math.min(maxReturnable, Number(event.target.value) || 0))
                )
              }
            />
            <span className="tech-stacks-modal__negotiators-total">({negotiatorsAvailable} on Ix)</span>
          </div>
        ) : null}

        <div className="tech-stacks-modal__columns">
          {stacks.map((stack, stackIndex) => {
            const faceUpId = stack[0]
            const tile = faceUpId ? getTechTile(faceUpId) : undefined
            const effectiveCost = tile
              ? effectiveTechCost(tile.cost, acquireDiscount, negotiatorsReturned)
              : 0
            const canAfford = tile ? playerSpice >= effectiveCost : false

            return (
              <div key={`stack-${stackIndex}`} className="tech-stacks-modal__column">
                <h3>Stack {stackIndex + 1}</h3>
                {tile ? (
                  <>
                    <img
                      className="tech-stacks-modal__tile-img"
                      src={tile.image}
                      alt={tile.name}
                      title={tile.description}
                      draggable={false}
                    />
                    <p className="tech-stacks-modal__tile-name">{tile.name}</p>
                    <p className="tech-stacks-modal__tile-cost">
                      {effectiveCost} spice
                      {effectiveCost !== tile.cost ? (
                        <span className="tech-stacks-modal__tile-cost-base"> ({tile.cost})</span>
                      ) : null}
                    </p>
                    <button
                      type="button"
                      className="tech-stacks-modal__acquire"
                      disabled={!canAfford}
                      onClick={() => handleAcquire(stackIndex, tile.id, tile.cost)}
                    >
                      Acquire
                    </button>
                  </>
                ) : (
                  <p className="tech-stacks-modal__empty">Empty</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="tech-stacks-modal__board-negotiators" aria-label="Negotiators on Ix by player">
          {players.map(player => (
            <span
              key={player.id}
              className={`tech-stacks-modal__player-negotiators player-${player.color}`}
              title={`${player.leader.name}: ${player.negotiatorsOnIx ?? 0} negotiators`}
            >
              {(player.negotiatorsOnIx ?? 0) > 0
                ? Array.from({ length: player.negotiatorsOnIx ?? 0 }, (_, index) => (
                    <span key={index} className="tech-stacks-modal__negotiator-square" aria-hidden="true" />
                  ))
                : <span className="tech-stacks-modal__negotiator-empty" aria-hidden="true" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TechStacksModal
