import React, { useState } from 'react'
import { Card } from '../../types/GameTypes'
import { getLeaderIconPath, LEADER_NAMES } from '../../data/leaders'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import './ImperiumRow.css'

interface HelenaRemovedCard {
  cardId: number
  playerId: number
  card: Card
}

interface ImperiumRowProps {
  cards: Card[]
  canAcquire: boolean
  persuasion: number
  alCount: number
  smfCount: number
  onAcquireArrakisLiaison: () => void
  onAcquireSpiceMustFlow: () => void
  onAcquireCard: (cardId: number) => void
  helenaRemovedCard?: HelenaRemovedCard | null
  activePlayerId?: number
  /** Sandbox setup: row slots become click targets to pick all five cards. */
  sandboxSetup?: {
    onConfigure: () => void
    requiredCount: number
  }
}

type PreviewSelection =
  | { kind: 'helena' }
  | { kind: 'row'; cardId: number }
  | { kind: 'arrakis-liaison' }
  | { kind: 'spice-must-flow' }

const ImperiumRow: React.FC<ImperiumRowProps> = ({
  cards,
  canAcquire,
  persuasion,
  alCount,
  smfCount,
  onAcquireArrakisLiaison,
  onAcquireSpiceMustFlow,
  onAcquireCard,
  helenaRemovedCard,
  activePlayerId,
  sandboxSetup,
}) => {
  const [previewSelection, setPreviewSelection] = useState<PreviewSelection | null>(null)
  const helenaSlotData = helenaRemovedCard?.card ? helenaRemovedCard : null
  const helenaCanAcquire = Boolean(
    canAcquire && helenaSlotData && activePlayerId === helenaSlotData.playerId
  )
  const canAcquireHelenaCard = Boolean(
    helenaSlotData && helenaCanAcquire && Math.max(0, (helenaSlotData.card.cost ?? 0) - 1) <= persuasion
  )
  const canAcquireRowCard = (card: Card) => canAcquire && !(card.cost && card.cost > persuasion)
  const canAcquireArrakisLiaison = canAcquire && persuasion >= 2 && alCount > 0
  const canAcquireSpiceMustFlow = canAcquire && persuasion >= 9 && smfCount > 0

  const rowPreviewCard = previewSelection?.kind === 'row'
    ? cards.find(card => card.id === previewSelection.cardId)
    : undefined

  const preview =
    previewSelection?.kind === 'helena' && helenaSlotData
      ? {
          name: helenaSlotData.card.name,
          image: helenaSlotData.card.image,
          note: 'Helena discount: -1 Persuasion',
          disabled: !canAcquireHelenaCard,
          onAcquire: () => onAcquireCard(helenaSlotData.card.id),
        }
      : rowPreviewCard
        ? {
            name: rowPreviewCard.name,
            image: rowPreviewCard.image,
            disabled: !canAcquireRowCard(rowPreviewCard),
            onAcquire: () => onAcquireCard(rowPreviewCard.id),
          }
        : previewSelection?.kind === 'arrakis-liaison'
          ? {
              name: 'Arrakis Liaison',
              image: 'imperium_row/arrakis_liaison.avif',
              note: `Count: ${alCount}`,
              disabled: !canAcquireArrakisLiaison,
              onAcquire: onAcquireArrakisLiaison,
            }
          : previewSelection?.kind === 'spice-must-flow'
            ? {
                name: 'The Spice Must Flow',
                image: 'imperium_row/spice_must_flow.avif',
                note: `Count: ${smfCount}`,
                disabled: !canAcquireSpiceMustFlow,
                onAcquire: onAcquireSpiceMustFlow,
              }
            : null

  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(Boolean(preview))

  const handlePreviewKeyDown = (event: React.KeyboardEvent, selection: PreviewSelection) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setPreviewSelection(selection)
    }
  }

  const handleAcquirePreview = () => {
    if (!preview || preview.disabled) return
    preview.onAcquire()
    setPreviewSelection(null)
  }

  const sandboxRequiredCount = sandboxSetup?.requiredCount ?? 5
  const sandboxEmptySlots = sandboxSetup
    ? Math.max(0, sandboxRequiredCount - cards.length)
    : 0
  const sandboxRowLabel =
    cards.length === sandboxRequiredCount
      ? 'Change imperium row'
      : `Set imperium row (${cards.length}/${sandboxRequiredCount})`

  return (
    <div
      className={[
        'imperium-section',
        canAcquire ? 'imperium-section--acquire-mode' : '',
        sandboxSetup ? 'imperium-section--sandbox-setup' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="imperium-row-layout imperium-row-layout--single">
        <div className="imperium-row-strip no-buttons" aria-label="Imperium row">
          {sandboxSetup ? (
            <button
              type="button"
              className="imperium-row-sandbox-area"
              onClick={sandboxSetup.onConfigure}
              title={sandboxRowLabel}
              aria-label={sandboxRowLabel}
            >
              <div className="imperium-row-sandbox-slots" aria-hidden="true">
                {cards.map(card => (
                  <div key={card.id} className="imperium-card imperium-card--sandbox-slot imperium-card--sandbox-display">
                    <img src={card.image} alt="" className="card-image-ir" />
                  </div>
                ))}
                {Array.from({ length: sandboxEmptySlots }, (_, index) => (
                  <div
                    key={`sandbox-empty-${index}`}
                    className="imperium-card imperium-card--sandbox-slot imperium-card--sandbox-empty imperium-card--sandbox-display"
                  />
                ))}
              </div>
            </button>
          ) : null}
          {helenaSlotData && !sandboxSetup && (
            <div
              className={`imperium-card helena-card no-button ${canAcquireHelenaCard ? 'can-acquire' : ''}`}
              onClick={() => setPreviewSelection({ kind: 'helena' })}
              onKeyDown={(event) => handlePreviewKeyDown(event, { kind: 'helena' })}
              role="button"
              tabIndex={0}
              title={
                helenaCanAcquire
                  ? 'View card'
                  : 'Helena may acquire this card for 1 Persuasion less during her Reveal turn.'
              }
            >
              <div className="helena-card-image-wrapper">
                {getLeaderIconPath(LEADER_NAMES.HELENA_RICHESE) && (
                  <img
                    src={getLeaderIconPath(LEADER_NAMES.HELENA_RICHESE)!}
                    alt="Helena"
                    className="helena-head-corner-icon"
                  />
                )}
                <img
                  src={helenaSlotData.card.image}
                  alt={helenaSlotData.card.name}
                  className="card-image-ir"
                />
                <span className="helena-discount-badge">−1 Persuasion</span>
              </div>
            </div>
          )}
          {!sandboxSetup &&
            cards.map(card => (
              <div
                key={card.id}
                className={`imperium-card no-button ${canAcquireRowCard(card) ? 'can-acquire' : ''}`}
                onClick={() => setPreviewSelection({ kind: 'row', cardId: card.id })}
                onKeyDown={(event) => handlePreviewKeyDown(event, { kind: 'row', cardId: card.id })}
                role="button"
                tabIndex={0}
                title="View card"
              >
                <img src={card.image} alt={card.name} className="card-image-ir" />
              </div>
            ))}
          {!sandboxSetup && (
            <>
              <div className="imperium-row-divider" role="separator" aria-orientation="vertical" />
              <div
                className={`imperium-card fixed-card no-button ${canAcquireArrakisLiaison ? 'can-acquire' : ''}`}
                onClick={() => setPreviewSelection({ kind: 'arrakis-liaison' })}
                onKeyDown={(event) => handlePreviewKeyDown(event, { kind: 'arrakis-liaison' })}
                role="button"
                tabIndex={0}
                title="View Arrakis Liaison"
              >
                <img
                  src={'imperium_row/arrakis_liaison.avif'}
                  alt={'Arrakis Liaison'}
                  className="card-image-ir"
                />
              </div>
              <div
                className={`imperium-card fixed-card no-button ${canAcquireSpiceMustFlow ? 'can-acquire' : ''}`}
                onClick={() => setPreviewSelection({ kind: 'spice-must-flow' })}
                onKeyDown={(event) => handlePreviewKeyDown(event, { kind: 'spice-must-flow' })}
                role="button"
                tabIndex={0}
                title="View The Spice Must Flow"
              >
                <img
                  src={'imperium_row/spice_must_flow.avif'}
                  alt={'The Spice Must Flow'}
                  className="card-image-ir"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {preview && !waitForBoardTarget && portalNode(
        <div
          className={['imperium-preview-overlay', scopedClass].filter(Boolean).join(' ')}
          onClick={() => setPreviewSelection(null)}
        >
          <div
            className="imperium-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={preview.name}
            onClick={event => event.stopPropagation()}
          >
            <img
              src={preview.image}
              alt={preview.name}
              className="imperium-preview-image"
              draggable={false}
            />
            {preview.note && <div className="imperium-preview-note">{preview.note}</div>}
            <div className="imperium-preview-actions">
              <button
                type="button"
                className="imperium-preview-acquire-button"
                onClick={handleAcquirePreview}
                disabled={preview.disabled}
              >
                Acquire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImperiumRow