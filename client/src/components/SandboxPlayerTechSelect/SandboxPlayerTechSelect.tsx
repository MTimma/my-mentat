import React, { useMemo, useState } from 'react'
import type { PlayerTechTile, TechTile, TechTileId } from '../../data/techTiles'
import { filterBySearchTokens } from '../../utils/searchTokens'
import '../ImperiumRowSelect/ImperiumRowSelect.css'
import '../TechTileSelect/TechTileSelect.css'
import './SandboxPlayerTechSelect.css'

interface SandboxPlayerTechSelectProps {
  tiles: TechTile[]
  blockedTileIds: TechTileId[]
  initialSelected?: PlayerTechTile[]
  onConfirm: (tech: PlayerTechTile[]) => void
  onCancel: () => void
}

const SandboxPlayerTechSelect: React.FC<SandboxPlayerTechSelectProps> = ({
  tiles,
  blockedTileIds,
  initialSelected = [],
  onConfirm,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<TechTileId[]>(() =>
    initialSelected.map(tile => tile.id)
  )
  const [filter, setFilter] = useState('')

  const blocked = useMemo(() => new Set(blockedTileIds), [blockedTileIds])
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])

  const sortedTiles = useMemo(
    () => [...tiles].sort((a, b) => a.name.localeCompare(b.name)),
    [tiles]
  )

  const filteredTiles = useMemo(
    () =>
      filterBySearchTokens(sortedTiles, filter, tile =>
        `${tile.name} ${tile.description} ${tile.cost}`.toLowerCase()
      ),
    [sortedTiles, filter]
  )

  const toggleTile = (tileId: TechTileId) => {
    if (blocked.has(tileId)) return
    setSelectedIds(prev =>
      prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]
    )
  }

  const handleConfirm = () => {
    onConfirm(selectedIds.map(id => ({ id, faceUp: true })))
  }

  return (
    <div className="sandbox-player-tech-select">
      <header className="sandbox-player-tech-select__header">
        <h3>Select tech tiles</h3>
        <p>
          Choose tiles this player starts with. Tiles on the Ix board or owned by other players are
          unavailable.
        </p>
        <div className="sandbox-player-tech-select__count">
          Selected {selectedIds.length}
        </div>
      </header>

      <div className="tech-tile-select-toolbar">
        <input
          type="search"
          className="search-input tech-tile-select-search"
          placeholder="Search tiles…"
          value={filter}
          onChange={event => setFilter(event.target.value)}
        />
        {selectedIds.length > 0 ? (
          <div className="sandbox-player-tech-select__preview" aria-label="Selected tech tiles">
            {selectedIds.map(tileId => {
              const tile = tiles.find(t => t.id === tileId)
              if (!tile) return null
              return (
                <button
                  key={tileId}
                  type="button"
                  className="tech-tile-select-preview-slot tech-tile-select-preview-slot--button tech-tile-select-preview-slot--filled"
                  title={`Remove ${tile.name}`}
                  aria-label={`Remove ${tile.name}`}
                  onClick={() => toggleTile(tileId)}
                >
                  <img src={tile.image} alt="" />
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="cards-grid tech-tile-select-grid" role="listbox" aria-label="Tech tiles">
        {filteredTiles.map(tile => {
          const isSelected = selected.has(tile.id)
          const isBlocked = blocked.has(tile.id) && !isSelected
          return (
            <button
              key={tile.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={[
                'card',
                'tech-tile-select-tile',
                isSelected ? 'selected' : '',
                isBlocked ? 'tech-tile-select-tile--disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={
                isBlocked
                  ? `${tile.name} — unavailable`
                  : `${tile.name} (${tile.cost} spice) — ${tile.description}`
              }
              disabled={isBlocked}
              onClick={() => toggleTile(tile.id)}
            >
              <img src={tile.image} alt={tile.name} draggable={false} />
              <span className="tech-tile-select-tile__meta">
                <span className="tech-tile-select-tile__name">{tile.name}</span>
                <span className="tech-tile-select-tile__cost">{tile.cost}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="dialog-actions">
        <button type="button" className="header-cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="header-confirm-button" onClick={handleConfirm}>
          Confirm
        </button>
      </div>
    </div>
  )
}

export default SandboxPlayerTechSelect
