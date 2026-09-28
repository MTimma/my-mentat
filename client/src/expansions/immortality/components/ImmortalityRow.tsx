import React, { useMemo, useState } from 'react'
import { useGame } from '../../../components/GameContext/gameContextState'
import { withImageZoomHint } from '../../../components/AltImagePreview/imageZoomHint'
import type { Card } from '../../../types/GameTypes'
import { buildTleilaxuPool } from '../../../catalog/runtime'
import { hasFirstGeneticMarker, nextResearchNodes } from '../researchTrack'
import BeneTleilaxBoardPanel from '../../../components/ImageBoard/BeneTleilaxBoardPanel'
import '../../../components/ImperiumRow/ImperiumRow.css'
import './ImmortalityRow.css'

const RECLAIMED_FORCES_NAME = 'Reclaimed Forces'
const PURCHASABLE_SLOT_COUNT = 2

interface ImmortalityRowProps {
  /** Sandbox setup: two empty slots open the Tleilaxu card picker. Reclaimed Forces stays hidden until play. */
  sandboxSetup?: {
    onConfigure: () => void
    requiredCount: number
  }
}

/**
 * Immortality Tleilaxu shop: two purchasable slots + Reclaimed Forces reserve,
 * mounted to the right of the Imperium Row at the same height.
 */
const ImmortalityRow: React.FC<ImmortalityRowProps> = ({ sandboxSetup }) => {
  const { gameState, dispatch } = useGame()
  const [refillOpen, setRefillOpen] = useState(false)
  const [deckTopChoice, setDeckTopChoice] = useState<Card | null>(null)

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

  const canPlaceOnDeck = activePlayer ? hasFirstGeneticMarker(activePlayer.researchNodeId) : false

  const acquire = (card: Card, acquireToTop?: boolean) => {
    if (!activePlayer || !canAcquire(card)) return
    dispatch({
      type: 'ACQUIRE_TLEILAXU',
      playerId: activePlayer.id,
      cardId: card.id,
      acquireToTop,
    })
  }

  const requestAcquire = (card: Card) => {
    if (!activePlayer || !canAcquire(card)) return
    if (card.name !== RECLAIMED_FORCES_NAME && canPlaceOnDeck) {
      setDeckTopChoice(card)
      return
    }
    acquire(card)
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

  if (sandboxSetup) {
    const requiredCount = sandboxSetup.requiredCount
    const emptySlots = Math.max(0, requiredCount - purchasableRow.length)
    const sandboxRowLabel =
      purchasableRow.length === requiredCount
        ? 'Change Tleilaxu row'
        : `Set Tleilaxu row (${purchasableRow.length}/${requiredCount})`

    return (
      <div
        className="immortality-row imperium-section immortality-row--sandbox imperium-section--sandbox-setup"
        data-testid="immortality-row"
      >
        <div className="imperium-row-layout imperium-row-layout--single">
          <div className="imperium-row-strip no-buttons immortality-row__strip" aria-label="Bene Tleilax row">
            <button
              type="button"
              className="imperium-row-sandbox-area"
              onClick={sandboxSetup.onConfigure}
              title={withImageZoomHint(sandboxRowLabel)}
              aria-label={sandboxRowLabel}
            >
              <div className="imperium-row-sandbox-slots" aria-hidden="true">
                {purchasableRow.slice(0, requiredCount).map(card => (
                  <div
                    key={card.id}
                    className="imperium-card imperium-card--sandbox-slot imperium-card--sandbox-display"
                  >
                    <img src={card.image} alt="" className="card-image-ir" data-preview-src={card.image} />
                  </div>
                ))}
                {Array.from({ length: emptySlots }, (_, index) => (
                  <div
                    key={`sandbox-empty-${index}`}
                    className="imperium-card imperium-card--sandbox-slot imperium-card--sandbox-empty imperium-card--sandbox-display"
                  />
                ))}
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

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
          title={withImageZoomHint(`${card.name} — ${card.cost ?? 0} specimen`)}
          onClick={() => requestAcquire(card)}
          disabled={!canAcquire(card)}
        >
          <img
            src={card.image}
            alt={card.name}
            className="card-image-ir"
            data-preview-src={card.image}
          />
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
              title={withImageZoomHint(
                `${reclaimedForces.name} — ${reclaimedForces.cost ?? 0} specimen (permanent reserve)`
              )}
              onClick={() => acquire(reclaimedForces)}
              disabled={!canAcquire(reclaimedForces)}
            >
              <img
                src={reclaimedForces.image}
                alt={reclaimedForces.name}
                className="card-image-ir"
                data-preview-src={reclaimedForces.image}
              />
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
                  title={withImageZoomHint(card.name)}
                  onClick={() => pickRefill(card)}
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    className="immortality-row__card-img"
                    data-preview-src={card.image}
                  />
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

      {pendingResearch && activePlayer ? (
        <div className="immortality-modal" role="dialog" aria-label="">
          <div className="immortality-modal__panel immortality-modal__panel--board">
            <BeneTleilaxBoardPanel
              players={gameState.players}
              currentPlayerId={activePlayer.id}
              tleilaxuTrackBonusSpice={gameState.tleilaxuTrackBonusSpice}
              tleilaxuTrackBonusClaimed={gameState.tleilaxuTrackBonusClaimed}
              choiceNodeIds={branchOptions}
              onResearchNodeSelect={(_playerId, nodeId) => chooseBranch(nodeId)}
            />
          </div>
        </div>
      ) : null}

      {deckTopChoice ? (
        <div className="immortality-modal" role="dialog" aria-label="Where to place the Tleilaxu card">
          <div className="immortality-modal__panel">
            <div className="immortality-modal__title">{deckTopChoice.name}</div>
            <div className="immortality-modal__actions">
              <button
                type="button"
                className="immortality-modal__option immortality-modal__option--wide"
                onClick={() => {
                  acquire(deckTopChoice, true)
                  setDeckTopChoice(null)
                }}
              >
                Top of deck
              </button>
              <button
                type="button"
                className="immortality-modal__option immortality-modal__option--wide"
                onClick={() => {
                  acquire(deckTopChoice, false)
                  setDeckTopChoice(null)
                }}
              >
                Discard pile
              </button>
            </div>
            <button type="button" className="immortality-modal__cancel" onClick={() => setDeckTopChoice(null)}>
              Cancel
            </button>
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
