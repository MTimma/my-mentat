import { hydrateCustomGamePacksFromRepo, hydrateCustomGamePacksFromStorage } from '../gamePacks/customGamePacks'

/** Load bundled-custom (repo) + browser-stored game packs before app render. */
export async function bootstrapGamePacks(): Promise<void> {
  hydrateCustomGamePacksFromStorage()
  await hydrateCustomGamePacksFromRepo()
}
