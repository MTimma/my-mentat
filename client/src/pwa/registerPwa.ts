import { registerSW } from 'virtual:pwa-register'

const UPDATE_POLL_MS = 5 * 60 * 1000

export type PwaUpdateHandler = (reload: () => void) => void

function pingWorkerUpdate(registration: ServiceWorkerRegistration): void {
  void registration.update()
}

/** Register the service worker and apply new builds without a hard refresh. */
export function registerPwa(_onNeedRefresh?: PwaUpdateHandler): void {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true)
    },
    onRegisteredSW(swUrl, registration) {
      // Cloudflare Browser Cache TTL was overlaying max-age=14400 on sw.js.
      // Never use the HTTP cache for worker script checks.
      void navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
      if (!registration) return
      pingWorkerUpdate(registration)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pingWorkerUpdate(registration)
      })
      window.addEventListener('focus', () => pingWorkerUpdate(registration))
      window.setInterval(() => pingWorkerUpdate(registration), UPDATE_POLL_MS)
    },
    onOfflineReady() {
      // App shell is network-first; no UI needed.
    },
  })
}
