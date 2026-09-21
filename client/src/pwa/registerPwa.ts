import { registerSW } from 'virtual:pwa-register'

const UPDATE_POLL_MS = 60 * 60 * 1000

export type PwaUpdateHandler = (reload: () => void) => void

/** Register the service worker and apply new builds without a hard refresh. */
export function registerPwa(_onNeedRefresh?: PwaUpdateHandler): void {
  if (!import.meta.env.PROD) return

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      window.setInterval(() => {
        void registration.update()
      }, UPDATE_POLL_MS)
    },
    onOfflineReady() {
      // App shell cached; no UI needed for this game companion.
    },
  })
}
