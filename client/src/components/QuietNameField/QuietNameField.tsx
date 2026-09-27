import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import './QuietNameField.css'

export interface QuietNameFieldProps {
  /** Saved text shown when the field is not being edited. */
  value: string
  /**
   * Called with the current draft on blur or Enter.
   * Return the text that should stay in the field.
   */
  onCommit: (draft: string) => string
  ariaLabel: string
  placeholder?: string
  maxLength?: number
  readOnly?: boolean
  id?: string
  className?: string
  /** Changing this resets the draft, including while the field is focused. */
  resetKey?: string | number
}

export interface QuietNameFieldHandle {
  commit: () => void
}

const QuietNameField = forwardRef<QuietNameFieldHandle, QuietNameFieldProps>(
  function QuietNameField(
    {
      value,
      onCommit,
      ariaLabel,
      placeholder,
      maxLength,
      readOnly = false,
      id,
      className,
      resetKey,
    },
    ref
  ) {
    const [draft, setDraft] = useState(value)
    const focusedRef = useRef(false)
    const skipCommitRef = useRef(false)
    const draftRef = useRef(draft)
    draftRef.current = draft
    const onCommitRef = useRef(onCommit)
    onCommitRef.current = onCommit

    useEffect(() => {
      focusedRef.current = false
    }, [resetKey])

    useEffect(() => {
      if (focusedRef.current) return
      setDraft(value)
    }, [value, resetKey])

    const commit = () => {
      if (readOnly) return
      const shown = onCommitRef.current(draftRef.current)
      setDraft(shown)
    }

    useImperativeHandle(ref, () => ({ commit }), [readOnly])

    return (
      <input
        id={id}
        className={['quiet-name-field', className].filter(Boolean).join(' ')}
        value={draft}
        maxLength={maxLength}
        aria-label={ariaLabel}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        onFocus={() => {
          if (readOnly) return
          focusedRef.current = true
        }}
        onChange={event => {
          if (readOnly) return
          setDraft(event.target.value)
        }}
        onBlur={() => {
          focusedRef.current = false
          if (skipCommitRef.current) {
            skipCommitRef.current = false
            return
          }
          commit()
        }}
        onKeyDown={event => {
          if (readOnly) return
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            skipCommitRef.current = true
            setDraft(value)
            event.currentTarget.blur()
          }
        }}
      />
    )
  }
)

export default QuietNameField
