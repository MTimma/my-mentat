import { hydrateCustomGamePacksFromRepo, hydrateCustomGamePacksFromStorage } from '../gamePacks/customGamePacks'

/** Load bundled-custom (repo) + browser-stored game packs before app render. */
export function bootstrapGamePacks(): void {
  hydrateCustomGamePacksFromStorage()
  void hydrateCustomGamePacksFromRepo()
}
