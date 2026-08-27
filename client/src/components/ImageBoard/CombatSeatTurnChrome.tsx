import React, { useLayoutEffect, useRef, useState } from 'react'
import type { Card, Gain, GameState, Player } from '../../types/GameTypes'
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
  /** When true, End Turn is available. Desktop swaps Play/Reveal; the rim keeps both. */
  showEndTurn: boolean
  endTurnDisabled: boolean
  endTurnTitle?: string
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

/** Host for TurnControls-ported reward/choice chips (full-width bar under End Turn + leader + gains). */
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

/** Play / Reveal or End Turn — strip above portrait (mobile) or hang left (desktop). */
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
  const showEndTurnOnly = actions.showEndTurn && !keepPlayReveal

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
          End Turn
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
    <div className="birdseye-seat__utils" onClick={stop}>
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

function useScrollOverflowFades(enabled: boolean, measureKey: string) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflowStart, setOverflowStart] = useState(false)
  const [overflowEnd, setOverflowEnd] = useState(false)

  useLayoutEffect(() => {
    if (!enabled) {
      setOverflowStart(false)
      setOverflowEnd(false)
      return
    }
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      setOverflowStart(scrollTop > 1)
      setOverflowEnd(scrollTop + clientHeight < scrollHeight - 1)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    const child = el.firstElementChild
    if (child) observer.observe(child)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [enabled, measureKey])

  return { scrollRef, overflowStart, overflowEnd }
}

export function BirdseyeSeatGains({
  playerId,
  gains,
  troopsDeployed = 0,
  troopsRetreated = 0,
  showTotals = false,
  totalsOnly = false,
  showSourceTitles = true,
  resolveCard,
}: {
  playerId: number
  gains: Gain[]
  troopsDeployed?: number
  troopsRetreated?: number
  showTotals?: boolean
  totalsOnly?: boolean
  showSourceTitles?: boolean
  resolveCard?: (cardId: number, name: string) => Card | undefined
}) {
  const hasGains = gains.length > 0 || troopsDeployed > 0 || troopsRetreated > 0
  const { scrollRef, overflowStart, overflowEnd } = useScrollOverflowFades(
    hasGains,
    `${gains.length}:${troopsDeployed}:${troopsRetreated}`
  )

  if (!hasGains) return null
  return (
    <div
      className={[
        'birdseye-seat-gains',
        overflowStart ? 'birdseye-seat-gains--overflow-start' : '',
        overflowEnd ? 'birdseye-seat-gains--overflow-end' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="birdseye-seat-gains__scroll" ref={scrollRef}>
        <TurnGainsDisplay
          gains={gains}
          playerId={playerId}
          showSourceTitles={showSourceTitles && !totalsOnly}
          showTotals={showTotals}
          totalsOnly={totalsOnly}
          inlineTrash
          resolveCard={resolveCard}
          troopsDeployedToConflict={troopsDeployed}
          troopsRetreatedFromConflict={troopsRetreated}
          className="birdseye-seat-gains__display"
        />
      </div>
    </div>
  )
}

/** Active-seat action chrome + tech panel state for desktop 6 stack. */
export function BirdseyeDesktopControls({
  player,
  actions,
  gameState,
  isHistoryView,
  troopDeploy,
  dreadnoughtDeploy,
  specimenDeploy,
  interactionsHostRef,
}: {
  player: Player
  actions: BirdseyeSeatActions
  gameState?: GameState
  isHistoryView?: boolean
  interactionsHostRef?: (el: HTMLDivElement | null) => void
} & BirdseyeSeatDeployProps) {
  const [techOpen, setTechOpen] = useState(false)
  return (
    <div className="birdseye-seat__controls-row">
      <BirdseyeInteractionsHost hostRef={interactionsHostRef} />
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
        <BirdseyePrimaryControls actions={actions} player={player} keepPlayReveal />
        {actions.showEndTurn ? (
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
            End Turn
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
