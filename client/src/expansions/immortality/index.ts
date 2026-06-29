import type { ExpansionModule } from '../types'
import { immortalityBoardLayer } from './boardMarkers'

export const IMMORTALITY_MODULE: ExpansionModule = {
  id: 'immortality',
  isEnabled: expansions => expansions.immortality === true,
  boardLayers: {
    imperium: immortalityBoardLayer('imperium'),
    // uprising layer is added once the Uprising board ships; module loads regardless.
  },
}

export * from './boardMarkers'
