import { useState, type ReactNode } from 'react'
import { FactionType, Player } from '../../types/GameTypes'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import { GameState } from '../../types/GameTypes'
import { OptionalCostResourceKind } from '../../utils/influenceChoices'
import { getAnyFactionInfluenceLossIcon } from '../../utils/influenceDisplay'
import PlayerPlayAreaModal from '../PlayerPlayAreaModal/PlayerPlayAreaModal'
import './LeaderResourceStrip.css'

type CardPileKind = 'deck' | 'discard' | 'trash'

export type LeaderResourceStripInclude =
  | 'vp'
  | 'spice'
  | 'water'
  | 'solari'
  | 'troops'
  | 'hand'
  | 'deck'
  | 'discard'
  | 'trash'
  | 'influence'

const PILE_LABELS: Record<CardPileKind, string> = {
  deck: 'Deck',
  discard: 'Discard',
  trash: 'Trash',
}

interface LeaderResourceStripProps {
  player: Player
  gameState?: GameState
  leaderName?: string
  /** Omit leader name and tighten spacing (e.g. history banner). */
  compact?: boolean
  /** Smallest layout for board overlays (e.g. combat ring). */
  overlay?: boolean
  /** When set, only these items are shown (overrides the default full strip). */
  include?: LeaderResourceStripInclude[]
  /** When set, only these resources are shown (e.g. costs the player cannot pay). */
  onlyResources?: OptionalCostResourceKind[]
}

const ALL_FACTIONS: FactionType[] = [
  FactionType.EMPEROR,
  FactionType.SPACING_GUILD,
  FactionType.BENE_GESSERIT,
  FactionType.FREMEN,
]

const LeaderResourceStrip = ({
  player,
  gameState,
  leaderName,
  compact,
  overlay,
  include,
  onlyResources,
}: LeaderResourceStripProps) => {
  const [openPile, setOpenPile] = useState<CardPileKind | null>(null)

  const vp = gameState ? getTotalVictoryPoints(player, gameState) : player.victoryPoints
  const showItem = (kind: LeaderResourceStripInclude): boolean => {
    if (include) return include.includes(kind)
    if (onlyResources) {
      if (kind === 'vp' || kind === 'hand' || kind === 'deck' || kind === 'discard' || kind === 'trash') {
        return false
      }
      return onlyResources.includes(kind as OptionalCostResourceKind)
    }
    if (kind === 'influence') return false
    return true
  }

  const totalInfluence = gameState
    ? ALL_FACTIONS.reduce(
        (sum, f) => sum + (gameState.factionInfluence[f]?.[player.id] ?? 0),
        0
      )
    : 0

  if (onlyResources && onlyResources.length === 0) {
    return null
  }

  const pileCards =
    openPile === 'deck'
      ? player.deck
      : openPile === 'discard'
        ? player.discardPile
        : openPile === 'trash'
          ? player.trash
          : []

  const renderPileCounter = (
    kind: CardPileKind,
    title: string,
    count: number,
    content: ReactNode
  ) => (
    <button
      type="button"
      className="leader-resource-item leader-resource-item--clickable"
      title={`${title} – click to view cards`}
      aria-label={`${title}: ${count} cards. View all cards.`}
      onClick={() => setOpenPile(kind)}
    >
      {content}
      <span className="leader-resource-value">{count}</span>
    </button>
  )

  return (
    <>
    <div
      className={[
        'leader-resource-strip',
        compact ? 'leader-resource-strip--compact' : '',
        overlay ? 'leader-resource-strip--overlay' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={
        onlyResources
          ? `Insufficient resources: ${onlyResources.join(', ')}`
          : `${leaderName ?? player.leader.name} resources`
      }
    >
      {leaderName && !compact && <span className="leader-resource-strip-name">{leaderName}</span>}
      {showItem('vp') && (
        <span className="leader-resource-item" title="Victory points">
          <img src="/icon/vp.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{vp}</span>
        </span>
      )}
      {showItem('spice') && (
        <span className="leader-resource-item" title="Spice">
          <img src="/icon/spice.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.spice}</span>
        </span>
      )}
      {showItem('water') && (
        <span className="leader-resource-item" title="Water">
          <img src="/icon/water.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.water}</span>
        </span>
      )}
      {showItem('solari') && (
        <span className="leader-resource-item" title="Solari">
          <img src="/icon/solari.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.solari}</span>
        </span>
      )}
      {showItem('troops') && (
        <span className="leader-resource-item" title="Garrison troops">
          <img src="/icon/troop.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.troops}</span>
        </span>
      )}
      {showItem('hand') && (
        <span className="leader-resource-item" title="Cards in hand">
          <img src="/icon/draw.png" alt="" className="leader-resource-icon" />
          <span className="leader-resource-value">{player.handCount}</span>
        </span>
      )}
      {showItem('deck') &&
        renderPileCounter(
          'deck',
          'Deck',
          player.deck.length,
          <span className="leader-resource-abbr" aria-hidden="true">
            D
          </span>
        )}
      {showItem('discard') &&
        renderPileCounter(
          'discard',
          'Discard pile',
          player.discardPile.length,
          <span className="leader-resource-abbr" aria-hidden="true">
            Dc
          </span>
        )}
      {showItem('trash') &&
        renderPileCounter(
          'trash',
          'Trashed cards',
          player.trash.length,
          <img src="/icon/trash.png" alt="" className="leader-resource-icon" />
        )}
      {(onlyResources?.includes('influence') || showItem('influence')) && (
        <span className="leader-resource-item" title="Total faction influence">
          <img
            src={getAnyFactionInfluenceLossIcon()}
            alt=""
            className="leader-resource-icon"
          />
          <span className="leader-resource-value">{totalInfluence}</span>
        </span>
      )}
    </div>
    {openPile && (
      <PlayerPlayAreaModal
        player={player}
        isOpen={true}
        pileLabel={PILE_LABELS[openPile]}
        cards={pileCards}
        onClose={() => setOpenPile(null)}
      />
    )}
    </>
  )
}

export default LeaderResourceStrip
