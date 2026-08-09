import React, { useState } from 'react'
import type { Gain, GameState, Player } from '../../types/GameTypes'
import type { TechTileId } from '../../data/techTiles'
import TurnGainsDisplay from '../TurnGainsDisplay/TurnGainsDisplay'
import TurnControlsTechRow from '../TurnControlsTechRow/TurnControlsTechRow'
import AgentIcon from '../AgentIcon/AgentIcon'
import './CombatSeatTurnChrome.css'

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
  /** When true, show End Turn instead of Play/Rev. */
  showEndTurn: boolean
  endTurnDisabled: boolean
  endTurnTitle?: string
  agents: number
  handCount: number
  onPlay: () => void
  onReveal: () => void
  onIntrigue: () => void
  onEndTurn: () => void
  onActivateTech?: (playerId: number, tileId: TechTileId) => void
}

function stop(e: React.SyntheticEvent) {
  e.stopPropagation()
}

/** Host for TurnControls-ported reward/choice chips (left of birds-eye actions). */
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
    />
  )
}

/** Play / Rev or End Turn — above portrait (mobile 3b) or in left stack (desktop 6). */
export function BirdseyePrimaryControls({
  actions,
  player,
}: {
  actions: BirdseyeSeatActions
  player: Player
}) {
  return (
    <div className="birdseye-seat__primary" onClick={stop}>
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
      ) : (
        <>
          <button
            type="button"
            className="birdseye-seat-btn birdseye-seat-btn--play"
            onClick={e => {
              stop(e)
              actions.onPlay()
            }}
            disabled={actions.playDisabled}
            title={actions.playTitle}
          >
            <span className="birdseye-seat-btn__label">Play</span>
            <span className="birdseye-seat-btn__agent" aria-hidden="true">
              <AgentIcon
                playerId={player.id}
                color={player.color}
                className="birdseye-seat-btn__agent-icon"
              />
              <span className="birdseye-seat-btn__agent-count">{actions.agents}</span>
            </span>
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
          >
            <span className="birdseye-seat-btn__count">{actions.handCount}</span>
            <span className="birdseye-seat-btn__label">Rev</span>
          </button>
        </>
      )}
    </div>
  )
}

/** Intrigue + Tech with badges. */
export function BirdseyeUtilControls({
  actions,
  techOpen,
  onToggleTech,
}: {
  actions: BirdseyeSeatActions
  techOpen: boolean
  onToggleTech: () => void
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
    <div className="birdseye-seat-tech-panel" onClick={stop}>
      <TurnControlsTechRow
        player={player}
        gameState={gameState}
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
    </div>
  )
}

export function BirdseyeSeatGains({
  playerId,
  gains,
  troopsDeployed = 0,
  troopsRetreated = 0,
}: {
  playerId: number
  gains: Gain[]
  troopsDeployed?: number
  troopsRetreated?: number
}) {
  if (gains.length === 0 && troopsDeployed === 0 && troopsRetreated === 0) return null
  return (
    <div className="birdseye-seat-gains">
      <TurnGainsDisplay
        gains={gains}
        playerId={playerId}
        showSourceTitles
        inlineTrash
        troopsDeployedToConflict={troopsDeployed}
        troopsRetreatedFromConflict={troopsRetreated}
        className="birdseye-seat-gains__display"
      />
    </div>
  )
}

/** Active-seat action chrome + tech panel state for desktop 6 stack. */
export function BirdseyeDesktopControls({
  player,
  actions,
  gameState,
  isHistoryView,
  interactionsHostRef,
}: {
  player: Player
  actions: BirdseyeSeatActions
  gameState?: GameState
  isHistoryView?: boolean
  interactionsHostRef?: (el: HTMLDivElement | null) => void
}) {
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

/** Overlay Intr/Tech for mobile 3b (sits on portrait). */
export function BirdseyePortraitOverlay({
  player,
  actions,
  gameState,
  isHistoryView,
}: {
  player: Player
  actions: BirdseyeSeatActions
  gameState?: GameState
  isHistoryView?: boolean
}) {
  const [techOpen, setTechOpen] = useState(false)
  return (
    <>
      <div className="birdseye-seat__overlay-utils">
        <BirdseyeUtilControls
          actions={actions}
          techOpen={techOpen}
          onToggleTech={() => setTechOpen(o => !o)}
        />
      </div>
      {techOpen && gameState && actions.showTech ? (
        <BirdseyeTechPanel
          player={player}
          gameState={gameState}
          actions={actions}
          isHistoryView={isHistoryView}
          onClose={() => setTechOpen(false)}
        />
      ) : null}
    </>
  )
}

/** Mobile 3b top row: interactions + Play/Rev. */
export function BirdseyeMobileTopRow({
  player,
  actions,
  interactionsHostRef,
}: {
  player: Player
  actions: BirdseyeSeatActions
  interactionsHostRef?: (el: HTMLDivElement | null) => void
}) {
  return (
    <div className="combat-area-cluster__seat-top">
      <BirdseyeInteractionsHost hostRef={interactionsHostRef} />
      <BirdseyePrimaryControls actions={actions} player={player} />
    </div>
  )
}
