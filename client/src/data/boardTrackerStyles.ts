/** Visual style for a player marker on an image-board track. */
export type BoardTrackerVariant = 'circle' | 'cube' | 'portrait'

/** Influence, VP, and High Council tracks on the main board image. */
export type BoardTrackerKind = 'influence' | 'vp' | 'high-council'

const BOARD_TRACKER_STYLE_DEFAULTS: Record<BoardTrackerKind, BoardTrackerVariant> = {
  influence: 'cube',
  vp: 'portrait',
  'high-council': 'circle',
}

const URL_PARAM_BY_KIND: Record<BoardTrackerKind, string> = {
  influence: 'trackerInfluence',
  vp: 'trackerVp',
  'high-council': 'trackerHighCouncil',
}

const VALID_VARIANTS = new Set<BoardTrackerVariant>(['circle', 'cube', 'portrait'])

function parseVariant(value: string | null): BoardTrackerVariant | null {
  if (!value) return null
  const normalized = value.toLowerCase() as BoardTrackerVariant
  return VALID_VARIANTS.has(normalized) ? normalized : null
}

/** Resolve style for a track — defaults in BOARD_TRACKER_STYLE_DEFAULTS, overridable via URL (?trackerInfluence=cube). */
export function getBoardTrackerVariant(kind: BoardTrackerKind): BoardTrackerVariant {
  if (typeof window !== 'undefined') {
    const override = parseVariant(new URLSearchParams(window.location.search).get(URL_PARAM_BY_KIND[kind]))
    if (override) return override
  }
  return BOARD_TRACKER_STYLE_DEFAULTS[kind]
}
