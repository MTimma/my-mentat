import { describe, expect, it } from 'vitest'
import { finishedEditFocusIndex } from '../redoTurnFocus'

const base = {
  wasEditing: true,
  editing: false,
  focusIndex: 2,
  historyLength: 6,
  alreadyApplied: null as number | null,
}

describe('finishedEditFocusIndex', () => {
  it('lands on the edited turn when an edit finishes', () => {
    expect(finishedEditFocusIndex(base)).toBe(2)
  })

  it('stays put while the edit is still open', () => {
    expect(finishedEditFocusIndex({ ...base, editing: true })).toBeNull()
  })

  it('ignores renders that were not editing before', () => {
    expect(finishedEditFocusIndex({ ...base, wasEditing: false })).toBeNull()
  })

  it('does not re-apply a focus index that was already used', () => {
    expect(finishedEditFocusIndex({ ...base, alreadyApplied: 2 })).toBeNull()
  })

  it('ignores an out-of-range or missing focus index', () => {
    expect(finishedEditFocusIndex({ ...base, focusIndex: 6 })).toBeNull()
    expect(finishedEditFocusIndex({ ...base, focusIndex: null })).toBeNull()
  })
})
