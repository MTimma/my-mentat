import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGame } from './GameContext/GameContext'
import { type LoadSaveFn, type LoadSaveSource } from '../api/gamesApi'
import SaveDocImportPanel from './SaveDocImportPanel/SaveDocImportPanel'
import type { SaveDoc } from '../save/types'
import {
  canUseSaveFilePicker,
  saveJsonFile,
  suggestedSaveFilenameFromTitle,
} from '../utils/saveJsonFile'
import './TurnHistory.css'

const ShareIcon = () => (
  <svg className="turn-history-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 3v10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M8 7 12 3l4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 13.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

  const debugJson = useMemo(() => {
    if (!open) return ''
    return JSON.stringify(exportSaveDoc(), null, 2)
  }, [open, exportSaveDoc])

  const openModal = useCallback(() => {
    setDebugView('save')
    setOpen(true)
  }, [])

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
    const doc = exportSaveDoc()
    const json = JSON.stringify(doc, null, 2)
    try {
      const result = await saveJsonFile(json, suggestedSaveFilenameFromTitle(doc.meta.title))
      if (result === 'cancelled') return
      setSaveFeedback(canUseSaveFilePicker() ? 'Saved' : 'Downloaded')
      window.setTimeout(() => setSaveFeedback(null), 2000)
    } catch {
      setSaveFeedback('Save failed')
      window.setTimeout(() => setSaveFeedback(null), 2000)
    }
  }, [exportSaveDoc])

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
        <ShareIcon />
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
                  onClick={() => setDebugView('save')}
                >
                  Export
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
                  <SaveDocImportPanel onLoad={handleLoad} buttonLabel="Load save" />
                </div>
              ) : (
                <>
                  <div className="turn-details-export">
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
