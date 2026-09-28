import React from 'react'
import './SandboxSetupControls.css'

export interface SandboxSetupControlsProps {
  ready: boolean
  riseOfIx?: boolean
  immortality?: boolean
  leadersDone: boolean
  imperiumRowDone: boolean
  tleilaxuRowDone?: boolean
  techTilesDone: boolean
  conflictDone: boolean
  onCommit: () => void
  onBrowse?: () => void
  /** Mobile footer bar: tighter horizontal layout. */
  compact?: boolean
}

function commitBlockedHintText(riseOfIx: boolean, immortality: boolean): string {
  const pieces = [
    'a leader for each player',
    '5 imperium row cards',
    ...(immortality ? ['2 Tleilaxu row cards'] : []),
    ...(riseOfIx ? ['3 tech tiles'] : []),
    'a conflict card',
  ]
  return `Pick ${pieces.slice(0, -1).join(', ')}, and ${pieces[pieces.length - 1]} first`
}

const SandboxSetupControls: React.FC<SandboxSetupControlsProps> = ({
  ready,
  riseOfIx = false,
  immortality = false,
  leadersDone,
  imperiumRowDone,
  tleilaxuRowDone = false,
  techTilesDone,
  conflictDone,
  onCommit,
  onBrowse,
  compact = false,
}) => {
  const commitBlockedHint = commitBlockedHintText(riseOfIx, immortality)

  const setupSteps = [
    { key: 'leaders', label: 'Leaders', done: leadersDone },
    { key: 'imperium-row', label: 'Imperium row', done: imperiumRowDone },
    ...(immortality ? [{ key: 'tleilaxu-row', label: 'Tleilaxu row', done: tleilaxuRowDone }] : []),
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
      {onBrowse ? (
        <button
          type="button"
          className="sandbox-session-bar__btn"
          onClick={onBrowse}
        >
          Browse
        </button>
      ) : null}
    </div>
  </div>
  )
}

export default SandboxSetupControls
