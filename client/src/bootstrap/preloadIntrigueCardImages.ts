import { intrigueCards } from '../services/IntrigueDeckService'
import { schedulePreloadImageUrls } from './preloadImages'

const INTRIGUE_IMAGE_URLS = [...new Set(intrigueCards.map(c => c.image).filter(Boolean))]

export function preloadIntrigueCardImages(): void {
  schedulePreloadImageUrls(INTRIGUE_IMAGE_URLS)
}
