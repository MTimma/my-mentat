import type { BoardHotspot, MarkerAnchor } from './boardHotspots'
import type { Expansions } from '../types/GameTypes'
import { ixBoardMarkerAnchors } from './ixBoardAnchors'

function hotspot(
  spaceId: number,
  rect: { left: number; top: number; width: number; height: number },
  agent: { x: number; y: number } = { x: 50, y: 40 }
): BoardHotspot {
  return { spaceId, ...rect, agentX: agent.x, agentY: agent.y }
}

export interface ExpansionBoardHotspotsLayer {
  isEnabled: (expansions: Expansions) => boolean
  /** Base board space ids removed while this expansion is active. */
  removeBaseSpaceIds: readonly number[]
  /** Added or replacement hotspots (`spaceId` replaces an existing base entry). */
  hotspots: readonly BoardHotspot[]
  /** Anchors on sub-panels not expressed as main-board hotspots (e.g. Ix overlay). */
  extraMarkerAnchors?: () => MarkerAnchor[]
}

/** Rise of Ix — spaces removed from the base board when the expansion is active. */
const RISE_OF_IX_REMOVED_BASE_SPACE_IDS = [7, 8, 11, 12] as const

/**
 * Rise of Ix main-board layer: new CHOAM spaces, retuned Landsraad hitboxes, and Ix panel anchors.
 * Ix panel spaces 23–24 live in `ixBoardAnchors.ts`.
 */
export const RISE_OF_IX_BOARD_HOTSPOTS_LAYER: ExpansionBoardHotspotsLayer = {
  isEnabled: expansions => expansions.riseOfIx,
  removeBaseSpaceIds: RISE_OF_IX_REMOVED_BASE_SPACE_IDS,
  hotspots: [
    hotspot(25, { left: 66, top: 11.5, width: 15, height: 9 }, { x: 35, y: 52 }), // Smuggling
    hotspot(26, { left: 66, top: 1.5, width: 15, height: 9.5 }, { x: 35, y: 60 }), // Interstellar Shipping
    hotspot(9, { left: 29, top: 1.5, width: 33, height: 9.5 }, { x: 17, y: 52 }), // High Council (RoI retune)
    hotspot(10, { left: 29, top: 11.5, width: 18.5, height: 9 }, { x: 30, y: 50 }), // Mentat (RoI retune)
    hotspot(13, { left: 48.5, top: 11.5, width: 13.5, height: 9 }, { x: 36, y: 52 }), // Swordmaster (RoI retune)
  ],
  extraMarkerAnchors: ixBoardMarkerAnchors,
}

/** Apply in order; later layers override hotspot geometry for the same `spaceId`. */
export const EXPANSION_BOARD_HOTSPOTS: ExpansionBoardHotspotsLayer[] = [
  RISE_OF_IX_BOARD_HOTSPOTS_LAYER,
]

export function activeExpansionBoardHotspots(
  expansions: Expansions
): ExpansionBoardHotspotsLayer[] {
  return EXPANSION_BOARD_HOTSPOTS.filter(layer => layer.isEnabled(expansions))
}

export function disabledBaseSpaceIdsForExpansions(expansions: Expansions): Set<number> {
  const ids = new Set<number>()
  for (const layer of activeExpansionBoardHotspots(expansions)) {
    for (const spaceId of layer.removeBaseSpaceIds) {
      ids.add(spaceId)
    }
  }
  return ids
}

/** @deprecated Use `disabledBaseSpaceIdsForExpansions`. */
export const RISE_OF_IX_DISABLED_BASE_SPACE_IDS = new Set(RISE_OF_IX_REMOVED_BASE_SPACE_IDS)

export function mergeBoardHotspots(
  base: BoardHotspot[],
  layers: ExpansionBoardHotspotsLayer[]
): BoardHotspot[] {
  const bySpaceId = new Map(base.map(h => [h.spaceId, h]))
  for (const layer of layers) {
    for (const spaceId of layer.removeBaseSpaceIds) {
      bySpaceId.delete(spaceId)
    }
    for (const hotspotEntry of layer.hotspots) {
      bySpaceId.set(hotspotEntry.spaceId, hotspotEntry)
    }
  }
  return [...bySpaceId.values()]
}

export function extraMarkerAnchorsForExpansions(expansions: Expansions): MarkerAnchor[] {
  return activeExpansionBoardHotspots(expansions).flatMap(
    layer => layer.extraMarkerAnchors?.() ?? []
  )
}
