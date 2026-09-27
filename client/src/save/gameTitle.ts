/** Default title for a new sandbox draft. */
export const DEFAULT_SANDBOX_GAME_TITLE = 'Sandbox game'

/**
 * Cap for the editable game title. Not from the rulebook.
 * Long enough for a short session name in the draft list.
 */
export const GAME_TITLE_MAX_LENGTH = 80

/** One-line title. Empty input keeps the default sandbox title. */
export function normalizeGameTitle(value: string): string {
  const next = value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GAME_TITLE_MAX_LENGTH)
  return next || DEFAULT_SANDBOX_GAME_TITLE
}
