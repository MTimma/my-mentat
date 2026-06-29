import React, { useState } from 'react'
import { buildGamePackTemplateFromParent } from '../../gamePacks/gamePackTemplate'
import {
  downloadGamePackJson,
  saveCustomGamePack,
  saveCustomGamePackToRepo,
} from '../../gamePacks/customGamePacks'
import { assertGamePackResolvable, parseGamePackManifestJson } from '../../gamePacks/validateGamePack'
import type { GamePackRef } from '../../gamePacks/types'
import './GamePackEditor.css'

interface GamePackEditorProps {
  parentPackId: GamePackRef
  onClose: () => void
  onSaved: (ref: GamePackRef) => void
}

const GamePackEditor: React.FC<GamePackEditorProps> = ({ parentPackId, onClose, onSaved }) => {
  const [jsonText, setJsonText] = useState(() => buildGamePackTemplateFromParent(parentPackId))
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setError(null)
    setStatus(null)
    setSaving(true)
    try {
      const manifest = parseGamePackManifestJson(jsonText)
      assertGamePackResolvable(manifest)
      const ref = saveCustomGamePack(manifest)
      let repoNote = ''
      if (import.meta.env.DEV) {
        try {
          await saveCustomGamePackToRepo(manifest)
          repoNote = ' Saved to public/game-packs/custom/ in the repo.'
        } catch (repoErr) {
          downloadGamePackJson(manifest)
          repoNote = ` Repo write failed (${repoErr instanceof Error ? repoErr.message : 'error'}); downloaded JSON instead.`
        }
      } else {
        downloadGamePackJson(manifest)
        repoNote = ' Downloaded JSON (commit to public/game-packs/custom/ for team sharing).'
      }
      setStatus(`Saved pack ${ref}.${repoNote}`)
      onSaved(ref)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="game-pack-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="game-pack-editor"
        role="dialog"
        aria-labelledby="game-pack-editor-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="game-pack-editor__header">
          <h2 id="game-pack-editor-title">Create game pack</h2>
          <p className="game-pack-editor__subtitle">
            Forking <code>{parentPackId}</code>. Edit JSON below; overrides are merged onto the parent at game start.
          </p>
        </header>

        <div className="game-pack-editor__help">
          <strong>Override examples in template:</strong>
          <ul>
            <li><code>overrides.boardSpaces</code> — Conspire (id 14) cheaper spice cost</li>
            <li><code>overrides.cards</code> — imperium card acquire cost</li>
            <li><code>overrides.effects</code> — effect registry entries by id</li>
            <li><code>overrides.intrigue</code> / <code>overrides.conflicts</code> — numeric catalog ids</li>
            <li><code>additions.deckPatches.starting</code> — extra starter-deck copies by catalog id (e.g. <code>imperium/power-play</code>)</li>
            <li><code>additions.deckPatches.imperium</code> — append/prepend imperium deck catalog ids</li>
          </ul>
        </div>

        <textarea
          className="game-pack-editor__json"
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          spellCheck={false}
          aria-label="Game pack JSON"
        />

        {error && <p className="game-pack-editor__error" role="alert">{error}</p>}
        {status && <p className="game-pack-editor__status" role="status">{status}</p>}

        <footer className="game-pack-editor__actions">
          <button type="button" className="game-pack-editor__btn game-pack-editor__btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="game-pack-editor__btn game-pack-editor__btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save game pack'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default GamePackEditor
