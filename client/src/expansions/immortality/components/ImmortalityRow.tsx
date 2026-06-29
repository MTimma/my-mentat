import React, { useMemo, useState } from 'react'
import { useGame } from '../../../components/GameContext/gameContextState'
import type { Card } from '../../../types/GameTypes'
import { buildTleilaxuPool } from '../../../catalog/runtime'
import { nextResearchNodes, researchNode } from '../researchTrack'
import '../../../components/ImperiumRow/ImperiumRow.css'
import './ImmortalityRow.css'

const RECLAIMED_FORCES_NAME = 'Reclaimed Forces'
const PURCHASABLE_SLOT_COUNT = 2

/** Compact reward label for branch/track tooltips (logging tool — approximate). */
function rewardLabel(reward: Record<string, unknown> | undefined): string {
  if (!reward) return '—'
  return Object.entries(reward)
    .map(([k, v]) => `${k}:${typeof v === 'number' ? v : '✓'}`)
    .join(', ')
}

/**
 * Immortality Tleilaxu shop: two purchasable slots + Reclaimed Forces reserve,
 * mounted to the right of the Imperium Row at the same height.
 */
const ImmortalityRow: React.FC = () => {
  const { gameState, dispatch } = useGame()
  const [refillOpen, setRefillOpen] = useState(false)

  const reclaimedForces = useMemo(
    () => buildTleilaxuPool().find(card => card.name === RECLAIMED_FORCES_NAME),
    []
  )

  if (!gameState.expansions?.immortality) return null

  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId)
  const row = gameState.tleilaxuRow ?? []
  const purchasableRow = row.filter(card => card.name !== RECLAIMED_FORCES_NAME)
  const rowDeck = gameState.tleilaxuRowDeck ?? []
  const specimens = activePlayer?.specimens ?? 0

  const pendingRefill = Boolean(gameState.pendingTleilaxuRowReplacement)
  const pendingResearch =
    gameState.pendingResearchAdvance && activePlayer
      ? gameState.pendingResearchAdvance.playerId === activePlayer.id
      : false

  const canAcquire = (card: Card): boolean => {
    if (!activePlayer) return false
    return (card.cost ?? 0) <= specimens
  }

  const acquire = (card: Card) => {
    if (!activePlayer || !canAcquire(card)) return
    dispatch({ type: 'ACQUIRE_TLEILAXU', playerId: activePlayer.id, cardId: card.id })
  }

  const pickRefill = (card: Card) => {
    const nextRowIds = [...purchasableRow.map(c => c.id), card.id]
    dispatch({ type: 'SET_TLEILAXU_ROW', cardIds: nextRowIds })
    setRefillOpen(false)
  }

  const chooseBranch = (nodeId: string) => {
    if (!activePlayer) return
    dispatch({ type: 'ADVANCE_RESEARCH', playerId: activePlayer.id, nodeId })
  }

  const branchOptions = activePlayer ? nextResearchNodes(activePlayer.researchNodeId) : []

  const renderPurchasableSlot = (card: Card | undefined, slotIndex: number) => {
    if (card) {
      return (
        <button
          key={card.id}
          type="button"
          className={[
            'imperium-card',
            'no-button',
            'immortality-row__card',
            canAcquire(card) ? 'can-acquire' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title={`${card.name} — ${card.cost ?? 0} specimen`}
          onClick={() => acquire(card)}
          disabled={!canAcquire(card)}
        >
          <img src={card.image} alt={card.name} className="card-image-ir" />
          <span className="immortality-row__cost">
            <img src="icon/specimen.png" alt="" className="immortality-row__icon" />
            {card.cost ?? 0}
          </span>
        </button>
      )
    }

    if (rowDeck.length > 0) {
      return (
        <button
          key={`refill-${slotIndex}`}
          type="button"
          className="imperium-card no-button immortality-row__refill"
          onClick={() => setRefillOpen(true)}
          title="Refill the Tleilaxu Row from the pool"
        >
          +
        </button>
      )
    }

    return (
      <div
        key={`empty-${slotIndex}`}
        className="imperium-card no-button immortality-row__empty"
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="immortality-row imperium-section" data-testid="immortality-row">
      <div className="imperium-row-layout imperium-row-layout--single">
        <div className="imperium-row-strip no-buttons immortality-row__strip" aria-label="Bene Tleilax row">
          {Array.from({ length: PURCHASABLE_SLOT_COUNT }, (_, index) =>
            renderPurchasableSlot(purchasableRow[index], index)
          )}

          {reclaimedForces ? (
            <button
              type="button"
              className={[
                'imperium-card',
                'fixed-card',
                'no-button',
                'immortality-row__card',
                'immortality-row__card--reserve',
                canAcquire(reclaimedForces) ? 'can-acquire' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={`${reclaimedForces.name} — ${reclaimedForces.cost ?? 0} specimen (permanent reserve)`}
              onClick={() => acquire(reclaimedForces)}
              disabled={!canAcquire(reclaimedForces)}
            >
              <img src={reclaimedForces.image} alt={reclaimedForces.name} className="card-image-ir" />
              <span className="immortality-row__cost">
                <img src="icon/specimen.png" alt="" className="immortality-row__icon" />
                {reclaimedForces.cost ?? 0}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {refillOpen ? (
        <div className="immortality-modal" role="dialog" aria-label="Refill Tleilaxu Row">
          <div className="immortality-modal__panel">
            <div className="immortality-modal__title">Choose a card to add to the Tleilaxu Row</div>
            <div className="immortality-modal__grid">
              {rowDeck.map(card => (
                <button
                  key={card.id}
                  type="button"
                  className="immortality-modal__option"
                  onClick={() => pickRefill(card)}
                >
                  <img src={card.image} alt={card.name} className="immortality-row__card-img" />
                  <span>{card.name}</span>
                </button>
              ))}
            </div>
            <button type="button" className="immortality-modal__cancel" onClick={() => setRefillOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {pendingResearch ? (
        <div className="immortality-modal" role="dialog" aria-label="Choose research branch">
          <div className="immortality-modal__panel">
            <div className="immortality-modal__title">Choose research branch</div>
            <div className="immortality-modal__grid">
              {branchOptions.map(nodeId => {
                const node = researchNode(nodeId)
                return (
                  <button
                    key={nodeId}
                    type="button"
                    className="immortality-modal__option immortality-modal__option--branch"
                    onClick={() => chooseBranch(nodeId)}
                  >
                    <span className="immortality-modal__branch-id">{nodeId}</span>
                    <span className="immortality-modal__branch-bonus">
                      {rewardLabel(node.bonus as Record<string, unknown> | undefined)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {pendingRefill && !refillOpen ? (
        <div className="immortality-row__hint">Tleilaxu Row slot empty — tap +.</div>
      ) : null}
    </div>
  )
}

export default ImmortalityRow
