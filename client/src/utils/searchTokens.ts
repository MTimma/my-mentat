export function parseSearchTokens(search: string): string[] {
  return search.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

export function blobMatchesSearchTokens(blob: string, tokens: string[], matchAll: boolean): boolean {
  return matchAll ? tokens.every(token => blob.includes(token)) : tokens.some(token => blob.includes(token))
}

/** AND-match all tokens first; with multiple tokens and no hits, fall back to OR. */
export function filterBySearchTokens<T>(
  items: T[],
  search: string,
  getBlob: (item: T) => string
): T[] {
  const tokens = parseSearchTokens(search)
  if (tokens.length === 0) return items

  const match = (matchAll: boolean) =>
    items.filter(item => blobMatchesSearchTokens(getBlob(item), tokens, matchAll))

  const andMatches = match(true)
  if (andMatches.length > 0 || tokens.length === 1) return andMatches
  return match(false)
}
