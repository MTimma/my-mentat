import React, { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BoardDialogPanel, BoardScopedModal } from '../BoardScopedModal'
import GamesList from '../GamesList/GamesList'
import QuietNameField from '../QuietNameField/QuietNameField'
import { useGame } from '../GameContext/gameContextState'
import { GAME_TITLE_MAX_LENGTH, normalizeGameTitle } from '../../save/gameTitle'
import { getSelectableGamePacks } from '../../gamePacks/registry'
import { subscribeGamePacks } from '../../gamePacks/customGamePacks'
import { prefetchGamesList, type LoadSaveFn, type LoadSaveSource } from '../../api/gamesApi'
import type { SaveDoc } from '../../save/types'
import './SandboxSessionBar.css'

export interface SandboxSessionBarProps {
  gamePackId: string
  hasProgress: boolean
  compact?: boolean
  onRestart: (gamePackId: string) => void
  onStartNew: () => void
  onLoadSave?: LoadSaveFn
  /** Starting round while sandbox setup is open. */
  round?: number | null
  onSetRound?: (round: number | null) => void
  /** Sandbox finish-setup row (checklists, Begin). */
  setupSlot?: ReactNode | ((openBrowse: () => void) => ReactNode)
  /** Kit dropdown — only during sandbox setup. Hidden after Begin. */
  showKit?: boolean
  /** Packed into the docked turn-history sidebar. */
  docked?: boolean
  /** False in view-only games. The name stays visible and cannot be edited. */
  canEdit?: boolean
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
  round = null,
  onSetRound,
  setupSlot,
  showKit = true,
  docked = false,
  canEdit = true,
}) => {
  const { gameTitle, setGameTitle } = useGame()
  const [packListVersion, setPackListVersion] = useState(0)
  const [browseOpen, setBrowseOpen] = useState(false)
  const selectablePacks = useMemo(() => getSelectableGamePacks(), [packListVersion])

  useEffect(() => subscribeGamePacks(() => setPackListVersion(v => v + 1)), [])

  useEffect(() => {
    prefetchGamesList()
  }, [])

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

  const openBrowse = () => setBrowseOpen(true)
  const displayRound = round ?? 1
  const setup = typeof setupSlot === 'function' ? setupSlot(openBrowse) : setupSlot

  const gameNameField = (
    <QuietNameField
      className="sandbox-session-bar__game-name"
      value={gameTitle}
      ariaLabel="Game name"
      maxLength={GAME_TITLE_MAX_LENGTH}
      readOnly={!canEdit}
      onCommit={draft => {
        const title = normalizeGameTitle(draft)
        if (canEdit && title !== gameTitle) setGameTitle(title)
        return title
      }}
    />
  )

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
      {showKit ? gameNameField : null}
      <div className="sandbox-session-bar__row">
        {showKit ? (
          <div className="sandbox-session-bar__kit-row">
            <label className="sandbox-session-bar__kit">
              <span className="sandbox-session-bar__label">Expansions</span>
              <select
                value={gamePackId}
                onChange={e => handleKitChange(e.target.value)}
                className="sandbox-session-bar__select"
              >
                {selectablePacks.map(pack => (
                  <option key={pack.ref} value={pack.ref}>
                    {pack.label}
                  </option>
                ))}
              </select>
            </label>
            {onSetRound ? (
              <div className="sandbox-session-bar__round">
                <span className="sandbox-session-bar__label sandbox-session-bar__round-label" aria-live="polite">
                  Round {displayRound}
                </span>
                <div className="sandbox-session-bar__round-controls">
                  <button
                    type="button"
                    className="sandbox-session-bar__round-btn"
                    aria-label={`Decrease round (currently ${displayRound})`}
                    disabled={displayRound <= 1}
                    onClick={() => onSetRound(displayRound - 1 <= 1 ? null : displayRound - 1)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="sandbox-session-bar__round-btn"
                    aria-label={`Increase round (currently ${displayRound})`}
                    onClick={() => onSetRound(displayRound + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {!showKit ? (
          <div className="sandbox-session-bar__play-row">
            {gameNameField}
            <div className="sandbox-session-bar__actions">
              {onLoadSave ? (
                <button
                  type="button"
                  className="sandbox-session-bar__btn"
                  aria-expanded={browseOpen}
                  onMouseEnter={prefetchGamesList}
                  onFocus={prefetchGamesList}
                  onClick={() => setBrowseOpen(open => !open)}
                >
                  Browse
                </button>
              ) : null}
              <button
                type="button"
                className="sandbox-session-bar__btn"
                onClick={handleStartNew}
              >
                New
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {setup ? <div className="sandbox-session-bar__setup">{setup}</div> : null}

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
