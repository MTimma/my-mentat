const warmedImageUrls = new Set<string>()

type PreloadOptions = {
  /** Max parallel Image() fetches. Default 6 — avoids saturating mobile networks. */
  concurrency?: number
  /** Idle timeout before starting (ms). */
  idleTimeoutMs?: number
}

/**
 * Warm image HTTP / SW caches during idle time so pickers don't flash empty art.
 * Dedupes URLs across calls for the lifetime of the page.
 */
export function schedulePreloadImageUrls(
  urls: readonly string[],
  options: PreloadOptions = {}
): void {
  if (typeof window === 'undefined') return

  const concurrency = Math.max(1, options.concurrency ?? 6)
  const idleTimeoutMs = options.idleTimeoutMs ?? 5000
  const pending = urls.filter(href => href && !warmedImageUrls.has(href))
  if (pending.length === 0) return
  for (const href of pending) warmedImageUrls.add(href)

  const warm = () => {
    let index = 0
    let active = 0

    const pump = () => {
      while (active < concurrency && index < pending.length) {
        const href = pending[index++]
        active += 1
        const img = new Image()
        const done = () => {
          active -= 1
          pump()
        }
        img.onload = done
        img.onerror = done
        img.src = href
      }
    }

    pump()
  }

  const ric = window.requestIdleCallback
  if (typeof ric === 'function') {
    ric(() => warm(), { timeout: idleTimeoutMs })
  } else {
    window.setTimeout(warm, 100)
  }
}
