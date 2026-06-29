import type { Expansions } from '../types/GameTypes'
import type { BoardSetId, ExpansionBoardLayer, ExpansionModule, ExpansionOverlay } from './types'
import { DEFAULT_BOARD_SET } from './types'
import { IMMORTALITY_MODULE } from './immortality'

/**
 * Ordered registry of expansion modules. Base files (`ImageBoard`, `App`, the
 * reducer) consult this registry instead of importing concrete expansions, so
 * adding an expansion never requires per-expansion `if` branches in base code.
 */
const MODULES: ExpansionModule[] = [IMMORTALITY_MODULE]

export function registerExpansionModule(module: ExpansionModule): void {
  if (MODULES.some(m => m.id === module.id)) return
  MODULES.push(module)
}

export function allExpansionModules(): readonly ExpansionModule[] {
  return MODULES
}

export function activeExpansionModules(expansions: Expansions): ExpansionModule[] {
  return MODULES.filter(module => module.isEnabled(expansions))
}

/** Board layers for all active expansions on the given board set. */
export function expansionBoardLayersFor(
  expansions: Expansions,
  boardSet: BoardSetId = DEFAULT_BOARD_SET
): ExpansionBoardLayer[] {
  const layers: ExpansionBoardLayer[] = []
  for (const module of activeExpansionModules(expansions)) {
    const layer = module.boardLayers?.[boardSet]
    if (layer) layers.push(layer)
  }
  return layers
}

/** Flat list of `<img>` overlays contributed by active expansions. */
export function expansionOverlaysFor(
  expansions: Expansions,
  boardSet: BoardSetId = DEFAULT_BOARD_SET
): ExpansionOverlay[] {
  return expansionBoardLayersFor(expansions, boardSet).flatMap(layer => layer.overlays ?? [])
}
