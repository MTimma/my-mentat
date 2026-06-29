import React from 'react'
import type { Player } from '../../types/GameTypes'
import {
  BENE_TLEILAX_BOARD_SRC,
  RESEARCH_NODE_POSITIONS,
  TLEILAXU_STEP_POSITIONS,
  TLEILAXU_VP_STEP,
  researchTokenPosition,
  tleilaxuTokenPosition,
} from '../../expansions/immortality/boardMarkers'
import { playerMarkerHex } from '../../utils/playerColors'
import './BeneTleilaxBoardOverlay.css'

function playerColor(player: Player): string {
  return playerMarkerHex(player)
}

export type BeneTleilaxBoardPlacement = 'docked' | 'stacked'

export interface BeneTleilaxBoardPanelProps {
  players: Player[]
  currentPlayerId: number
  tleilaxuTrackBonusSpice?: number
  tleilaxuTrackBonusClaimed?: boolean
  placement?: BeneTleilaxBoardPlacement
  markerDebug?: boolean
  interactive?: boolean
  onResearchNodeSelect?: (playerId: number, nodeId: string) => void
  onTleilaxuStepSelect?: (playerId: number, step: number) => void
}

const BeneTleilaxBoardPanel: React.FC<BeneTleilaxBoardPanelProps> = ({
  players,
  currentPlayerId,
  tleilaxuTrackBonusSpice = 0,
  tleilaxuTrackBonusClaimed = false,
  placement = 'stacked',
  markerDebug = false,
  interactive = false,
  onResearchNodeSelect,
  onTleilaxuStepSelect,
}) => {
  const playersSorted = [...players].sort((a, b) => a.id - b.id)
  const showVpBonus = !tleilaxuTrackBonusClaimed && (tleilaxuTrackBonusSpice ?? 0) > 0
  const vpPoint = TLEILAXU_STEP_POSITIONS[TLEILAXU_VP_STEP]

  const handleResearchClick = (nodeId: string) => {
    if (!interactive || !onResearchNodeSelect) return
    onResearchNodeSelect(currentPlayerId, nodeId)
  }

  const handleTleilaxuClick = (step: number) => {
    if (!interactive || !onTleilaxuStepSelect) return
    onTleilaxuStepSelect(currentPlayerId, step)
  }

  return (
    <div
      className={[
        'bene-tleilax-board',
        placement === 'docked' ? 'bene-tleilax-board--docked' : 'bene-tleilax-board--stacked',
        interactive ? 'bene-tleilax-board--interactive' : '',
        markerDebug ? 'bene-tleilax-board--marker-debug' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Bene Tleilax board"
    >
      <img
        className="bene-tleilax-board__img"
        src={`/${BENE_TLEILAX_BOARD_SRC}`}
        alt="Bene Tleilax research and Tleilaxu tracks"
        draggable={false}
      />

      {interactive ? (
        <div className="bene-tleilax-board__hotspots" aria-hidden>
          {Object.entries(TLEILAXU_STEP_POSITIONS).map(([step, point]) => (
            <button
              key={`t-hot-${step}`}
              type="button"
              className="bene-tleilax-board__hotspot bene-tleilax-board__hotspot--tleilaxu"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              title={`Set Tleilaxu step ${step}`}
              aria-label={`Set Tleilaxu step ${step}`}
              onClick={() => handleTleilaxuClick(Number(step))}
            />
          ))}
          {Object.entries(RESEARCH_NODE_POSITIONS).map(([nodeId, point]) => (
            <button
              key={`r-hot-${nodeId}`}
              type="button"
              className="bene-tleilax-board__hotspot bene-tleilax-board__hotspot--research"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              title={`Set research ${nodeId}`}
              aria-label={`Set research node ${nodeId}`}
              onClick={() => handleResearchClick(nodeId)}
            />
          ))}
        </div>
      ) : null}

      <div className="bene-tleilax-board__markers" aria-hidden>
        {playersSorted.map((player, laneIndex) => {
          const research = researchTokenPosition(player.researchNodeId, laneIndex)
          const tleilaxu = tleilaxuTokenPosition(player.tleilaxuStep, laneIndex)
          const color = playerColor(player)
          const isActive = player.id === currentPlayerId

          return (
            <React.Fragment key={player.id}>
              <span
                className={[
                  'bene-tleilax-board__token',
                  'bene-tleilax-board__token--research',
                  isActive ? 'bene-tleilax-board__token--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${research.x}%`,
                  top: `${research.y}%`,
                  backgroundColor: color,
                }}
                title={`${player.leader?.name ?? `P${player.id + 1}`} research (${player.researchNodeId ?? 'r0'})`}
              />
              <span
                className={[
                  'bene-tleilax-board__token',
                  'bene-tleilax-board__token--tleilaxu',
                  isActive ? 'bene-tleilax-board__token--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${tleilaxu.x}%`,
                  top: `${tleilaxu.y}%`,
                  backgroundColor: color,
                }}
                title={`${player.leader?.name ?? `P${player.id + 1}`} Tleilaxu step ${player.tleilaxuStep ?? 0}`}
              />
            </React.Fragment>
          )
        })}

        {showVpBonus && vpPoint ? (
          <span
            className="bene-tleilax-board__vp-bonus"
            style={{ left: `${vpPoint.x}%`, top: `${vpPoint.y - 5}%` }}
            title={`${tleilaxuTrackBonusSpice} spice bonus (first to reach)`}
          >
            +{tleilaxuTrackBonusSpice}
            <img src="/icon/spice.png" alt="" className="bene-tleilax-board__spice-icon" />
          </span>
        ) : null}
      </div>

      {markerDebug ? (
        <div className="bene-tleilax-board__debug" aria-hidden>
          {Object.entries(RESEARCH_NODE_POSITIONS).map(([id, p]) => (
            <span
              key={`r-${id}`}
              className="bene-tleilax-board__debug-dot bene-tleilax-board__debug-dot--research"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={`research ${id}`}
            />
          ))}
          {Object.entries(TLEILAXU_STEP_POSITIONS).map(([step, p]) => (
            <span
              key={`t-${step}`}
              className="bene-tleilax-board__debug-dot bene-tleilax-board__debug-dot--tleilaxu"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={`tleilaxu ${step}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default BeneTleilaxBoardPanel
