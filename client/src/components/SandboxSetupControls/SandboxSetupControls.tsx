import React from 'react'
import type { SandboxSetupPosition } from '../../types/GameTypes'
import './SandboxSetupControls.css'

export interface SandboxSetupControlsProps {
  position: SandboxSetupPosition | undefined
  ready: boolean
  onSetPosition: (round: number | null, playerTurn: number | null) => void
  onCommit: () => void
  /** Mobile footer bar: omit long hint (board tooltips cover setup steps). */
  compact?: boolean
}

const SandboxSetupControls: React.FC<SandboxSetupControlsProps> = ({
  position,
  ready,
  onSetPosition,
  onCommit,
  compact = false,
}) => (
  <div className={['sandbox-setup-controls', compact ? 'sandbox-setup-controls--compact' : ''].filter(Boolean).join(' ')}>
    {!compact ? (
      <p className="sandbox-setup-controls__hint">
        Sandbox setup — pick the imperium row and conflict, then customize each player area on the board.
      </p>
    ) : null}
    <div className="sandbox-setup-controls__position">
      <label className="sandbox-setup-controls__field">
        <span>Round</span>
        <input
          type="number"
          min="1"
          placeholder="—"
          value={position?.round ?? ''}
          onChange={e => {
            const raw = e.target.value
            onSetPosition(
              raw === '' ? null : Math.max(1, Number(raw) || 1),
              position?.playerTurn ?? null
            )
          }}
        />
        <button
          type="button"
          className="sandbox-setup-controls__clear"
          title="Clear round (imaginary position)"
          onClick={() => onSetPosition(null, position?.playerTurn ?? null)}
        >
          ×
        </button>
      </label>
      <label className="sandbox-setup-controls__field">
        <span>Turn</span>
        <input
          type="number"
          min="1"
          placeholder="—"
          value={position?.playerTurn ?? ''}
          onChange={e => {
            const raw = e.target.value
            onSetPosition(
              position?.round ?? null,
              raw === '' ? null : Math.max(1, Number(raw) || 1)
            )
          }}
        />
        <button
          type="button"
          className="sandbox-setup-controls__clear"
          title="Clear turn (start at turn 1)"
          onClick={() => onSetPosition(position?.round ?? null, null)}
        >
          ×
        </button>
      </label>
    </div>
    <button
      type="button"
      className="sandbox-setup-controls__commit"
      disabled={!ready}
      title={
        ready
          ? 'Lock in the setup and start player turns'
          : 'Pick 5 imperium row cards and a conflict card first'
      }
      onClick={onCommit}
    >
      Begin turns
    </button>
  </div>
)

export default SandboxSetupControls
