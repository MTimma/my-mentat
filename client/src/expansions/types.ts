import type { Expansions } from '../types/GameTypes'

/**
 * Board set an expansion attaches to. Expansions are **base-agnostic**: the same
 * expansion module supplies a different anchor table per board set. `imperium`
 * is the original Dune: Imperium board; `uprising` is reserved (anchors stubbed
 * until the Uprising board lands).
 */
export type BoardSetId = 'imperium' | 'uprising'

export const DEFAULT_BOARD_SET: BoardSetId = 'imperium'

/** Rectangle in inner-board 0–100 coordinates (same system as `boardHotspots.ts`). */
export interface InnerRect {
  left: number
  top: number
  width: number
  height: number
}

/** Point in inner-board 0–100 coordinates. */
export interface InnerPoint {
  x: number
  y: number
}

/** An `<img>` overlay drawn on the main board for an expansion. */
export interface ExpansionOverlay {
  /** Stable id for React keys / debugging. */
  id: string
  /** Public asset path (e.g. `board/immortality/research_station.png`). */
  src: string
  rect: InnerRect
}

/**
 * Board contribution of one expansion for one board set. Kept intentionally
 * small — concrete marker rendering stays inside the owning expansion's
 * components; this exposes only the data base files need to lay things out.
 */
export interface ExpansionBoardLayer {
  overlays?: ExpansionOverlay[]
}

export interface ExpansionModule {
  id: string
  isEnabled: (expansions: Expansions) => boolean
  /** Board layers keyed by board set; an absent key ⇒ no board contribution. */
  boardLayers?: Partial<Record<BoardSetId, ExpansionBoardLayer>>
}
