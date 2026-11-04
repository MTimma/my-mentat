/**
 * History row the viewer should land on once a turn edit finishes, or `null` to
 * keep the current view. Runs once per finished edit (guarded by `alreadyApplied`)
 * so the edited turn stays selected instead of jumping to the latest turn.
 */
export function finishedEditFocusIndex(params: {
  /** Was an edit open on the previous render? */
  wasEditing: boolean
  /** Is an edit open now? */
  editing: boolean
  /** Edited turn's history index, from the reducer. */
  focusIndex: number | null
  historyLength: number
  /** Focus index already applied, so it is not re-applied on later renders. */
  alreadyApplied: number | null
}): number | null {
  const { wasEditing, editing, focusIndex, historyLength, alreadyApplied } = params
  if (!wasEditing || editing) return null
  if (focusIndex == null) return null
  if (focusIndex >= historyLength) return null
  if (alreadyApplied === focusIndex) return null
  return focusIndex
}
