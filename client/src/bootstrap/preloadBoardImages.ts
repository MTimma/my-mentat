import { EARLY_BOARD_IMAGE_URLS } from '../data/boardAssets'
import { schedulePreloadImageUrls } from './preloadImages'

/** Warm the main board layers immediately — not deferred to idle like picker thumbs. */
export function preloadBoardImages(): void {
  schedulePreloadImageUrls(EARLY_BOARD_IMAGE_URLS, { concurrency: 3, idleTimeoutMs: 0 })
}
