import React, { useMemo, useState, useLayoutEffect, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Player } from '../../types/GameTypes'
import AgentIcon from '../AgentIcon/AgentIcon'
import './CombatPhaseOverlay.css'

export interface CombatPhaseOverlayProps {
  players: Player[]
  combatStrength: Record<number, number>
  combatPasses: Set<number>
  activePlayerId: number
  isVisible: boolean
  /** Active player has played at least one combat intrigue this visit (footer shows Continue). */
  activePlayerPlayedCombatIntrigue?: boolean
  /** History replay: show resolved combat summary without live-turn prompts. */
  readOnly?: boolean
  /** When set, overlay is scoped to this board container instead of the full viewport. */
  containerRef?: RefObject<HTMLElement | null>
}

const CombatPhaseOverlay: React.FC<CombatPhaseOverlayProps> = ({
  players,
  combatStrength,
  combatPasses,
  activePlayerId,
  isVisible,
  activePlayerPlayedCombatIntrigue = false,
  readOnly = false,
  containerRef,
}) => {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!isVisible) {
      setPortalTarget(null)
      return
    }
    setPortalTarget(containerRef?.current ?? null)
  }, [containerRef, isVisible])

  const rankings = useMemo(() => {
    return Object.entries(combatStrength)
      .map(([playerId, strength]) => ({ playerId: Number(playerId), strength }))
      .filter(entry => entry.strength > 0)
      .sort((a, b) => b.strength - a.strength)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  }, [combatStrength])

  const hasParticipants = rankings.length > 0

  const activePlayer = players.find(player => player.id === activePlayerId)

  if (!isVisible) return null

  const overlay = (
    <div
      className={[
        'combat-phase-overlay',
        portalTarget ? 'combat-phase-overlay--board-scoped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Combat phase"
    >
      <div className="combat-phase-modal">
        <h2 className="combat-phase-modal-title">
          {readOnly ? 'Combat Resolution' : 'Combat Phase'}
        </h2>
        {!readOnly && activePlayer && (
          <p className="combat-phase-active-player">
            <AgentIcon playerId={activePlayer.id} />
            <span>
              {activePlayer.leader.name}
              <span className="combat-phase-active-label">
                {activePlayerPlayedCombatIntrigue
                  ? ' — play another intrigue or continue'
                  : ' — play intrigue or pass'}
              </span>
            </span>
          </p>
        )}
        <div className="combat-phase-rankings" aria-label="Combat strength rankings">
          {!hasParticipants ? (
            <p className="combat-phase-empty">No participants in the conflict</p>
          ) : null}
          {rankings.map(({ playerId, strength, rank }) => {
            const player = players.find(p => p.id === playerId)
            const hasPassed = combatPasses.has(playerId)
            const isActive = playerId === activePlayerId
            return (
              <div
                key={playerId}
                className={[
                  'combat-phase-rank',
                  `combat-phase-rank--place-${rank}`,
                  hasPassed ? 'combat-phase-rank--passed' : '',
                  isActive ? 'combat-phase-rank--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="combat-phase-rank-place">{rank}.</span>
                <AgentIcon playerId={playerId} />
                <span className="combat-phase-rank-strength" title={`${strength} strength`}>
                  <img src="/icon/dagger.png" alt="" className="combat-phase-strength-icon" aria-hidden="true" />
                  {strength}
                </span>
                {player && <span className="combat-phase-rank-name">{player.leader.name}</span>}
                {player && (
                  <span
                    className="combat-phase-intrigue-count"
                    title={`${player.intrigueCount} intrigue card${player.intrigueCount === 1 ? '' : 's'}`}
                  >
                    <img
                      src="/icon/intrigue.png"
                      alt=""
                      className="combat-phase-intrigue-icon"
                      aria-hidden="true"
                    />
                    {player.intrigueCount}
                  </span>
                )}
                {hasPassed && <span className="combat-phase-passed">Passed</span>}
              </div>
            )
          })}
        </div>
        {(!readOnly || hasParticipants) && (
          <p className="combat-phase-hint">
            {readOnly
              ? 'Final combat strengths for this round.'
              : 'Play any number of combat intrigue cards, then pass. Playing a card lets everyone act again.'}
          </p>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return overlay
  if (!portalTarget) return null
  return createPortal(overlay, portalTarget)
}

export default CombatPhaseOverlay
