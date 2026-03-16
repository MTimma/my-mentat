import React, { useEffect, useMemo, useState } from 'react'
import { Card, PlayerSetup } from '../../types/GameTypes'
import CardSearch from '../CardSearch/CardSearch'
import { buildSetupImperiumDeck } from '../../services/starterDeckSetup'
import './StarterDeckEditor.css'

interface StarterDeckEditorProps {
  playerSetups: PlayerSetup[]
  onPlayerDeckChange: (playerIndex: number, deck: Card[]) => void
}

const sortCards = (cards: Card[]): Card[] =>
  [...cards].sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name)
    return nameCompare !== 0 ? nameCompare : a.id - b.id
  })

const StarterDeckEditor: React.FC<StarterDeckEditorProps> = ({ playerSetups, onPlayerDeckChange }) => {
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null)
  const [selectedCards, setSelectedCards] = useState<Card[]>([])

  useEffect(() => {
    if (editingPlayerIndex === null) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [editingPlayerIndex])

  const sharedImperiumDeck = useMemo(
    () => buildSetupImperiumDeck(playerSetups.map(playerSetup => playerSetup.deck)),
    [playerSetups]
  )

  const editingPlayer = editingPlayerIndex === null ? null : playerSetups[editingPlayerIndex]

  const availableCards = useMemo(() => {
    if (!editingPlayer) return []
    return sortCards([...editingPlayer.deck, ...sharedImperiumDeck])
  }, [editingPlayer, sharedImperiumDeck])

  const previewCards = selectedCards

  const handleOpenEditor = (playerIndex: number) => {
    setEditingPlayerIndex(playerIndex)
    setSelectedCards(playerSetups[playerIndex].deck)
  }

  const handleConfirm = (deck: Card[]) => {
    if (editingPlayerIndex === null) return
    onPlayerDeckChange(editingPlayerIndex, deck)
    setEditingPlayerIndex(null)
    setSelectedCards([])
  }

  const handleCancel = () => {
    setEditingPlayerIndex(null)
    setSelectedCards([])
  }

  return (
    <div className="starter-deck-editor">
      <p className="starter-deck-editor-note">
        Cards assigned to a player starter deck are removed from the shared Imperium deck before the game starts.
      </p>

      <div className="starter-deck-editor-list">
        {playerSetups.map((playerSetup, index) => (
          <div key={playerSetup.playerNumber} className="starter-deck-editor-row">
            <div className="starter-deck-editor-info">
              <h3>Player {index + 1} - {playerSetup.leader.name}</h3>
              <p>{playerSetup.deck.length} cards in starter deck</p>
              <div className="starter-deck-editor-chip-list">
                {playerSetup.deck.slice(0, 4).map(card => (
                  <span key={card.id} className="starter-deck-editor-chip">
                    {card.name}
                  </span>
                ))}
                {playerSetup.deck.length > 4 && (
                  <span className="starter-deck-editor-chip starter-deck-editor-chip-muted">
                    +{playerSetup.deck.length - 4} more
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="starter-deck-editor-button"
              onClick={() => handleOpenEditor(index)}
            >
              Edit starter deck
            </button>
          </div>
        ))}
      </div>

      {editingPlayer && (
        <div className="starter-deck-editor-overlay">
          <div className="starter-deck-editor-dialog">
            <header className="starter-deck-editor-header">
              <h2>Edit Player {editingPlayer.playerNumber} Starter Deck</h2>
              <p>
                Select exactly {editingPlayer.deck.length} cards. Available cards include this player&apos;s current deck and every
                unclaimed Imperium deck card.
              </p>
              <div className="starter-deck-editor-count">
                Selected {selectedCards.length} / {editingPlayer.deck.length}
              </div>
            </header>

            <div className="starter-deck-editor-search">
              <CardSearch
                isOpen={true}
                cards={availableCards}
                onSelect={handleConfirm}
                onCancel={handleCancel}
                isRevealTurn={true}
                selectionCount={editingPlayer.deck.length}
                text={`Edit Player ${editingPlayer.playerNumber} starter deck`}
                onSelectionChange={setSelectedCards}
                hideTitle={true}
                initialSelectedCards={editingPlayer.deck}
                cancelButtonText="Cancel"
                slotBetweenCardsAndSearch={
                  <div className="starter-deck-editor-preview">
                    {previewCards.map(card => (
                      <div key={card.id} className="starter-deck-editor-preview-slot" title={card.name}>
                        {card.image && (
                          <img
                            src={card.image}
                            alt={card.name}
                            className="starter-deck-editor-preview-image"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StarterDeckEditor
