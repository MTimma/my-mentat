import React, { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BoardDialogPanel, BoardScopedModal } from '../BoardScopedModal'
import GamesList from '../GamesList/GamesList'
import { getSelectableGamePacks } from '../../gamePacks/registry'
import { subscribeGamePacks } from '../../gamePacks/customGamePacks'
import type { LoadSaveFn, LoadSaveSource } from '../../api/gamesApi'
import type { SaveDoc } from '../../save/types'
import './SandboxSessionBar.css'

export interface SandboxSessionBarProps {
  gamePackId: string
  hasProgress: boolean
  compact?: boolean
  onRestart: (gamePackId: string) => void
  onStartNew: () => void
  onLoadSave?: LoadSaveFn
  /** Sandbox finish-setup row (checklists, Begin, round). */
  setupSlot?: ReactNode
  /** Kit dropdown — only during sandbox setup. Hidden after Begin. */
  showKit?: boolean
  /** Packed into the docked turn-history sidebar. */
  docked?: boolean
}

const KIT_CONFIRM = 'Change expansions? The board will reset.'
const START_NEW_CONFIRM = 'Start a new game? The current board will be replaced.'

const SandboxSessionBar: React.FC<SandboxSessionBarProps> = ({
  gamePackId,
  hasProgress,
  compact = false,
  onRestart,
  onStartNew,
  onLoadSave,
  setupSlot,
  showKit = true,
  docked = false,
}) => {
  const [packListVersion, setPackListVersion] = useState(0)
  const [browseOpen, setBrowseOpen] = useState(false)
  const selectablePacks = useMemo(() => getSelectableGamePacks(), [packListVersion])

  useEffect(() => subscribeGamePacks(() => setPackListVersion(v => v + 1)), [])

  const handleKitChange = (nextPackId: string) => {
    if (nextPackId === gamePackId) return
    if (hasProgress && !window.confirm(KIT_CONFIRM)) return
    onRestart(nextPackId)
  }

  const handleStartNew = () => {
    if (hasProgress && !window.confirm(START_NEW_CONFIRM)) return
    onStartNew()
  }

  const handleLoad = (doc: SaveDoc, source?: LoadSaveSource) => {
    setBrowseOpen(false)
    onLoadSave?.(doc, source)
  }

  return (
    <div
      className={[
        'sandbox-session-bar',
        compact ? 'sandbox-session-bar--compact' : '',
        docked ? 'sandbox-session-bar--docked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sandbox-session-bar__row">
      <button
            type="button"
            className="sandbox-session-bar__btn"
            aria-expanded={browseOpen}
            onClick={() => setBrowseOpen(open => !open)}
          >
            Browse
          </button>
        {showKit ? (
          <label className="sandbox-session-bar__kit">
            <span className="sandbox-session-bar__label">Expansions</span>
            <select
              value={gamePackId}
              onChange={e => handleKitChange(e.target.value)}
              className="sandbox-session-bar__select"
              aria-label="Expansions"
            >
              {selectablePacks.map(pack => (
                <option key={pack.ref} value={pack.ref}>
                  {pack.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="sandbox-session-bar__actions">
          {!showKit ? (
            <button type="button" className="sandbox-session-bar__btn sandbox-session-bar__btn--primary" onClick={handleStartNew}>
              New
            </button>
          ) : null}
          
        </div>
      </div>
      {setupSlot ? <div className="sandbox-session-bar__setup">{setupSlot}</div> : null}

      <BoardScopedModal
        isOpen={browseOpen}
        overlayVariant="picker"
        onClose={() => setBrowseOpen(false)}
        closeOnOverlayClick
      >
          
        <BoardDialogPanel
          className="sandbox-session-bar__browse-dialog"
          titleId="sandbox-browse-title"
          onClose={() => setBrowseOpen(false)}
          showCancel
          cancelLabel="Close"
        >
          {onLoadSave ? (
            <div className="sandbox-session-bar__browse-list">
              <GamesList onLoad={handleLoad} />
            </div>
          ) : (
            <p className="sandbox-session-bar__browse-empty">No loader available.</p>
          )}

        </BoardDialogPanel>
      </BoardScopedModal>
    </div>
  )
}

export default SandboxSessionBar
