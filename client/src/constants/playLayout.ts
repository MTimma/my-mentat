/** Docked, always-visible turn history (desktop + wide tablet / touchpad landscape). */
export const DOCKED_HISTORY_LAYOUT_MQ = '(min-width: 768px)'

/** In-flow footer, expanded board column (mouse-first desktop). */
export const DESKTOP_PLAY_LAYOUT_MQ = '(min-width: 901px)'

/**
 * Phone + tablet: collapsible play-area overlay (below desktop breakpoint).
 * Must stay in sync with DESKTOP_PLAY_LAYOUT_MQ (901px) — the old 600px cutoff
 * left a 601–900 gap with no chevron in Chrome half-width / iPad windows.
 */
export const COMPACT_PLAY_OVERLAY_MQ = '(max-width: 900px)'