import { RISE_OF_IX_CONFLICT_CARD_IMAGE_FILE } from './conflictsRiseOfIx'

/** Base-game conflict card art under `public/conflicts/cards/`. */
export const BASE_CONFLICT_CARD_IMAGE_FILE: Partial<Record<number, string>> = {
  901: 'skirmish-iii.webp',
  902: 'skirmish-iiii.webp',
  903: 'skirmish-ii.webp',
  904: 'skirmish-i.webp',
  905: 'siege-of-arrakeen.webp',
  906: 'siege-of-carthag.webp',
  907: 'secure-imperial-basin.webp',
  908: 'cloak-and-dagger.webp',
  909: 'machinations.webp',
  910: 'desert-power.webp',
  911: 'raid-stockpiles.webp',
  912: 'sort-through-the-chaos.webp',
  913: 'guild-bank-raid.webp',
  914: 'terrible-purpose.webp',
  915: 'battle-for-imperial-basin.webp',
  916: 'battle-for-arrakeen.webp',
  917: 'battle-for-carthag.webp',
  918: 'grand-vision.webp',
}

export const CONFLICT_CARD_IMAGE_FILE: Partial<Record<number, string>> = {
  ...BASE_CONFLICT_CARD_IMAGE_FILE,
  ...RISE_OF_IX_CONFLICT_CARD_IMAGE_FILE,
}

export function conflictCardImageSrc(conflictId: number): string | null {
  const filename = CONFLICT_CARD_IMAGE_FILE[conflictId]
  return filename ? `/conflicts/cards/${filename}` : null
}
