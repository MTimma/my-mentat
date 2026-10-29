import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Card, Gain, GameState, IntrigueCard, Player, PlayerColor } from '../../types/GameTypes'
import type { TechTileId } from '../../data/techTiles'
import TurnGainsDisplay from '../TurnGainsDisplay/TurnGainsDisplay'
import PlayerTechModal from '../PlayerTechModal/PlayerTechModal'
import AgentIcon from '../AgentIcon/AgentIcon'
import RevealCardsIcon from '../RevealCardsIcon/RevealCardsIcon'
import CombatDeployDock from './CombatDeployDock'
import type {
  CombatDreadnoughtDeployProps,
  CombatSpecimenDeployProps,
  CombatTroopDeployProps,
} from './CombatAreaCluster'
import { playAreaCardHasPendingEffectHighlight } from '../../utils/playAreaDisplay'
import { excludeRetreatAllowanceGains } from '../../utils/turnGainsDisplay'
import { withImageZoomHint } from '../AltImagePreview/imageZoomHint'
import './CombatSeatTurnChrome.css'

export type BirdseyeSeatDeployProps = {
  troopDeploy?: CombatTroopDeployProps
  dreadnoughtDeploy?: CombatDreadnoughtDeployProps
  specimenDeploy?: CombatSpecimenDeployProps
}

export type BirdseyeSeatMode = 'mobile3b' | 'desktop6'

export interface BirdseyeSeatActions {
  playDisabled: boolean
  playTitle?: string
  revealDisabled: boolean
  revealTitle?: string
  intrigueDisabled: boolean
  intrigueTitle?: string
  intrigueCount: number
  techCount: number
  techDisabled: boolean
  techTitle?: string
  showTech: boolean
  showFamilyAtomics?: boolean
  familyAtomicsUsed?: boolean
  familyAtomicsDisabled?: boolean
  onUseFamilyAtomics?: () => void
  /** When true, End Turn / Pass Combat is available. Desktop swaps Play/Reveal; the rim keeps both. */
  showEndTurn: boolean
  endTurnDisabled: boolean
  endTurnTitle?: string
  /** Button label for the End Turn slot (e.g. Pass Combat / Continue during combat). */
  endTurnLabel?: string
  /** Hide Play/Reveal (conflict-reward Continue circle). */
  hidePlayReveal?: boolean
  agents: number
  handCount: number
  /** Selected card, agent not placed — same rule as TurnControls Play→Change. */
  isChangingSelectedCard?: boolean
  selectedCardImage?: string
  selectedCardName?: string
  onPlay: () => void
  onReveal: () => void
  onIntrigue: () => void
  onEndTurn: () => void
  onActivateTech?: (playerId: number, tileId: TechTileId) => void
}

function stop(e: React.SyntheticEvent) {
  e.stopPropagation()
}

/** Test of Humanity — discard or lose a deployed troop, under that leader's turn buttons. */
export function TestOfHumanityChoice({
  canDiscard,
  canLose,
  onDiscard,
  onLoseTroop,
}: {
  canDiscard: boolean
  canLose: boolean
  onDiscard: () => void
  onLoseTroop: () => void
}) {
  return (
    <div
      className="birdseye-seat__primary test-of-humanity-choice"
      onClick={stop}
      role="group"
      aria-label="Test of Humanity"
    >
      <button
        type="button"
        className="birdseye-seat-btn"
        disabled={!canDiscard}
        title={canDiscard ? 'Discard a card' : 'No cards to discard'}
        onClick={event => {
          stop(event)
          if (canDiscard) onDiscard()
        }}
      >
        <span className="birdseye-seat-btn__label">Discard</span>
      </button>
      <button
        type="button"
        className="birdseye-seat-btn"
        disabled={!canLose}
        title={canLose ? 'Lose one deployed troop' : 'No deployed troops'}
        onClick={event => {
          stop(event)
          if (canLose) onLoseTroop()
        }}
      >
        <span className="birdseye-seat-btn__label">Lose troop</span>
      </button>
    </div>
  )
}

/** Host for TurnControls-ported reward/choice chips (in the gains column above the leader). */
export function BirdseyeInteractionsHost({
  hostRef,
}: {
  hostRef?: (el: HTMLDivElement | null) => void
}) {
  return (
    <div
      className="birdseye-seat__interactions"
      ref={hostRef}
      onClick={stop}
      aria-label="Pending effect resolutions"
    />
  )
}

/** Play / Reveal or End Turn — rim strip (mobile) or per-column stack (desktop). */
export function BirdseyePrimaryControls({
  actions,
  player,
  keepPlayReveal = false,
}: {
  actions: BirdseyeSeatActions
  player: Player
  /** Rim keeps Play/Reveal and adds End Turn beside them. Desktop still swaps. */
  keepPlayReveal?: boolean
}) {
  const isChangingSelectedCard = Boolean(actions.isChangingSelectedCard)
  const actionLabel = isChangingSelectedCard ? 'Change' : 'Play'
  const showCardThumb = Boolean(isChangingSelectedCard && actions.selectedCardImage)
  const showEndTurnOnly =
    Boolean(actions.hidePlayReveal) || (actions.showEndTurn && !keepPlayReveal)

  return (
    <div className="birdseye-seat__primary" onClick={stop}>
      {showEndTurnOnly ? (
        <button
          type="button"
          className="birdseye-seat-btn birdseye-seat-btn--end-turn"
          onClick={e => {
            stop(e)
            actions.onEndTurn()
          }}
          disabled={actions.endTurnDisabled}
          title={actions.endTurnTitle}
        >
          {actions.endTurnLabel ?? 'End Turn'}
        </button>
      ) : (
        <>
          <button
            type="button"
            className={[
              'birdseye-seat-btn birdseye-seat-btn--play',
              showCardThumb ? 'birdseye-seat-btn--has-card' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={e => {
              stop(e)
              actions.onPlay()
            }}
            disabled={actions.playDisabled}
            title={
              showCardThumb && actions.selectedCardName
                ? actions.selectedCardName
                : actions.playTitle
            }
            aria-label={`${actionLabel} card`}
          >
            <span className="birdseye-seat-btn__label">{actionLabel}</span>
            <span className="birdseye-seat-btn__agent" aria-hidden="true">
              <AgentIcon
                playerId={player.id}
                color={player.color}
                className="birdseye-seat-btn__agent-icon"
              />
            </span>
            {showCardThumb ? (
              <span className="birdseye-seat-btn__card-thumb" aria-hidden="true">
                <img
                  src={actions.selectedCardImage}
                  alt=""
                  draggable={false}
                />
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="birdseye-seat-btn birdseye-seat-btn--reveal"
            onClick={e => {
              stop(e)
              actions.onReveal()
            }}
            disabled={actions.revealDisabled}
            title={actions.revealTitle}
            aria-label={`Reveal hand with ${actions.handCount} cards`}
          >
            <RevealCardsIcon className="birdseye-seat-btn__cards" />
            <span className="birdseye-seat-btn__label">Reveal</span>
            <span className="birdseye-seat-btn__hand-count">{actions.handCount}</span>
          </button>
        </>
      )}
    </div>
  )
}

/** Active-seat troop / dread / specimen deploy — under End Turn / intrigue / tech. */
export function BirdseyeSeatDeployControls({
  player,
  troopDeploy,
  dreadnoughtDeploy,
  specimenDeploy,
}: {
  player: Player
} & BirdseyeSeatDeployProps) {
  if (!troopDeploy && !dreadnoughtDeploy && !specimenDeploy) return null
  return (
    <div className="birdseye-seat__deploy" onClick={stop} aria-label="Combat deploy controls">
      <CombatDeployDock
        troopDeploy={troopDeploy}
        dreadnoughtDeploy={dreadnoughtDeploy}
        specimenDeploy={specimenDeploy}
        activePlayerId={player.id}
        activePlayerColor={player.color}
        className="birdseye-seat__deploy-dock"
      />
    </div>
  )
}

/** Intrigue + Tech with badges. Optional Deploy toggle (rim only). */
export function BirdseyeUtilControls({
  actions,
  techOpen,
  onToggleTech,
  showDeploy = false,
  deployOpen = false,
  onToggleDeploy,
}: {
  actions: BirdseyeSeatActions
  techOpen: boolean
  onToggleTech: () => void
  showDeploy?: boolean
  deployOpen?: boolean
  onToggleDeploy?: () => void
}) {
  return (
    <div
      className={[
        'birdseye-seat__utils',
        actions.showFamilyAtomics && actions.showTech ? 'birdseye-seat__utils--with-atomics' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={stop}
    >
      <button
        type="button"
        className="birdseye-seat-btn birdseye-seat-btn--intrigue"
        onClick={e => {
          stop(e)
          actions.onIntrigue()
        }}
        disabled={actions.intrigueDisabled}
        title={actions.intrigueTitle}
        aria-label={`Play intrigue. ${actions.intrigueCount} available.`}
      >
        <img src="/icon/intrigue.png" alt="" />
        <span className="birdseye-seat-btn__badge">{actions.intrigueCount}</span>
      </button>
      {actions.showTech ? (
        <button
          type="button"
          className="birdseye-seat-btn birdseye-seat-btn--tech"
          onClick={e => {
            stop(e)
            onToggleTech()
          }}
          disabled={actions.techDisabled}
          title={actions.techTitle}
          aria-label={`Tech tiles. ${actions.techCount} owned.`}
          aria-expanded={techOpen}
        >
          <img src="/icon/tech.png" alt="" />
          <span className="birdseye-seat-btn__badge">{actions.techCount}</span>
        </button>
      ) : null}
      {actions.showFamilyAtomics ? (
        <button
          type="button"
          className="birdseye-seat-btn birdseye-seat-btn--atomics"
          onClick={e => {
            stop(e)
            actions.onUseFamilyAtomics?.()
          }}
          disabled={actions.familyAtomicsDisabled}
          title={
            actions.familyAtomicsUsed
              ? 'Family Atomics already used this game'
              : 'Family Atomics: refresh the Imperium Row (once per game)'
          }
          aria-label={
            actions.familyAtomicsUsed
              ? 'Family Atomics already used this game'
              : 'Family Atomics: refresh the Imperium Row (once per game)'
          }
        >
          <img src="/icon/atomic.png" alt="" />
        </button>
      ) : null}
      {showDeploy && onToggleDeploy ? (
        <button
          type="button"
          className="birdseye-seat-btn birdseye-seat-btn--deploy"
          onClick={e => {
            stop(e)
            onToggleDeploy()
          }}
          aria-label="Deploy troops"
          aria-expanded={deployOpen}
        >
          <img src="/icon/troop.png" alt="" />
          <span className="birdseye-seat-btn__label">Deploy</span>
        </button>
      ) : null}
    </div>
  )
}

export function BirdseyeTechPanel({
  player,
  gameState,
  actions,
  isHistoryView,
  onClose,
}: {
  player: Player
  gameState: GameState
  actions: BirdseyeSeatActions
  isHistoryView?: boolean
  onClose: () => void
}) {
  return (
    <PlayerTechModal
      isOpen
      onClose={onClose}
      gameState={gameState}
      player={player}
      onActivateTech={
        actions.onActivateTech
          ? (playerId, tileId) => {
              actions.onActivateTech?.(playerId, tileId)
              onClose()
            }
          : undefined
      }
      isHistoryView={isHistoryView}
    />
  )
}

/**
 * Idle band between the square board and the 88px faces.
 * Invented name `BirdseyeIdleBand`. Empty leftover, or tech/deploy sheet. No prose.
 */
export function BirdseyeIdleBand({
  sheet,
}: {
  sheet?: React.ReactNode
}) {
  return (
    <div className="birdseye-idle-band" data-marker="birdseye-idle-band">
      {sheet ? (
        <div className="birdseye-idle-band__sheet">{sheet}</div>
      ) : (
        <div className="birdseye-idle-band__fill" />
      )}
    </div>
  )
}

type ScrollBindRef = ((el: HTMLDivElement | null) => void) & {
  current: HTMLDivElement | null
}

export function useScrollOverflowFades(enabled: boolean, measureKey: string) {
  const [overflowStart, setOverflowStart] = useState(false)
  const [overflowEnd, setOverflowEnd] = useState(false)
  const [thumb, setThumb] = useState({ topPct: 0, heightPct: 100 })
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  // Callback ref so measurement rebinds when a portal moves the scroller.
  const scrollRef = useMemo(() => {
    const bind = ((el: HTMLDivElement | null) => {
      bind.current = el
      setNode(prev => (prev === el ? prev : el))
    }) as ScrollBindRef
    bind.current = null
    return bind
  }, [])

  useLayoutEffect(() => {
    if (!enabled || !node) {
      setOverflowStart(false)
      setOverflowEnd(false)
      setThumb({ topPct: 0, heightPct: 100 })
      return
    }
    const el = node

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const overflowPx = scrollHeight - clientHeight
      const canScroll = overflowPx > 1
      setOverflowStart(canScroll && scrollTop > 1)
      setOverflowEnd(canScroll && scrollTop + clientHeight < scrollHeight - 1)
      const heightPct =
        scrollHeight <= 0 ? 100 : Math.min(100, Math.max(12, (clientHeight / scrollHeight) * 100))
      const maxTop = 100 - heightPct
      const topPct = !canScroll || overflowPx <= 0 ? 0 : (scrollTop / overflowPx) * maxTop
      setThumb({ topPct, heightPct })
    }

    const observer = new ResizeObserver(update)
    const observeTree = () => {
      observer.observe(el)
      el.querySelectorAll('*').forEach(node => observer.observe(node))
    }
    observeTree()
    update()
    const mutations = new MutationObserver(() => {
      observeTree()
      update()
    })
    mutations.observe(el, { childList: true, subtree: true })
    el.addEventListener('scroll', update, { passive: true })
    el.addEventListener('load', update, true)
    return () => {
      observer.disconnect()
      mutations.disconnect()
      el.removeEventListener('scroll', update)
      el.removeEventListener('load', update, true)
    }
  }, [enabled, measureKey, node])

  return {
    scrollRef,
    overflowStart,
    overflowEnd,
    scrollable: overflowStart || overflowEnd,
    thumb,
  }
}

/** Always-on thumb. Native overlay bars hide and only paint on the active pane. */
export function BirdseyeLaneScrollbar({
  visible,
  thumb,
}: {
  visible: boolean
  thumb: { topPct: number; heightPct: number }
}) {
  if (!visible) return null
  return (
    <div className="birdseye-lane-scroll-rail" aria-hidden>
      <div
        className="birdseye-lane-scroll-thumb"
        style={{ top: `${thumb.topPct}%`, height: `${thumb.heightPct}%` }}
      />
    </div>
  )
}

export function BirdseyeSeatGains({
  playerId,
  playerColor,
  gains,
  troopsDeployed = 0,
  dreadnoughtsDeployed = 0,
  troopsRetreated = 0,
  showTotals = false,
  totalsOnly = false,
  revealPooledTotals = false,
  showSourceTitles = true,
  compactConflictTitles = false,
  resolveCard,
}: {
  playerId: number
  playerColor?: PlayerColor
  gains: Gain[]
  troopsDeployed?: number
  dreadnoughtsDeployed?: number
  troopsRetreated?: number
  showTotals?: boolean
  totalsOnly?: boolean
  revealPooledTotals?: boolean
  showSourceTitles?: boolean
  /** Conflict rewards: title is 1st/2nd/3rd. Intrigue card names stay off this strip. */
  compactConflictTitles?: boolean
  resolveCard?: (cardId: number, name: string) => Card | undefined
}) {
  const displayGains = excludeRetreatAllowanceGains(gains)
  const hasGains =
    displayGains.length > 0 || troopsDeployed > 0 || dreadnoughtsDeployed > 0 || troopsRetreated > 0
  const { scrollRef, overflowStart, overflowEnd, scrollable, thumb } = useScrollOverflowFades(
    hasGains,
    `${displayGains.length}:${troopsDeployed}:${dreadnoughtsDeployed}:${troopsRetreated}`
  )

  if (!hasGains) return null
  return (
    <div
      className={[
        'birdseye-seat-gains',
        overflowStart ? 'birdseye-seat-gains--overflow-start' : '',
        overflowEnd ? 'birdseye-seat-gains--overflow-end' : '',
        scrollable ? 'birdseye-seat-gains--scrollable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="birdseye-seat-gains__scroll birdseye-lane-scroll" ref={scrollRef}>
        <TurnGainsDisplay
          gains={displayGains}
          playerId={playerId}
          playerColor={playerColor}
          showSourceTitles={showSourceTitles && !totalsOnly}
          compactConflictTitles={compactConflictTitles}
          showTotals={showTotals}
          totalsOnly={totalsOnly}
          revealPooledTotals={revealPooledTotals}
          omitPositiveSign={revealPooledTotals}
          inlineTrash
          resolveCard={resolveCard}
          troopsDeployedToConflict={troopsDeployed}
          dreadnoughtsDeployedToConflict={dreadnoughtsDeployed}
          troopsRetreatedFromConflict={troopsRetreated}
          className="birdseye-seat-gains__display"
        />
      </div>
      <BirdseyeLaneScrollbar visible={scrollable} thumb={thumb} />
    </div>
  )
}

/** Active-seat action chrome under that column's play-area cards. */
export function BirdseyeDesktopControls({
  player,
  actions,
  gameState,
  isHistoryView,
  troopDeploy,
  dreadnoughtDeploy,
  specimenDeploy,
}: {
  player: Player
  actions: BirdseyeSeatActions
  gameState?: GameState
  isHistoryView?: boolean
} & BirdseyeSeatDeployProps) {
  const [techOpen, setTechOpen] = useState(false)
  return (
    <div className="birdseye-seat__controls-row">
      <div className="birdseye-seat__controls-stack">
        <BirdseyePrimaryControls actions={actions} player={player} />
        <BirdseyeUtilControls
          actions={actions}
          techOpen={techOpen}
          onToggleTech={() => setTechOpen(o => !o)}
        />
        <BirdseyeSeatDeployControls
          player={player}
          troopDeploy={troopDeploy}
          dreadnoughtDeploy={dreadnoughtDeploy}
          specimenDeploy={specimenDeploy}
        />
        {techOpen && gameState && actions.showTech ? (
          <BirdseyeTechPanel
            player={player}
            gameState={gameState}
            actions={actions}
            isHistoryView={isHistoryView}
            onClose={() => setTechOpen(false)}
          />
        ) : null}
      </div>
    </div>
  )
}

function PlayAreaThumb({
  card,
  className,
  title,
  style,
  effectsHostKey,
}: {
  card: Card
  className: string
  title: string
  style?: React.CSSProperties
  /** TurnControls portals mandatory choice chips into this host (on top of the card). */
  effectsHostKey?: string
}) {
  return (
    <div className={className} title={card.image ? withImageZoomHint(title) : title} style={style}>
      {card.image ? (
        <img src={card.image} alt={card.name} draggable={false} data-preview-src={card.image} />
      ) : (
        <span className="birdseye-seat-play-area__card-name">{card.name}</span>
      )}
      {effectsHostKey ? (
        <div
          className="birdseye-seat-play-area__card-effects"
          data-birdseye-card-effects={effectsHostKey}
          onClick={stop}
          aria-label={`Pending effects for ${card.name}`}
        />
      ) : null}
    </div>
  )
}

/** Compact in-play cards under each desktop leader seat. */
export function BirdseyeSeatPlayArea({
  cards,
  isActive = false,
  revealedCardIds,
  pendingEffectCardIds,
  playedIntrigues = [],
  activeIntrigues = [],
  pendingIntrigueIds,
  interactionsHostRef,
}: {
  cards: Card[]
  isActive?: boolean
  revealedCardIds?: number[]
  pendingEffectCardIds?: ReadonlySet<number> | number[]
  playedIntrigues?: IntrigueCard[]
  activeIntrigues?: IntrigueCard[]
  pendingIntrigueIds?: ReadonlySet<number> | number[]
  /** Pending chips overlay this lane, from the action buttons up to the resources. */
  interactionsHostRef?: (el: HTMLDivElement | null) => void
}) {
  const names = cards.map(card => card.name).filter(Boolean)
  const revealedIds = new Set(revealedCardIds ?? [])
  const pendingIds =
    pendingEffectCardIds instanceof Set
      ? pendingEffectCardIds
      : new Set(pendingEffectCardIds ?? [])
  const pendingIntrigueIdSet =
    pendingIntrigueIds instanceof Set
      ? pendingIntrigueIds
      : new Set(pendingIntrigueIds ?? [])
  const revealedCount = cards.filter(card => revealedIds.has(card.id)).length
  let revealedOrder = 0
  const hasCards = cards.length > 0
  const hasIntrigues = playedIntrigues.length > 0 || activeIntrigues.length > 0
  const { scrollRef, overflowStart, overflowEnd, scrollable, thumb } = useScrollOverflowFades(
    hasCards || hasIntrigues,
    `${cards.length}:${playedIntrigues.length}:${activeIntrigues.length}:${pendingIds.size}:${pendingIntrigueIdSet.size}`
  )
  const ariaLabel = [
    names.length > 0 && `Play area: ${names.join(', ')}`,
    playedIntrigues.length > 0 &&
      `Played intrigue: ${playedIntrigues.map(card => card.name).join(', ')}`,
    activeIntrigues.length > 0 &&
      `Active intrigue: ${activeIntrigues.map(card => card.name).join(', ')}`,
  ]
    .filter(Boolean)
    .join('. ')

  const renderIntrigue = (card: IntrigueCard, kind: 'played' | 'active') => {
    const hasPendingEffects = playAreaCardHasPendingEffectHighlight(
      card.id,
      pendingIntrigueIdSet,
      isActive
    )
    const isActiveIntrigue = kind === 'active'
    return (
      <PlayAreaThumb
        key={`${kind}-intrigue-${card.id}`}
        card={card}
        className={[
          'birdseye-seat-play-area__card',
          'birdseye-seat-play-area__card--intrigue',
          isActiveIntrigue ? 'birdseye-seat-play-area__card--active-intrigue' : '',
          hasPendingEffects ? 'turn-card-frame--has-effects' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={
          hasPendingEffects
            ? `Resolve pending effects for ${card.name}`
            : isActiveIntrigue
              ? `${card.name} (active this round)`
              : card.name
        }
        style={hasPendingEffects ? { zIndex: 8 } : undefined}
        effectsHostKey={hasPendingEffects ? `intrigue:${card.id}` : undefined}
      />
    )
  }

  return (
    <div
      className={[
        'birdseye-seat-play-area',
        isActive ? 'birdseye-seat-play-area--active' : '',
        !hasCards && !hasIntrigues ? 'birdseye-seat-play-area--empty' : '',
        overflowStart ? 'birdseye-seat-play-area--overflow-start' : '',
        overflowEnd ? 'birdseye-seat-play-area--overflow-end' : '',
        scrollable ? 'birdseye-seat-play-area--scrollable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel || 'Empty play area'}
    >
      {!hasCards && !hasIntrigues ? (
        <div className="birdseye-seat-play-area__well" />
      ) : (
        <div className="birdseye-seat-play-area__stack birdseye-lane-scroll" ref={scrollRef}>
          {hasCards ? (
            <div className="birdseye-seat-play-area__cards">
              {cards.map(card => {
                const isRevealed = revealedIds.has(card.id)
                const hasPendingEffects = playAreaCardHasPendingEffectHighlight(
                  card.id,
                  pendingIds,
                  isActive
                )
                const revealZ = isRevealed ? revealedCount - revealedOrder++ : undefined
                return (
                  <PlayAreaThumb
                    key={card.id}
                    card={card}
                    className={[
                      'birdseye-seat-play-area__card',
                      isRevealed ? 'birdseye-seat-play-area__card--revealed' : '',
                      hasPendingEffects ? 'turn-card-frame--has-effects' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={
                      hasPendingEffects
                        ? `Resolve pending effects for ${card.name}`
                        : card.name
                    }
                    style={
                      hasPendingEffects
                        ? { zIndex: 8 }
                        : revealZ != null
                          ? { zIndex: revealZ }
                          : undefined
                    }
                    effectsHostKey={hasPendingEffects ? `card:${card.id}` : undefined}
                  />
                )
              })}
            </div>
          ) : null}
          {hasIntrigues ? (
            <div
              className="birdseye-seat-play-area__intrigues"
              role="group"
              aria-label="Played and active intrigue"
            >
              {playedIntrigues.map(card => renderIntrigue(card, 'played'))}
              {activeIntrigues.map(card => renderIntrigue(card, 'active'))}
            </div>
          ) : null}
        </div>
      )}
      <BirdseyeLaneScrollbar visible={scrollable} thumb={thumb} />
      {interactionsHostRef ? (
        <BirdseyeInteractionsHost hostRef={interactionsHostRef} />
      ) : null}
    </div>
  )
}

/** Mobile chrome strip: Play/Reveal + Intr/Tech + deploy under the stack. */
export function BirdseyePortraitOverlay({
  player,
  actions,
  gameState,
  isHistoryView,
  troopDeploy,
  dreadnoughtDeploy,
  specimenDeploy,
}: {
  player: Player
  actions: BirdseyeSeatActions
  gameState?: GameState
  isHistoryView?: boolean
} & BirdseyeSeatDeployProps) {
  const [techOpen, setTechOpen] = useState(false)
  return (
    <>
      <div className="birdseye-seat__overlay-actions">
        <div className="birdseye-seat__overlay-row">
          <div className="birdseye-seat__overlay-core">
            <BirdseyePrimaryControls actions={actions} player={player} />
            <BirdseyeUtilControls
              actions={actions}
              techOpen={techOpen}
              onToggleTech={() => setTechOpen(o => !o)}
            />
            <BirdseyeSeatDeployControls
              player={player}
              troopDeploy={troopDeploy}
              dreadnoughtDeploy={dreadnoughtDeploy}
              specimenDeploy={specimenDeploy}
            />
            {techOpen && gameState && actions.showTech ? (
              <BirdseyeTechPanel
                player={player}
                gameState={gameState}
                actions={actions}
                isHistoryView={isHistoryView}
                onClose={() => setTechOpen(false)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * One shared mobile action bar (not copied per seat).
 * Invented name `BirdseyeRimBar`. Sizes 48px / 44px / 8px are from the HUD critique, not a spec.
 * Tech/deploy sheets live in `BirdseyeIdleBand`, not on this 48px rail.
 */
export function BirdseyeRimBar({
  player,
  actions,
  techOpen,
  onToggleTech,
  showDeploy = false,
  deployOpen = false,
  onToggleDeploy,
  hostRef,
}: {
  player: Player
  actions: BirdseyeSeatActions
  techOpen: boolean
  onToggleTech: () => void
  showDeploy?: boolean
  deployOpen?: boolean
  onToggleDeploy?: () => void
  hostRef?: (el: HTMLDivElement | null) => void
}) {
  return (
    <div className="birdseye-rim" role="toolbar" aria-label="Turn actions">
      <div className="birdseye-rim__actions">
        <BirdseyePrimaryControls
          actions={actions}
          player={player}
          keepPlayReveal={!actions.hidePlayReveal}
        />
        {actions.showEndTurn && !actions.hidePlayReveal ? (
          <button
            type="button"
            className="birdseye-seat-btn birdseye-seat-btn--end-turn"
            onClick={e => {
              stop(e)
              actions.onEndTurn()
            }}
            disabled={actions.endTurnDisabled}
            title={actions.endTurnTitle}
          >
            {actions.endTurnLabel ?? 'End Turn'}
          </button>
        ) : null}
        <BirdseyeUtilControls
          actions={actions}
          techOpen={techOpen}
          onToggleTech={onToggleTech}
          showDeploy={showDeploy}
          deployOpen={deployOpen}
          onToggleDeploy={onToggleDeploy}
        />
      </div>
      <BirdseyeInteractionsHost hostRef={hostRef} />
    </div>
  )
}
