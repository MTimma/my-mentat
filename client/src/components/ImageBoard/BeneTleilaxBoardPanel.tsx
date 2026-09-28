import React from 'react'
import { withImageZoomHint } from '../AltImagePreview/imageZoomHint'
import type { Player } from '../../types/GameTypes'
import {
  BENE_TLEILAX_BOARD_SRC,
  RESEARCH_CELL_HIT,
  RESEARCH_NODE_POSITIONS,
  SPECIMEN_TANK_ANCHORS,
  TLEILAXU_STEP_POSITIONS,
  TLEILAXU_VP_STEP,
  researchTokenPosition,
  tleilaxuTokenPosition,
} from '../../expansions/immortality/boardMarkers'
import { researchNode } from '../../expansions/immortality/researchTrack'
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
  /**
   * Research-branch chooser: only these node ids are highlighted buttons.
   * Other hexes stay on the board art and are not clickable.
   */
  choiceNodeIds?: readonly string[]
  /** Bonus text above each choice hex. Off when every node is selectable. */
  showChoiceLabels?: boolean
  onResearchNodeSelect?: (playerId: number, nodeId: string) => void
  onTleilaxuStepSelect?: (playerId: number, step: number) => void
}

function researchChoiceLabel(nodeId: string): string {
  const bonus = researchNode(nodeId).bonus
  if (!bonus) return nodeId
  const parts = Object.entries(bonus)
    .filter(([, value]) => value)
    .map(([key, value]) => (typeof value === 'number' ? `${key}:${value}` : key))
  return parts.length ? `${nodeId} ${parts.join(', ')}` : nodeId
}

const BeneTleilaxBoardPanel: React.FC<BeneTleilaxBoardPanelProps> = ({
  players,
  currentPlayerId,
  tleilaxuTrackBonusSpice = 0,
  tleilaxuTrackBonusClaimed = false,
  placement = 'stacked',
  markerDebug = false,
  interactive = false,
  choiceNodeIds,
  showChoiceLabels = true,
  onResearchNodeSelect,
  onTleilaxuStepSelect,
}) => {
  const playersSorted = [...players].sort((a, b) => a.id - b.id)
  const showVpBonus = !tleilaxuTrackBonusClaimed && (tleilaxuTrackBonusSpice ?? 0) > 0
  const vpPoint = TLEILAXU_STEP_POSITIONS[TLEILAXU_VP_STEP]
  const choosing = choiceNodeIds != null
  const currentResearchNodeId = players.find(p => p.id === currentPlayerId)?.researchNodeId
  const boardSrc = `/${BENE_TLEILAX_BOARD_SRC}`

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
        choosing ? 'bene-tleilax-board--choice' : '',
        markerDebug ? 'bene-tleilax-board--marker-debug' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Bene Tleilax board"
    >
      <img
        className="bene-tleilax-board__img"
        src={boardSrc}
        alt="Bene Tleilax research and Tleilaxu tracks"
        title={withImageZoomHint('Bene Tleilax board')}
        draggable={false}
        data-preview-src={boardSrc}
      />

      {choosing ? (
        <div className="bene-tleilax-board__hotspots">
          {choiceNodeIds.map(nodeId => {
            const point = RESEARCH_NODE_POSITIONS[nodeId]
            if (!point) return null
            const label = researchChoiceLabel(nodeId)
            return (
              <span
                key={`choice-${nodeId}`}
                className="bene-tleilax-board__cell-anchor"
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  width: `${RESEARCH_CELL_HIT.width}%`,
                  height: `${RESEARCH_CELL_HIT.height}%`,
                }}
              >
                <button
                  type="button"
                  className={[
                    'bene-tleilax-board__cell',
                    nodeId === currentResearchNodeId ? 'bene-tleilax-board__cell--current' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  title={label}
                  aria-label={`Choose research ${label}`}
                  aria-current={nodeId === currentResearchNodeId ? 'true' : undefined}
                  data-testid={`research-cell-${nodeId}`}
                  onClick={() => onResearchNodeSelect?.(currentPlayerId, nodeId)}
                />
                {showChoiceLabels ? (
                  <span className="bene-tleilax-board__cell-label">{label}</span>
                ) : null}
              </span>
            )
          })}
        </div>
      ) : null}

      {interactive && !choosing ? (
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

          const specimens = player.specimens ?? 0
          const tank = SPECIMEN_TANK_ANCHORS[laneIndex]

          return (
            <React.Fragment key={player.id}>
              {tank && specimens > 0 ? (
                <span
                  className="bene-tleilax-board__specimen-lane"
                  data-marker="specimen-tank"
                  data-player-id={player.id}
                  style={{ left: `${tank.x}%`, top: `${tank.y}%` }}
                  title={`${player.leader?.name ?? `P${player.id + 1}`}: ${specimens} specimen${specimens === 1 ? '' : 's'}`}
                >
                  {Array.from({ length: Math.min(specimens, 6) }, (_, index) => (
                    <span
                      key={index}
                      className="bene-tleilax-board__specimen-square"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {specimens > 6 ? (
                    <span className="bene-tleilax-board__specimen-overflow">+{specimens - 6}</span>
                  ) : null}
                </span>
              ) : null}
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
              className="bene-tleilax-board__debug-anchor"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${RESEARCH_CELL_HIT.width}%`,
                height: `${RESEARCH_CELL_HIT.height}%`,
              }}
            >
              <span
                className="bene-tleilax-board__debug-dot bene-tleilax-board__debug-dot--research"
                data-marker="research-node"
                data-node-id={id}
                title={`research ${id}: ${p.x}%, ${p.y}%`}
              />
              <span className="bene-tleilax-board__debug-label">{id}</span>
            </span>
          ))}
          {SPECIMEN_TANK_ANCHORS.map((p, index) => (
            <span
              key={`s-${index}`}
              className="bene-tleilax-board__debug-dot bene-tleilax-board__debug-dot--specimen"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={`specimen tank ${index}`}
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
