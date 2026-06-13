import React, { useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { FactionType, GameState, Player } from '../../types/GameTypes'
import { getLeaderImage } from '../../data/leaders'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import PlayerPlayAreaModal from '../PlayerPlayAreaModal/PlayerPlayAreaModal'
import './CombatPlayerDetailModal.css'

type CardPileKind = 'deck' | 'discard' | 'trash'

const PILE_LABELS: Record<CardPileKind, string> = {
  deck: 'Deck',
  discard: 'Discard',
  trash: 'Trash',
}

const FACTION_INFLUENCE_FIELDS: Array<{ faction: FactionType; label: string }> = [
  { faction: FactionType.EMPEROR, label: 'Emperor' },
  { faction: FactionType.SPACING_GUILD, label: 'Guild' },
  { faction: FactionType.BENE_GESSERIT, label: 'Bene G.' },
  { faction: FactionType.FREMEN, label: 'Fremen' },
]

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
  const [openPile, setOpenPile] = useState<CardPileKind | null>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const leaderImage = getLeaderImage(player.leader.name)
  const vp = gameState ? getTotalVictoryPoints(player, gameState) : player.victoryPoints

  useLayoutEffect(() => {
    setPortalTarget(containerRef?.current ?? null)
  }, [containerRef])

  const pileCards =
    openPile === 'deck'
      ? player.deck
      : openPile === 'discard'
        ? player.discardPile
        : openPile === 'trash'
          ? player.trash
          : []

  const stats: Array<{ icon?: string; label: string; value: number }> = [
    { icon: '/icon/vp.png', label: 'Victory points', value: vp },
    { icon: '/icon/spice.png', label: 'Spice', value: player.spice },
    { icon: '/icon/solari.png', label: 'Solari', value: player.solari },
    { icon: '/icon/water.png', label: 'Water', value: player.water },
    { icon: '/icon/troop.png', label: 'Garrison', value: player.troops },
    { icon: '/icon/draw.png', label: 'Hand', value: player.handCount },
    { icon: '/icon/intrigue.png', label: 'Intrigue', value: player.intrigueCount },
  ]

  const overlay = (
    <>
      <div
        className={[
          'dialog-overlay',
          'combat-player-detail-overlay',
          portalTarget ? 'combat-player-detail-overlay--board-scoped' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onClose}
      >
        <div
          className={`combat-player-detail-modal combat-player-detail-modal--${player.color}`}
          onClick={event => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="combat-player-detail-title"
        >
          <header className="combat-player-detail-header">
            <h3 id="combat-player-detail-title">{player.leader.name}</h3>
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
                <img
                  src={leaderImage}
                  alt={player.leader.name}
                  className="combat-player-detail-leader-img"
                  draggable={false}
                />
              </div>
            ) : null}

            <div className="combat-player-detail-footer">
              {gameState ? (
                <div className="combat-player-detail-influence" aria-label="Faction influence">
                  <span className="combat-player-detail-influence-heading">Faction influence</span>
                  <div className="combat-player-detail-influence-grid">
                    {FACTION_INFLUENCE_FIELDS.map(({ faction, label }) => {
                      const value = gameState.factionInfluence[faction]?.[player.id] ?? 0
                      return (
                        <div
                          key={faction}
                          className="combat-player-detail-influence-item"
                          title={`${label} influence`}
                        >
                          <img
                            src={`/icon/${faction}.png`}
                            alt=""
                            className="combat-player-detail-stat-icon"
                            aria-hidden="true"
                          />
                          <span className="combat-player-detail-stat-value">{value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="combat-player-detail-stats" aria-label="Player resources">
                {stats.map(stat => (
                  <div key={stat.label} className="combat-player-detail-stat" title={stat.label}>
                    {stat.icon ? (
                      <img src={stat.icon} alt="" className="combat-player-detail-stat-icon" aria-hidden="true" />
                    ) : null}
                    <span className="combat-player-detail-stat-value">{stat.value}</span>
                  </div>
                ))}
              </div>

              <div className="combat-player-detail-piles">
                {(['deck', 'discard', 'trash'] as const).map(kind => {
                  const count =
                    kind === 'deck'
                      ? player.deck.length
                      : kind === 'discard'
                        ? player.discardPile.length
                        : player.trash.length
                  return (
                    <button
                      key={kind}
                      type="button"
                      className="combat-player-detail-pile-btn"
                      onClick={() => setOpenPile(kind)}
                    >
                      <span className="combat-player-detail-pile-label">{PILE_LABELS[kind]}</span>
                      <span className="combat-player-detail-pile-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {openPile && (
        <PlayerPlayAreaModal
          player={player}
          isOpen={true}
          pileLabel={PILE_LABELS[openPile]}
          cards={pileCards}
          containerRef={containerRef}
          onClose={() => setOpenPile(null)}
        />
      )}
    </>
  )

  if (typeof document === 'undefined') return overlay
  if (!portalTarget) return null
  return createPortal(overlay, portalTarget)
}

export default CombatPlayerDetailModal
