import React, { useMemo, useRef, useState } from 'react'
import type { TechTile, TechTileId } from '../../data/techTiles'
import {
  canConfirmSandboxStackTops,
  normalizeSandboxStackTops,
  TECH_STACK_COUNT,
} from '../../utils/sandboxTechTiles'
import type { Player } from '../../types/GameTypes'
import { filterBySearchTokens } from '../../utils/searchTokens'
import { useVisualViewportOverlay } from '../../utils/useVisualViewportOverlay'
import { PickerModalShell } from '../BoardScopedModal'
import { usePlayBoardModalContext } from '../../context/PlayBoardModalContext'
import './TechTileSelect.css'

export type SandboxStackTop = TechTileId | null | undefined

interface TechTileSelectProps {
  tiles: TechTile[]
  players: Player[]
  tilesForBoard: number
  requiredFilledStacks: number
  allowedEmptyStacks: number
  blockedTileIds: TechTileId[]
  initialStackTops?: SandboxStackTop[]
  onConfirm: (stackTops: Array<TechTileId | null>) => void
  onCancel?: () => void
}

function initialDraft(stackTops?: SandboxStackTop[]): SandboxStackTop[] {
  if (!stackTops || stackTops.length !== 3) return [undefined, undefined, undefined]
  return [...stackTops]
}

const TechTileSelect: React.FC<TechTileSelectProps> = ({
  tiles,
  players,
  tilesForBoard,
  requiredFilledStacks,
  allowedEmptyStacks,
  blockedTileIds,
  onConfirm,
  onCancel,
  initialStackTops,
}) => {
  const [stackTops, setStackTops] = useState<SandboxStackTop[]>(() => initialDraft(initialStackTops))
  const [filter, setFilter] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  const { scopeModalsToBoard } = usePlayBoardModalContext()

  useVisualViewportOverlay(overlayRef, { enabled: !scopeModalsToBoard, lockDocumentScroll: true })

  const blocked = useMemo(() => new Set(blockedTileIds), [blockedTileIds])
  const selectedIds = useMemo(
    () => new Set(stackTops.filter((top): top is TechTileId => Boolean(top))),
    [stackTops]
  )

  const sortedTiles = useMemo(
    () => [...tiles].sort((a, b) => a.name.localeCompare(b.name)),
    [tiles]
  )

  const filteredTiles = useMemo(() => {
    const available = sortedTiles.filter(tile => !blocked.has(tile.id))
    return filterBySearchTokens(available, filter, tile =>
      `${tile.name} ${tile.description} ${tile.cost}`.toLowerCase()
    )
  }, [sortedTiles, filter, blocked])

  const filledCount = stackTops.filter((top): top is TechTileId => Boolean(top)).length
  const emptyCount = stackTops.filter(top => top === null).length
  const unsetCount = stackTops.filter(top => top === undefined).length
  const nextFillIndex = stackTops.findIndex(top => top === undefined)

  const canMarkEmpty =
    allowedEmptyStacks > 0 &&
    emptyCount < allowedEmptyStacks &&
    nextFillIndex !== -1 &&
    filledCount <= requiredFilledStacks

  const canConfirm = canConfirmSandboxStackTops(players, stackTops)

  const handleTilePick = (tileId: TechTileId) => {
    setStackTops(prev => {
      const next = [...prev]
      const existingIndex = next.findIndex(top => top === tileId)
      if (existingIndex !== -1) {
        next[existingIndex] = undefined
        return next
      }

      const targetIndex = next.findIndex(top => top === undefined)
      if (targetIndex === -1) return prev

      next[targetIndex] = tileId
      return next
    })
  }

  const markNextEmpty = () => {
    if (!canMarkEmpty) return
    setStackTops(prev => {
      const next = [...prev]
      const targetIndex = next.findIndex(top => top === undefined)
      if (targetIndex === -1) return prev
      next[targetIndex] = null
      return next
    })
  }

  const clearSlot = (slotIndex: number) => {
    setStackTops(prev => {
      const next = [...prev]
      if (next[slotIndex] === undefined) return prev
      next[slotIndex] = undefined
      return next
    })
  }

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(normalizeSandboxStackTops(stackTops))
  }

  const handleCancel = () => {
    setStackTops(initialDraft(initialStackTops))
    onCancel?.()
  }

  const poolHint =
    tilesForBoard === 0
      ? 'All 18 tech tiles are with players — all board stacks stay empty.'
      : allowedEmptyStacks === 0
        ? `Click tiles to choose ${requiredFilledStacks} face-up stacks. Remaining tiles shuffle face-down.`
        : `Click tiles to choose ${requiredFilledStacks} face-up stack${requiredFilledStacks === 1 ? '' : 's'}. Up to ${allowedEmptyStacks} stack${allowedEmptyStacks === 1 ? '' : 's'} may stay empty.`

  return (
    <PickerModalShell
      title="Select face-up tech tiles"
      lead={poolHint}
      countLabel={
        <>
          Selected {filledCount} / {TECH_STACK_COUNT}
          {allowedEmptyStacks > 0
            ? ` · ${emptyCount + unsetCount} empty slot${emptyCount + unsetCount === 1 ? '' : 's'} allowed`
            : ''}
        </>
      }
      overlayRef={overlayRef}
    >
      <div className="tech-tile-select-body">
        <div className="tech-tile-select-toolbar">
          <input
            type="search"
            className="search-input tech-tile-select-search"
            placeholder="Search tiles…"
            value={filter}
            onChange={event => setFilter(event.target.value)}
          />
          <div className="tech-tile-select-preview" aria-label="Tech stacks">
            {stackTops.map((top, index) => {
              const tile = top ? tiles.find(t => t.id === top) : undefined
              const isNext = index === nextFillIndex
              return (
                <button
                  key={`preview-${index}`}
                  type="button"
                  className={[
                    'card-search-selection-preview-slot',
                    'tech-tile-select-preview-slot',
                    'tech-tile-select-preview-slot--button',
                    isNext ? 'tech-tile-select-preview-slot--active' : '',
                    tile ? 'tech-tile-select-preview-slot--filled' : '',
                    top === null ? 'tech-tile-select-preview-slot--empty-choice' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={top === undefined}
                  onClick={() => clearSlot(index)}
                  title={
                    tile
                      ? `Remove ${tile.name}`
                      : top === null
                        ? 'Clear empty stack'
                        : undefined
                  }
                  aria-label={
                    tile
                      ? `Remove ${tile.name} from stack ${index + 1}`
                      : top === null
                        ? `Clear empty stack ${index + 1}`
                        : `Empty stack ${index + 1}`
                    }
                >
                  {tile ? (
                    <img src={tile.image} alt="" data-preview-src={tile.image} />
                  ) : top === null ? (
                    <span className="tech-tile-select-preview-slot__empty-label">Empty</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {canMarkEmpty ? (
          <div className="tech-tile-select-empty-row">
            <button
              type="button"
              className="tech-tile-select-empty-button"
              onClick={markNextEmpty}
            >
              Leave next stack empty
            </button>
          </div>
        ) : null}

        <div className="cards-grid tech-tile-select-grid" role="listbox" aria-label="Tech tiles">
          {filteredTiles.map(tile => {
            const selected = selectedIds.has(tile.id)
            const disabled = !selected && nextFillIndex === -1
            return (
              <button
                key={tile.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={[
                  'card',
                  'tech-tile-select-tile',
                  selected ? 'selected' : '',
                  disabled ? 'tech-tile-select-tile--disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={`${tile.name} (${tile.cost} spice) — ${tile.description}`}
                disabled={disabled}
                onClick={() => handleTilePick(tile.id)}
              >
                <img
                  src={tile.image}
                  alt={tile.name}
                  draggable={false}
                  data-preview-src={tile.image}
                />
                <span className="tech-tile-select-tile__meta">
                  <span className="tech-tile-select-tile__name">{tile.name}</span>
                  <span className="tech-tile-select-tile__cost">{tile.cost}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="dialog-actions">
          {onCancel ? (
            <button type="button" className="header-cancel-button modal-btn modal-btn--secondary" onClick={handleCancel}>
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            className="header-confirm-button modal-btn modal-btn--primary"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </PickerModalShell>
  )
}

export default TechTileSelect
