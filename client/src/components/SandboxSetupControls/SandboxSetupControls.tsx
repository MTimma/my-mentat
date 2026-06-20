import React from 'react'
import type { SandboxSetupPosition } from '../../types/GameTypes'
import './SandboxSetupControls.css'

export interface SandboxSetupControlsProps {
  position: SandboxSetupPosition | undefined
  ready: boolean
  riseOfIx?: boolean
  imperiumRowDone: boolean
  techTilesDone: boolean
  conflictDone: boolean
  onSetPosition: (round: number | null, playerTurn: number | null) => void
  onCommit: () => void
  /** Mobile footer bar: tighter horizontal layout. */
  compact?: boolean
}

const SandboxSetupControls: React.FC<SandboxSetupControlsProps> = ({
  position,
  ready,
  riseOfIx = false,
  imperiumRowDone,
  techTilesDone,
  conflictDone,
  onSetPosition,
  onCommit,
  compact = false,
}) => {
  const commitBlockedHint = riseOfIx
    ? 'Pick 5 imperium row cards, 3 tech tiles, and a conflict card first'
    : 'Pick 5 imperium row cards and a conflict card first'

  const currentRound = position?.round ?? null

  const displayRound = currentRound ?? 1

  const incrementRound = () => {
    onSetPosition(displayRound + 1, null)
  }

  const clearRound = () => {
    onSetPosition(null, null)
  }

  const setupSteps = [
    { key: 'imperium-row', label: 'Imperium row', done: imperiumRowDone },
    ...(riseOfIx ? [{ key: 'tech-tiles', label: 'Tech tiles', done: techTilesDone }] : []),
    { key: 'conflict', label: 'Conflict', done: conflictDone },
  ] as const

  return (
  <div className={['sandbox-setup-controls', compact ? 'sandbox-setup-controls--compact' : ''].filter(Boolean).join(' ')}>
    <div className="sandbox-setup-controls__finish">
      <div className="sandbox-setup-controls__finish-row">
        <span className="sandbox-setup-controls__finish-label">Finish setup:</span>
        <ul className="sandbox-setup-controls__checklist" aria-label="Sandbox setup steps">
          {setupSteps.map(step => (
            <li
              key={step.key}
              className={[
                'sandbox-setup-controls__step',
                step.done ? 'sandbox-setup-controls__step--done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${step.label}: ${step.done ? 'complete' : 'incomplete'}`}
            >
              <span className="sandbox-setup-controls__step-label">{step.label}</span>
              <span className="sandbox-setup-controls__step-mark" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
    </div>
    <div className="sandbox-setup-controls__actions">
      <button
        type="button"
        className="sandbox-setup-controls__commit"
        disabled={!ready}
        title={
          ready
            ? 'Lock in the setup and start player turns'
            : commitBlockedHint
        }
        onClick={onCommit}
      >
        Begin
      </button>
      <div className="sandbox-setup-controls__field sandbox-setup-controls__field--round">
        <span>Round</span>
        <span className="sandbox-setup-controls__round-value" aria-live="polite">
          {displayRound}
        </span>
        <button
          type="button"
          className="sandbox-setup-controls__round-increase"
          title="Increase round"
          aria-label="Increase round"
          onClick={incrementRound}
        >
          +
        </button>
        <button
          type="button"
          className="sandbox-setup-controls__clear"
          title="Reset round to 1"
          aria-label="Reset round to 1"
          disabled={currentRound == null}
          onClick={clearRound}
        >
          ×
        </button>
      </div>
    </div>
  </div>
  )
}

export default SandboxSetupControls
