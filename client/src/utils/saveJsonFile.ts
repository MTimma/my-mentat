/** Suggested save basename (no extension) from a save document title. */
export function suggestedSaveFilenameFromTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || `save-${Date.now()}`
}

export function ensureJsonFilename(name: string): string {
  const trimmed = name.trim().replace(/\.json$/i, '')
  if (!trimmed) return `save-${Date.now()}.json`
  return `${trimmed}.json`
}

export function canUseSaveFilePicker(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

/**
 * Save JSON to disk. Uses the native save dialog when available (folder + filename);
 * otherwise triggers a download with the given filename.
 */
export async function saveJsonFile(
  json: string,
  suggestedFilename: string
): Promise<'saved' | 'cancelled'> {
  const filename = ensureJsonFilename(suggestedFilename)

  if (canUseSaveFilePicker()) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'JSON files',
            accept: { 'application/json': ['.json'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return 'saved'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled'
      }
      throw err
    }
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
  return 'saved'
}
