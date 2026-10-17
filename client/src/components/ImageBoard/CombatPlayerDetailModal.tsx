import React, { useLayoutEffect, useState, type RefObject } from 'react'
import { GameState, Player } from '../../types/GameTypes'
import { getLeaderImage } from '../../data/leaders'
import { getTechTile } from '../../data/techTiles'
import { listedPlayerName } from '../../utils/playerName'
import AgentIcon from '../AgentIcon/AgentIcon'
import TessiaLeaderOverlays from '../TessiaLeaderOverlays/TessiaLeaderOverlays'
import CardPileGrid from '../CardPileGrid/CardPileGrid'
import TechTileFlipBadge from '../TechTileFlipBadge/TechTileFlipBadge'
import { withImageZoomHint } from '../AltImagePreview/imageZoomHint'
import { BirdseyeLaneScrollbar, useScrollOverflowFades } from './CombatSeatTurnChrome'
import { BoardScopedModal } from '../BoardScopedModal'
import './CombatPlayerDetailModal.css'

type DetailTab = 'deck' | 'discard' | 'trash' | 'tech'

const TAB_LABELS: Record<DetailTab, string> = {
  deck: 'Hand & Deck',
  discard: 'Discard',
  trash: 'Trash',
  tech: 'Tech',
}

const EMPTY_LABELS: Record<DetailTab, string> = {
  deck: 'No cards in hand or deck',
  discard: 'No cards in discard',
  trash: 'No cards in trash',
  tech: 'No tech tiles',
}

interface CombatPlayerDetailModalProps {
  player: Player
  gameState?: GameState
  containerRef?: RefObject<HTMLElement | null>
  onClose: () => void
}

const CombatPlayerDetailModal: React.FC<CombatPlayerDetailModalProps> = ({
  player,
  gameState,
  containerRef,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('deck')
  const leaderImage = getLeaderImage(player.leader.name)
  const playerName = listedPlayerName(player)
  const riseOfIx = gameState?.expansions?.riseOfIx === true
  const tab: DetailTab = activeTab === 'tech' && !riseOfIx ? 'deck' : activeTab
  const ownedTech = player.tech ?? []

  const pileCards =
    tab === 'deck' ? player.deck : tab === 'discard' ? player.discardPile : tab === 'trash' ? player.trash : []

  const tabs: Array<{ id: DetailTab; count: number }> = [
    { id: 'deck', count: player.deck.length },
    { id: 'discard', count: player.discardPile.length },
    { id: 'trash', count: player.trash.length },
  ]
  if (riseOfIx) tabs.push({ id: 'tech', count: ownedTech.length })

  const contentKey =
    tab === 'tech'
      ? `tech:${player.id}:${ownedTech.map(tile => `${tile.id}:${tile.faceUp ? 1 : 0}`).join(',')}`
      : `${tab}:${player.id}:${pileCards.map(card => card.id).join(',')}`

  const { scrollRef, overflowStart, overflowEnd, scrollable, thumb } = useScrollOverflowFades(
    true,
    contentKey
  )

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = 0
  }, [contentKey, scrollRef])

  return (
    <BoardScopedModal
      isOpen
      overlayClassName={[
        'combat-player-detail-overlay',
        containerRef ? 'combat-player-detail-overlay--board-scoped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      containerRef={containerRef}
      onClose={onClose}
      closeOnOverlayClick
    >
      <div
        className={`combat-player-detail-modal combat-player-detail-modal--${player.color}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="combat-player-detail-title"
      >
        <header className="combat-player-detail-header">
          <h3 id="combat-player-detail-title" className="combat-player-detail-title">
            <span className="combat-player-detail-title-name">{playerName}</span>
            <AgentIcon
              playerId={player.id}
              color={player.color}
              className="combat-player-detail-title-agent"
            />
          </h3>
          <button
            type="button"
            className="combat-player-detail-close"
            onClick={onClose}
            aria-label="Close player details"
          >
            ×
          </button>
        </header>

        <div className="combat-player-detail-body">
          {leaderImage ? (
            <div className="combat-player-detail-leader">
              <div className="combat-player-detail-leader-frame">
                <img
                  src={leaderImage}
                  alt={player.leader.name}
                  className="combat-player-detail-leader-img"
                  draggable={false}
                  data-preview-src={leaderImage}
                />
                <TessiaLeaderOverlays leader={player.leader} />
              </div>
            </div>
          ) : null}

          <div className="combat-player-detail-sheet">
          <div className="combat-player-detail-tabs" role="tablist" aria-label="Player cards">
            {tabs.map(({ id, count }) => {
              const selected = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`combat-player-detail-tab-${id}`}
                  className={[
                    'combat-player-detail-tab',
                    selected ? 'combat-player-detail-tab--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-selected={selected}
                  aria-controls="combat-player-detail-panel"
                  onClick={() => setActiveTab(id)}
                >
                  <span className="combat-player-detail-tab-label">{TAB_LABELS[id]}</span>
                  <span className="combat-player-detail-tab-count">{count}</span>
                </button>
              )
            })}
          </div>

          <div
            className={[
              'combat-player-detail-panel',
              overflowStart ? 'combat-player-detail-panel--overflow-start' : '',
              overflowEnd ? 'combat-player-detail-panel--overflow-end' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              id="combat-player-detail-panel"
              role="tabpanel"
              aria-labelledby={`combat-player-detail-tab-${tab}`}
              className="combat-player-detail-pile-scroll birdseye-lane-scroll"
              ref={scrollRef}
            >
              {tab === 'tech' ? (
                ownedTech.length === 0 ? (
                  <p className="card-pile-grid__empty">{EMPTY_LABELS.tech}</p>
                ) : (
                  <div className="combat-player-detail-tech-grid">
                    {ownedTech.map((owned, index) => {
                      const tile = getTechTile(owned.id)
                      const name = tile?.name ?? owned.id
                      return (
                        <div key={`${owned.id}-${index}`} className="combat-player-detail-tech-tile">
                          {owned.faceUp && tile ? (
                            <img
                              src={tile.image}
                              alt={name}
                              title={withImageZoomHint(name)}
                              className="combat-player-detail-tech-tile__img"
                              draggable={false}
                              data-preview-src={tile.image}
                            />
                          ) : (
                            <TechTileFlipBadge image={tile?.image} alt={name} size="inline" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                <CardPileGrid cards={pileCards} emptyLabel={EMPTY_LABELS[tab]} />
              )}
            </div>
            <BirdseyeLaneScrollbar visible={scrollable} thumb={thumb} />
          </div>
          </div>
        </div>
      </div>
    </BoardScopedModal>
  )
}

export default CombatPlayerDetailModal
