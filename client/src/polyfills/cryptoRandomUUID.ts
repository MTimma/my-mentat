/**
 * `crypto.randomUUID()` is only guaranteed in secure contexts (HTTPS / localhost).
 * iOS Chrome on http:// LAN can throw or expose `randomUUID` as undefined, which
 * crashes the game reducer when creating pending reward ids (PLACE_AGENT, etc.).
 */
function randomUUIDViaGetRandomValues(): string {
  const c = globalThis.crypto
  const bytes = new Uint8Array(16)
  if (c?.getRandomValues) {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

declare global {
  interface Crypto {
    randomUUID?: () => string
  }
}

;(function patchRandomUUID(): void {
  const c = globalThis.crypto
  if (!c) return

  const nativeRandomUUID = typeof c.randomUUID === 'function' ? c.randomUUID.bind(c) : undefined

  const safeRandomUUID = (): string => {
    if (nativeRandomUUID) {
      try {
        return nativeRandomUUID()
      } catch {
        /* non-secure context / WebKit quirks */
      }
    }
    return randomUUIDViaGetRandomValues()
  }

  try {
    Object.defineProperty(c, 'randomUUID', {
      value: safeRandomUUID,
      configurable: true,
      enumerable: true,
      writable: true,
    })
  } catch {
    try {
      c.randomUUID = safeRandomUUID
    } catch {
      /* ignore */
    }
  }
})()
