import React, { useState } from 'react'
import type { Card } from '../../../types/GameTypes'
import { PickerModalShell } from '../../../components/BoardScopedModal'
import { withImageZoomHint } from '../../../components/AltImagePreview/imageZoomHint'
import './ImperiumRowDiscardPile.css'

interface ImperiumRowDiscardPileProps {
  cards: Card[]
}

/** Face-up stack of Imperium Row cards removed by Family Atomics. */
const ImperiumRowDiscardPile: React.FC<ImperiumRowDiscardPileProps> = ({ cards }) => {
  const [open, setOpen] = useState(false)
  if (cards.length === 0) return null

  const top = cards[cards.length - 1]
  const title = `Imperium row discard (${cards.length})`

  return (
    <>
      <button
        type="button"
        className="imperium-row-discard"
        onClick={() => setOpen(true)}
        title={withImageZoomHint(title)}
        aria-label={title}
      >
        <img src={top.image} alt="" className="imperium-row-discard__face" />
        <span className="imperium-row-discard__count">{cards.length}</span>
      </button>
      {open ? (
        <PickerModalShell
          title="Imperium row discard"
          countLabel={`${cards.length} cards`}
          onClose={() => setOpen(false)}
          closeOnOverlayClick
        >
          <div className="imperium-row-discard__grid">
            {[...cards].reverse().map(card => (
              <img
                key={card.id}
                src={card.image}
                alt={card.name}
                title={withImageZoomHint(card.name)}
                className="imperium-row-discard__card"
                data-preview-src={card.image}
              />
            ))}
          </div>
          <button type="button" className="imperium-row-discard__close" onClick={() => setOpen(false)}>
            Close
          </button>
        </PickerModalShell>
      ) : null}
    </>
  )
}

export default ImperiumRowDiscardPile
