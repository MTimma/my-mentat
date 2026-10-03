import React, { useMemo, useState } from 'react'
import type { Card } from '../../types/GameTypes'
import CardSearch from '../CardSearch/CardSearch'
import { PickerModalShell } from '../BoardScopedModal'
import type { BoardDeckFace, BoardDeckPile } from '../../utils/boardDeckPiles'
import '../ImperiumRowSelect/ImperiumRowSelect.css'

interface BoardDecksModalProps {
  piles: BoardDeckPile[]
  onClose: () => void
}

function facesToCards(faces: BoardDeckFace[]): Card[] {
  return faces.map((face, index) => {
    const card: Card & { description?: string } = {
      id: index + 1,
      name: face.name,
      image: face.image ?? '',
      agentIcons: [],
      description: face.note,
    }
    return card
  })
}

const BoardDecksModal: React.FC<BoardDecksModalProps> = ({ piles, onClose }) => {
  const [pileId, setPileId] = useState(piles[0]?.id ?? null)
  const pile = piles.find(item => item.id === pileId) ?? piles[0]
  const cards = useMemo(() => (pile ? facesToCards(pile.cards) : []), [pile])

  const tabs = (
    <div className="card-search-pile-tabs" role="tablist" aria-label="Board decks and discards">
      {piles.map(item => {
        const active = item.id === pile?.id
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`card-search-pile-tab${active ? ' card-search-pile-tab--active' : ''}`}
            onClick={() => setPileId(item.id)}
          >
            {item.label}
            <span className="card-search-pile-tab-count" aria-hidden="true">
              {item.cards.length}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <PickerModalShell
      title={pile?.label ?? 'Board decks & discards'}
      onClose={onClose}
      closeOnOverlayClick
      className="board-decks-modal"
    >
      <CardSearch
        key={pile?.id ?? 'empty'}
        isOpen
        embedded
        browseOnly
        hideTitle
        cards={cards}
        onSelect={() => {}}
        onCancel={onClose}
        isRevealTurn={false}
        selectionCount={1}
        text={pile?.label ?? 'Board decks & discards'}
        belowGrid={tabs}
      />
    </PickerModalShell>
  )
}

export default BoardDecksModal
