import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGame } from './GameContext/GameContext'
import { type LoadSaveFn, type LoadSaveSource } from '../api/gamesApi'
import SaveDocImportPanel from './SaveDocImportPanel/SaveDocImportPanel'
import GamesList from './GamesList/GamesList'
import type { SaveDoc } from '../save/types'
import {
  canUseSaveFilePicker,
  saveJsonFile,
  suggestedSaveFilenameFromTitle,
} from '../utils/saveJsonFile'
import './TurnHistory.css'

const DetailsIcon = () => (
  <svg className="turn-history-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <ellipse cx="12" cy="13.5" rx="5.5" ry="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    <path d="M7.5 10.5 5.5 6.5M16.5 10.5l2-2M9 8.5 8 4M15 8.5l1-4M6.5 14l-3 .5M17.5 14l3 .5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="9.75" cy="13" r="1" fill="currentColor" />
    <circle cx="14.25" cy="13" r="1" fill="currentColor" />
  </svg>
)

export function TurnHistoryDebugButton({
  onLoadSave,
  className,
}: {
  onLoadSave?: LoadSaveFn
  className?: string
}) {
  const { exportSaveDoc } = useGame()
  const [open, setOpen] = useState(false)
  const [debugView, setDebugView] = useState<'save' | 'load'>('save')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [saveFilename, setSaveFilename] = useState('')

  const debugJson = useMemo(() => {
    if (!open) return ''
    return JSON.stringify(exportSaveDoc(), null, 2)
  }, [open, exportSaveDoc])

  const openModal = useCallback(() => {
    setSaveFilename(suggestedSaveFilenameFromTitle(exportSaveDoc().meta.title))
    setDebugView('save')
    setOpen(true)
  }, [exportSaveDoc])

  const handleCopySave = useCallback(async () => {
    const text = JSON.stringify(exportSaveDoc(), null, 2)
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback('Copied')
      window.setTimeout(() => setCopyFeedback(null), 2000)
    } catch {
      setCopyFeedback('Copy failed')
      window.setTimeout(() => setCopyFeedback(null), 2000)
    }
  }, [exportSaveDoc])

  const handleSaveJson = useCallback(async () => {
    const json = JSON.stringify(exportSaveDoc(), null, 2)
    try {
      const result = await saveJsonFile(json, saveFilename)
      if (result === 'cancelled') return
      setSaveFeedback(canUseSaveFilePicker() ? 'Saved' : 'Downloaded')
      window.setTimeout(() => setSaveFeedback(null), 2000)
    } catch {
      setSaveFeedback('Save failed')
      window.setTimeout(() => setSaveFeedback(null), 2000)
    }
  }, [exportSaveDoc, saveFilename])

  const handleLoad = useCallback(
    (doc: SaveDoc, source?: LoadSaveSource) => {
      if (!onLoadSave) return
      onLoadSave(doc, source)
      setOpen(false)
    },
    [onLoadSave]
  )

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  return (
    <>
      <button
        type="button"
        className={['turn-history-icon-btn', 'turn-history-icon-btn--details', className]
          .filter(Boolean)
          .join(' ')}
        onClick={openModal}
        title="Copy or load save JSON"
        aria-label="Copy or load save JSON"
      >
        <DetailsIcon />
      </button>
      {open &&
        createPortal(
          <div className="turn-details-modal" onClick={() => setOpen(false)}>
            <div className="turn-details-content" onClick={e => e.stopPropagation()}>
              <h3>Game data</h3>
              <div className="turn-details-tabs" role="tablist" aria-label="Debug view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={debugView === 'save'}
                  className={
                    debugView === 'save' ? 'turn-details-tab turn-details-tab--active' : 'turn-details-tab'
                  }
                  onClick={() => {
                    setSaveFilename(suggestedSaveFilenameFromTitle(exportSaveDoc().meta.title))
                    setDebugView('save')
                  }}
                >
                  Save
                </button>
                {onLoadSave ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={debugView === 'load'}
                    className={
                      debugView === 'load' ? 'turn-details-tab turn-details-tab--active' : 'turn-details-tab'
                    }
                    onClick={() => setDebugView('load')}
                  >
                    Load
                  </button>
                ) : null}
              </div>
              {debugView === 'load' && onLoadSave ? (
                <div className="turn-details-load">
                  <GamesList className="turn-details-games-list" onLoad={handleLoad} />
                  <SaveDocImportPanel onLoad={handleLoad} buttonLabel="Load save" />
                </div>
              ) : (
                <>
                  <div className="turn-details-export">
                    <label className="turn-details-filename-field">
                      <span className="turn-details-filename-label">Filename</span>
                      <div className="turn-details-filename-row">
                        <input
                          type="text"
                          className="turn-details-filename-input"
                          value={saveFilename}
                          onChange={e => setSaveFilename(e.target.value)}
                          spellCheck={false}
                          autoComplete="off"
                        />
                        <span className="turn-details-filename-suffix" aria-hidden="true">
                          .json
                        </span>
                      </div>
                    </label>
                    <div className="turn-details-export-actions">
                      <button type="button" className="turn-details-export-btn" onClick={handleCopySave}>
                        {copyFeedback ?? 'Copy to clipboard'}
                      </button>
                      <button type="button" className="turn-details-export-btn" onClick={handleSaveJson}>
                        {saveFeedback ?? (canUseSaveFilePicker() ? 'Save as…' : 'Download')}
                      </button>
                    </div>
                  </div>
                  <pre>{debugJson}</pre>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
