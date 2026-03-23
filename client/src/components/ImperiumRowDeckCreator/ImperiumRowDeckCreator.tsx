import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../../types/GameTypes'
import { ALL_IMPERIUM_ROW_CARDS, buildImperiumDeck, IMPERIUM_ROW_DECK } from '../../data/cards'
import CardSearch from '../CardSearch/CardSearch'
import './ImperiumRowDeckCreator.css'

const IMPERIUM_ID_FLOOR = 2000

const cloneCardWithNewId = (template: Card, id: number): Card => {
  const copy = JSON.parse(JSON.stringify(template)) as Card
  copy.id = id
  return copy
}

const nextDeckId = (deck: Card[]): number =>
  Math.max(IMPERIUM_ID_FLOOR - 1, ...deck.map(c => c.id)) + 1

export type ImperiumDeckTemplateId = 'base' | 'empty'

interface ImperiumRowDeckCreatorProps {
  deck: Card[]
  onDeckChange: (deck: Card[]) => void
}

const sortCatalog = (cards: Card[]): Card[] =>
  [...cards].sort((a, b) => a.name.localeCompare(b.name))

const ImperiumRowDeckCreator: React.FC<ImperiumRowDeckCreatorProps> = ({
  deck,
  onDeckChange,
}) => {
  const [phase, setPhase] = useState<'template' | 'edit'>(() =>
    deck.length === 0 ? 'template' : 'edit'
  )
  const [showAddModal, setShowAddModal] = useState(false)
  const [addCopies, setAddCopies] = useState(1)

  const catalogSorted = useMemo(() => sortCatalog(ALL_IMPERIUM_ROW_CARDS), [])

  const groupedDeck = useMemo(() => {
    const map = new Map<string, Card[]>()
    for (const c of deck) {
      const list = map.get(c.name) ?? []
      list.push(c)
      map.set(c.name, list)
    }
    return [...map.entries()]
      .map(([name, instances]) => ({ name, instances }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [deck])

  const loadTemplate = useCallback(
    (id: ImperiumDeckTemplateId) => {
      if (id === 'base') {
        onDeckChange(buildImperiumDeck())
      } else {
        onDeckChange([])
      }
      setPhase('edit')
    },
    [onDeckChange]
  )

  const handleBackToTemplates = () => {
    if (deck.length > 0) {
      const ok = window.confirm(
        'Switch templates? Your current Imperium deck will be replaced when you pick a new starting option.'
      )
      if (!ok) return
    }
    setPhase('template')
  }

  const removeInstance = (cardId: number) => {
    onDeckChange(deck.filter(c => c.id !== cardId))
  }

  const removeGroup = (name: string) => {
    onDeckChange(deck.filter(c => c.name !== name))
  }

  const appendCopies = (template: Card, count: number) => {
    if (count < 1) return
    let id = nextDeckId(deck)
    const additions: Card[] = []
    for (let i = 0; i < count; i++) {
      additions.push(cloneCardWithNewId(template, id))
      id += 1
    }
    onDeckChange([...deck, ...additions])
    setShowAddModal(false)
    setAddCopies(1)
  }

  useEffect(() => {
    if (!showAddModal) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showAddModal])

  const addModalCopiesControl = (
    <div className="imperium-deck-creator-copies" aria-label="Copies to add">
      <span className="imperium-deck-creator-copies-label">Copies</span>
      <div className="imperium-deck-creator-copies-stepper">
        <button
          type="button"
          className="imperium-deck-creator-stepper-btn"
          onClick={() => setAddCopies(c => Math.max(1, c - 1))}
          aria-label="Decrease copies"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={99}
          value={addCopies}
          onChange={e => {
            const v = Number(e.target.value)
            if (Number.isNaN(v)) return
            setAddCopies(Math.min(99, Math.max(1, v)))
          }}
          className="imperium-deck-creator-copies-input"
          aria-label="Number of copies"
        />
        <button
          type="button"
          className="imperium-deck-creator-stepper-btn"
          onClick={() => setAddCopies(c => Math.min(99, c + 1))}
          aria-label="Increase copies"
        >
          +
        </button>
      </div>
    </div>
  )

  return (
    <div className="imperium-deck-creator">
      <AnimatePresence mode="wait">
        {phase === 'template' ? (
          <motion.div
            key="template"
            className="imperium-deck-creator-templates"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="imperium-deck-creator-heading">Imperium row deck</h2>
            <p className="imperium-deck-creator-lead">
              Choose a starting point. You can add or remove cards afterward.
            </p>
            <div className="imperium-deck-creator-template-grid">
              <button
                type="button"
                className="imperium-deck-creator-template-card"
                onClick={() => loadTemplate('base')}
              >
                <span className="imperium-deck-creator-template-title">Base game deck</span>
                <span className="imperium-deck-creator-template-desc">
                  Full official Imperium deck ({IMPERIUM_ROW_DECK.length} cards)
                </span>
              </button>
              <button
                type="button"
                className="imperium-deck-creator-template-card imperium-deck-creator-template-card-alt"
                onClick={() => loadTemplate('empty')}
              >
                <span className="imperium-deck-creator-template-title">Empty deck</span>
                <span className="imperium-deck-creator-template-desc">
                  Build from scratch using the card search
                </span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            className="imperium-deck-creator-editor"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="imperium-deck-creator-editor-header">
              <div>
                <h2 className="imperium-deck-creator-heading">Your Imperium deck</h2>
                <p className="imperium-deck-creator-count">{deck.length} cards total</p>
              </div>
              <div className="imperium-deck-creator-editor-actions">
                <button
                  type="button"
                  className="imperium-deck-creator-text-btn"
                  onClick={handleBackToTemplates}
                >
                  Change template
                </button>
                <button
                  type="button"
                  className="imperium-deck-creator-primary-btn"
                  onClick={() => {
                    setAddCopies(1)
                    setShowAddModal(true)
                  }}
                >
                  Add cards
                </button>
              </div>
            </div>

            <div className="imperium-deck-creator-list" role="list">
              {groupedDeck.length === 0 ? (
                <p className="imperium-deck-creator-empty">
                  No cards yet. Use <strong>Add cards</strong> to search the Imperium library.
                </p>
              ) : (
                groupedDeck.map(({ name, instances }) => (
                  <div key={name} className="imperium-deck-creator-row" role="listitem">
                    <div className="imperium-deck-creator-row-thumb">
                      {instances[0].image ? (
                        <img src={instances[0].image} alt="" className="imperium-deck-creator-thumb-img" />
                      ) : (
                        <div className="imperium-deck-creator-thumb-fallback">{name.slice(0, 1)}</div>
                      )}
                    </div>
                    <div className="imperium-deck-creator-row-info">
                      <span className="imperium-deck-creator-row-name">{name}</span>
                      {typeof instances[0].cost === 'number' && (
                        <span className="imperium-deck-creator-row-cost">Cost {instances[0].cost}</span>
                      )}
                    </div>
                    <div className="imperium-deck-creator-row-qty" aria-label={`${instances.length} copies`}>
                      ×{instances.length}
                    </div>
                    <div className="imperium-deck-creator-row-btns">
                      <button
                        type="button"
                        className="imperium-deck-creator-row-btn"
                        onClick={() => removeInstance(instances[instances.length - 1].id)}
                        title="Remove one copy"
                      >
                        −1
                      </button>
                      <button
                        type="button"
                        className="imperium-deck-creator-row-btn imperium-deck-creator-row-btn-danger"
                        onClick={() => removeGroup(name)}
                        title="Remove all copies"
                      >
                        All
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAddModal && (
        <div className="imperium-deck-creator-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="imperium-add-title">
          <div className="imperium-deck-creator-modal">
            <header className="imperium-deck-creator-modal-header">
              <h2 id="imperium-add-title">Add Imperium cards</h2>
              <button
                type="button"
                className="imperium-deck-creator-modal-close"
                onClick={() => {
                  setShowAddModal(false)
                  setAddCopies(1)
                }}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <p className="imperium-deck-creator-modal-hint">
              Select one card, set copies, then confirm.
            </p>
            <div className="imperium-deck-creator-modal-search">
              <CardSearch
                isOpen={true}
                cards={catalogSorted}
                onSelect={selected => {
                  if (selected.length === 1) {
                    appendCopies(selected[0], addCopies)
                  }
                }}
                onCancel={() => {
                  setShowAddModal(false)
                  setAddCopies(1)
                }}
                isRevealTurn={true}
                selectionCount={1}
                text="Choose a card"
                hideTitle={true}
                cancelButtonText="Close"
                confirmAdornment={addModalCopiesControl}
                slotBetweenCardsAndSearch={<div className="imperium-deck-creator-search-slot" aria-hidden />}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImperiumRowDeckCreator
