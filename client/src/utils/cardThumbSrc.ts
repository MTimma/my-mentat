/**
 * Map full card/leader art paths to picker thumbnails under `…/thumbs/`.
 * Full path stays on `data-preview-src` for zoom.
 *
 * `imperium_row/foo.avif` → `imperium_row/thumbs/foo.avif`
 * `/leaders/rise_of_ix/x.avif` → `/leaders/rise_of_ix/thumbs/x.avif`
 */
export function cardThumbSrc(imagePath: string): string {
  if (!imagePath) return imagePath
  const absolute = imagePath.startsWith('/')
  const normalized = absolute ? imagePath.slice(1) : imagePath
  const slash = normalized.lastIndexOf('/')
  const dir = slash >= 0 ? normalized.slice(0, slash) : ''
  const file = slash >= 0 ? normalized.slice(slash + 1) : normalized
  const avifFile = file.replace(/\.(png|jpe?g|webp)$/i, '.avif')
  const thumbRel = dir ? `${dir}/thumbs/${avifFile}` : `thumbs/${avifFile}`
  return absolute ? `/${thumbRel}` : thumbRel
}
