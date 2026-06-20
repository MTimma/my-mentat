import React, { useCallback, useRef, useState } from 'react'
import { parseSaveDocJson } from '../../save/parseSaveDoc'
import type { SaveDoc } from '../../save/types'
import './SaveDocImportPanel.css'

export interface SaveDocImportPanelProps {
  onLoad: (doc: SaveDoc) => void
  buttonLabel?: string
  className?: string
}

const SaveDocImportPanel: React.FC<SaveDocImportPanelProps> = ({
  onLoad,
  buttonLabel = 'Load game',
  className,
}) => {
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tryLoad = useCallback(
    (raw: string) => {
      const result = parseSaveDocJson(raw)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      onLoad(result.doc)
    },
    [onLoad]
  )

  const handleLoadClick = () => {
    tryLoad(jsonText)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setJsonText(text)
      tryLoad(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={['save-doc-import', className].filter(Boolean).join(' ')}>
      <textarea
        className="save-doc-import-textarea"
        value={jsonText}
        onChange={e => {
          setJsonText(e.target.value)
          if (error) setError(null)
        }}
        placeholder="Paste Save document JSON (Turn History → Save document tab)…"
        rows={6}
        spellCheck={false}
      />
      <div className="save-doc-import-actions">
        <button type="button" className="save-doc-import-btn" onClick={handleLoadClick}>
          {buttonLabel}
        </button>
        <button
          type="button"
          className="save-doc-import-btn save-doc-import-btn--secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose file…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="save-doc-import-file-input"
          onChange={handleFileChange}
        />
      </div>
      {error && (
        <p className="save-doc-import-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default SaveDocImportPanel
