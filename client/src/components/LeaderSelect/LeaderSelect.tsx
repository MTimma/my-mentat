import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Leader } from '../../types/GameTypes'
import { getLeaderImage } from '../../data/leaders'
import './LeaderSelect.css'

export type LeaderSelectVariant = 'setup' | 'sandbox'

interface LeaderSelectProps {
  leaders: Leader[]
  value: Leader
  onChange: (leader: Leader) => void
  ariaLabel?: string
  className?: string
  variant?: LeaderSelectVariant
}

const LeaderSelect: React.FC<LeaderSelectProps> = ({
  leaders,
  value,
  onChange,
  ariaLabel,
  className,
  variant = 'setup',
}) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const selectedImage = getLeaderImage(value.name)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(
    null
  )

  const updateMenuRect = () => {
    const trigger = triggerRef.current
    if (!trigger) {
      setMenuRect(null)
      return
    }
    const rect = trigger.getBoundingClientRect()
    const menuWidth =
      variant === 'setup' || variant === 'sandbox'
        ? Math.min(240, Math.max(180, window.innerWidth - rect.left - 16))
        : rect.width
    setMenuRect({
      top: rect.bottom,
      left: rect.left,
      width: menuWidth,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null)
      return
    }
    updateMenuRect()
    window.addEventListener('resize', updateMenuRect)
    window.addEventListener('scroll', updateMenuRect, true)
    return () => {
      window.removeEventListener('resize', updateMenuRect)
      window.removeEventListener('scroll', updateMenuRect, true)
    }
  }, [open, variant])

  useEffect(() => {
    const row = rootRef.current?.closest('.player-setup-row, .sandbox-player-editor__leader-row')
    if (!row) return
    row.classList.toggle('player-setup-row--leader-menu-open', open)
    row.classList.toggle('sandbox-player-editor__leader-row--menu-open', open)
    return () => {
      row.classList.remove('player-setup-row--leader-menu-open')
      row.classList.remove('sandbox-player-editor__leader-row--menu-open')
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      const menu = document.getElementById(listId)
      if (menu?.contains(target)) return
      setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, listId])

  const handleSelect = (leader: Leader) => {
    onChange(leader)
    setOpen(false)
  }

  const menu =
    open && menuRect ? (
      <div
        className={[
          'leader-select__menu',
          'leader-select__menu--portal',
          variant === 'sandbox' ? 'leader-select__menu--sandbox' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="listbox"
        id={listId}
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          top: menuRect.top,
          left: menuRect.left,
          width: menuRect.width,
          zIndex: 1400,
        }}
      >
        {leaders.map(leader => {
          const image = getLeaderImage(leader.name)
          const selected = leader.name === value.name
          return (
            <button
              key={leader.name}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label="Leader card"
              className={[
                'leader-select__option',
                selected ? 'leader-select__option--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleSelect(leader)}
            >
              <span className="leader-select__option-img">
                {image ? (
                  <img src={image} alt="" draggable={false} />
                ) : (
                  <span className="leader-select__thumb-fallback" aria-hidden="true">
                    ?
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    ) : null

  return (
    <div
      ref={rootRef}
      className={[
        'leader-select',
        `leader-select--${variant}`,
        open ? 'leader-select--open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        ref={triggerRef}
        type="button"
        className="leader-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="leader-select__thumb" aria-hidden="true">
          {selectedImage ? (
            <img src={selectedImage} alt="" draggable={false} />
          ) : (
            <span className="leader-select__thumb-fallback">?</span>
          )}
        </span>
        <span className="leader-select__chevron" aria-hidden="true" />
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}

export default LeaderSelect
